import { provideHttpClient } from "@angular/common/http";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { Acls } from "@core/acl/acls.model";
import { AclService } from "@core/acl/acl.service";
import { APP_CONFIG } from "@dwtechs/ngx-crud-builder";
import { UsersService } from "./users.service";

describe("UsersService restore", () => {
  let service: UsersService;
  let http: HttpTestingController;
  let acls: ReturnType<typeof signal<Acls | undefined>>;

  beforeEach(() => {
    acls = signal<Acls | undefined>(undefined);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { apiPrefix: "/api/megadex/" } },
        { provide: AclService, useValue: { getEntityAcls: () => acls() } },
      ],
    });
    service = TestBed.inject(UsersService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it("only exposes restore when its permission is granted", () => {
    expect(service.httpCalls().restore).toBeUndefined();
    acls.set({ restore: { allowed: true, operations: [5], fields: [] } });
    expect(service.httpCalls().restore).toBeDefined();
    acls.set({ restore: { allowed: false, operations: [], fields: [] } });
    expect(service.httpCalls().restore).toBeUndefined();
  });

  it("posts selected user IDs to the restore endpoint", () => {
    acls.set({ restore: { allowed: true, operations: [5], fields: [] } });
    const restore = service.httpCalls().restore;
    expect(restore).toBeDefined();
    restore?.([7, 9]).subscribe();
    const req = http.expectOne("/api/megadex/users/restore");
    expect(req.request.method).toBe("POST");
    expect(req.request.body).toEqual({ rows: [7, 9] });
    req.flush({ rows: [], total: 0 });
  });
});
