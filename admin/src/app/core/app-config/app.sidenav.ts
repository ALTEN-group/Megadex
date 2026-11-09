import { MenuItem } from "@openng/optimus-ui/api";
import { AppPaths } from "app/app.routes";

export const SIDENAV: MenuItem[] = [
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
  {
    id: "auditLogs",
    label: $localize`:@@Admin_AuditLogsNav:Audit log`,
    routerLink: `/${AppPaths.AUDITLOGS}`,
    icon: "pi pi-history",
    data: {
      functionality: "auditLogs",
    },
  },
];
