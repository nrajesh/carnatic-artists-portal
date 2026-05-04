export type DeploymentDisplayConfig = {
  name: string;
  countryCode: string;
  countryName: string;
  primaryLocale: string;
};

export function getCountryDisplayName(regionCode: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale, "en"], { type: "region" }).of(regionCode) ?? regionCode;
  } catch {
    return regionCode;
  }
}

export function getDeploymentDisplayConfig(): DeploymentDisplayConfig {
  const name =
    process.env.NEXT_PUBLIC_DEPLOYMENT_NAME?.trim() ||
    process.env.DEPLOYMENT_NAME?.trim() ||
    "Artist Portal";
  const countryCode =
    process.env.NEXT_PUBLIC_DEPLOYMENT_REGION?.trim() ||
    process.env.DEPLOYMENT_REGION?.trim() ||
    "";
  const primaryLocale =
    process.env.NEXT_PUBLIC_DEPLOYMENT_LOCALE_PRIMARY?.trim() ||
    process.env.DEPLOYMENT_LOCALE_PRIMARY?.trim() ||
    "en";

  return {
    name,
    countryCode,
    countryName: getCountryDisplayName(countryCode, primaryLocale),
    primaryLocale,
  };
}
