import { AppPaths } from "app/app.routes";
import { MenuItem } from "@openng/optimus-ui/api";

export const SIDENAV: MenuItem[] = [
  {
    id: "home",
    label: $localize`:@@Home_homeNav:Accueil`,
    routerLink: `/${AppPaths.HOME}`,
    icon: "pi pi-home",
  },
  {
    id: "users",
    label: $localize`:@@Admin_UsersNav:Users`,
    routerLink: `/${AppPaths.USERS}`,
    icon: "pi pi-users",
    data: {
      functionality: "users",
    },
  },
  {
    id: "socials",
    label: $localize`:@@Admin_SocialsNav:Social networks`,
    routerLink: `/${AppPaths.SOCIALS}`,
    icon: "pi pi-share-alt",
    data: {
      functionality: "socials",
    },
  },
];
