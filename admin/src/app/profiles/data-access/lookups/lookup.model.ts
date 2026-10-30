/**
 * A translated reference value served by Megadex lookups
 * (`country_trans`, `civility_trans`, `gender_trans`).
 */
export interface Lookup {
  code: string;
  lang: string;
  trans: string;
  abbr?: string;
  nationality?: string;
}

/** Lookup lists resolved for the users page, in the admin locale. */
export interface UserLookups {
  countries: Lookup[];
  civilities: Lookup[];
  genders: Lookup[];
}
