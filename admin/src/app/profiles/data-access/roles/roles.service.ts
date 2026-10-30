import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { APP_CONFIG } from "@core/app-config/app-config.token";
import { Role } from "app/profiles/data-access/roles/role.model";
import { catchError, map, Observable, of, shareReplay } from "rxjs";

/**
 * Lists the Gatelin roles a user can be given.
 */
@Injectable({
  providedIn: "root",
})
export class RolesService {
  private readonly http = inject(HttpClient);
  private readonly searchUrl = `${inject(APP_CONFIG).gatelinApi}roles/search`;
  private all$: Observable<Role[]> | null = null;

  public getAndCacheAll(): Observable<Role[]> {
    this.all$ ??= this.http.post<{ rows?: Role[] }>(this.searchUrl, {}).pipe(
      map((res) => (res.rows ?? []).filter((role) => !role.archived)),
      // The roles are optional metadata: a failing lookup must not block the users page.
      catchError(() => {
        this.all$ = null;
        return of([]);
      }),
      shareReplay(1),
    );
    return this.all$;
  }
}
