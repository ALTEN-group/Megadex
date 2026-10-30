import { ArchiveInfo } from "@dwtechs/ngx-crud-builder";

/**
 * Represents a social network of the catalog
 * Maps to the social entity in src/entities/social.js
 */
export interface Social extends ArchiveInfo {
  id: number | null;
  name: string;
  url: string | null;
}

/**
 * Creates a new Social entity with default values
 * @returns {Social} A new Social object with null/default values
 * @example
 * const newSocial = socialFactory();
 */
export const socialFactory = (): Social => ({
  id: null,
  name: "",
  url: null,
  ...new ArchiveInfo(),
});
