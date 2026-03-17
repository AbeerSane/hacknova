const express = require("express");
const router = express.Router();

const Report = require("../models/Report");
const Notification = require("../models/Notification");

// SAVE REPORT (from patient) + NOTIFY DOCTOR
router.post("/add", async (req, res) => {
 try {
  const {
   patientId, patientName, patientEmail, doctorId,
   latestVitals, vitalCount, medicationCount, appointmentCount, alertCount
  } = req.body;

  const report = new Report({
   patientId,
   patientName,
   patientEmail,
   doctorId,
   latestVitals: latestVitals || {},
   vitalCount: vitalCount || 0,
   medicationCount: medicationCount || 0,
   appointmentCount: appointmentCount || 0,
   alertCount: alertCount || 0
  });

  await report.save();

  if (doctorId) {
   await Notification.create({
    userId: doctorId,
    title: "New Health Report",
    message: `${patientName} has shared a new health report. Check the Reports section.`,
    type: "system"
   });
  }

  res.json({ message: "Report saved successfully", report });
 } catch (error) {
  res.status(500).json({ error: error.message });
 }
});

// GET REPORTS FOR A PATIENT
router.get("/patient/:patientId", async (req, res) => {
 try {
  const reports = await Report.find({ patientId: req.params.patientId }).sort({ createdAt: -1 });
  res.json(reports);
 } catch (error) {
  res.status(500).json({ error: error.message });
 }
});

// GET REPORTS SENT TO A DOCTOR
router.get("/doctor/:doctorId", async (req, res) => {
 try {
  const reports = await Report.find({ doctorId: req.params.doctorId }).sort({ createdAt: -1 });
  res.json(reports);
 } catch (error) {
  res.status(500).json({ error: error.message });
 }
});

module.exports = router;
