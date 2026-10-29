import { TestBed } from "@angular/core/testing";
import { SchemaService } from "@core/schema/schema.service";
import { AclService } from "./acl.service";

describe("AclService", () => {
  let service: AclService;
  let schemaService: { get: ReturnType<typeof vi.fn> };

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

  it("is unresolved until ACLs are stored", () => {
    expect(service.areAclResolved()).toBe(false);
    expect(service.accessLevels()).toBeUndefined();
  });

  it("allows undefined functionality", () => {
    expect(service.hasAccess(undefined, "get")).toBe(true);
  });

  it("stores permissions and marks ACLs as resolved", () => {
    service.storeAccessLevels([{ route: 1, operations: [1], fields: [] }]);

    expect(service.areAclResolved()).toBe(true);
    expect(service.accessLevels()).toEqual({});
  });

  it("resets access levels", () => {
    service.storeAccessLevels([]);
    service.resetAccessLevels();

    expect(service.accessLevels()).toBeUndefined();
  });

  it("skips schema enrichment for undefined functionality", () => {
    service.storeAccessLevels([]);

    let done = false;
    service.enrichAclWithSchema(undefined).subscribe(() => {
      done = true;
    });

    expect(done).toBe(true);
    expect(schemaService.get).not.toHaveBeenCalled();
  });
});
