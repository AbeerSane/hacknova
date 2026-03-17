const mongoose = require("mongoose");

const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/healthapp";

mongoose
	.connect(mongoUri)
	.then(() => console.log("MongoDB Connected"))
	.catch((err) => console.log("MongoDB connection error:", err.message));

module.exports = mongoose;