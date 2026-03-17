const mongoose = require("mongoose");

const prescriptionSchema = new mongoose.Schema({
 doctorId: { type: String, required: true },
 patientId: { type: String, required: true },
 medicineName: { type: String, required: true },
 dosage: { type: String, required: true },
 frequencyPerDay: { type: Number, required: true },
 durationDays: { type: Number, required: true },
 startDate: { type: String, required: true },
 endDate: String,
 times: [String],
 notes: String,
 status: {
  type: String,
  enum: ["active", "completed", "cancelled"],
  default: "active"
 }
}, { timestamps: true });

module.exports = mongoose.model("Prescription", prescriptionSchema);
