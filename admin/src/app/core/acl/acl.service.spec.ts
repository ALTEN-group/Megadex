import { TestBed } from "@angular/core/testing";
import { Permission } from "@core/auth/auth.dto";
import { SchemaService } from "@core/schema/schema.service";
import { of, throwError } from "rxjs";
import { AclService } from "./acl.service";

describe("AclService", () => {
  let service: AclService;
  let schemaService: { get: ReturnType<typeof vi.fn> };

  const permissions: Permission[] = [
    { route: 92, operations: [1], fields: [] }, // socials.get
    { route: 84, operations: [1], fields: ["email"] }, // users.create
    { route: 85, operations: [1], fields: ["city"] }, // users.update
  ];

  beforeEach(() => {
    schemaService = { get: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        AclService,
        { provide: SchemaService, useValue: schemaService },
      ],
    });

    service = TestBed.inject(AclService);
  });

  it("denies access until ACLs are stored", () => {
    expect(service.hasAccess("socials", "get")).toBe(false);
    expect(service.areAclResolved()).toBe(false);
  });

  it("allows undefined functionality", () => {
    expect(service.hasAccess(undefined, "get")).toBe(true);
  });

  it("stores permissions and resolves access checks", () => {
    service.storeAccessLevels(permissions);

    expect(service.areAclResolved()).toBe(true);
    expect(service.hasAccess("socials", "get")).toBe(true);
    expect(service.hasAccess("socials", "create")).toBe(false);
    expect(service.hasAccess("users", "create")).toBe(true);
    expect(service.hasAccess("users", undefined)).toBe(false);
    expect(service.getEntityAcls("users")?.create?.fields).toEqual(["email"]);
  });

  it("resets access levels", () => {
    service.storeAccessLevels(permissions);
    service.resetAccessLevels();

    expect(service.accessLevels()).toBeUndefined();
    expect(service.hasAccess("socials", "get")).toBe(false);
  });

  it("updates fields for a mapped route id", () => {
    service.storeAccessLevels(permissions);
    service.updateFieldsForRoute(84, ["email", "phone"]);

    expect(service.getEntityAcls("users")?.create?.fields).toEqual([
      "email",
      "phone",
    ]);
  });

  it("enriches create/update fields from schema when permission fields are empty", () => {
    service.storeAccessLevels([
      { route: 84, operations: [], fields: [] },
      { route: 85, operations: [], fields: [] },
    ]);
    schemaService.get.mockReturnValue(
      of([
        { key: "email", operations: ["INSERT", "UPDATE"] },
        { key: "nickname", operations: ["INSERT"] },
        { key: "city", operations: ["UPDATE"] },
      ]),
    );

    let done = false;
    service.enrichAclWithSchema("users").subscribe(() => {
      done = true;
    });

    expect(done).toBe(true);
    expect(schemaService.get).toHaveBeenCalledWith("users");
    expect(service.getEntityAcls("users")?.create?.fields).toEqual([
      "email",
      "nickname",
    ]);
    expect(service.getEntityAcls("users")?.update?.fields).toEqual([
      "email",
      "city",
    ]);
  });

  it("keeps permission fields when they are non-empty", () => {
    service.storeAccessLevels(permissions);
    schemaService.get.mockReturnValue(
      of([{ key: "fromSchema", operations: ["INSERT", "UPDATE"] }]),
    );

    service.enrichAclWithSchema("users").subscribe();

    expect(service.getEntityAcls("users")?.create?.fields).toEqual(["email"]);
    expect(service.getEntityAcls("users")?.update?.fields).toEqual(["city"]);
  });

  it("swallows schema errors", () => {
    service.storeAccessLevels(permissions);
    schemaService.get.mockReturnValue(throwError(() => new Error("boom")));

    let completed = false;
    service.enrichAclWithSchema("users").subscribe({
      next: () => {
        completed = true;
      },
    });

    expect(completed).toBe(true);
  });
});
