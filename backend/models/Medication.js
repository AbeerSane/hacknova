const mongoose = require("mongoose");

const medicationSchema = new mongoose.Schema({

 userId:String,
 medicineName:String,
 dosage:String,
 date:String,
 time:String,
 taken:Boolean,
 prescribedBy:String,
 isDoctorOrder:{
  type:Boolean,
  default:false
 },
 prescriptionId:String

});

module.exports = mongoose.model("Medication",medicationSchema);