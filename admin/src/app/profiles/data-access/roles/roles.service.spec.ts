import { provideHttpClient } from "@angular/common/http";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { APP_CONFIG } from "@core/app-config/app-config.token";
import { Role } from "app/profiles/data-access/roles/role.model";
import { RolesService } from "./roles.service";

describe("RolesService", () => {
  let service: RolesService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        RolesService,
        { provide: APP_CONFIG, useValue: { gatelinApi: "/api/gatelin/" } },
      ],
    });

    service = TestBed.inject(RolesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it("posts to the Gatelin roles search route and drops archived roles", () => {
    let roles: Role[] = [];
    service.getAndCacheAll().subscribe((value) => {
      roles = value;
    });

    const req = http.expectOne("/api/gatelin/roles/search");
    expect(req.request.method).toBe("POST");
    req.flush({
      rows: [
        { id: 1, name: "Super admin", archived: false },
        { id: 2, name: "Old", archived: true },
      ],
    });

    expect(roles).toEqual([{ id: 1, name: "Super admin", archived: false }]);
  });

  it("fetches the roles once and replays them to later subscribers", () => {
    service.getAndCacheAll().subscribe();
    http.expectOne("/api/gatelin/roles/search").flush({ rows: [] });

    service.getAndCacheAll().subscribe();
    http.expectNone("/api/gatelin/roles/search");
  });

  it("returns an empty list and retries on the next call when the request fails", () => {
    let roles: Role[] | undefined;
    service.getAndCacheAll().subscribe((value) => {
      roles = value;
    });
    http
      .expectOne("/api/gatelin/roles/search")
      .flush("boom", { status: 500, statusText: "Server Error" });

    expect(roles).toEqual([]);

    service.getAndCacheAll().subscribe();
    http.expectOne("/api/gatelin/roles/search").flush({ rows: [] });
  });
});
