import type {APIRoute} from "astro";

import {sanityClient} from "../../lib/sanity";
import {CONTACT_FORM_QUERY} from "../../lib/queries";

/* The only route that is not prerendered: it needs the Resend key, which must stay on
   the server, and it runs per submission rather than per build. */
export const prerender = false;

/* Which pages may submit here. The value arrives in a hidden field, and the form
   definition is then read from that page's document — so a submission can only ever
   name fields the Studio actually renders. */
const FORM_PAGES = new Set(["contactus", "soluciones"]);

const TO = import.meta.env.CONTACT_TO ?? process.env.CONTACT_TO ?? "info@luxcuero.com";
const FROM =
  import.meta.env.CONTACT_FROM ??
  process.env.CONTACT_FROM ??
  "Luxcuero <no-reply@luxcuero.com>";
const RESEND_API_KEY = import.meta.env.RESEND_API_KEY ?? process.env.RESEND_API_KEY;

/* Vercel rejects a request body over 4.5 MB before the function ever runs, so the photo
   uploads are capped below that and the form checks the same limit client-side. */
const MAX_ATTACHMENT_BYTES = 3.5 * 1024 * 1024;
/* A single answer longer than this is a bot pasting, not a customer describing a sofa. */
const MAX_VALUE_LENGTH = 5000;

type FormFieldDef = {
  label?: string;
  name?: string;
  inputType?: string;
  required?: boolean | null;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/* Header injection guard: a newline in the reply-to would let a submission add headers
   of its own, so anything that is not a plausible single-line address is dropped. */
const isEmail = (value: string) => /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(value);

/* Per-address throttle. A serverless instance is short-lived and several run at once,
   so this bounds a burst against one warm instance rather than enforcing a global
   quota — enough to blunt a script hammering the form, without standing up a KV store
   for it. The honeypot catches the rest. */
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const recentByAddress = new Map<string, number[]>();

function isRateLimited(address: string): boolean {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;

  /* Sweep every caller, not just this one: without it the map keeps a key for every
     address the instance has ever seen. */
  for (const [key, times] of recentByAddress) {
    const kept = times.filter((time) => time > cutoff);
    if (kept.length === 0) recentByAddress.delete(key);
    else recentByAddress.set(key, kept);
  }

  const times = recentByAddress.get(address) ?? [];
  if (times.length >= RATE_LIMIT_MAX) return true;

  recentByAddress.set(address, [...times, now]);
  return false;
}

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {"content-type": "application/json"},
  });

export const POST: APIRoute = async ({request, clientAddress}) => {
  if (!RESEND_API_KEY) {
    console.error("[contact] RESEND_API_KEY is not set — cannot send the enquiry.");
    return json({ok: false, error: "server"}, 500);
  }

  /* Vercel sets x-forwarded-for; clientAddress covers the dev server, where the header
     is absent. Only the first hop is ours to trust — the rest the client can forge. */
  const address =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || clientAddress || "unknown";
  if (isRateLimited(address)) {
    return json({ok: false, error: "rate"}, 429);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ok: false, error: "invalid"}, 400);
  }

  /* Honeypot. It is hidden from people and left empty by them; bots fill every input
     they find. Answer 200 so the bot has nothing to tune against. */
  if (typeof form.get("website") === "string" && form.get("website") !== "") {
    return json({ok: true}, 200);
  }

  const slug = String(form.get("form") ?? "");
  if (!FORM_PAGES.has(slug)) return json({ok: false, error: "invalid"}, 400);

  const definition = await sanityClient.fetch(CONTACT_FORM_QUERY, {slug});
  const fields: FormFieldDef[] = definition?.fields ?? [];
  if (fields.length === 0) {
    console.error(`[contact] no form definition found on page "${slug}".`);
    return json({ok: false, error: "server"}, 500);
  }

  /* Walk the definition, not the submission, so the email keeps the Studio's field
     order and anything extra the browser sent is ignored. */
  const answers: {label: string; value: string}[] = [];
  const attachments: {filename: string; content: string}[] = [];
  const missing: string[] = [];
  let replyTo: string | undefined;
  let attachedBytes = 0;
  let skippedFiles = 0;

  for (const field of fields) {
    const {label = "", name, inputType} = field;
    if (!name) continue;

    if (inputType === "file") {
      /* An empty file input still submits an entry, with size 0 and no name. */
      const files = form
        .getAll(name)
        .filter((entry): entry is File => entry instanceof File && entry.size > 0);

      for (const file of files) {
        if (attachedBytes + file.size > MAX_ATTACHMENT_BYTES) {
          skippedFiles += 1;
          continue;
        }
        attachedBytes += file.size;
        const bytes = Buffer.from(await file.arrayBuffer());
        attachments.push({filename: file.name, content: bytes.toString("base64")});
      }

      if (files.length > 0) {
        answers.push({
          label,
          value: files.map((file) => file.name).join(", "),
        });
      } else if (field.required) {
        missing.push(label);
      }
      continue;
    }

    /* Checkbox groups submit one entry per ticked option under the same name. */
    const value = form
      .getAll(name)
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .join(", ")
      .slice(0, MAX_VALUE_LENGTH);

    if (!value) {
      if (field.required) missing.push(label);
      continue;
    }

    if (inputType === "email" && !replyTo && isEmail(value)) replyTo = value;
    answers.push({label, value});
  }

  if (missing.length > 0) return json({ok: false, error: "missing", fields: missing}, 400);
  if (answers.length === 0) return json({ok: false, error: "invalid"}, 400);

  const notes: string[] = [];
  if (skippedFiles > 0) {
    notes.push(
      `${skippedFiles} archivo(s) adjunto(s) no se enviaron porque superan el límite de tamaño.`,
    );
  }

  const heading = definition?.heading ?? "Formulario";
  const subject = `${heading} — ${answers[0]?.value ?? slug}`;

  const text = [
    ...answers.map(({label, value}) => `${label}: ${value}`),
    ...notes,
    "",
    `Enviado desde https://www.luxcuero.com/${slug}`,
  ].join("\n");

  const html = `
    <h2 style="font-family:system-ui,sans-serif">${escapeHtml(heading)}</h2>
    <table style="font-family:system-ui,sans-serif;font-size:14px;border-collapse:collapse">
      ${answers
        .map(
          ({label, value}) => `
        <tr>
          <td style="padding:6px 12px 6px 0;vertical-align:top;color:#666">${escapeHtml(label)}</td>
          <td style="padding:6px 0;vertical-align:top"><strong>${escapeHtml(value).replace(
            /\n/g,
            "<br>",
          )}</strong></td>
        </tr>`,
        )
        .join("")}
    </table>
    ${notes.map((note) => `<p style="color:#a00;font-size:13px">${escapeHtml(note)}</p>`).join("")}
    <p style="color:#666;font-size:12px">Enviado desde https://www.luxcuero.com/${escapeHtml(slug)}</p>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: [TO],
      subject,
      text,
      html,
      /* Replying in the inbox goes to the customer rather than to the no-reply sender. */
      ...(replyTo ? {reply_to: replyTo} : {}),
      ...(attachments.length > 0 ? {attachments} : {}),
    }),
  });

  if (!response.ok) {
    console.error(`[contact] Resend returned ${response.status}: ${await response.text()}`);
    return json({ok: false, error: "send"}, 502);
  }

  return json({ok: true}, 200);
};
