# HealthApp Care+

A full-stack healthcare monitoring and tele-consultation platform with patient and doctor dashboards, vital tracking, emergency flows, AI insights, map-based nearby doctor discovery, and chatbot support.

## What This Project Includes

- Role-based authentication (Patient / Doctor)
- Patient dashboard:
  - Vitals (manual + sensor simulation mode)
  - Medication tracking and calendar view
  - Appointment requests and status tracking
  - Emergency SOS flow
  - Report generation and doctor sharing
  - Nearby doctors map (live location with fallback)
  - Unified AI insights panel
- Doctor dashboard:
  - Consultation request triage
  - Approve/reject consultation requests
  - Patient data review and recommendations
  - Alerts and reports visibility
- Integrations:
  - Gemini chatbot
  - Twilio WhatsApp notifications
  - SMTP email OTP reset flow
- Unified AI engine (modular):
  - Risk prediction
  - Recommendations
  - Trend-based alerts
  - Monitoring frequency and consult suggestion
  - Report analysis
  - Context-aware chatbot response support
  - Near-term prediction

## Tech Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: MongoDB + Mongoose
- Auth: JWT + bcrypt
- PDF: jsPDF
- AI/LLM: Google Gemini API
- Messaging: Twilio WhatsApp
- Email: Nodemailer (SMTP)
- Maps: React Leaflet + OpenStreetMap

## Project Structure

- frontend/: React app UI
- backend/: Express API server
  - routes/: feature API modules
  - models/: Mongoose models
  - services/: integration and AI service modules

## Prerequisites

- Node.js 18+
- npm 9+
- MongoDB running locally or cloud URI

## Installation

1. Install dependencies:

```bash
npm install
```

2. Create a .env file in project root.

## Environment Variables

Set the following in .env:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/healthapp
JWT_SECRET=replace_with_secure_secret

# Gemini
GEMINI_API_KEY=your_gemini_api_key

# Twilio WhatsApp
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
TWILIO_DEFAULT_TO=whatsapp:+91xxxxxxxxxx
TWILIO_USE_DEFAULT_FOR_ALL=true

# SMTP (forgot password OTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=your_email@gmail.com
```

Notes:
- For Gmail SMTP, use an App Password (not your normal account password).
- If Twilio vars are missing, WhatsApp delivery is skipped gracefully.

## Run the App

Run backend + frontend together:

```bash
npm run dev
```

Useful scripts:

```bash
npm run backend
npm run frontend
npm run frontend:build
npm run frontend:preview
```

Default URLs:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

## Key API Endpoints

### Auth and Users
- POST /api/users/register
- POST /api/users/login
- POST /api/users/forgot-password
- POST /api/users/reset-password
- GET /api/users/doctors/list
- PUT /api/users/:id/profile

### Vitals, Medications, Appointments
- POST /api/vitals/add
- GET /api/vitals/:userId
- POST /api/medications/add
- GET /api/medications/:userId
- POST /api/appointments/request-consultation
- PATCH /api/appointments/doctor/:doctorId/appointments/:appointmentId/respond

### Alerts, SOS, Reports, Contact
- POST /api/sos
- GET /api/notifications/:userId
- POST /api/reports/add
- GET /api/reports/patient/:patientId
- GET /api/reports/doctor/:doctorId
- POST /api/contact

### Chatbot + Unified AI
- POST /api/chatbot/chat
- POST /api/ai/unified-analysis

## Unified AI Engine Input/Output

Endpoint: POST /api/ai/unified-analysis

Request:

```json
{
  "heartRate": [80, 85, 90, 110, 115],
  "spo2": [98, 97, 95, 93, 90],
  "reportData": {
    "hemoglobin": 11.2,
    "bp": "138/88",
    "sugar": 156
  },
  "question": "Do I need doctor consultation?"
}
```

Response:

```json
{
  "risk": {
    "riskLevel": "High",
    "confidence": 0.91,
    "reason": "heart rate trend is increasing and SpO2 trend is decreasing"
  },
  "recommendations": {
    "diet": ["..."],
    "lifestyle": ["..."],
    "precautions": ["..."]
  },
  "alerts": {
    "alert": true,
    "message": "...",
    "severity": "High"
  },
  "monitoring": {
    "checkFrequency": "every 30 minutes",
    "doctorConsult": true
  },
  "reportAnalysis": {
    "issues": ["..."],
    "summary": "..."
  },
  "prediction": {
    "prediction": "...",
    "timeFrame": "next 24 hours"
  },
  "chatbot": {
    "response": "...",
    "urgency": "high",
    "suggestion": "..."
  }
}
```

## In-App Testing Guide

### 1) Vitals Sensor Simulation
1. Login as Patient.
2. Go to My Health Vitals.
3. Click Sensor Simulation.
4. HR/SpO2/temperature auto-fill; BP remains manual entry.
5. Save vitals.

### 2) AI Insights in UI
1. In patient sidebar, open AI Insights.
2. Enter a question.
3. Click Run AI Analysis.
4. View risk/alerts/monitoring cards and full JSON.

### 3) Nearby Doctors Map
1. Open Nearby Doctors Map tab.
2. Allow location permissions for live coordinates.
3. Use Refresh Location to re-fetch GPS.
4. If permission denied, fallback location is used.

### 4) Chatbot Context Check
Call endpoint with health arrays and reportData; response includes contextual analysis fields.

## Troubleshooting

- Cannot POST on new routes:
  - Restart backend after route changes.
- Chatbot not responding with Gemini:
  - Verify GEMINI_API_KEY in .env.
  - Route has fallback response from local AI context if Gemini fails.
- OTP email not sent:
  - Check SMTP_* values and app password.
- WhatsApp not delivered:
  - Verify Twilio credentials and WhatsApp sender format.
- Build warnings about chunk size:
  - Informational for now; app still builds and runs.

## Security and Safety Notes

- This project is for educational/demo usage.
- AI outputs are supportive guidance, not medical diagnosis.
- Do not store real patient secrets in test/demo environments.

## License

ISC
