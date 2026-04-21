import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { HardNavAnchor } from "@/components/hard-nav-anchor";

export const metadata: Metadata = {
  title: "Error simulator (dev)",
};

const probe404Path = "/_dev_error_simulator_404_probe";

const VERIFY_CODES = ["missing", "invalid", "expired", "used", "unexpected"] as const;

function Card({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-amber-200 bg-white p-6 shadow-sm">
      <h2 className="font-display text-lg font-semibold tracking-tight text-stone-900">{title}</h2>
      <p className="mt-2 text-sm text-stone-600">{description}</p>
      <div className="mt-4 flex flex-wrap gap-2">{children}</div>
    </section>
  );
}

function Btn({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <HardNavAnchor
      href={href}
      className="inline-flex min-h-[40px] items-center justify-center rounded-lg bg-amber-700 px-3 py-2 text-center text-xs font-semibold text-white hover:bg-amber-800 sm:text-sm"
    >
      {children}
    </HardNavAnchor>
  );
}

function SubtleLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-center text-xs font-semibold text-amber-900 hover:border-amber-400 hover:bg-amber-50 sm:text-sm"
    >
      {children}
    </Link>
  );
}

export default function DevErrorSimulatorPage() {
  return (
    <main className="min-h-screen bg-amber-50 px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <p className="mb-2 text-sm text-amber-800">
          <Link href="/" className="font-medium underline-offset-2 hover:underline">
            ← Home
          </Link>
        </p>
        <h1 className="mb-2 font-display text-3xl font-bold tracking-tight text-stone-900">Error simulator</h1>
        <p className="mb-10 max-w-2xl text-sm text-stone-600">
          Development-only shortcuts to every error and status experience we ship: React boundaries, Next.js
          not-found, dedicated status pages, and auth edge cases. Use{" "}
          <strong className="font-medium text-stone-800">full navigation</strong> buttons where noted so you
          are not stuck inside a boundary after a throw.
        </p>

        <div className="grid gap-6 sm:grid-cols-2">
          <Card
            title="Segment error boundary"
            description="Themed `app/error.tsx` UI. Server path throws during render; client path throws on the next render after you click."
          >
            <Btn href="/dev/error-simulator/segment">Server throw</Btn>
            <SubtleLink href="/dev/error-simulator/client">Client throw page</SubtleLink>
          </Card>

          <Card
            title="Not found (404)"
            description="Hits `app/not-found.tsx` with the amber status layout (header and footer stay from the root layout)."
          >
            <Btn href={probe404Path}>Open 404 probe URL</Btn>
          </Card>

          <Card
            title="Maintenance (503-style copy)"
            description="Human-facing `/maintenance` page - not an automatic HTTP 503 unless you wire hosting to it."
          >
            <SubtleLink href="/maintenance">Open maintenance page</SubtleLink>
          </Card>

          <Card
            title="Magic-link verify errors"
            description="Card UI at `/auth/verify/error` for each known `code` query value."
          >
            {VERIFY_CODES.map((code) => (
              <SubtleLink key={code} href={`/auth/verify/error?code=${code}`}>
                code={code}
              </SubtleLink>
            ))}
          </Card>

          <Card
            title="Global root error"
            description={
              "There is no safe in-app button for this: app/global-error.tsx replaces the entire root layout. To preview it, temporarily add throw new Error('test') at the top of app/layout.tsx, load any route, then revert the change immediately."
            }
          >
            <span className="text-xs text-stone-500">See project docs / layout file</span>
          </Card>

          <Card
            title="API JSON errors (sample)"
            description="These return JSON, not HTML. Useful when checking status codes in the network panel."
          >
            <a
              href="/api/health/db"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-stone-200 bg-white px-3 py-2 text-center text-xs font-semibold text-stone-800 hover:border-amber-300 sm:text-sm"
            >
              GET /api/health/db (new tab)
            </a>
          </Card>
        </div>
      </div>
    </main>
  );
}
