import { describe, expect, it } from "vitest";
import { normalizeBioHtmlForDisplay } from "../bio-html-display";

describe("normalizeBioHtmlForDisplay", () => {
  it("replaces empty paragraphs with a spacer div", () => {
    const html = "<p>First block.</p><p></p><p>Second block.</p>";
    const out = normalizeBioHtmlForDisplay(html);
    expect(out).toContain("bio-para-gap");
    expect(out).not.toMatch(/<p><\/p>/i);
    expect(out).toContain("First block.");
    expect(out).toContain("Second block.");
  });

  it("replaces TipTap-style br-only paragraphs", () => {
    const html = '<p>A</p><p><br class="ProseMirror-trailingBreak"></p><p>B</p>';
    const out = normalizeBioHtmlForDisplay(html);
    expect(out.match(/bio-para-gap/g)?.length).toBe(1);
    expect(out).toContain("A");
    expect(out).toContain("B");
  });

  it("does not strip content from normal paragraphs", () => {
    const html = "<p>Hello <strong>world</strong>.</p>";
    expect(normalizeBioHtmlForDisplay(html)).toBe(html);
  });

  it("returns original when blank", () => {
    expect(normalizeBioHtmlForDisplay("   ")).toBe("   ");
  });
});
