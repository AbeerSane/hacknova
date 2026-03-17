const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema({
 patientId: { type: String, required: true },
 patientName: String,
 patientEmail: String,
 doctorId: String,
 latestVitals: { type: Object, default: {} },
 vitalCount: { type: Number, default: 0 },
 medicationCount: { type: Number, default: 0 },
 appointmentCount: { type: Number, default: 0 },
 alertCount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model("Report", reportSchema);
