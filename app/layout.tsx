import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { fontDisplay, fontSans } from "./fonts";
import { PostHogProvider } from "@/components/posthog-provider";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { DevAdminBadge } from "@/components/dev-admin-badge";
import { PrivacyNoticeBanner } from "@/components/privacy-notice-banner";
import { formatDeploymentDateTime } from "@/lib/format-deployment-datetime";
import { getArtistFullNameById } from "@/lib/queries/artists";
import { verifySession } from "@/lib/session-jwt";

export const metadata: Metadata = {
  title: "Artist Discovery Portal",
  description: "Discover artists and portfolios based in The Netherlands",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const sessionCookie = (await cookies()).get("session")?.value ?? null;
  const session = sessionCookie ? await verifySession(sessionCookie) : null;
  const sessionDisplayName = session ? await getArtistFullNameById(session.artistId) : null;

  const sessionBannerLabel =
    session &&
    (sessionDisplayName
      ? session.role === "admin"
        ? `${sessionDisplayName} (admin)`
        : sessionDisplayName
      : session.role);

  return (
    <html lang="en" className={`${fontSans.variable} ${fontDisplay.variable}`}>
      <body className="flex min-h-screen flex-col font-sans antialiased text-stone-900">
        <SiteHeader />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <PostHogProvider>{children}</PostHogProvider>
        </div>
        {session && (
          <div className="border-t border-amber-200/80 bg-amber-50/60 px-4 py-2 text-center text-xs text-stone-500">
            Logged in as {sessionBannerLabel} · Session expires{" "}
            {formatDeploymentDateTime(session.expiresAt)}
          </div>
        )}
        <SiteFooter />
        <PrivacyNoticeBanner />
        <DevAdminBadge />
      </body>
    </html>
  );
}
