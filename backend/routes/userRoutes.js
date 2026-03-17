const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const User = require("../models/User");
const { sendResetOtpMail } = require("../services/mailService");

const jwtSecret = process.env.JWT_SECRET || "healthapp-dev-secret";

function hashOtp(otp) {
 return crypto.createHash("sha256").update(String(otp)).digest("hex");
}

// CREATE USER
router.post("/register", async (req, res) => {

try {

const {
 name,
 email,
 password,
 role,
 phone,
 specialization,
 city,
 caregivers,
 doctorIdentityFile,
 doctorIdentityFileName
} = req.body;
const existingUser = await User.findOne({ email });

if (existingUser) {
 return res.status(400).json({ error: "Email already registered" });
}

const hashedPassword = await bcrypt.hash(password, 10);

if ((role || "patient") === "doctor" && !doctorIdentityFile) {
 return res.status(400).json({ error: "Doctor identity file is mandatory" });
}

const user = new User({
 name,
 email,
 password: hashedPassword,
 role: role || "patient",
 phone,
 specialization,
 city,
 caregivers,
 doctorIdentityFile,
 doctorIdentityFileName
});

await user.save();

res.json({
message: "User registered successfully",
user: {
 id: user._id,
 name: user.name,
 email: user.email,
 role: user.role,
 phone: user.phone,
 specialization: user.specialization,
 city: user.city,
 avatarDataUrl: user.avatarDataUrl,
 bio: user.bio,
 gender: user.gender,
 dateOfBirth: user.dateOfBirth,
 address: user.address,
 clinicName: user.clinicName,
 yearsExperience: user.yearsExperience,
 licenseNumber: user.licenseNumber,
 doctorIdentityFileName: user.doctorIdentityFileName
}
});

} catch (error) {

res.status(500).json({error:error.message});

}

});


// LOGIN USER
router.post("/login", async (req, res) => {

 try {

  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
   return res.status(401).json({ error: "Invalid email or password" });
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
   return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = jwt.sign(
   { userId: user._id, role: user.role },
   jwtSecret,
   { expiresIn: "7d" }
  );

  res.json({
   message: "Login successful",
   token,
   user: {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    specialization: user.specialization,
    city: user.city,
    avatarDataUrl: user.avatarDataUrl,
    bio: user.bio,
    gender: user.gender,
    dateOfBirth: user.dateOfBirth,
    address: user.address,
    clinicName: user.clinicName,
    yearsExperience: user.yearsExperience,
    licenseNumber: user.licenseNumber,
    doctorIdentityFileName: user.doctorIdentityFileName
   }
  });

 } catch (error) {

  res.status(500).json({ error: error.message });

 }

});


// REQUEST PASSWORD RESET OTP
router.post("/forgot-password", async (req, res) => {

 try {

  const { email } = req.body;
  if (!email) {
   return res.status(400).json({ error: "Email is required" });
  }

  const user = await User.findOne({ email });

  if (!user) {
   return res.json({ message: "If the email exists, an OTP has been sent." });
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  user.resetOtpHash = hashOtp(otp);
  user.resetOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();

  await sendResetOtpMail({ to: email, otp });

  res.json({ message: "OTP sent to your email" });

 } catch (error) {

  res.status(500).json({ error: error.message });

 }

});


// RESET PASSWORD USING OTP
router.post("/reset-password", async (req, res) => {

 try {

  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
   return res.status(400).json({ error: "Email, OTP, and newPassword are required" });
  }

  if (String(newPassword).length < 6) {
   return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  const user = await User.findOne({ email });
  if (!user || !user.resetOtpHash || !user.resetOtpExpiresAt) {
   return res.status(400).json({ error: "Invalid or expired OTP" });
  }

  if (new Date(user.resetOtpExpiresAt).getTime() < Date.now()) {
   return res.status(400).json({ error: "OTP has expired" });
  }

  const providedHash = hashOtp(otp);
  if (providedHash !== user.resetOtpHash) {
   return res.status(400).json({ error: "Invalid OTP" });
  }

  user.password = await bcrypt.hash(newPassword, 10);
  user.resetOtpHash = undefined;
  user.resetOtpExpiresAt = undefined;
  await user.save();

  res.json({ message: "Password reset successful. Please login." });

 } catch (error) {

  res.status(500).json({ error: error.message });

 }

});


// GET DOCTORS
router.get("/doctors/list", async (req, res) => {

try {

const doctors = await User.find({ role: "doctor", isAvailable: true }).select("name email phone specialization city");
res.json(doctors);

} catch (error) {

res.status(500).json({ error: error.message });

}

});

router.get("/:id", async (req, res) => {
 try {
  const user = await User.findById(req.params.id).select("-password");
  if (!user) {
   return res.status(404).json({ error: "User not found" });
  }
  res.json(user);
 } catch (error) {
  res.status(500).json({ error: error.message });
 }
});

router.put("/:id/profile", async (req, res) => {
 try {
  const allowedUpdates = [
   "name",
   "phone",
   "city",
   "specialization",
   "avatarDataUrl",
   "bio",
   "gender",
   "dateOfBirth",
   "address",
   "clinicName",
   "yearsExperience",
   "licenseNumber"
  ];

  const updates = {};
  allowedUpdates.forEach((key) => {
   if (Object.prototype.hasOwnProperty.call(req.body, key)) {
    updates[key] = req.body[key];
   }
  });

  const user = await User.findByIdAndUpdate(req.params.id, updates, {
    returnDocument: "after",
   runValidators: true
  }).select("-password");

  if (!user) {
   return res.status(404).json({ error: "User not found" });
  }

  res.json({
   message: "Profile updated",
   user: {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    specialization: user.specialization,
    city: user.city,
    avatarDataUrl: user.avatarDataUrl,
    bio: user.bio,
    gender: user.gender,
    dateOfBirth: user.dateOfBirth,
    address: user.address,
    clinicName: user.clinicName,
    yearsExperience: user.yearsExperience,
    licenseNumber: user.licenseNumber,
    doctorIdentityFileName: user.doctorIdentityFileName
   }
  });
 } catch (error) {
  res.status(500).json({ error: error.message });
 }
});


// GET ALL USERS
router.get("/", async (req,res)=>{

try{

const users = await User.find();

res.json(users);

}
catch(error){

res.status(500).json({error:error.message});

}

});


module.exports = router;