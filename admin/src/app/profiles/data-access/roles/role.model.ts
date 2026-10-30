/**
 * A Gatelin role, as listed by Gatelin's roles search route.
 * Roles live in Gatelin: Megadex only stores their ids on a user (`roles`).
 */
export interface Role {
  id: number;
  name: string;
  color?: string | null;
  archived?: boolean;
}
