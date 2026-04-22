import { transactionalEmailHtml, transactionalEmailPlainText, getPortalNameForEmail } from "@/lib/email-templates";
import { sendResendEmail } from "@/lib/resend-email";

export type SendSuspensionEmailResult =
  | { ok: true; emailSent: true }
  | { ok: true; emailSent: false; reason: "resend_not_configured" | "no_recipient" | "send_failed" };

function appOrigin(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "");
}

/**
 * Emails the artist when their account is suspended, including the admin note.
 */
export async function sendSuspensionNoticeEmail(params: {
  to: string;
  adminNote: string;
}): Promise<SendSuspensionEmailResult> {
  const to = params.to.trim();
  if (!to) return { ok: true, emailSent: false, reason: "no_recipient" };

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !from) {
    console.warn("[suspension-email] RESEND_API_KEY or RESEND_FROM_EMAIL missing — suspension email skipped");
    return { ok: true, emailSent: false, reason: "resend_not_configured" };
  }

  const portal = getPortalNameForEmail();
  const base = appOrigin();
  const dashboardHref = base ? `${base}/dashboard` : "/dashboard";

  const title = "Your account has been suspended";
  const paragraphs = [
    `Your access to ${portal} is currently suspended. An administrator left the following message:`,
    params.adminNote.trim(),
    "You can sign in to your dashboard and open the conversation from your account status to reply to the team.",
  ];

  const content = {
    title,
    paragraphs,
    primaryCta: { href: dashboardHref, label: "Open dashboard" },
    footnote: "If you believe this is a mistake, use “Message the team” in the dashboard to reach an administrator.",
  };

  try {
    await sendResendEmail({
      apiKey,
      from,
      to,
      subject: `${title} · ${portal}`,
      html: transactionalEmailHtml(content),
      text: transactionalEmailPlainText(content),
    });
    return { ok: true, emailSent: true };
  } catch (e) {
    console.warn("[suspension-email] Resend send failed", e);
    return { ok: true, emailSent: false, reason: "send_failed" };
  }
}
