import type { MentionableArtist } from "./artist-mentions";
import { rankTypeaheadMatches } from "./typeahead-search";

export type ActiveMentionQuery = {
  from: number;
  to: number;
  query: string;
};

function isMentionBoundary(char: string | undefined): boolean {
  return !char || /\s|[([{"'`]/.test(char);
}

function mentionSearchLabel(target: MentionableArtist): string {
  return `${target.fullName} ${target.tag.slice(1)} ${target.slug.replace(/-/g, " ")}`;
}

export function findActiveMentionQuery(
  textBeforeCursor: string,
  cursorPos: number,
): ActiveMentionQuery | null {
  const atIndex = textBeforeCursor.lastIndexOf("@");
  if (atIndex === -1) return null;
  if (!isMentionBoundary(textBeforeCursor[atIndex - 1])) return null;

  const query = textBeforeCursor.slice(atIndex + 1);
  if (/[\n\r\t]/.test(query)) return null;
  if (query.startsWith(" ")) return null;
  if (/[!?,;:()[\]{}<>]/.test(query)) return null;

  return {
    from: cursorPos - (textBeforeCursor.length - atIndex),
    to: cursorPos,
    query,
  };
}

export function getMentionSuggestions(
  mentionTargets: MentionableArtist[],
  query: string,
  limit = 6,
): MentionableArtist[] {
  const cleanedQuery = query.trim().replace(/^@+/, "");
  const ranked = cleanedQuery
    ? rankTypeaheadMatches(mentionTargets, mentionSearchLabel, cleanedQuery)
    : mentionTargets
        .slice()
        .sort((left, right) => left.fullName.localeCompare(right.fullName))
        .map((item) => ({
          item,
          matchIndex: -1,
          matchLength: 0,
          wordStart: false,
        }));

  return ranked.slice(0, limit).map((match) => match.item);
}
