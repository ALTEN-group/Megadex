import { provideHttpClient } from "@angular/common/http";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import { LOCALE_ID } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { APP_CONFIG } from "@core/app-config/app-config.token";
import { UserLookups } from "app/profiles/data-access/lookups/lookup.model";
import { LookupsService } from "./lookups.service";

const URLS = [
  "/api/megadex/countries/search",
  "/api/megadex/civilities/search",
  "/api/megadex/genders/search",
];

describe("LookupsService", () => {
  let service: LookupsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        LookupsService,
        { provide: APP_CONFIG, useValue: { megadexApi: "/api/megadex/" } },
        { provide: LOCALE_ID, useValue: "fr-FR" },
      ],
    });

    service = TestBed.inject(LookupsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it("searches every lookup filtered on the admin language", () => {
    let lookups: UserLookups | undefined;
    service.getAndCacheAll().subscribe((value) => {
      lookups = value;
    });

    for (const url of URLS) {
      const req = http.expectOne(url);
      expect(req.request.method).toBe("POST");
      expect(req.request.body).toEqual({
        filters: { lang: { value: "fr", matchMode: "equals" } },
      });
      req.flush({ rows: [{ code: url, lang: "fr", trans: "x" }] });
    }

    expect(lookups?.countries).toEqual([
      { code: URLS[0], lang: "fr", trans: "x" },
    ]);
    expect(lookups?.genders).toEqual([
      { code: URLS[2], lang: "fr", trans: "x" },
    ]);
  });

  it("fetches the lookups once and replays them to later subscribers", () => {
    service.getAndCacheAll().subscribe();
    for (const url of URLS) http.expectOne(url).flush({ rows: [] });

    service.getAndCacheAll().subscribe();
    for (const url of URLS) http.expectNone(url);
  });

  it("returns an empty list for a failing lookup and retries on the next call", () => {
    let lookups: UserLookups | undefined;
    service.getAndCacheAll().subscribe((value) => {
      lookups = value;
    });
    http
      .expectOne(URLS[0])
      .flush("boom", { status: 500, statusText: "Server Error" });
    http.expectOne(URLS[1]).flush({ rows: [] });
    http.expectOne(URLS[2]).flush({ rows: [] });

    expect(lookups?.countries).toEqual([]);

    service.getAndCacheAll().subscribe();
    for (const url of URLS) http.expectOne(url).flush({ rows: [] });
  });
});
