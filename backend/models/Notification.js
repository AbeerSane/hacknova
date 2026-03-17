const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
 {
  userId: String,
  title: String,
  message: String,
  type: {
   type: String,
   enum: ["appointment", "vital-alert", "medication", "system", "emergency"],
   default: "system"
  },
    priority: {
     type: String,
     enum: ["low", "medium", "high", "critical"],
     default: "medium"
    },
  isRead: {
   type: Boolean,
   default: false
  }
 },
 { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
