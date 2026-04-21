import { describe, it, expect } from "vitest";
import { chooseKeeperForDuplicateColourGroup } from "@/lib/speciality-color-pair-dedupe";

describe("chooseKeeperForDuplicateColourGroup", () => {
  it("keeps the seeded palette row when it matches the duplicate pair", () => {
    const ghatam = {
      id: "1",
      name: "Ghatam",
      primaryColor: "#92400E",
      textColor: "#FFFFFF",
    };
    const guitar = {
      id: "2",
      name: "Carnatic Guitar",
      primaryColor: "#92400E",
      textColor: "#FFFFFF",
    };
    const { keeper, others } = chooseKeeperForDuplicateColourGroup([guitar, ghatam]);
    expect(keeper.name).toBe("Ghatam");
    expect(others).toHaveLength(1);
    expect(others[0]!.name).toBe("Carnatic Guitar");
  });

  it("when no palette match, keeps alphabetically first name", () => {
    const a = { id: "a", name: "Alpha Inst", primaryColor: "#112233", textColor: "#FFFFFF" };
    const b = { id: "b", name: "Beta Inst", primaryColor: "#112233", textColor: "#FFFFFF" };
    const { keeper, others } = chooseKeeperForDuplicateColourGroup([b, a]);
    expect(keeper.name).toBe("Alpha Inst");
    expect(others.map((x) => x.name).sort()).toEqual(["Beta Inst"]);
  });
});
