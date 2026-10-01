import { Resend } from "resend";
import { appUrl } from "./auth";
import type { WatchedProduct } from "./db/schema";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error("RESEND_API_KEY is not set");
  }
  return new Resend(key);
}

const from = () => process.env.RESEND_FROM ?? "BonusMelding <onboarding@resend.dev>";

export async function sendMagicLinkEmail(email: string, manageToken: string) {
  const link = appUrl(`/api/auth/verify?token=${manageToken}`);
  const resend = getResend();

  await resend.emails.send({
    from: from(),
    to: email,
    subject: "Je BonusMelding dashboard-link",
    html: `
      <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; color: #0b3d2e;">
        <h1 style="font-size: 28px; margin-bottom: 8px;">BonusMelding</h1>
        <p style="font-size: 16px; line-height: 1.5;">
          Klik op de knop hieronder om je gevolgde producten te beheren.
          De link werkt alleen voor jou — deel hem niet.
        </p>
        <p style="margin: 28px 0;">
          <a href="${link}" style="background:#0b3d2e;color:#f4fff0;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;">
            Open dashboard
          </a>
        </p>
        <p style="font-size: 13px; color: #4a6358;">Of kopieer deze link:<br/>${link}</p>
      </div>
    `,
  });
}

export async function sendBonusDigestEmail(
  email: string,
  manageToken: string,
  hits: WatchedProduct[],
) {
  const dashboard = appUrl(`/api/auth/verify?token=${manageToken}`);
  const unsubscribe = appUrl(`/api/unsubscribe?token=${manageToken}`);
  const resend = getResend();

  const items = hits
    .map(
      (h) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #d7e8dc;">
          <strong style="display:block;font-size:16px;">${escapeHtml(h.name)}</strong>
          <span style="font-size:13px;color:#4a6358;text-transform:uppercase;letter-spacing:0.04em;">${escapeHtml(h.supermarket)}</span>
        </td>
      </tr>`,
    )
    .join("");

  await resend.emails.send({
    from: from(),
    to: email,
    subject:
      hits.length === 1
        ? `${hits[0].name} staat in de bonus`
        : `${hits.length} van jouw producten staan in de bonus`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 520px; margin: 0 auto; color: #0b3d2e;">
        <h1 style="font-size: 28px; margin-bottom: 4px;">BonusMelding</h1>
        <p style="font-size: 16px; line-height: 1.5;">
          Goed nieuws — deze producten die je volgt staan deze week in de Albert Heijn-bonus:
        </p>
        <table width="100%" cellpadding="0" cellspacing="0">${items}</table>
        <p style="margin: 28px 0;">
          <a href="${dashboard}" style="background:#0b3d2e;color:#f4fff0;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;">
            Beheer je lijst
          </a>
        </p>
        <p style="font-size: 12px; color: #4a6358;">
          <a href="${unsubscribe}" style="color:#4a6358;">Afmelden</a>
        </p>
      </div>
    `,
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
