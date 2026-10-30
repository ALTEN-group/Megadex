import { inject } from "@angular/core";
import { ResolveFn } from "@angular/router";
import { Role } from "app/profiles/data-access/roles/role.model";
import { RolesService } from "app/profiles/data-access/roles/roles.service";
import { Observable } from "rxjs";

export const rolesResolver: ResolveFn<Role[]> = (
  _route,
  _state,
): Observable<Role[]> => inject(RolesService).getAndCacheAll();
