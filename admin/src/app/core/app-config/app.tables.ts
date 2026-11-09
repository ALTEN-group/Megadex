import { ExcelExportMode, FilterLevel } from "@dwtechs/ngx-crud-builder";
import { AdminEntity } from "./app.entities";

type TableInfo = {
  label: string;
  title: string;
  entityId: AdminEntity;
  editionDialogSize: "xs" | "s" | "m" | "l";
  filterLevel: FilterLevel;
  isPreferencesModeEnabled: boolean;
  shouldSyncIdWithUrl: boolean;
  shouldSyncPageWithUrl: boolean;
  isExcelExportEnabled: boolean;
  excelExportMode: ExcelExportMode;
  additionalReadonlyProperties: Record<string, boolean>;
};

export const TABLES: Record<AdminEntity, TableInfo> = {
  users: {
    label: $localize`:@@TableLabels_User:User`,
    title: $localize`:@@TableLabels_Users:Users`,
    entityId: "users",
    editionDialogSize: "l",
    filterLevel: "advanced",
    isPreferencesModeEnabled: true,
    shouldSyncIdWithUrl: true,
    shouldSyncPageWithUrl: true,
    isExcelExportEnabled: true,
    excelExportMode: "local",
    additionalReadonlyProperties: {},
  },
  socials: {
    label: $localize`:@@TableLabels_Social:Social network`,
    title: $localize`:@@TableLabels_Socials:Social networks`,
    entityId: "socials",
    editionDialogSize: "s",
    filterLevel: "advanced",
    isPreferencesModeEnabled: true,
    shouldSyncIdWithUrl: true,
    shouldSyncPageWithUrl: true,
    isExcelExportEnabled: true,
    excelExportMode: "local",
    additionalReadonlyProperties: {},
  },
  auditLogs: {
    label: $localize`:@@TableLabels_AuditLog:Audit log entry`,
    title: $localize`:@@TableLabels_AuditLogs:Audit log`,
    entityId: "auditLogs",
    editionDialogSize: "m",
    filterLevel: "advanced",
    isPreferencesModeEnabled: true,
    shouldSyncIdWithUrl: true,
    shouldSyncPageWithUrl: true,
    isExcelExportEnabled: true,
    excelExportMode: "local",
    additionalReadonlyProperties: {},
  },
} as const;
