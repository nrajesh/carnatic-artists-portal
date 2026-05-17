import Link from "next/link";
import type { ReactNode } from "react";

export type MentionableArtist = {
  id: string;
  slug: string;
  fullName: string;
  tag: string;
};

function mentionRegex(): RegExp {
  return /(^|[^A-Za-z0-9_/-])@([a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?)(?=$|[^A-Za-z0-9_-])/g;
}

function targetMap(targets: MentionableArtist[]): Map<string, MentionableArtist> {
  return new Map(targets.map((target) => [target.slug.toLowerCase(), target]));
}

function mentionTitle(target: MentionableArtist): string {
  return `Mention ${target.fullName}`;
}

function linkClassName(extra?: string): string {
  return [
    "font-semibold text-amber-700 underline decoration-amber-300 underline-offset-2 hover:text-amber-900",
    extra,
  ]
    .filter(Boolean)
    .join(" ");
}

function linkApprovedMentionsInTextSegment(
  text: string,
  targetsBySlug: Map<string, MentionableArtist>,
): string {
  return text.replace(mentionRegex(), (match, prefix: string, rawSlug: string) => {
    const target = targetsBySlug.get(rawSlug.toLowerCase());
    if (!target) return match;
    const href = `/artists/${encodeURIComponent(target.slug)}`;
    return `${prefix}<a href="${href}" class="${linkClassName()}" title="${mentionTitle(target)}">@${target.slug}</a>`;
  });
}

/**
 * TipTap bio HTML is already trusted application content. This pass only links
 * approved @slug text nodes and deliberately skips markup and existing anchors.
 */
export function linkApprovedMentionsInHtml(
  html: string,
  mentionTargets: MentionableArtist[],
): string {
  if (!html || mentionTargets.length === 0 || !html.includes("@")) return html;
  const targetsBySlug = targetMap(mentionTargets);
  const parts = html.split(/(<[^>]+>)/g);
  let insideAnchor = false;

  return parts
    .map((part) => {
      if (part.startsWith("<")) {
        if (/^<a(?:\s|>)/i.test(part)) insideAnchor = true;
        if (/^<\/a\s*>/i.test(part)) insideAnchor = false;
        return part;
      }
      return insideAnchor ? part : linkApprovedMentionsInTextSegment(part, targetsBySlug);
    })
    .join("");
}

export function MentionedText({
  text,
  mentionTargets,
}: {
  text: string;
  mentionTargets: MentionableArtist[];
}) {
  if (!text.includes("@") || mentionTargets.length === 0) {
    return <>{text}</>;
  }

  const targetsBySlug = targetMap(mentionTargets);
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const mentions = mentionRegex();

  while ((match = mentions.exec(text)) !== null) {
    const [fullMatch, prefix, rawSlug] = match;
    const slugStart = match.index + prefix.length;
    const target = targetsBySlug.get(rawSlug.toLowerCase());
    if (!target) continue;

    if (slugStart > lastIndex) nodes.push(text.slice(lastIndex, slugStart));
    nodes.push(
      <Link
        key={`${slugStart}-${target.id}`}
        href={`/artists/${target.slug}`}
        className={linkClassName()}
        title={mentionTitle(target)}
      >
        @{target.slug}
      </Link>,
    );
    lastIndex = match.index + fullMatch.length;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return <>{nodes}</>;
}
