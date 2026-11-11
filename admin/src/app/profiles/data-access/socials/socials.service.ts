import {
  computed,
  Injectable,
  Injector,
  inject,
  runInInjectionContext,
} from "@angular/core";
import { AclService } from "@core/acl/acl.service";
import { ENTITY_API_PATHS } from "@core/app-config/app.api-paths";
import { AdminEntity } from "@core/app-config/app.entities";
import { Calls, CrudRepository, filterCalls } from "@dwtechs/ngx-crud-builder";
import { SOCIAL_COLUMNS } from "app/profiles/data-access/socials/social.conf";
import {
  Social,
  socialFactory,
} from "app/profiles/data-access/socials/social.model";
import { SocialsCatalogService } from "app/profiles/data-access/socials/socials-catalog.service";
import { tap } from "rxjs";

const socialsEntity: AdminEntity = "socials";

/**
 * Service to manage the social networks catalog
 */
@Injectable({
  providedIn: "root",
})
export class SocialsService {
  private readonly aclsService = inject(AclService);
  private readonly socialsCatalog = inject(SocialsCatalogService);
  private readonly injector = inject(Injector);
  private readonly acls = computed(() =>
    this.aclsService.getEntityAcls(socialsEntity),
  );
  private readonly crud = new CrudRepository<Social>().with({
    endpoint: ENTITY_API_PATHS[socialsEntity],
  });

  public readonly httpCalls = computed<Calls<Social>>(() =>
    filterCalls(
      {
        get: this.crud.get,
        create: (item) =>
          this.crud
            .create(item)
            .pipe(tap(() => this.socialsCatalog.invalidate())),
        update: (item) =>
          this.crud
            .update(item)
            .pipe(tap(() => this.socialsCatalog.invalidate())),
        archive: (ids) =>
          this.crud
            .archive(ids)
            .pipe(tap(() => this.socialsCatalog.invalidate())),
        restore: (ids) =>
          this.crud
            .restore(ids)
            .pipe(tap(() => this.socialsCatalog.invalidate())),
        getHistory: this.crud.getHistory,
      },
      {
        canCreate: this.acls()?.create?.allowed === true,
        canUpdate: this.acls()?.update?.allowed === true,
        canArchive: this.acls()?.archive?.allowed === true,
        canRestore: this.acls()?.restore?.allowed === true,
      },
    ),
  );

  public readonly config = computed(() =>
    runInInjectionContext(this.injector, () => SOCIAL_COLUMNS(this.acls())),
  );
  public readonly entityFactory = socialFactory;
}
