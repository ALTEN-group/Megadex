import { userFactory } from "./user.model";
import { toApiUser } from "./users.service";

describe("userFactory & toApiUser", () => {
  it("creates a user with default values", () => {
    const user = userFactory();

    expect(user.id).toBeNull();
    expect(user.firstName).toBe("");
    expect(user.lastName).toBe("");
    expect(user.nickname).toBe("");
    expect(user.email).toBe("");
    expect(user.language).toBe("en");
    expect(user.active).toBe(false);
    expect(user.roles).toEqual([]);
    expect(user.socialsJsonAgg).toEqual({});
    expect(user.gdprConsentedAt).toBeNull();
    expect(user.marketingConsentedAt).toBeNull();
    expect(user.archived).toBe(false);
  });

  it("returns fresh array and object references on each call", () => {
    const first = userFactory();
    const second = userFactory();

    first.roles.push(1);
    first.socialsJsonAgg["GitHub"] = "ada";

    expect(second.roles).toEqual([]);
    expect(second.socialsJsonAgg).toEqual({});
  });

  it("formats Date birthdates as YYYY-MM-DD in local time via toApiUser", () => {
    const user = {
      ...userFactory(),
      birthdate: new Date(2000, 0, 5, 14, 30, 0),
    };

    const payload = toApiUser(user);
    expect(payload.birthdate).toBe("2000-01-05");
  });

  it("leaves null or string birthdates untouched in toApiUser", () => {
    const withNull = userFactory();
    expect(toApiUser(withNull)).toBe(withNull);

    const withString = { ...userFactory(), birthdate: "1995-12-31" };
    expect(toApiUser(withString)).toBe(withString);
  });
});
