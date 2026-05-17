import { describe, expect, it } from "vitest";
import { linkApprovedMentionsInHtml, type MentionableArtist } from "../artist-mentions";

const lakshmi: MentionableArtist = {
  id: "artist-1",
  slug: "lakshmi-narayanan",
  fullName: "Lakshmi Narayanan",
  tag: "@lakshmi-narayanan",
};

describe("linkApprovedMentionsInHtml", () => {
  it("links approved artist @tags in text nodes", () => {
    const out = linkApprovedMentionsInHtml("<p>Working with @lakshmi-narayanan soon.</p>", [
      lakshmi,
    ]);

    expect(out).toContain('href="/artists/lakshmi-narayanan"');
    expect(out).toContain("@lakshmi-narayanan</a>");
  });

  it("leaves unapproved @tags as plain text", () => {
    const out = linkApprovedMentionsInHtml("<p>Hello @unknown-artist.</p>", [lakshmi]);
    expect(out).toBe("<p>Hello @unknown-artist.</p>");
  });

  it("does not rewrite existing anchors", () => {
    const html = '<p><a href="/x">@lakshmi-narayanan</a></p>';
    expect(linkApprovedMentionsInHtml(html, [lakshmi])).toBe(html);
  });
});
