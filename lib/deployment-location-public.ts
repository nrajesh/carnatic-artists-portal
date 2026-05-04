function parseStringArrayValue(raw: string | undefined): string[] {
  const trimmed = raw?.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!Array.isArray(parsed)) return [];
    return Array.from(
      new Set(
        parsed
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    );
  } catch {
    return [];
  }
}

export function getPublicDeploymentLocationInputConfig() {
  const areaLabelSingular =
    process.env.NEXT_PUBLIC_DEPLOYMENT_LOCATION_LABEL_SINGULAR?.trim() || "location";
  const areaLabelPlural =
    process.env.NEXT_PUBLIC_DEPLOYMENT_LOCATION_LABEL_PLURAL?.trim() || `${areaLabelSingular}s`;
  const areaOptions = parseStringArrayValue(process.env.NEXT_PUBLIC_DEPLOYMENT_LOCATION_OPTIONS);

  return {
    areaLabelSingular,
    areaLabelPlural,
    areaOptions,
  };
}
