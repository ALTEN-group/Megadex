import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { TABLES } from "@core/app-config/app.tables";
import { TableComponent } from "@dwtechs/ngx-crud-builder";
import { SocialsService } from "app/profiles/data-access/socials/socials.service";

/**
 * Component to display and manage the social networks catalog
 */
@Component({
  selector: "adm-socials",
  templateUrl: "./socials.component.html",
  imports: [TableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SocialsComponent {
  private readonly socialsService = inject(SocialsService);

  public readonly config = this.socialsService.config;

  public readonly entityFactory = this.socialsService.entityFactory;

  public readonly httpCalls = this.socialsService.httpCalls;

  public readonly tableInformation = TABLES.socials;
}
