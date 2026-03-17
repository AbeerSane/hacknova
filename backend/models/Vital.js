const mongoose = require("mongoose");

const vitalSchema = new mongoose.Schema({

 userId:String,

 heartRate:Number,
 bloodPressure:String,
 spo2:Number,
 temperature:Number,
 isAbnormal:{
  type:Boolean,
  default:false
 },
 alertReason:[String],

 date:{
  type:Date,
  default:Date.now
 }

});

module.exports = mongoose.model("Vital",vitalSchema);