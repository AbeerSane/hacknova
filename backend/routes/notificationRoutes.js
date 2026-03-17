const express = require("express");
const router = express.Router();

const Notification = require("../models/Notification");
const { sendWhatsApp } = require("../services/whatsappService");

// GET USER NOTIFICATIONS
router.get("/:userId", async (req, res) => {

 try {

  const notifications = await Notification.find({ userId: req.params.userId }).sort({ createdAt: -1 });
  res.json(notifications);

 } catch (error) {

  res.status(500).json({ error: error.message });

 }

});

// MARK NOTIFICATION AS READ
router.patch("/:id/read", async (req, res) => {

 try {

  const notification = await Notification.findByIdAndUpdate(
   req.params.id,
   { isRead: true },
    { returnDocument: "after" }
  );

  if (!notification) {
   return res.status(404).json({ error: "Notification not found" });
  }

  res.json(notification);

 } catch (error) {

  res.status(500).json({ error: error.message });

 }

});

// TEST WHATSAPP MESSAGE
router.post("/whatsapp-test", async (req, res) => {

 try {

  const { to, message } = req.body;
  const result = await sendWhatsApp({
   to,
   body: message || "HealthApp test message from Twilio WhatsApp integration"
  });

  res.json({
   message: result.sent ? "WhatsApp message sent" : "WhatsApp message skipped",
   result
  });

 } catch (error) {

  res.status(500).json({ error: error.message });

 }

});

module.exports = router;
