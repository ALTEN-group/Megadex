import { AppPaths } from "app/app.routes";
import { MenuItem } from "@openng/optimus-ui/api";

export const SIDENAV: MenuItem[] = [
  {
    id: "home",
    label: $localize`:@@Home_homeNav:Accueil`,
    routerLink: `/${AppPaths.HOME}`,
    icon: "pi pi-home",
  },
];
