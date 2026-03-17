const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");

const jwtSecret = process.env.JWT_SECRET || "healthapp-dev-secret";

// CREATE USER
router.post("/register", async (req, res) => {

try {

const { name, email, password, role, phone, specialization, city, caregivers } = req.body;
const existingUser = await User.findOne({ email });

if (existingUser) {
 return res.status(400).json({ error: "Email already registered" });
}

const hashedPassword = await bcrypt.hash(password, 10);

const user = new User({
 name,
 email,
 password: hashedPassword,
 role: role || "patient",
 phone,
 specialization,
 city,
 caregivers
});

await user.save();

res.json({
message: "User registered successfully",
user: {
 id: user._id,
 name: user.name,
 email: user.email,
 role: user.role
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
 city: user.city
 }
});

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