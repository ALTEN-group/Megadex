import { Acls } from "@core/acl/acls.model";
import { withAclConditions } from "@core/utils/field-config/acl-conditions.utils";
import { buildArchivedConfig } from "@core/utils/field-config/archived.config";
import { buildAuditConfig } from "@core/utils/field-config/audit.config";
import { ID_SORTED_CONFIG } from "@core/utils/field-config/id-sorted.config";
import {
  CONTROL_TYPES,
  INPUT_TYPES,
  maxlength,
  minlength,
  required,
  StrictCrudItemOptions,
} from "@dwtechs/ngx-crud-builder";
import { Social } from "app/profiles/data-access/socials/social.model";

export const SOCIAL_COLUMNS: (
  acls: Acls | undefined,
) => StrictCrudItemOptions<Social>[] = (acls) =>
  withAclConditions(
    [
      ID_SORTED_CONFIG,
      {
        key: "name",
        label: "Name",
        controlType: CONTROL_TYPES.INPUT,
        type: INPUT_TYPES.TEXT,
        controlOptions: {
          validators: [required, minlength(1), maxlength(50)],
        },
      },
      {
        key: "url",
        label: "URL",
        controlType: CONTROL_TYPES.INPUT,
        type: INPUT_TYPES.TEXT,
        columnOptions: {
          defaultWidth: "300px",
        },
        controlOptions: {
          validators: [maxlength(255)],
        },
      },
      ...buildArchivedConfig(),
      ...buildAuditConfig(),
    ] as StrictCrudItemOptions<Social>[],
    acls,
  );
