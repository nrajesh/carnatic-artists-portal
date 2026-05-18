import { describe, expect, it } from "vitest";
import type { MentionableArtist } from "../artist-mentions";
import { findActiveMentionQuery, getMentionSuggestions } from "../bio-mention-typeahead";

const lakshmi: MentionableArtist = {
  id: "artist-1",
  slug: "lakshmi-narayanan",
  fullName: "Lakshmi Narayanan",
  tag: "@lakshmi-narayanan",
};

const ravi: MentionableArtist = {
  id: "artist-2",
  slug: "ravi-krishnamurthy",
  fullName: "Ravi Krishnamurthy",
  tag: "@ravi-krishnamurthy",
};

describe("findActiveMentionQuery", () => {
  it("finds an active mention at the cursor", () => {
    expect(findActiveMentionQuery("Working with @ravi", 18)).toEqual({
      from: 13,
      to: 18,
      query: "ravi",
    });
  });

  it("allows typing part of a full name", () => {
    expect(findActiveMentionQuery("With @Ravi Kri", 14)).toEqual({
      from: 5,
      to: 14,
      query: "Ravi Kri",
    });
  });

  it("opens on a bare at-sign", () => {
    expect(findActiveMentionQuery("With @", 6)).toEqual({
      from: 5,
      to: 6,
      query: "",
    });
  });

  it("ignores email-style at-signs", () => {
    expect(findActiveMentionQuery("email me at hello@example.com", 29)).toBeNull();
  });
});

describe("getMentionSuggestions", () => {
  it("matches by full name fragments", () => {
    expect(getMentionSuggestions([lakshmi, ravi], "Ravi Kri")).toEqual([ravi]);
  });

  it("matches by tag text", () => {
    expect(getMentionSuggestions([lakshmi, ravi], "lakshmi-n")).toEqual([lakshmi]);
  });
});
