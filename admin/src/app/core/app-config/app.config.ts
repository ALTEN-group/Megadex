import {
  inject,
  LOCALE_ID,
  makeEnvironmentProviders,
  provideAppInitializer,
} from "@angular/core";
import { TitleStrategy } from "@angular/router";
import { SIDENAV } from "@core/app-config/app.sidenav";
import { APP_CONFIG, AppConfig } from "@core/app-config/app-config.token";
import { CRUD_LABELS_CONFIG } from "@core/app-config/crud-labels";
import { CustomTitleStrategyService } from "@core/app-config/custom-title-strategy.service";
import { PrimeNgTranslations } from "@core/app-config/primeng-translations";
import {
  AuthenticationService,
  readLoginTicket,
} from "@core/auth/auth.service";
import {
  APP_FORM_CONFIG,
  APP_CONFIG as CRUD_APP_CONFIG,
  FormTokenData,
  HISTORY_MAPPER,
  HistorizedData,
  provideCrudLabels,
  provideCrudRenderer,
  provideFormFieldRenderer,
} from "@dwtechs/ngx-crud-builder";
import { filter, of, tap } from "rxjs";
import { environment } from "../../../environments/environment";
import { readAdminRuntimeConfig } from "./runtime-config";

/**
 * Main Config
 */
const TITLE = "Megadex";
const APP_KEY = "megadex";
const runtime = readAdminRuntimeConfig();
const AppStorageKey = {
  TABLE_CONFIG: `${APP_KEY}_tableConfig`,
  THEME: `${APP_KEY}_theme`,
  // Shared (not app-prefixed): Megadex and Gatelin admin both authenticate
  // against the same Gatelin session backend, so both must read/write the
  // same slot for the cookie-based silent refresh to identify the consumer
  // when switching between the two admin apps. Configurable via
  // ADMIN_SSO_TOKEN_KEY so it can be changed without an Angular rebuild.
  TOKEN: runtime.ssoTokenKey?.trim() || "sso_access_token",
} as const;
export const CONFIG: AppConfig = {
  title: TITLE,
  appKey: APP_KEY,
  storageKeys: AppStorageKey,
  sidenavItems: SIDENAV,
  megadexApi: environment.megadexApi,
  gatelinApi: environment.gatelinApi,
  apiUsers: environment.apiUsers,
  webBase: environment.webBase ?? "/api/foxnox/web",
  env: environment,
};

const FORM_CONFIG: FormTokenData = {
  customErrorMessages: {
    unsafeWords: $localize`:@@Validators_UnsafeWords:Le texte contient des mots non autorisés : {words}`,
    minDate: $localize`:@@Validators_MinDate:La date doit être au moins à {days} jour(s) après aujourd'hui`,
  },
};

export function provideAppConfig() {
  return makeEnvironmentProviders([
    provideAppInitializer(() => {
      const authService = inject(AuthenticationService);
      return checkToken(authService);
    }),
    provideCrudRenderer("optimus-ui"),
    { provide: LOCALE_ID, useValue: "fr" },
    { provide: APP_CONFIG, useValue: CONFIG },
    {
      provide: CRUD_APP_CONFIG,
      useValue: {
        title: CONFIG.title,
        appKey: CONFIG.appKey,
        storageKeys: CONFIG.storageKeys,
        // Megadex entity CRUD, including table preferences, is proxied at
        // /api/megadex/… . Login/sessions stay on gatelinApi.
        apiPrefix: environment.megadexApi,
      },
    },
    provideCrudLabels(CRUD_LABELS_CONFIG, PrimeNgTranslations),
    { provide: APP_FORM_CONFIG, useValue: FORM_CONFIG },
    { provide: TitleStrategy, useClass: CustomTitleStrategyService },
    {
      provide: HISTORY_MAPPER,
      useFactory: () => {
        return (raw: unknown): HistorizedData<unknown> => {
          const r = raw as any;
          const record = { ...r.record };
          return {
            id: r.id,
            tstamp: r.tstamp,
            operation: r.operation,
            updaterId: r.userId,
            updaterName: r.userName,
            record,
          };
        };
      },
    },
  ]);
}

function checkToken(authService: AuthenticationService) {
  if (readLoginTicket()) return of(null);

  return authService.refreshToken().pipe(
    tap((success) => {
      if (!success) {
        authService.redirectToLogin();
      }
    }),
    filter(Boolean),
    authService.getUserBasics(),
  );
}
