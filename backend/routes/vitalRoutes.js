const express = require("express");
const router = express.Router();

const Vital = require("../models/Vital");
const Appointment = require("../models/Appointment");
const Notification = require("../models/Notification");
const User = require("../models/User");
const { sendWhatsApp } = require("../services/whatsappService");

function detectAbnormal(vital) {
 const reasons = [];
 const heartRate = Number(vital.heartRate);
 const spo2 = Number(vital.spo2);
 const temperature = Number(vital.temperature);

 if (!Number.isNaN(heartRate) && (heartRate < 50 || heartRate > 120)) {
  reasons.push("Heart rate out of safe range");
 }

 if (!Number.isNaN(spo2) && spo2 < 92) {
  reasons.push("SpO2 below safe threshold");
 }

 if (!Number.isNaN(temperature) && temperature > 101) {
  reasons.push("Body temperature indicates fever");
 }

 return reasons;
}


// ADD VITAL DATA
router.post("/add", async (req,res)=>{

try{

const reasons = detectAbnormal(req.body);

const vital = new Vital({
 ...req.body,
 isAbnormal: reasons.length > 0,
 alertReason: reasons
});

await vital.save();

if (reasons.length) {
 const patient = await User.findById(req.body.userId).select("name phone");
 const latestAppointment = await Appointment.findOne({ userId: String(req.body.userId) }).sort({ createdAt: -1 });
 const notifications = [
  {
   userId: String(req.body.userId),
   title: "Abnormal Vitals Detected",
   message: reasons.join(", "),
   type: "vital-alert"
  }
 ];

 if (latestAppointment?.doctorId) {
    const assignedDoctor = await User.findById(latestAppointment.doctorId).select("name phone");
  notifications.push({
   userId: String(latestAppointment.doctorId),
   title: "Patient Needs Attention",
   message: `Patient ${req.body.userId} has abnormal vitals: ${reasons.join(", ")}`,
   type: "vital-alert"
  });

    await sendWhatsApp({
     to: assignedDoctor?.phone,
     body: `[DOCTOR COPY] Abnormal vitals detected for ${patient?.name || req.body.userId}: ${reasons.join(", ")}.`
    });
 }

 await Notification.insertMany(notifications);

 await sendWhatsApp({
    to: patient?.phone,
    body: `[PATIENT COPY] Your vitals are outside safe range: ${reasons.join(", ")}. Please consult your doctor.`
 });
}

res.json({
message:"Vital data saved",
vital,
requiresAttention: reasons.length > 0,
alertReason: reasons
});

}
catch(error){

res.status(500).json({error:error.message});

}

});


// GET VITALS BY USER
router.get("/:userId", async (req,res)=>{

try{

const vitals = await Vital.find({userId:req.params.userId});

res.json(vitals);

}
catch(error){

res.status(500).json({error:error.message});

}

});


module.exports = router;