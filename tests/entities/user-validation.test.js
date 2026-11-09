// @ts-check
import { httpUrlValidator, property } from "../../src/entities/property.js";
import socialEnt from "../../src/entities/social.js";
import userEnt from "../../src/entities/user.js";

describe("entity property normalizers and validators", () => {
  it("validates http and https URLs and rejects non-http schemes", () => {
    const check = httpUrlValidator(255);
    expect(check("")).toBe(true);
    expect(check("https://dwtechs.github.io/Megadex")).toBe(true);
    expect(check("http://localhost:3000/avatar.png")).toBe(true);
    expect(check("javascript:alert(1)")).toBe(false);
    expect(check("ftp://example.com/file")).toBe(false);
    expect(check("not a url")).toBe(false);
  });

  it("lowercases email and backupEmail on user entity", () => {
    const emailProp = userEnt.properties.find((p) => p.key === "email");
    const backupProp = userEnt.properties.find((p) => p.key === "backupEmail");
    expect(emailProp.normalizer("Ada.Lovelace@Example.COM")).toBe(
      "ada.lovelace@example.com",
    );
    expect(backupProp.normalizer("Backup@Example.COM")).toBe(
      "backup@example.com",
    );
  });

  it("converts boolean true or ISO string to Date on date properties", () => {
    const dateProp = property("gdprConsentedAt", "date", ["INSERT"]);
    expect(dateProp.normalizer(true)).toBeInstanceOf(Date);
    expect(dateProp.normalizer("2026-01-01T00:00:00.000Z")).toBeInstanceOf(
      Date,
    );
  });

  it("validates user domain fields (gender, civility, country, nationality, language, socialsJsonAgg)", () => {
    const byKey = Object.fromEntries(userEnt.properties.map((p) => [p.key, p]));

    expect(byKey.gender.validator("F")).toBe(true);
    expect(byKey.gender.validator("X")).toBe(false);

    expect(byKey.civility.validator("Mrs.")).toBe(true);
    expect(byKey.civility.validator("SIR")).toBe(false);

    expect(byKey.country.validator("FRA")).toBe(true);
    expect(byKey.country.validator("fr")).toBe(false);

    expect(byKey.nationality.validator("GBR")).toBe(true);
    expect(byKey.nationality.validator("UK")).toBe(false);

    expect(byKey.language.validator("en")).toBe(true);
    expect(byKey.language.validator("EN")).toBe(false);

    expect(
      byKey.socialsJsonAgg.validator(
        JSON.stringify({ GitHub: "octocat", LinkedIn: null }),
      ),
    ).toBe(true);
    expect(byKey.socialsJsonAgg.validator(JSON.stringify(["not-an-obj"]))).toBe(
      false,
    );
    expect(
      byKey.socialsJsonAgg.validator(JSON.stringify({ GitHub: 12345 })),
    ).toBe(false);
  });

  it("validates social.url with httpUrlValidator", () => {
    const urlProp = socialEnt.properties.find((p) => p.key === "url");
    expect(urlProp.validator("https://github.com")).toBe(true);
    expect(urlProp.validator("javascript:void(0)")).toBe(false);
  });
});
