import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { APP_CONFIG } from "@core/app-config/app-config.token";
import { Social } from "app/profiles/data-access/socials/social.model";
import { catchError, map, Observable, of, shareReplay } from "rxjs";

/**
 * Lists the names of the active social networks a user can have a handle on.
 */
@Injectable({
  providedIn: "root",
})
export class SocialsCatalogService {
  private readonly http = inject(HttpClient);
  private readonly searchUrl = `${inject(APP_CONFIG).megadexApi}socials/search`;
  private names$: Observable<string[]> | null = null;

  public getAndCacheAll(): Observable<string[]> {
    this.names$ ??= this.http.post<{ rows?: Social[] }>(this.searchUrl, {}).pipe(
      map((res) =>
        (res.rows ?? [])
          .filter((social) => !social.archived)
          .map((social) => social.name),
      ),
      // The catalog only lists the handle inputs: a failing call must not block the page.
      catchError(() => {
        this.names$ = null;
        return of([]);
      }),
      shareReplay(1),
    );
    return this.names$;
  }
}
