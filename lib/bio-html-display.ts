/**
 * Rich-text editors (TipTap / ProseMirror) often insert empty paragraphs as “blank lines”.
 * True `<p></p>`, `<p><br></p>`, or whitespace-only `<p>` … `</p>` collapse to no visible height
 * because margins collapse and `:empty` does not match `<p><br></p>` or `<p> </p>`.
 *
 * Replace those patterns with a fixed spacer so paragraph breaks always read on the public site.
 */
export function normalizeBioHtmlForDisplay(html: string): string {
  const trimmed = html.trim();
  if (!trimmed) return html;

  const spacer = '<div class="bio-para-gap" aria-hidden="true"></div>';

  return (
    html
      // `<p><br></p>` / `<p><br class="ProseMirror-trailingBreak"></p>` (TipTap empty paragraph)
      .replace(/<p(?:\s[^>]*)?>\s*<br[^>]*>\s*<\/p>/gi, spacer)
      // `<p></p>` or `<p class="…"></p>` with only whitespace
      .replace(/<p(?:\s[^>]*)?>\s*<\/p>/gi, spacer)
  );
}
