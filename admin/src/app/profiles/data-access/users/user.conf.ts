import { DomSanitizer } from "@angular/platform-browser";
import { Acls } from "@core/acl/acls.model";
import { withAclConditions } from "@core/utils/field-config/acl-conditions.utils";
import { buildArchivedConfig } from "@core/utils/field-config/archived.config";
import { buildAuditConfig } from "@core/utils/field-config/audit.config";
import { ID_SORTED_CONFIG } from "@core/utils/field-config/id-sorted.config";
import { toSelectItems } from "@core/utils/primeng/to-select-items";
import { buildColoredChipsCellRenderer } from "@core/utils/renderers/colored-chips.renderer";
import {
  CONTROL_TYPES,
  EmailValidator,
  INPUT_TYPES,
  maxlength,
  minlength,
  patternValidator,
  required,
  StrictCrudItemOptions,
} from "@dwtechs/ngx-crud-builder";
import { SelectItem } from "@openng/optimus-ui/api";
import {
  Lookup,
  UserLookups,
} from "app/profiles/data-access/lookups/lookup.model";
import { Role } from "app/profiles/data-access/roles/role.model";
import { User } from "app/profiles/data-access/users/user.model";

// Languages offered by the form (the `language` domain in db/liquibase/megadex/versions/03-struct/02-enum.sql
// accepts any ISO 639-1 code).
const LANGUAGES: SelectItem[] = [
  { label: "Arabic", value: "ar" },
  { label: "Chinese", value: "zh" },
  { label: "Dutch", value: "nl" },
  { label: "English", value: "en" },
  { label: "French", value: "fr" },
  { label: "German", value: "de" },
  { label: "Italian", value: "it" },
  { label: "Japanese", value: "ja" },
  { label: "Portuguese", value: "pt" },
  { label: "Spanish", value: "es" },
];

const formatSocials = (value: unknown): string =>
  Object.entries((value ?? {}) as Record<string, unknown>)
    .filter(([, handle]) => handle)
    .map(([name, handle]) => `${name}: ${handle}`)
    .join(", ");

const toLookupItems = (items: Lookup[]): SelectItem[] =>
  items
    .map((item) => ({ label: item.trans, value: item.code }))
    .toSorted((a, b) => a.label.localeCompare(b.label));

const httpUrlValidator = patternValidator({
  pattern: /^https?:\/\/.+/,
  message: "URL must start with http:// or https://",
});

const text = (
  key: keyof User,
  label: string,
  max: number,
  extra: Partial<StrictCrudItemOptions<User>> = {},
): StrictCrudItemOptions<User> =>
  ({
    key,
    label,
    controlType: CONTROL_TYPES.INPUT,
    type: INPUT_TYPES.TEXT,
    ...extra,
    controlOptions: {
      ...extra.controlOptions,
      validators: [...(extra.controlOptions?.validators ?? []), maxlength(max)],
    },
  }) as StrictCrudItemOptions<User>;

