const nodemailer = require("nodemailer");

function createTransporter() {
 const host = process.env.SMTP_HOST;
 const port = Number(process.env.SMTP_PORT || 587);
 const secure = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";
 const user = process.env.SMTP_USER;
 const pass = process.env.SMTP_PASS;

 if (!host || !user || !pass) {
  throw new Error("Email service not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS.");
 }

 return nodemailer.createTransport({
  host,
  port,
  secure,
  auth: { user, pass }
 });
}

async function sendResetOtpMail({ to, otp }) {
 const transporter = createTransporter();
 const from = process.env.SMTP_FROM || process.env.SMTP_USER;

 await transporter.sendMail({
  from,
  to,
  subject: "HealthApp Password Reset OTP",
  text: `Your HealthApp OTP is ${otp}. It expires in 10 minutes.`,
  html: `<div style=\"font-family:Arial,sans-serif;line-height:1.5\"><h2>HealthApp Password Reset</h2><p>Your OTP is:</p><p style=\"font-size:24px;font-weight:700;letter-spacing:2px\">${otp}</p><p>This OTP expires in 10 minutes.</p></div>`
 });
}

module.exports = { sendResetOtpMail };
