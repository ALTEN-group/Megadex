import { inject } from "@angular/core";
import { ResolveFn } from "@angular/router";
import { UserLookups } from "app/profiles/data-access/lookups/lookup.model";
import { LookupsService } from "app/profiles/data-access/lookups/lookups.service";
import { Observable } from "rxjs";

export const userLookupsResolver: ResolveFn<UserLookups> = (
  _route,
  _state,
): Observable<UserLookups> => inject(LookupsService).getAndCacheAll();
