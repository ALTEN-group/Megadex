import {
  computed,
  inject,
  Injectable,
  Injector,
  runInInjectionContext,
} from "@angular/core";
import { AclService } from "@core/acl/acl.service";
import { ENTITY_API_PATHS } from "@core/app-config/app.api-paths";
import { AdminEntity } from "@core/app-config/app.entities";
import { Calls, CrudRepository } from "@dwtechs/ngx-crud-builder";
import { SOCIAL_COLUMNS } from "app/profiles/data-access/socials/social.conf";
import {
  Social,
  socialFactory,
} from "app/profiles/data-access/socials/social.model";

const socialsEntity: AdminEntity = "socials";

/**
 * Service to manage the social networks catalog
 */
@Injectable({
  providedIn: "root",
})
export class SocialsService {
  private readonly aclsService = inject(AclService);
  private readonly injector = inject(Injector);
  private readonly acls = computed(() =>
    this.aclsService.getEntityAcls(socialsEntity),
  );
  private readonly crud = new CrudRepository<Social>().with({
    endpoint: ENTITY_API_PATHS[socialsEntity],
  });

  public readonly httpCalls: Calls<Social> = {
    get: this.crud.get,
    create: this.crud.create,
    update: this.crud.update,
    archive: this.crud.archive,
    getHistory: this.crud.getHistory,
  };

  public readonly config = computed(() =>
    runInInjectionContext(this.injector, () => SOCIAL_COLUMNS(this.acls())),
  );
  public readonly entityFactory = socialFactory;
}
