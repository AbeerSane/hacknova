const express = require("express");
const router = express.Router();

const Appointment = require("../models/Appointment");
const User = require("../models/User");
const Notification = require("../models/Notification");
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

const { patientId, notes, doctorId } = req.body;

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

const appointment = new Appointment({
 userId: String(patient._id),
 patientId: String(patient._id),
 doctorId: String(selectedDoctor._id),
 doctor: selectedDoctor.name,
 hospital: "HealthApp Tele-Consult",
 date: consultationSlot.date,
 time: consultationSlot.time,
 notes: notes || "Consultation requested after vital update",
 token: buildToken(),
 status: "scheduled"
});

await appointment.save();

await Notification.insertMany([
 {
  userId: String(patient._id),
  title: "Consultation Scheduled",
  message: `Dr. ${selectedDoctor.name} assigned. Token: ${appointment.token}. ${appointment.date} at ${appointment.time}`,
  type: "appointment"
 },
 {
  userId: String(selectedDoctor._id),
  title: "New Patient Assigned",
  message: `${patient.name} assigned for consultation. Token: ${appointment.token}.`,
  type: "appointment"
 }
]);

await Promise.all([
 sendWhatsApp({
  to: patient.phone,
    body: `[PATIENT COPY] Consultation scheduled with Dr. ${selectedDoctor.name}. Token: ${appointment.token}. Date: ${appointment.date} ${appointment.time}.`
 }),
 sendWhatsApp({
  to: selectedDoctor.phone,
    body: `[DOCTOR COPY] New patient assigned: ${patient.name}. Token: ${appointment.token}. Date: ${appointment.date} ${appointment.time}.`
 })
]);

res.json({
 message: "Doctor assigned and consultation scheduled",
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

const appointments = await Appointment.find({ doctorId: req.params.doctorId });
const patientIds = [...new Set(appointments.map((item) => item.patientId || item.userId).filter(Boolean))];
const patients = await User.find({ _id: { $in: patientIds } }).select("name email phone");

res.json(patients);

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