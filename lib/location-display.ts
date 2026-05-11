export function normalizeLocationLabel(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const [primary] = trimmed.split(",");
  return primary?.trim() ?? trimmed;
}
