const twilio = require("twilio");

function normalizeWhatsAppNumber(phone) {
 if (!phone) return "";
 const trimmed = String(phone).trim();
 if (trimmed.startsWith("whatsapp:")) return trimmed;
 return `whatsapp:${trimmed}`;
}

function unwrapWhatsAppPrefix(value) {
 return String(value || "").replace(/^whatsapp:/, "").trim();
}

function isE164(value) {
 return /^\+\d{8,15}$/.test(unwrapWhatsAppPrefix(value));
}

function resolveRecipient(to) {
 const defaultTo = process.env.TWILIO_DEFAULT_TO;
 const forceDefault = String(process.env.TWILIO_USE_DEFAULT_FOR_ALL || "true").toLowerCase() === "true";

 if (forceDefault && defaultTo) {
  return normalizeWhatsAppNumber(defaultTo);
 }

 if (to && isE164(to)) {
  return normalizeWhatsAppNumber(to);
 }

 if (defaultTo) {
  return normalizeWhatsAppNumber(defaultTo);
 }

 return normalizeWhatsAppNumber(to);
}

function hasTwilioConfig() {
 return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM);
}

async function sendWhatsApp({ to, body }) {
 if (!hasTwilioConfig()) {
  return { sent: false, skipped: true, reason: "Twilio env not configured" };
 }

 const toWhatsApp = resolveRecipient(to);
 const fromWhatsApp = normalizeWhatsAppNumber(process.env.TWILIO_WHATSAPP_FROM);

 if (!toWhatsApp || !body) {
  return { sent: false, skipped: true, reason: "Recipient or body missing" };
 }

 const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
 const result = await client.messages.create({
  from: fromWhatsApp,
  to: toWhatsApp,
  body
 });

 return { sent: true, sid: result.sid };
}

module.exports = { sendWhatsApp, hasTwilioConfig };
