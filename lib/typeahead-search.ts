export type RankedTypeaheadMatch<T> = {
  item: T;
  matchIndex: number;
  matchLength: number;
  wordStart: boolean;
};

function isWordBoundaryChar(char: string | undefined): boolean {
  if (!char) return true;
  return /[\s/\\-]/.test(char);
}

function findWordStartMatchIndex(labelLower: string, queryLower: string): number {
  let fromIndex = 0;
  while (fromIndex < labelLower.length) {
    const matchIndex = labelLower.indexOf(queryLower, fromIndex);
    if (matchIndex === -1) return -1;
    if (isWordBoundaryChar(labelLower[matchIndex - 1])) {
      return matchIndex;
    }
    fromIndex = matchIndex + 1;
  }
  return -1;
}

export function rankTypeaheadMatches<T>(
  items: T[],
  getLabel: (item: T) => string,
  query: string,
): RankedTypeaheadMatch<T>[] {
  const queryLower = query.trim().toLowerCase();
  if (!queryLower) {
    return items.map((item) => ({
      item,
      matchIndex: -1,
      matchLength: 0,
      wordStart: false,
    }));
  }

  return items
    .map((item) => {
      const label = getLabel(item);
      const labelLower = label.toLowerCase();
      const containsIndex = labelLower.indexOf(queryLower);
      if (containsIndex === -1) return null;

      const wordStartIndex = findWordStartMatchIndex(labelLower, queryLower);
      return {
        item,
        matchIndex: wordStartIndex >= 0 ? wordStartIndex : containsIndex,
        matchLength: queryLower.length,
        wordStart: wordStartIndex >= 0,
      };
    })
    .filter((match): match is RankedTypeaheadMatch<T> => match !== null)
    .sort((left, right) => {
      if (left.wordStart !== right.wordStart) return left.wordStart ? -1 : 1;
      if (left.matchIndex !== right.matchIndex) return left.matchIndex - right.matchIndex;
      return getLabel(left.item).localeCompare(getLabel(right.item));
    });
}

export function splitTypeaheadHighlight(label: string, query: string) {
  const queryTrimmed = query.trim();
  if (!queryTrimmed) return null;

  const matchIndex = label.toLowerCase().indexOf(queryTrimmed.toLowerCase());
  if (matchIndex === -1) return null;

  return {
    before: label.slice(0, matchIndex),
    match: label.slice(matchIndex, matchIndex + queryTrimmed.length),
    after: label.slice(matchIndex + queryTrimmed.length),
  };
}
