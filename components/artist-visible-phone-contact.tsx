const WHATSAPP_BRAND = {
  hex: "25D366",
  path: "M20.52 3.48A11.8 11.8 0 0012.07 0C5.51 0 .18 5.33.18 11.89c0 2.1.55 4.15 1.6 5.96L0 24l6.33-1.66a11.87 11.87 0 005.74 1.47h.01c6.56 0 11.89-5.33 11.89-11.89a11.8 11.8 0 00-3.45-8.44zm-8.45 18.3h-.01a9.96 9.96 0 01-5.07-1.39l-.36-.21-3.75.98 1-3.66-.24-.38a9.93 9.93 0 01-1.53-5.24C2.11 6.43 6.54 2 12.07 2a9.8 9.8 0 016.99 2.91 9.82 9.82 0 012.89 6.99c0 5.53-4.43 9.88-9.88 9.88zm5.42-7.4c-.3-.15-1.77-.87-2.04-.96-.27-.1-.47-.15-.67.15s-.77.96-.95 1.15c-.17.2-.35.22-.65.08-.3-.15-1.28-.47-2.43-1.49a9.04 9.04 0 01-1.69-2.1c-.18-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.08-.8.38-.27.3-1.04 1.02-1.04 2.5s1.07 2.9 1.22 3.1c.15.2 2.1 3.2 5.08 4.49.71.3 1.27.49 1.7.62.72.23 1.37.2 1.89.12.58-.09 1.77-.72 2.02-1.41.25-.7.25-1.29.17-1.42-.08-.13-.28-.2-.58-.35z",
};

type ContactChannel = "whatsapp" | "mobile" | null;

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

function PhoneHandsetIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24 11.36 11.36 0 003.68.59 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1 0 11.36 11.36 0 00.59 3.68 1 1 0 01-.24 1.01l-2.2 2.2z"
      />
    </svg>
  );
}

/**
 * When a phone number is visible to the viewer, show it with a WhatsApp vs mobile handset affordance.
 */
export function ArtistVisiblePhoneContact({
  contactNumber,
  contactType,
  className = "",
}: {
  contactNumber: string;
  contactType: ContactChannel;
  /** Wrapper classes (e.g. flex row). */
  className?: string;
}) {
  const trimmed = contactNumber.trim();
  if (!trimmed) return null;

  const isWhatsapp = contactType === "whatsapp";
  const waDigits = digitsOnly(trimmed);
  const href =
    isWhatsapp && waDigits.length > 0 ? `https://wa.me/${waDigits}` : `tel:${encodeURIComponent(trimmed)}`;
  const label = isWhatsapp
    ? `Message on WhatsApp: ${trimmed}`
    : `Call or text: ${trimmed}`;

  return (
    <a
      href={href}
      aria-label={label}
      target={isWhatsapp ? "_blank" : undefined}
      rel={isWhatsapp ? "noopener noreferrer" : undefined}
      className={`inline-flex min-h-[44px] items-center gap-2.5 rounded-xl border border-stone-200 bg-stone-50/90 px-3 py-2 text-sm font-medium text-stone-800 shadow-sm transition-colors hover:border-amber-300 hover:bg-amber-50/90 ${className}`}
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
        style={{
          backgroundColor: isWhatsapp ? `${WHATSAPP_BRAND.hex}18` : "#78716c18",
          color: isWhatsapp ? `#${WHATSAPP_BRAND.hex}` : "#57534e",
        }}
        aria-hidden
      >
        {isWhatsapp ? (
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
            <path fill="currentColor" d={WHATSAPP_BRAND.path} />
          </svg>
        ) : (
          <PhoneHandsetIcon className="h-5 w-5" />
        )}
      </span>
      <span className="min-w-0 break-all ph-no-capture">{trimmed}</span>
    </a>
  );
}

/** Compact inline icon + number for admin tables and review screens. */
export function ArtistPhoneContactInline({
  contactNumber,
  contactType,
}: {
  contactNumber: string;
  contactType: ContactChannel;
}) {
  const trimmed = contactNumber.trim();
  if (!trimmed) {
    return <span className="text-stone-400">—</span>;
  }
  const isWhatsapp = contactType === "whatsapp";
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
        style={{
          backgroundColor: isWhatsapp ? `${WHATSAPP_BRAND.hex}14` : "#78716c14",
          color: isWhatsapp ? `#${WHATSAPP_BRAND.hex}` : "#57534e",
        }}
        title={isWhatsapp ? "WhatsApp" : "Mobile"}
        aria-hidden
      >
        {isWhatsapp ? (
          <svg viewBox="0 0 24 24" className="h-4 w-4">
            <path fill="currentColor" d={WHATSAPP_BRAND.path} />
          </svg>
        ) : (
          <PhoneHandsetIcon className="h-4 w-4" />
        )}
      </span>
      <span className="ph-no-capture">{trimmed}</span>
    </span>
  );
}
