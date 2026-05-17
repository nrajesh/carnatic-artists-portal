import Link from "next/link";
import { MermaidDiagram } from "@/components/mermaid-diagram";
import { PortalSectionHeading } from "@/components/portal-section-heading";

export default function ConnectionsV1AboutPage() {
  return (
    <main className="min-h-screen bg-amber-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <Link
            href="/about"
            className="mb-2 inline-block text-sm text-amber-700 hover:text-amber-900"
          >
            ← About
          </Link>
          <h1 className="text-3xl font-bold text-stone-900">Artist Connections V1</h1>
          <p className="mt-2 text-sm text-stone-600">
            Live implementation notes for the feature-flagged connections module: request flow,
            notification model, mention behavior, and admin review surfaces.
          </p>
        </div>

        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <PortalSectionHeading variant="title" className="mb-3">
            V1 scope
          </PortalSectionHeading>
          <ul className="space-y-2 text-sm text-stone-700">
            <li>Mutual connection requests with approve, reject, and remove actions.</li>
            <li>In-app and email notifications for connection requests and approvals.</li>
            <li>
              Artist-side preference controls for pausing new requests and muting connection events.
            </li>
            <li>Approved-only mentions in bios and collab messages.</li>
            <li>
              Admin read-only oversight page for pending, approved, rejected, and paused-request
              states.
            </li>
          </ul>
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <PortalSectionHeading variant="title" className="mb-3">
            Runtime model
          </PortalSectionHeading>
          <p className="mb-4 text-sm text-stone-600">
            Connections stay behind the{" "}
            <code className="rounded bg-stone-100 px-1 text-xs">artist-connections</code> PostHog
            flag and also soft-fail when the Prisma delegate or database table is unavailable. That
            keeps unrelated artist and admin pages stable during rollout.
          </p>
          <MermaidDiagram
            chart={`flowchart TD
  A["Profile page"] --> B["canUseArtistConnections(viewer)"]
  A --> C["canUseArtistConnections(target)"]
  B --> D["PostHog flag evaluation"]
  C --> D
  D --> E["Storage readiness check"]
  E --> F["Connection status lookup"]
  F --> G["Render Connect / Pending / Connected"]
  F --> H["Approved mention targets"]
  H --> I["Bio + collab message linkification"]`}
          />
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <PortalSectionHeading variant="title" className="mb-3">
            Relationship lifecycle
          </PortalSectionHeading>
          <MermaidDiagram
            chart={`stateDiagram-v2
  [*] --> NONE
  NONE --> PENDING_OUTGOING: requester sends request
  PENDING_OUTGOING --> APPROVED: recipient approves
  PENDING_OUTGOING --> REJECTED: recipient rejects
  PENDING_OUTGOING --> NONE: requester cancels/removes
  APPROVED --> NONE: either artist removes connection
  REJECTED --> PENDING_OUTGOING: requester retries later
  NONE --> DISABLED: recipient pauses requests
  DISABLED --> NONE: recipient re-enables requests`}
          />
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <PortalSectionHeading variant="title" className="mb-3">
            Data design
          </PortalSectionHeading>
          <MermaidDiagram
            chart={`erDiagram
  Artist ||--o{ ArtistConnection : requester
  Artist ||--o{ ArtistConnection : recipient
  Artist ||--|| NotificationPreference : has
  Artist ||--o{ Notification : receives

  ArtistConnection {
    string id
    string requesterId
    string recipientId
    enum status
    datetime createdAt
    datetime updatedAt
  }

  NotificationPreference {
    string artistId
    bool inAppEnabled
    bool emailEnabled
    bool webPushEnabled
    bool connectionRequestsAllowed
    bool connectionRequestEnabled
    bool connectionApprovedEnabled
  }`}
          />
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <PortalSectionHeading variant="title" className="mb-3">
            Implementation notes
          </PortalSectionHeading>
          <ul className="space-y-2 text-sm text-stone-700">
            <li>
              New requests are blocked when the recipient has paused incoming requests in{" "}
              <code className="rounded bg-stone-100 px-1 text-xs">/profile/notifications</code>.
            </li>
            <li>
              Mention input stays slug-based for precision, but rendered approved mentions display
              the artist’s full name while linking to the profile.
            </li>
            <li>
              The admin page at{" "}
              <code className="rounded bg-stone-100 px-1 text-xs">/admin/connections</code> is
              intentionally read-only in V1, giving moderators visibility before heavier trust and
              safety workflows land.
            </li>
            <li>
              Existing pages remain resilient if the feature flag is disabled or the{" "}
              <code className="rounded bg-stone-100 px-1 text-xs">ArtistConnection</code> table is
              missing.
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
