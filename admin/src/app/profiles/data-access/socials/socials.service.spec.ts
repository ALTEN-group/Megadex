import { provideHttpClient } from "@angular/common/http";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { AclService } from "@core/acl/acl.service";
import { Acls } from "@core/acl/acls.model";
import { APP_CONFIG } from "@dwtechs/ngx-crud-builder";
import { SocialsService } from "./socials.service";
import { SocialsCatalogService } from "./socials-catalog.service";

describe("SocialsService", () => {
  const mutations = ["create", "update", "archive", "restore"] as const;
  let service: SocialsService;
  let http: HttpTestingController;
  let acls: ReturnType<typeof signal<Acls | undefined>>;
  let invalidate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    acls = signal<Acls | undefined>(undefined);
    invalidate = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { apiPrefix: "/api/megadex/" } },
        { provide: AclService, useValue: { getEntityAcls: () => acls() } },
        { provide: SocialsCatalogService, useValue: { invalidate } },
      ],
    });
    service = TestBed.inject(SocialsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it.each(mutations)(
    "only exposes %s when its own ACL grants permission",
    (mutation) => {
      expect(service.httpCalls()[mutation]).toBeUndefined();

      acls.set({});
      expect(service.httpCalls()[mutation]).toBeUndefined();

      acls.set({
        [mutation]: { allowed: true, operations: [5], fields: [] },
      });
      expect(service.httpCalls()[mutation]).toBeTypeOf("function");
      for (const other of mutations.filter((name) => name !== mutation)) {
        expect(service.httpCalls()[other]).toBeUndefined();
      }

      acls.set({
        create: { allowed: true, operations: [1], fields: [] },
        update: { allowed: true, operations: [2], fields: [] },
        archive: { allowed: true, operations: [3], fields: [] },
        restore: { allowed: true, operations: [5], fields: [] },
        [mutation]: { allowed: false, operations: [], fields: [] },
      });
      expect(service.httpCalls()[mutation]).toBeUndefined();
      for (const other of mutations.filter((name) => name !== mutation)) {
        expect(service.httpCalls()[other]).toBeTypeOf("function");
      }
      expect(invalidate).not.toHaveBeenCalled();
    },
  );

  it("posts selected IDs to restore and invalidates the catalog only after success", () => {
    acls.set({ restore: { allowed: true, operations: [5], fields: [] } });
    const restore = service.httpCalls().restore;
    expect(restore).toBeDefined();
    if (!restore) throw new Error("Restore capability is not available");
    const result = restore([7, 9]);
    expect(invalidate).not.toHaveBeenCalled();
    http.expectNone("/api/megadex/socials/restore");

    const next = vi.fn();
    const complete = vi.fn();
    result.subscribe({ next, complete });

    const req = http.expectOne("/api/megadex/socials/restore");
    expect(req.request.method).toBe("POST");
    expect(req.request.body).toEqual({ rows: [7, 9] });
    expect(invalidate).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();

    req.flush({ rows: [], total: 0 });

    expect(next).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledTimes(1);
  });

  it("propagates restore HTTP errors without invalidating the catalog", () => {
    acls.set({ restore: { allowed: true, operations: [5], fields: [] } });
    const restore = service.httpCalls().restore;
    expect(restore).toBeDefined();
    if (!restore) throw new Error("Restore capability is not available");
    const next = vi.fn();
    const error = vi.fn();
    const complete = vi.fn();
    restore([7, 9]).subscribe({ next, error, complete });

    const req = http.expectOne("/api/megadex/socials/restore");
    expect(req.request.method).toBe("POST");
    expect(req.request.body).toEqual({ rows: [7, 9] });
    expect(invalidate).not.toHaveBeenCalled();

    req.flush("boom", { status: 500, statusText: "Server Error" });

    expect(error).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith(
      expect.objectContaining({ status: 500, error: "boom" }),
    );
    expect(next).not.toHaveBeenCalled();
    expect(complete).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
  });
});
