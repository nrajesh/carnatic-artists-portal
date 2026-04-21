import { siFacebook, siInstagram, siX, siYoutube } from "simple-icons";
import type { SimpleIcon } from "simple-icons";
import { WebsiteLinkIcon } from "@/components/website-link-icon";

/** LinkedIn was removed from simple-icons; use canonical bug mark (brand color #0A66C2). */
const siLinkedInCompat: SimpleIcon = {
  title: "LinkedIn",
  slug: "linkedin",
  svg: "<svg />",
  path: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
  source: "https://linkedin.com",
  hex: "0A66C2",
};

const PLATFORM_ORDER = [
  "instagram",
  "youtube",
  "linkedin",
  "facebook",
  "twitter",
  "website",
] as const;

type PlatformKey = (typeof PLATFORM_ORDER)[number] | "other";

function normalizeKey(raw: string): PlatformKey {
  const k = raw.trim().toLowerCase();
  if ((PLATFORM_ORDER as readonly string[]).includes(k)) {
    return k as (typeof PLATFORM_ORDER)[number];
  }
  return "other";
}

function platformMeta(key: PlatformKey): {
  label: string;
  icon: SimpleIcon | "globe";
  accent: string;
  subtitle: string;
} {
  switch (key) {
    case "instagram":
      return {
        label: "Instagram",
        icon: siInstagram,
        accent: "#E4405F",
        subtitle: "Photos & reels",
      };
    case "youtube":
      return {
        label: "YouTube",
        icon: siYoutube,
        accent: "#FF0000",
        subtitle: "Videos & channel",
      };
    case "linkedin":
      return {
        label: "LinkedIn",
        icon: siLinkedInCompat,
        accent: "#0A66C2",
        subtitle: "Professional profile",
      };
    case "facebook":
      return {
        label: "Facebook",
        icon: siFacebook,
        accent: "#1877F2",
        subtitle: "Profile & updates",
      };
    case "twitter":
      return {
        label: "X (Twitter)",
        icon: siX,
        accent: "#000000",
        subtitle: "Posts & updates",
      };
    case "website":
      return {
        label: "Website",
        icon: "globe",
        accent: "#b45309",
        subtitle: "External site",
      };
    default:
      return {
        label: "Link",
        icon: "globe",
        accent: "#78716c",
        subtitle: "Opens in browser",
      };
  }
}

function safeHostname(url: string): string | null {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function sortLinks(links: { type: string; url: string }[]) {
  return [...links].sort((a, b) => {
    const ka = normalizeKey(a.type);
    const kb = normalizeKey(b.type);
    const ia = ka === "other" ? 99 : PLATFORM_ORDER.indexOf(ka as (typeof PLATFORM_ORDER)[number]);
    const ib = kb === "other" ? 99 : PLATFORM_ORDER.indexOf(kb as (typeof PLATFORM_ORDER)[number]);
    if (ia !== ib) return ia - ib;
    return a.url.localeCompare(b.url);
  });
}

function BrandGlyph({
  icon,
  accent,
  className,
}: {
  icon: SimpleIcon | "globe";
  accent: string;
  className?: string;
}) {
  if (icon === "globe") {
    return (
      <svg
        viewBox="0 0 24 24"
        className={className}
        fill="none"
        stroke={accent}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path fill="currentColor" d={icon.path} />
    </svg>
  );
}

export function ArtistExternalLinksFeed({ links }: { links: { type: string; url: string }[] }) {
  if (links.length === 0) return null;

  const ordered = sortLinks(links);

  return (
    <ul className="flex flex-col gap-3 sm:gap-3.5 list-none p-0 m-0">
      {ordered.map((link, i) => {
        const key = normalizeKey(link.type);
        const meta = platformMeta(key);
        const host = safeHostname(link.url);
        const title = key === "other" ? link.type.trim() || "Link" : meta.label;
        const aria = `${title}${host ? ` (${host})` : ""} - opens in a new tab`;
        const showSiteFavicon =
          !!host && (key === "website" || key === "other");

        return (
          <li key={`${link.url}-${i}`}>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={aria}
              className={[
                "group flex w-full min-h-[4.5rem] items-stretch gap-3 rounded-2xl border border-stone-200 bg-white p-3.5 text-left shadow-sm",
                "transition-[box-shadow,transform,border-color] duration-200",
                "hover:border-stone-300 hover:shadow-md active:scale-[0.99] sm:min-h-[5rem] sm:p-4",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600",
              ].join(" ")}
              style={{
                borderLeftWidth: "4px",
                borderLeftColor: meta.accent,
              }}
            >
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl sm:h-14 sm:w-14"
                style={{
                  backgroundColor: `${meta.accent}14`,
                  ...(showSiteFavicon ? {} : meta.icon !== "globe" ? { color: meta.accent } : {}),
                }}
              >
                {showSiteFavicon ? (
                  <WebsiteLinkIcon
                    hostname={host}
                    accent={meta.accent}
                    className="h-6 w-6 sm:h-7 sm:w-7"
                  />
                ) : (
                  <BrandGlyph
                    icon={meta.icon}
                    accent={meta.accent}
                    className="h-6 w-6 sm:h-7 sm:w-7"
                  />
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 pr-1">
                <span className="font-semibold text-stone-900 text-[0.95rem] leading-snug sm:text-base">
                  {title}
                </span>
                <span className="text-xs text-stone-500 sm:text-sm">{meta.subtitle}</span>
                {host ? (
                  <span className="truncate text-xs text-stone-400 sm:text-[0.8125rem]" title={host}>
                    {host}
                  </span>
                ) : null}
              </div>

              <div className="flex shrink-0 flex-col items-end justify-center text-stone-300 group-hover:text-amber-700">
                <span className="text-lg font-light transition-colors" aria-hidden>
                  ↗
                </span>
              </div>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
