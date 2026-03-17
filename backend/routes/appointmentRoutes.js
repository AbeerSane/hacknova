const express = require("express");
const router = express.Router();

const Appointment = require("../models/Appointment");
const User = require("../models/User");
const Notification = require("../models/Notification");
const Vital = require("../models/Vital");
const { sendWhatsApp } = require("../services/whatsappService");

function buildToken() {
 return `CONS-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
}

function nextConsultationDate() {
 const date = new Date();
 date.setDate(date.getDate() + 1);
 date.setHours(11, 0, 0, 0);
 return {
  date: date.toISOString().slice(0, 10),
  time: "11:00"
 };
}


// ADD APPOINTMENT
router.post("/add", async (req,res)=>{

try{

const appointment = new Appointment(req.body);

await appointment.save();

res.json({
message:"Appointment booked",
appointment
});

}
catch(error){

res.status(500).json({error:error.message});

}

});


// REQUEST CONSULTATION WITH AUTO-ASSIGNMENT
router.post("/request-consultation", async (req, res) => {

try {

const { patientId, notes, doctorId, preferredDate, preferredTime } = req.body;

if (!patientId) {
 return res.status(400).json({ error: "patientId is required" });
}

const patient = await User.findById(patientId);

if (!patient || patient.role !== "patient") {
 return res.status(404).json({ error: "Patient not found" });
}

let selectedDoctor;

if (doctorId) {
 selectedDoctor = await User.findById(doctorId);
 if (!selectedDoctor || selectedDoctor.role !== "doctor") {
  return res.status(404).json({ error: "Selected doctor not found" });
 }
} else {
 const doctors = await User.find({ role: "doctor", isAvailable: true });
 if (!doctors.length) {
  return res.status(404).json({ error: "No available doctors right now" });
 }
 const doctorsWithLoad = await Promise.all(
  doctors.map(async (doctor) => {
   const activeCount = await Appointment.countDocuments({
    doctorId: String(doctor._id),
    status: { $in: ["pending", "scheduled"] }
   });
   return { doctor, activeCount };
  })
 );
 doctorsWithLoad.sort((a, b) => a.activeCount - b.activeCount);
 selectedDoctor = doctorsWithLoad[0].doctor;
}
const consultationSlot = nextConsultationDate();
const selectedDate = preferredDate || consultationSlot.date;
const selectedTime = preferredTime || consultationSlot.time;

const appointment = new Appointment({
 userId: String(patient._id),
 patientId: String(patient._id),
 doctorId: String(selectedDoctor._id),
 doctor: selectedDoctor.name,
 hospital: "HealthApp Tele-Consult",
 date: selectedDate,
 time: selectedTime,
 preferredDate: selectedDate,
 preferredTime: selectedTime,
 notes: notes || "Consultation requested after vital update",
 token: buildToken(),
 status: "pending"
});

await appointment.save();

await Notification.insertMany([
 {
  userId: String(patient._id),
  title: "Consultation Request Sent",
  message: `Requested with Dr. ${selectedDoctor.name}. Preferred: ${selectedDate} ${selectedTime}. Awaiting approval.`,
  type: "appointment"
 },
 {
  userId: String(selectedDoctor._id),
  title: "New Consultation Request",
  message: `${patient.name} requested consultation. Preferred: ${selectedDate} ${selectedTime}.`,
  type: "appointment"
 }
]);

await Promise.all([
 sendWhatsApp({
  to: patient.phone,
    body: `[PATIENT COPY] Consultation request sent to Dr. ${selectedDoctor.name}. Preferred date/time: ${selectedDate} ${selectedTime}. Waiting for doctor approval.`
 }),
 sendWhatsApp({
  to: selectedDoctor.phone,
    body: `[DOCTOR COPY] New consultation request from ${patient.name}. Preferred date/time: ${selectedDate} ${selectedTime}. Approve or reject in dashboard.`
 })
]);

res.json({
 message: "Consultation request sent to doctor",
 appointment,
 doctor: {
  id: selectedDoctor._id,
  name: selectedDoctor.name,
  email: selectedDoctor.email,
  phone: selectedDoctor.phone,
  specialization: selectedDoctor.specialization
 }
});

} catch (error) {

res.status(500).json({ error: error.message });

}

});


// DOCTOR RESPONDS TO CONSULTATION REQUEST
router.patch("/doctor/:doctorId/appointments/:appointmentId/respond", async (req, res) => {

try {

const { doctorId, appointmentId } = req.params;
const { action, approvedDate, approvedTime, decisionNote } = req.body;

if (!["approve", "reject"].includes(String(action || "").toLowerCase())) {
 return res.status(400).json({ error: "action must be approve or reject" });
}

const appointment = await Appointment.findById(appointmentId);
if (!appointment) {
 return res.status(404).json({ error: "Appointment request not found" });
}

if (String(appointment.doctorId) !== String(doctorId)) {
 return res.status(403).json({ error: "This request is not assigned to this doctor" });
}

if (appointment.status !== "pending") {
 return res.status(400).json({ error: `Only pending requests can be updated. Current status: ${appointment.status}` });
}

const doctor = await User.findById(doctorId).select("name phone");
const patient = await User.findById(appointment.patientId || appointment.userId).select("name phone");

const normalizedAction = String(action).toLowerCase();

if (normalizedAction === "approve") {
 appointment.status = "scheduled";
 appointment.date = approvedDate || appointment.preferredDate || appointment.date || nextConsultationDate().date;
 appointment.time = approvedTime || appointment.preferredTime || appointment.time || nextConsultationDate().time;
 appointment.decisionNote = decisionNote || "Approved by doctor";

 await appointment.save();

 await Notification.insertMany([
  {
   userId: String(patient?._id || appointment.userId),
   title: "Consultation Approved",
   message: `Dr. ${doctor?.name || "Doctor"} approved your request. Date: ${appointment.date} ${appointment.time}. Token: ${appointment.token}`,
   type: "appointment"
  },
  {
   userId: String(doctorId),
   title: "Request Approved",
   message: `Approved consultation for ${patient?.name || "patient"}. Date: ${appointment.date} ${appointment.time}`,
   type: "appointment"
  }
 ]);

 await Promise.all([
  sendWhatsApp({
   to: patient?.phone,
   body: `[PATIENT COPY] Your consultation request is approved. Date: ${appointment.date} ${appointment.time}. Token: ${appointment.token}.`
  }),
  sendWhatsApp({
   to: doctor?.phone,
   body: `[DOCTOR COPY] You approved consultation for ${patient?.name || "patient"}. Date: ${appointment.date} ${appointment.time}.`
  })
 ]);

 return res.json({ message: "Consultation approved", appointment });
}

appointment.status = "rejected";
appointment.decisionNote = decisionNote || "Not approved by doctor";
await appointment.save();

await Notification.insertMany([
 {
  userId: String(patient?._id || appointment.userId),
  title: "Consultation Request Not Approved",
  message: `Dr. ${doctor?.name || "Doctor"} did not approve your request${appointment.decisionNote ? `: ${appointment.decisionNote}` : ""}.`,
  type: "appointment"
 },
 {
  userId: String(doctorId),
  title: "Request Rejected",
  message: `Rejected consultation for ${patient?.name || "patient"}.`,
  type: "appointment"
 }
]);

await Promise.all([
 sendWhatsApp({
  to: patient?.phone,
  body: `[PATIENT COPY] Your consultation request was not approved by Dr. ${doctor?.name || "Doctor"}${appointment.decisionNote ? `. Note: ${appointment.decisionNote}` : ""}.`
 }),
 sendWhatsApp({
  to: doctor?.phone,
  body: `[DOCTOR COPY] You rejected consultation request for ${patient?.name || "patient"}.`
 })
]);

res.json({ message: "Consultation rejected", appointment });

} catch (error) {

res.status(500).json({ error: error.message });

}

});


// GET DOCTOR APPOINTMENTS
router.get("/doctor/:doctorId", async (req, res) => {

try {

const appointments = await Appointment.find({ doctorId: req.params.doctorId }).sort({ createdAt: -1 });
res.json(appointments);

} catch (error) {

res.status(500).json({ error: error.message });

}

});


// GET DOCTOR ASSIGNED PATIENTS
router.get("/doctor/:doctorId/patients", async (req, res) => {

try {

const appointments = await Appointment.find({ doctorId: req.params.doctorId }).sort({ createdAt: -1 });
const patientIds = [...new Set(appointments.map((item) => item.patientId || item.userId).filter(Boolean))];
const patients = await User.find({ _id: { $in: patientIds } }).select("name email phone city");
const vitals = await Vital.find({ userId: { $in: patientIds } }).sort({ date: -1 });

const latestAppointmentByPatient = new Map();
appointments.forEach((item) => {
 const patientId = String(item.patientId || item.userId || "");
 if (patientId && !latestAppointmentByPatient.has(patientId)) {
  latestAppointmentByPatient.set(patientId, item);
 }
});

const latestVitalByPatient = new Map();
vitals.forEach((item) => {
 const patientId = String(item.userId || "");
 if (patientId && !latestVitalByPatient.has(patientId)) {
  latestVitalByPatient.set(patientId, item);
 }
});

const enrichedPatients = patients.map((patient) => {
 const patientId = String(patient._id);
 const latestAppointment = latestAppointmentByPatient.get(patientId);
 const latestVital = latestVitalByPatient.get(patientId);
 const lastAppointmentAt = latestAppointment?.createdAt ? new Date(latestAppointment.createdAt).getTime() : 0;
 const lastVitalAt = latestVital?.date ? new Date(latestVital.date).getTime() : 0;
 const recentActivityAt = Math.max(lastAppointmentAt, lastVitalAt);
 const isCritical = Boolean(latestVital?.isAbnormal);
 const criticalReason = Array.isArray(latestVital?.alertReason) ? latestVital.alertReason : [];
 const priorityScore = (isCritical ? 10 ** 13 : 0) + recentActivityAt;

 return {
  _id: patient._id,
  name: patient.name,
  email: patient.email,
  phone: patient.phone,
  city: patient.city,
  isCritical,
  criticalReason,
  recentActivityAt: recentActivityAt ? new Date(recentActivityAt).toISOString() : null,
  lastAppointmentStatus: latestAppointment?.status || "unknown",
  priorityScore
 };
});

enrichedPatients.sort((a, b) => b.priorityScore - a.priorityScore);

res.json(enrichedPatients);

} catch (error) {

res.status(500).json({ error: error.message });

}

});


// GET USER APPOINTMENTS
router.get("/:userId", async (req,res)=>{

try{

const appointments = await Appointment.find({userId:req.params.userId}).sort({ createdAt: -1 });

res.json(appointments);

}
catch(error){

res.status(500).json({error:error.message});

}

});


module.exports = router;