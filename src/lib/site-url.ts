const fallbackSiteUrl = "https://frankshamida.vercel.app";

export function getSiteUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ??
    process.env.VERCEL_URL?.trim();

  if (!configuredUrl) {
    return fallbackSiteUrl;
  }

  if (
    configuredUrl.startsWith("http://") ||
    configuredUrl.startsWith("https://")
  ) {
    return configuredUrl;
  }

  return `https://${configuredUrl}`;
}
