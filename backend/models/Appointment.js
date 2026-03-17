const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema({

 userId:String,
 patientId:String,
 doctorId:String,
 doctor:String,
 hospital:String,
 date:String,
 time:String,
 notes:String,
 token:String,
 status:{
  type:String,
  enum:["pending","scheduled","completed","cancelled"],
  default:"scheduled"
 }

},{timestamps:true});

module.exports = mongoose.model("Appointment",appointmentSchema);