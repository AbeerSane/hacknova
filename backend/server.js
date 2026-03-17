const express = require("express")
const cors = require("cors")
const bodyParser = require("body-parser")
require("dotenv").config()

require("./db")

const userRoutes = require("./routes/userRoutes")
const medicationRoutes = require("./routes/medicationRoutes")
const appointmentRoutes = require("./routes/appointmentRoutes")
const vitalRoutes = require("./routes/vitalRoutes")
const contactRoutes = require("./routes/contactRoutes")
const sosRoutes = require("./routes/sosRoutes")
const notificationRoutes = require("./routes/notificationRoutes")
const reportRoutes = require("./routes/reportRoutes")
const chatbotRoutes = require("./routes/chatbotRoutes")
const prescriptionRoutes = require("./routes/prescriptionRoutes")
const aiRoutes = require("./routes/aiRoutes")

const app = express()
const port = process.env.PORT || 5000

app.use(cors())
app.use(bodyParser.json({ limit: "12mb" }))

app.use("/api/users",userRoutes)
app.use("/api/medications",medicationRoutes)
app.use("/api/appointments",appointmentRoutes)
app.use("/api/vitals",vitalRoutes)
app.use("/api/contact",contactRoutes)
app.use("/api/sos",sosRoutes)
app.use("/api/notifications",notificationRoutes)
app.use("/api/reports",reportRoutes)
app.use("/api/chatbot",chatbotRoutes)
app.use("/api/prescriptions",prescriptionRoutes)
app.use("/api/ai",aiRoutes)

app.get("/api/health", (req, res) => {
 res.json({ status: "ok" })
})

app.listen(port,()=>{
 console.log(`Server running on port ${port}`)
})