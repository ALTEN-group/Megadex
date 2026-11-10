import { socialFactory } from "./social.model";

describe("socialFactory", () => {
  it("creates a social network with default values", () => {
    const social = socialFactory();

    expect(social.id).toBeNull();
    expect(social.name).toBe("");
    expect(social.url).toBeNull();
    expect(social.archived).toBe(false);
    expect(social.archivedAt).toBeNull();
  });
});
