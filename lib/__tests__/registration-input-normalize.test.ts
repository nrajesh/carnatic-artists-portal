import { describe, it, expect } from "vitest";
import {
  mergeInstagramUrl,
  mergeLinkedinUrl,
  mergeWebsitePath,
  instagramSuffixFromStored,
  linkedinSuffixFromStored,
  sanitizeContactNumberInput,
  isPlausibleContactNumber,
} from "../registration-input-normalize";

describe("registration-input-normalize", () => {
  it("sanitizes contact number to digits and optional leading +", () => {
    expect(sanitizeContactNumberInput("+31 abc 612345678")).toBe("+31612345678");
    expect(sanitizeContactNumberInput("31 6 12")).toBe("31612");
    expect(isPlausibleContactNumber("+31612345678")).toBe(true);
    expect(isPlausibleContactNumber("0612345678")).toBe(true);
    expect(isPlausibleContactNumber("+")).toBe(false);
    expect(isPlausibleContactNumber("12345")).toBe(false);
  });

  it("merges LinkedIn handle to canonical URL", () => {
    expect(mergeLinkedinUrl("")).toBe("");
    expect(mergeLinkedinUrl("jane-doe")).toBe("https://www.linkedin.com/in/jane-doe");
    expect(mergeLinkedinUrl("https://linkedin.com/in/existing")).toBe(
      "https://linkedin.com/in/existing",
    );
  });

  it("round-trips LinkedIn suffix", () => {
    const full = mergeLinkedinUrl("some-one");
    expect(linkedinSuffixFromStored(full)).toBe("some-one");
  });

  it("merges Instagram handle", () => {
    expect(mergeInstagramUrl("myhandle")).toBe("https://www.instagram.com/myhandle");
    expect(instagramSuffixFromStored("https://instagram.com/other/")).toBe("other");
  });

  it("merges website path with https", () => {
    expect(mergeWebsitePath("example.com/a")).toBe("https://example.com/a");
    expect(mergeWebsitePath("")).toBe("");
  });
});
