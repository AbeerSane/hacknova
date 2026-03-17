const express = require("express");
const router = express.Router();

const Prescription = require("../models/Prescription");
const Medication = require("../models/Medication");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { sendWhatsApp } = require("../services/whatsappService");

function getDefaultTimes(frequencyPerDay) {
 const defaults = {
  1: ["09:00"],
  2: ["09:00", "21:00"],
  3: ["08:00", "14:00", "20:00"],
  4: ["06:00", "12:00", "18:00", "22:00"]
 };
 return defaults[frequencyPerDay] || ["09:00"];
}

function parseTimes(customTimes, frequencyPerDay) {
 if (!customTimes || !customTimes.trim()) {
  return getDefaultTimes(frequencyPerDay);
 }

 const parsed = customTimes
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean)
  .slice(0, frequencyPerDay);

 if (parsed.length === frequencyPerDay) {
  return parsed;
 }

 const fallback = getDefaultTimes(frequencyPerDay);
 for (let i = parsed.length; i < frequencyPerDay; i += 1) {
  parsed.push(fallback[i] || "09:00");
 }
 return parsed;
}

// CREATE PRESCRIPTION + GENERATE MEDICATION SCHEDULE ENTRIES
router.post("/add", async (req, res) => {
 try {
  const {
   doctorId,
   patientId,
   medicineName,
   dosage,
   frequencyPerDay,
   durationDays,
   startDate,
   customTimes,
   notes
  } = req.body;

  if (!doctorId || !patientId || !medicineName || !dosage || !frequencyPerDay || !durationDays || !startDate) {
   return res.status(400).json({ error: "Missing required prescription fields" });
  }

  const patient = await User.findById(patientId);
  if (!patient || patient.role !== "patient") {
   return res.status(404).json({ error: "Patient not found" });
  }

  const doctor = await User.findById(doctorId);
  if (!doctor || doctor.role !== "doctor") {
   return res.status(404).json({ error: "Doctor not found" });
  }

  const freq = Number(frequencyPerDay);
  const days = Number(durationDays);
  const times = parseTimes(customTimes, freq);

  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) {
   return res.status(400).json({ error: "Invalid startDate" });
  }

  const end = new Date(start);
  end.setDate(end.getDate() + days - 1);

  const prescription = new Prescription({
   doctorId,
   patientId,
   medicineName,
   dosage,
   frequencyPerDay: freq,
   durationDays: days,
   startDate,
   endDate: end.toISOString().slice(0, 10),
   times,
   notes
  });

  await prescription.save();

  const scheduleEntries = [];
  for (let day = 0; day < days; day += 1) {
   const current = new Date(start);
   current.setDate(start.getDate() + day);
   const dateStr = current.toISOString().slice(0, 10);

   times.forEach((time) => {
    scheduleEntries.push({
     userId: patientId,
     medicineName,
     dosage,
     date: dateStr,
     time,
     taken: false,
     prescribedBy: doctorId,
     isDoctorOrder: true,
     prescriptionId: String(prescription._id)
    });
   });
  }

  if (scheduleEntries.length) {
   await Medication.insertMany(scheduleEntries);
  }

  await Notification.create({
   userId: patientId,
   title: "New Prescription Added",
   message: `Dr. ${doctor.name} prescribed ${medicineName} (${dosage}) ${freq} times/day for ${days} days.`,
   type: "medication"
  });

    await Promise.all([
     sendWhatsApp({
        to: patient.phone,
        body: `[PATIENT COPY] New prescription: ${medicineName} (${dosage}), ${freq} times/day for ${days} days starting ${startDate}.`
     }),
     sendWhatsApp({
        to: doctor.phone,
        body: `[DOCTOR COPY] Prescription created for ${patient.name}: ${medicineName} (${dosage}), ${freq} times/day for ${days} days.`
     })
    ]);

  res.json({
   message: "Prescription added and medication calendar updated",
   prescription,
   scheduleCount: scheduleEntries.length
  });
 } catch (error) {
  res.status(500).json({ error: error.message });
 }
});

// GET DOCTOR PRESCRIPTIONS
router.get("/doctor/:doctorId", async (req, res) => {
 try {
  const prescriptions = await Prescription.find({ doctorId: req.params.doctorId }).sort({ createdAt: -1 });
  res.json(prescriptions);
 } catch (error) {
  res.status(500).json({ error: error.message });
 }
});

// GET PATIENT PRESCRIPTIONS
router.get("/patient/:patientId", async (req, res) => {
 try {
  const prescriptions = await Prescription.find({ patientId: req.params.patientId }).sort({ createdAt: -1 });
  res.json(prescriptions);
 } catch (error) {
  res.status(500).json({ error: error.message });
 }
});

module.exports = router;
