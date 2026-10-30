import { ArchiveInfo } from "@dwtechs/ngx-crud-builder";

/**
 * Represents a user profile
 * Maps to the users entity in src/entities/user.js
 */
export interface User extends ArchiveInfo {
  id: number | null;
  gender: string | null;
  civility: string | null;
  firstName: string;
  middleName: string | null;
  lastName: string;
  nickname: string;
  email: string;
  backupEmail: string | null;
  address: string | null;
  zipCode: string | null;
  city: string | null;
  country: string | null;
  nationality: string | null;
  phone: string | null;
  birthdate: Date | string | null;
  portrait: string | null;
  language: string;
  job: string | null;
  company: string | null;
  website: string | null;
  /** Handles keyed by social network name (catalog served by Megadex socials) */
  socialsJsonAgg: Record<string, string | null>;
  gdprConsentedAt: Date | string | null;
  marketingConsentedAt: Date | string | null;
  active: boolean;
  /** Gatelin role ids */
  roles: number[];
}

/**
 * Creates a new User entity with default values
 * @returns {User} A new User object with null/default values
 * @example
 * const newUser = userFactory();
 */
export const userFactory = (): User => ({
  id: null,
  gender: null,
  civility: null,
  firstName: "",
  middleName: null,
  lastName: "",
  nickname: "",
  email: "",
  backupEmail: null,
  address: null,
  zipCode: null,
  city: null,
  country: null,
  nationality: null,
  phone: null,
  birthdate: null,
  portrait: null,
  language: "en",
  job: null,
  company: null,
  website: null,
  socialsJsonAgg: {},
  gdprConsentedAt: null,
  marketingConsentedAt: null,
  active: false,
  roles: [],
  ...new ArchiveInfo(),
});
