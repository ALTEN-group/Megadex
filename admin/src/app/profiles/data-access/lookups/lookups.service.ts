import { HttpClient } from "@angular/common/http";
import { inject, Injectable, LOCALE_ID } from "@angular/core";
import { APP_CONFIG } from "@core/app-config/app-config.token";
import { Lookup, UserLookups } from "app/profiles/data-access/lookups/lookup.model";
import { catchError, forkJoin, map, Observable, of, shareReplay } from "rxjs";

type LookupEndpoint = "countries" | "civilities" | "genders";

/**
 * Read-only Megadex reference data, filtered on the admin locale and cached.
 */
@Injectable({
  providedIn: "root",
})
export class LookupsService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(APP_CONFIG).megadexApi;
  private readonly lang = inject(LOCALE_ID).split("-")[0];
  private all$: Observable<UserLookups> | null = null;

  public getAndCacheAll(): Observable<UserLookups> {
    this.all$ ??= forkJoin({
      countries: this.search("countries"),
      civilities: this.search("civilities"),
      genders: this.search("genders"),
    }).pipe(shareReplay(1));
    return this.all$;
  }

  private search(endpoint: LookupEndpoint): Observable<Lookup[]> {
    return this.http
      .post<{ rows?: Lookup[] }>(`${this.api}${endpoint}/search`, {
        filters: { lang: { value: this.lang, matchMode: "equals" } },
      })
      .pipe(
        map((res) => res.rows ?? []),
        // Lookups only label the selects: a failing call must not block the page.
        catchError(() => {
          this.all$ = null;
          return of([]);
        }),
      );
  }
}
