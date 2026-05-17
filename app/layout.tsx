import type { Metadata } from "next";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { fontDisplay, fontSans } from "./fonts";
import { PostHogProvider } from "@/components/posthog-provider";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { DevAdminBadge } from "@/components/dev-admin-badge";
import { PrivacyNoticeBanner } from "@/components/privacy-notice-banner";
import { getDeploymentDisplayConfig } from "@/lib/deployment-display";

const displayConfig = getDeploymentDisplayConfig();

export const metadata: Metadata = {
  title: displayConfig.name,
  description: `Discover artists and portfolios based in ${displayConfig.countryName}`,
  openGraph: {
    title: displayConfig.name,
    description: `Discover artists and portfolios based in ${displayConfig.countryName}`,
    images: [
      { url: "/assets/social-share-logo.png", width: 1024, height: 1024, alt: displayConfig.name },
    ],
  },
  twitter: {
    card: "summary",
    title: displayConfig.name,
    description: `Discover artists and portfolios based in ${displayConfig.countryName}`,
    images: ["/assets/social-share-logo.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/assets/favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/assets/favicon-16.png", type: "image/png", sizes: "16x16" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/assets/apple-touch-icon.png", type: "image/png", sizes: "180x180" }],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang={displayConfig.primaryLocale}
      className={`${fontSans.variable} ${fontDisplay.variable}`}
      suppressHydrationWarning
    >
      <body className="flex min-h-screen flex-col bg-amber-50 font-sans antialiased text-stone-900" suppressHydrationWarning>
        <SiteHeader />
        <div aria-hidden="true" className="h-[92px] shrink-0 sm:h-[104px]" />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-amber-50">
          <PostHogProvider>{children}</PostHogProvider>
        </div>
        <SiteFooter />
        <PrivacyNoticeBanner />
        <DevAdminBadge />
      </body>
    </html>
  );
}
