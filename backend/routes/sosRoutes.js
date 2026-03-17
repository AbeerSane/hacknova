const express = require("express");

const router = express.Router();
const Notification = require("../models/Notification");
const User = require("../models/User");
const Appointment = require("../models/Appointment");
const { sendWhatsApp } = require("../services/whatsappService");

router.post("/", async (req,res)=>{

try {

const { userId, description, doctorId, priority } = req.body;

console.log("SOS ALERT TRIGGERED");

if (userId) {
 const user = await User.findById(userId).select("name phone");
 const recentAppointments = await Appointment.find({ userId: String(userId), doctorId: { $exists: true, $ne: null } })
  .sort({ createdAt: -1 })
  .limit(20)
  .select("doctorId");

 const candidateDoctorIds = [
  doctorId,
  ...recentAppointments.map((item) => item.doctorId)
 ].filter(Boolean);

 let doctor = null;
 for (const id of candidateDoctorIds) {
  const candidate = await User.findById(id).select("name phone role");
  if (candidate && candidate.role === "doctor") {
   doctor = candidate;
   break;
  }
 }

 if (!doctor) {
  return res.status(400).json({ error: "No assigned doctor found. Please request consultation first." });
 }

 const urgencyText = (description && String(description).trim())
  ? String(description).trim()
  : "Urgent assistance required immediately.";

 const normalizedPriority = ["low", "medium", "high", "critical"].includes(String(priority || "").toLowerCase())
  ? String(priority).toLowerCase()
  : "high";

 await Notification.insertMany([
  {
   userId,
    title: `Emergency Alert Sent (${normalizedPriority.toUpperCase()})`,
   message: `Urgency message sent to Dr. ${doctor.name}: ${urgencyText}`,
    type: "emergency",
    priority: normalizedPriority
  },
  {
    userId: String(doctor._id),
    title: `Urgent Message From Patient (${normalizedPriority.toUpperCase()})`,
   message: `${user?.name || "Patient"} says: ${urgencyText}`,
    type: "emergency",
    priority: normalizedPriority
  }
 ]);

 await Promise.all([
  sendWhatsApp({
   to: doctor?.phone,
    body: `[DOCTOR COPY - URGENCY ${normalizedPriority.toUpperCase()}] Patient ${user?.name || "Unknown patient"} needs help. Message: ${urgencyText}`
  }),
  sendWhatsApp({
   to: user?.phone,
    body: `[PATIENT COPY - URGENCY SENT ${normalizedPriority.toUpperCase()}] Your urgent message was sent to Dr. ${doctor?.name}: ${urgencyText}`
  })
 ]);
}

res.json({
message:"Urgency message sent to doctor"
});

} catch (error) {

res.status(500).json({ error: error.message });

}

});

module.exports = router;