export const USER_COLUMNS: (
  acls: Acls | undefined,
  lookups: UserLookups,
  roles: Role[],
  socials: string[],
  sanitizer: DomSanitizer,
) => StrictCrudItemOptions<User>[] = (
  acls,
  lookups,
  roles,
  socials,
  sanitizer,
) =>
  withAclConditions(
    [
      ID_SORTED_CONFIG,
      {
        key: "civility",
        label: "Civility",
        controlType: CONTROL_TYPES.SELECT,
        options: toLookupItems(lookups.civilities),
        columnOptions: { defaultWidth: "90px" },
        controlOptions: {},
      },
      text("firstName", "First name", 50, {
        controlOptions: { validators: [required, minlength(1)] },
      }),
      text("middleName", "Middle name", 50, {
        columnOptions: { isSoftHidden: true },
      }),
      text("lastName", "Last name", 50, {
        controlOptions: { validators: [required, minlength(1)] },
      }),
      text("nickname", "Nickname", 30, {
        controlOptions: { validators: [required, minlength(1)] },
      }),
      text("email", "Email", 50, {
        columnOptions: { defaultWidth: "250px" },
        controlOptions: { validators: [required, EmailValidator] },
      }),
      text("backupEmail", "Backup email", 50, {
        columnOptions: { isSoftHidden: true },
        controlOptions: { validators: [EmailValidator] },
      }),
      {
        key: "gender",
        label: "Gender",
        controlType: CONTROL_TYPES.SELECT,
        options: toLookupItems(lookups.genders),
        columnOptions: { isSoftHidden: true },
        controlOptions: {},
      },
      {
        key: "birthdate",
        label: "Birthdate",
        controlType: CONTROL_TYPES.DATE,
        columnOptions: { isSoftHidden: true },
        controlOptions: {},
      },
      text("phone", "Phone", 20),
      text("address", "Address", 100, {
        columnOptions: { isSoftHidden: true },
      }),
      text("zipCode", "Zip code", 10, {
        columnOptions: { isSoftHidden: true },
      }),
      text("city", "City", 50),
      {
        key: "country",
        label: "Country",
        controlType: CONTROL_TYPES.SELECT,
        options: toLookupItems(lookups.countries),
        controlOptions: { filter: true },
      },
      {
        key: "nationality",
        label: "Nationality",
        controlType: CONTROL_TYPES.SELECT,
        options: toLookupItems(lookups.countries),
        columnOptions: { isSoftHidden: true },
        controlOptions: { filter: true },
      },
      {
        key: "language",
        label: "Language",
        controlType: CONTROL_TYPES.SELECT,
        options: LANGUAGES,
        columnOptions: { defaultWidth: "100px" },
        controlOptions: { validators: [required] },
      },
      text("job", "Job", 100, { columnOptions: { isSoftHidden: true } }),
      text("company", "Company", 50, { columnOptions: { isSoftHidden: true } }),
      text("portrait", "Portrait URL", 255, {
        columnOptions: { isSoftHidden: true },
        controlOptions: { validators: [httpUrlValidator] },
      }),
      text("website", "Website", 255, {
        columnOptions: { isSoftHidden: true },
        controlOptions: { validators: [httpUrlValidator] },
      }),
      {
        key: "socialsJsonAgg",
        label: "Social networks",
        controlType: CONTROL_TYPES.GROUP,
        columnOptions: {
          isSoftHidden: true,
          sortable: false,
          filterable: false,
          ignoreOnExport: true,
          customCellRenderer: formatSocials,
        },
        controlOptions: {},
        // One handle input per active network of the catalog (Megadex socials).
        children: socials.map((name) => ({
          key: name,
          label: name,
          controlType: CONTROL_TYPES.INPUT,
          type: INPUT_TYPES.TEXT,
          controlOptions: { validators: [maxlength(255)] },
        })),
      },
      {
        key: "gdprConsentedAt",
        label: "GDPR consent",
        controlType: CONTROL_TYPES.DATE,
        columnOptions: { isSoftHidden: true },
        controlOptions: { dateShowTime: true },
      },
      {
        key: "marketingConsentedAt",
        label: "Marketing consent",
        controlType: CONTROL_TYPES.DATE,
        columnOptions: { isSoftHidden: true },
        controlOptions: { dateShowTime: true },
      },
      {
        key: "roles",
        label: "Roles",
        controlType: CONTROL_TYPES.MULTISELECT,
        options: toSelectItems(roles, "name"),
        columnOptions: {
          sortable: false,
          filterable: false,
          headerTooltip: "Gatelin roles granted to this user.",
          customCellRenderer: buildColoredChipsCellRenderer(
            sanitizer,
            (value: unknown) => {
              const role = roles.find((r) => r.id === Number(value));
              return role
                ? { label: role.name, color: role.color || null }
                : undefined;
            },
          ),
        },
        controlOptions: {
          width: "100%",
          validators: [required],
        },
      },
      {
        key: "active",
        label: "Active",
        controlType: CONTROL_TYPES.CHECKBOX,
        columnOptions: {
          defaultWidth: "60px",
          headerTooltip: "Only active users can log in.",
        },
        controlOptions: {},
      },
      ...buildArchivedConfig(),
      ...buildAuditConfig(),
    ] as StrictCrudItemOptions<User>[],
    acls,
  );
