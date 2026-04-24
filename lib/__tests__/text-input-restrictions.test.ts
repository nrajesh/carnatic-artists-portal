import { describe, it, expect } from "vitest";
import {
  contactNumberHadDisallowedInput,
  contactNumberTooManyDigits,
  emailFieldHadDisallowedInput,
  personNameHadDisallowedInput,
  slugLiveHadDisallowedInput,
  urlFragmentHadDisallowedInput,
} from "../text-input-restrictions";

describe("text-input-restrictions", () => {
  it("detects invalid contact characters", () => {
    expect(contactNumberHadDisallowedInput("")).toBe(false);
    expect(contactNumberHadDisallowedInput("+316")).toBe(false);
    expect(contactNumberHadDisallowedInput("+31 6")).toBe(true);
    expect(contactNumberHadDisallowedInput("abc")).toBe(true);
    expect(contactNumberTooManyDigits("1".repeat(16))).toBe(true);
    expect(contactNumberTooManyDigits("1".repeat(15))).toBe(false);
  });

  it("detects invalid name characters", () => {
    expect(personNameHadDisallowedInput("José O'Neil")).toBe(false);
    expect(personNameHadDisallowedInput("A<script>")).toBe(true);
  });

  it("detects invalid email field characters", () => {
    expect(emailFieldHadDisallowedInput("a@b.co")).toBe(false);
    expect(emailFieldHadDisallowedInput("a @b.co")).toBe(true);
  });

  it("detects invalid slug characters", () => {
    expect(slugLiveHadDisallowedInput("my-slug")).toBe(false);
    expect(slugLiveHadDisallowedInput("bad@slug")).toBe(true);
  });

  it("detects invalid URL fragment characters", () => {
    expect(urlFragmentHadDisallowedInput("example.com/a")).toBe(false);
    expect(urlFragmentHadDisallowedInput("ex ample")).toBe(true);
  });
});
