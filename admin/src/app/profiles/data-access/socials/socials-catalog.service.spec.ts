import { provideHttpClient } from "@angular/common/http";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { APP_CONFIG } from "@core/app-config/app-config.token";
import { SocialsCatalogService } from "./socials-catalog.service";

describe("SocialsCatalogService", () => {
  let service: SocialsCatalogService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        SocialsCatalogService,
        { provide: APP_CONFIG, useValue: { megadexApi: "/api/megadex/" } },
      ],
    });

    service = TestBed.inject(SocialsCatalogService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it("posts to the Megadex socials search route and keeps active network names", () => {
    let names: string[] = [];
    service.getAndCacheAll().subscribe((value) => {
      names = value;
    });

    const req = http.expectOne("/api/megadex/socials/search");
    expect(req.request.method).toBe("POST");
    req.flush({
      rows: [
        { id: 1, name: "Facebook", archived: false },
        { id: 2, name: "Orkut", archived: true },
        { id: 3, name: "X", archived: false },
      ],
    });

    expect(names).toEqual(["Facebook", "X"]);
  });

  it("fetches the catalog once and replays it to later subscribers", () => {
    service.getAndCacheAll().subscribe();
    http.expectOne("/api/megadex/socials/search").flush({ rows: [] });

    service.getAndCacheAll().subscribe();
    http.expectNone("/api/megadex/socials/search");
  });

  it("returns an empty list and retries on the next call when the request fails", () => {
    let names: string[] | undefined;
    service.getAndCacheAll().subscribe((value) => {
      names = value;
    });
    http
      .expectOne("/api/megadex/socials/search")
      .flush("boom", { status: 500, statusText: "Server Error" });

    expect(names).toEqual([]);

    service.getAndCacheAll().subscribe();
    http.expectOne("/api/megadex/socials/search").flush({ rows: [] });
  });
});
