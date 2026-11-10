import {
  computed,
  Injectable,
  Injector,
  inject,
  runInInjectionContext,
} from "@angular/core";
import { DomSanitizer } from "@angular/platform-browser";
import { ActivatedRouteSnapshot } from "@angular/router";
import { AclService } from "@core/acl/acl.service";
import { ENTITY_API_PATHS } from "@core/app-config/app.api-paths";
import { AdminEntity } from "@core/app-config/app.entities";
import { Calls, CrudRepository } from "@dwtechs/ngx-crud-builder";
import { UserLookups } from "app/profiles/data-access/lookups/lookup.model";
import { Role } from "app/profiles/data-access/roles/role.model";
import { USER_COLUMNS } from "app/profiles/data-access/users/user.conf";
import { User, userFactory } from "app/profiles/data-access/users/user.model";

const usersEntity: AdminEntity = "users";

const NO_LOOKUPS: UserLookups = { countries: [], civilities: [], genders: [] };

/**
 * `birthdate` is a SQL DATE: send the picked calendar day (local) rather than a UTC
 * instant, which would shift it to the previous day east of UTC.
 */
export function toApiUser(item: User): User {
  const value = item.birthdate;
  if (!(value instanceof Date)) return item;
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    ...item,
    birthdate: `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`,
  };
}

/**
 * Service to manage user profiles
 */
@Injectable({
  providedIn: "root",
})
export class UsersService {
  private readonly aclsService = inject(AclService);
  private readonly injector = inject(Injector);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly acls = computed(() =>
    this.aclsService.getEntityAcls(usersEntity),
  );
  private readonly crud = new CrudRepository<User>().with({
    endpoint: ENTITY_API_PATHS[usersEntity],
  });

  public readonly httpCalls = computed<Calls<User>>(() => ({
    get: this.crud.get,
    create: (item) => this.crud.create(toApiUser(item)),
    update: (item) => this.crud.update(toApiUser(item)),
    archive: this.crud.archive,
    restore: this.acls()?.restore?.allowed ? this.crud.restore : undefined,
    getHistory: this.crud.getHistory,
  }));

  public readonly config = (payload: ActivatedRouteSnapshot) =>
    computed(() =>
      runInInjectionContext(this.injector, () =>
        USER_COLUMNS(
          this.acls(),
          (payload.data["lookups"] as UserLookups | undefined) ?? NO_LOOKUPS,
          (payload.data["roles"] as Role[] | undefined) ?? [],
          (payload.data["socials"] as string[] | undefined) ?? [],
          this.sanitizer,
        ),
      ),
    );
  public readonly entityFactory = userFactory;
}
