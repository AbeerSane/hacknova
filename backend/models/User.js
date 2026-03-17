const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({

 name:String,
 email:{
  type:String,
  unique:true,
  required:true
 },
 password:String,
 role:{
  type:String,
  enum:["patient","doctor"],
  default:"patient"
 },
 phone:String,
 specialization:String,
 isAvailable:{
  type:Boolean,
  default:true
 },

 city:String,

 caregivers:[
 {
  name:String,
  phone:String
 }
 ]

});

module.exports = mongoose.model("User",userSchema);