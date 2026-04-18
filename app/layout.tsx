import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { PostHogProvider } from "@/components/posthog-provider";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { DevAdminBadge } from "@/components/dev-admin-badge";
import { formatDeploymentDateTime } from "@/lib/format-deployment-datetime";
import { verifySession } from "@/lib/session-jwt";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Carnatic Artist Portal",
  description: "A portal for Carnatic musicians based in The Netherlands",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const sessionCookie = (await cookies()).get("session")?.value ?? null;
  const session = sessionCookie ? await verifySession(sessionCookie) : null;

  return (
    <html lang="en">
      <body className={`${inter.className} flex min-h-screen flex-col`}>
        <SiteHeader />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <PostHogProvider>{children}</PostHogProvider>
        </div>
        {session && (
          <div className="border-t border-amber-200/80 bg-amber-50/60 px-4 py-2 text-center text-xs text-stone-500">
            Logged in as {session.role} · Session expires {formatDeploymentDateTime(session.expiresAt)}
          </div>
        )}
        <SiteFooter />
        <DevAdminBadge />
      </body>
    </html>
  );
}
