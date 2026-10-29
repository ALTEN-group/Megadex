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

export const TABLES: Record<AdminEntity, TableInfo> = {} as const;
