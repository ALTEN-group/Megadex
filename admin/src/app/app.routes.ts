import { Routes } from "@angular/router";
import { aclGuard } from "@core/acl/acl.guard";
import { ADMIN_ENTITIES, AdminEntity } from "@core/app-config/app.entities";
import { loginGuard } from "@core/auth/login.guard";
import { NotFoundComponent } from "@core/pages/not-found/not-found.component";
import { userLookupsResolver } from "app/profiles/data-access/lookups/lookups.resolver";
import { rolesResolver } from "app/profiles/data-access/roles/roles.resolver";

type EntityPaths = { readonly [K in AdminEntity as Uppercase<K>]: K };

const ENTITY_PATHS = Object.fromEntries(
  ADMIN_ENTITIES.map((e) => [e.toUpperCase(), e]),
) as EntityPaths;

/**
 * Application Paths
 */
export const AppPaths = {
  LOGIN: "login",
  HOME: "home",
  NOT_FOUND: "not-found",
  UNAUTHORIZED: "unauthorized",
  ...ENTITY_PATHS,
} as const;

export const ROUTES: Routes = [
  {
    path: AppPaths.LOGIN,
    loadChildren: () =>
      import("./login/login.routes").then((m) => m.AUTH_ROUTES),
    title: "Connexion",
    canActivate: [loginGuard()],
  },
  {
    path: AppPaths.HOME,
    loadComponent: () =>
      import("./core/pages/home/home.component").then((m) => m.HomeComponent),
    title: "Accueil",
    data: {
      breadcrumb: $localize`:@@Home_homeNav:Accueil`,
    },
  },
  {
    path: AppPaths.USERS,
    loadComponent: () =>
      import("./profiles/features/users/users.component").then(
        (m) => m.UsersComponent,
      ),
    title: "Users",
    canActivate: [aclGuard()],
    data: {
      breadcrumb: $localize`:@@Admin_UsersNav:Users`,
      functionality: AppPaths.USERS,
    },
    resolve: {
      lookups: userLookupsResolver,
      roles: rolesResolver,
    },
  },
  {
    path: AppPaths.SOCIALS,
    loadComponent: () =>
      import("./profiles/features/socials/socials.component").then(
        (m) => m.SocialsComponent,
      ),
    title: "Social networks",
    canActivate: [aclGuard()],
    data: {
      breadcrumb: $localize`:@@Admin_SocialsNav:Social networks`,
      functionality: AppPaths.SOCIALS,
    },
  },
  {
    path: AppPaths.UNAUTHORIZED,
    loadComponent: () =>
      import("./core/pages/unauthorized/unauthorized.component").then(
        (m) => m.UnauthorizedComponent,
      ),
    title: "Unauthorized",
    data: {
      breadcrumb: $localize`:@@Unauthorized_unauthorizedNav:Unauthorized`,
    },
  },
  {
    path: AppPaths.NOT_FOUND,
    component: NotFoundComponent,
    title: "Non trouvé",
    data: {
      breadcrumb: $localize`:@@NotFound_notFoundNav:Non trouvé`,
    },
  },
  {
    path: "",
    redirectTo: `/${AppPaths.HOME}`,
    pathMatch: "full",
  },
  {
    path: "**",
    redirectTo: `/${AppPaths.NOT_FOUND}`,
    pathMatch: "full",
  },
];
