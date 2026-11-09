/// <reference types="@angular/localize" />

import { registerLocaleData } from "@angular/common";
import {
  provideHttpClient,
  withInterceptors,
  withInterceptorsFromDi,
  withXsrfConfiguration,
} from "@angular/common/http";
import localeFr from "@angular/common/locales/fr";
import {
  enableProdMode,
  importProvidersFrom,
  provideZonelessChangeDetection,
} from "@angular/core";
import { BrowserModule, bootstrapApplication } from "@angular/platform-browser";
import { provideAnimations } from "@angular/platform-browser/animations";
import { provideAnimationsAsync } from "@angular/platform-browser/animations/async";
import { provideRouter } from "@angular/router";
import { provideAppConfig } from "@core/app-config/app.config";
import { MegadexPreset } from "@core/app-config/primeng-preset";
import { authInterceptor } from "@core/auth/auth.interceptor";
import { errorInterceptor } from "@core/interceptors/error.interceptor";
import { locationInterceptor } from "@core/interceptors/location.interceptor";
import { ConfirmationService, MessageService } from "@openng/optimus-ui/api";
import { provideOptimus } from "@openng/optimus-ui/config";
import { DialogService } from "@openng/optimus-ui/dynamicdialog";
import { ROUTES } from "app/app.routes";
import { AppComponent } from "./app/app.component";
import { environment } from "./environments/environment";

registerLocaleData(localeFr);

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [
    // Leave this one first
    importProvidersFrom(BrowserModule),
    provideZonelessChangeDetection(),
    provideAnimations(),
    provideAnimationsAsync(),
    provideOptimus({
      theme: {
        preset: MegadexPreset,
        options: {
          darkModeSelector: ".dark",
        },
      },
    }),
    provideAppConfig(),
    provideHttpClient(
      withInterceptorsFromDi(),
      withInterceptors([
        authInterceptor,
        errorInterceptor,
        locationInterceptor,
      ]),
      withXsrfConfiguration({
        cookieName: "csrfToken",
        headerName: "X-CSRF-Token",
      }),
    ),
    provideRouter(ROUTES),
    MessageService,
    ConfirmationService,
    DialogService,
  ],
}).catch(() => console.error("Megadex admin failed to start"));
