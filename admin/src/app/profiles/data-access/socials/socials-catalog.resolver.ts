import { inject } from "@angular/core";
import { ResolveFn } from "@angular/router";
import { SocialsCatalogService } from "app/profiles/data-access/socials/socials-catalog.service";
import { Observable } from "rxjs";

export const socialsCatalogResolver: ResolveFn<string[]> = (
  _route,
  _state,
): Observable<string[]> => inject(SocialsCatalogService).getAndCacheAll();
