const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema({

 userId:String,
 patientId:String,
 doctorId:String,
 doctor:String,
 hospital:String,
 date:String,
 time:String,
 preferredDate:String,
 preferredTime:String,
 notes:String,
 decisionNote:String,
 token:String,
 status:{
  type:String,
  enum:["pending","scheduled","completed","cancelled","rejected"],
  default:"scheduled"
 }

},{timestamps:true});

module.exports = mongoose.model("Appointment",appointmentSchema);