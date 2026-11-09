import { inject } from "@angular/core";
import {
  ArchiveInfo,
  CRUD_LABELS,
  createAuditConfig,
  StrictCrudItemOptions,
} from "@dwtechs/ngx-crud-builder";

export function buildAuditConfig(): StrictCrudItemOptions<ArchiveInfo>[] {
  const labels = inject(CRUD_LABELS);
  return createAuditConfig(labels.auditConfig);
}
