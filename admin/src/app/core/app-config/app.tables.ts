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

// Table views (isPreferencesModeEnabled) are off: crud-builder stores them through
// `${apiPrefix}preferences/{componentId}` (Gatelin/Foxnox format), which Megadex's
// per-user /megadex/preferences API does not implement.
export const TABLES: Record<AdminEntity, TableInfo> = {
  users: {
    label: $localize`:@@TableLabels_User:User`,
    title: $localize`:@@TableLabels_Users:Users`,
    entityId: "users",
    editionDialogSize: "l",
    filterLevel: "advanced",
    isPreferencesModeEnabled: false,
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
    isPreferencesModeEnabled: false,
    shouldSyncIdWithUrl: true,
    shouldSyncPageWithUrl: true,
    isExcelExportEnabled: true,
    excelExportMode: "local",
    additionalReadonlyProperties: {},
  },
} as const;
