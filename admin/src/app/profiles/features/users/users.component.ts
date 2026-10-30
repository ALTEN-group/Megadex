import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { TABLES } from "@core/app-config/app.tables";
import { TableComponent } from "@dwtechs/ngx-crud-builder";
import { UsersService } from "app/profiles/data-access/users/users.service";

/**
 * Component to display and manage user profiles
 */
@Component({
  selector: "adm-users",
  templateUrl: "./users.component.html",
  imports: [TableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersComponent {
  private readonly usersService = inject(UsersService);
  private readonly route = inject(ActivatedRoute);

  public readonly config = this.usersService.config(this.route.snapshot);

  public readonly entityFactory = this.usersService.entityFactory;

  public readonly httpCalls = this.usersService.httpCalls;

  public readonly tableInformation = TABLES.users;
}
