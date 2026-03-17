import { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../config";
import BrandLogo from "../components/BrandLogo";
import CountUp from "../components/CountUp";
import { MiniLineChart, RingProgressChart } from "../components/RealtimeCharts";
import UserAvatar from "../components/UserAvatar";
import NearbyDoctorsMap from "../components/NearbyDoctorsMap";

function randomInt(min, max) {
 return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max, decimals = 1) {
 const value = min + Math.random() * (max - min);
 return Number(value.toFixed(decimals));
}

function generateSimulatedHealthData() {
 const profileBand = Math.random();

 let heartRate;
 if (profileBand < 0.33) {
  heartRate = randomInt(62, 74);
 } else if (profileBand < 0.66) {
  heartRate = randomInt(72, 86);
 } else {
  heartRate = randomInt(84, 98);
 }

 const spo2Min = heartRate > 90 ? 95 : 96;
 const spo2 = randomInt(spo2Min, 100);

 const tempCenter = heartRate < 72 ? 36.7 : heartRate < 86 ? 36.9 : 37.2;
 const temperature = Math.max(36.5, Math.min(37.5, randomFloat(tempCenter - 0.2, tempCenter + 0.2, 1)));

 return {
  heartRate,
  spo2,
  temperature,
   systolicBP: null,
   diastolicBP: null,
  status: "simulated"
 };
}

const sidebarItems = [
 { id: "overview", label: "Dashboard Overview" },
 { id: "vitals", label: "My Health Vitals" },
 { id: "medications", label: "Medication Tracker" },
 { id: "appointments", label: "Appointments" },
 { id: "nearby", label: "Nearby Doctors Map" },
 { id: "ai", label: "AI Insights" },
 { id: "reports", label: "Health Reports" },
 { id: "alerts", label: "Alerts & Notifications" },
 { id: "emergency", label: "Emergency Help" },
 { id: "contact", label: "Contact Us" },
 { id: "profile", label: "Profile Settings" }
];

export default function PatientDashboard() {
 const { session, logout, updateUser } = useAuth();
 const [searchParams] = useSearchParams();
 const navigate = useNavigate();
 const user = session.user;
 const todayISO = new Date().toISOString().slice(0, 10);
 const [vitals, setVitals] = useState([]);
 const [medications, setMedications] = useState([]);
 const [appointments, setAppointments] = useState([]);
 const [notifications, setNotifications] = useState([]);
 const [status, setStatus] = useState("");
 const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "overview");
 const [doctors, setDoctors] = useState([]);
 const [vitalForm, setVitalForm] = useState({ heartRate: "", bloodPressure: "", spo2: "", temperature: "" });
 const [vitalInputMode, setVitalInputMode] = useState("manual");
 const [simulatedSensorJson, setSimulatedSensorJson] = useState(null);
 const [aiQuestion, setAiQuestion] = useState("Explain my health trend and risk in simple terms");
 const [aiAnalysis, setAiAnalysis] = useState(null);
 const [aiLoading, setAiLoading] = useState(false);
 const [medForm, setMedForm] = useState({ medicineName: "", dosage: "", date: todayISO, time: "" });
 const [selectedMedDate, setSelectedMedDate] = useState(todayISO);
 const [calendarMonth, setCalendarMonth] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
 const [emergencyMessage, setEmergencyMessage] = useState("");
 const [emergencyPriority, setEmergencyPriority] = useState("high");
 const [consultPreference, setConsultPreference] = useState(() => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return {
   preferredDate: tomorrow.toISOString().slice(0, 10),
   preferredTime: "11:00",
   notes: "Patient-selected consultation"
  };
 });
 const [contactForm, setContactForm] = useState({
  name: user.name || "",
  email: user.email || "",
  message: ""
 });
 const [profileForm, setProfileForm] = useState({
  name: user.name || "",
  phone: user.phone || "",
  city: user.city || "",
  gender: user.gender || "",
  dateOfBirth: user.dateOfBirth || "",
  address: user.address || "",
  bio: user.bio || "",
  avatarDataUrl: user.avatarDataUrl || ""
 });

 const latestVital = useMemo(() => (vitals.length ? vitals[vitals.length - 1] : null), [vitals]);
 const medicationsByDate = useMemo(() => {
  return medications.reduce((acc, item) => {
   const key = item.date || todayISO;
   if (!acc[key]) {
    acc[key] = [];
   }
   acc[key].push(item);
   return acc;
  }, {});
 }, [medications, todayISO]);

 const selectedDateMeds = useMemo(() => medicationsByDate[selectedMedDate] || [], [medicationsByDate, selectedMedDate]);

 const recentVitals = useMemo(() => vitals.slice(-8), [vitals]);
 const heartRateTrend = useMemo(() => recentVitals.map((item) => Number(item.heartRate)).filter((value) => Number.isFinite(value)), [recentVitals]);
 const todayMedicationStats = useMemo(() => {
  const todaysMeds = medicationsByDate[todayISO] || [];
  const completed = todaysMeds.filter((item) => item.taken).length;
  const total = todaysMeds.length;
  return {
   completed,
   total,
   adherence: total ? Math.round((completed / total) * 100) : 0
  };
 }, [medicationsByDate, todayISO]);

 const allocatedMedicationStats = useMemo(() => {
  const prescribedMeds = medications.filter((item) => item.isDoctorOrder);
  const todaysAllocated = prescribedMeds.filter((item) => item.date === todayISO).length;

  return {
   totalAllocated: prescribedMeds.length,
   todaysAllocated
  };
 }, [medications, todayISO]);

 const calendarCells = useMemo(() => {
  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const firstWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];

  for (let i = 0; i < firstWeekday; i += 1) {
   cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
   const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
   cells.push({ day, dateStr, count: (medicationsByDate[dateStr] || []).length });
  }

  return cells;
 }, [calendarMonth, medicationsByDate]);

 const loadData = async () => {
  try {
    const results = await Promise.allSettled([
      apiRequest(`/vitals/${user.id}`),
      apiRequest(`/medications/${user.id}`),
      apiRequest(`/appointments/${user.id}`),
      apiRequest(`/notifications/${user.id}`),
      apiRequest("/users/doctors/list")
    ]);

    const [vitalResult, medResult, appointmentResult, notificationResult, doctorResult] = results;

    if (vitalResult.status === "fulfilled") {
      setVitals(vitalResult.value);
    }
    if (medResult.status === "fulfilled") {
      setMedications(medResult.value);
    }
    if (appointmentResult.status === "fulfilled") {
      setAppointments(appointmentResult.value);
    }
    if (notificationResult.status === "fulfilled") {
      setNotifications(notificationResult.value);
    }
    if (doctorResult.status === "fulfilled") {
      setDoctors(doctorResult.value);
    }

    const firstError = results.find((item) => item.status === "rejected");
    if (firstError) {
      setStatus(`Some dashboard data failed to load: ${firstError.reason?.message || "Unknown error"}`);
    }
  } catch (error) {
   setStatus(error.message);
  }
 };

 useEffect(() => {
  loadData();
 }, []);

useEffect(() => {
 const interval = setInterval(() => {
  loadData();
 }, 30000);

 return () => clearInterval(interval);
}, []);

 useEffect(() => {
  const tab = searchParams.get("tab");
  if (tab && sidebarItems.some((item) => item.id === tab)) {
   setActiveTab(tab);
  }
 }, [searchParams]);

 useEffect(() => {
  setProfileForm({
   name: user.name || "",
   phone: user.phone || "",
   city: user.city || "",
   gender: user.gender || "",
   dateOfBirth: user.dateOfBirth || "",
   address: user.address || "",
   bio: user.bio || "",
   avatarDataUrl: user.avatarDataUrl || ""
  });
 }, [user]);

 const handleProfileAvatarChange = (event) => {
  const file = event.target.files?.[0];
  if (!file) {
   return;
  }

  const reader = new FileReader();
  reader.onload = () => {
   setProfileForm((prev) => ({ ...prev, avatarDataUrl: String(reader.result || "") }));
  };
  reader.readAsDataURL(file);
 };

 const saveProfile = async (event) => {
  event.preventDefault();
  setStatus("Saving profile...");

  try {
   const response = await apiRequest(`/users/${user.id}/profile`, {
    method: "PUT",
    body: JSON.stringify(profileForm)
   });

   updateUser(response.user);
   setStatus("Profile updated successfully");
   navigate("/");
  } catch (error) {
   setStatus(error.message);
  }
 };

 const saveVital = async (event) => {
  event.preventDefault();
  setStatus("Saving vitals...");

  try {
   const payload = {
    userId: user.id,
    heartRate: Number(vitalForm.heartRate),
    bloodPressure: vitalForm.bloodPressure,
    spo2: Number(vitalForm.spo2),
    temperature: Number(vitalForm.temperature)
   };

   const result = await apiRequest("/vitals/add", {
    method: "POST",
    body: JSON.stringify(payload)
   });

   setVitalForm({ heartRate: "", bloodPressure: "", spo2: "", temperature: "" });
   setActiveTab("appointments");
   await loadData();
   setStatus(result.requiresAttention ? "Vitals saved with alert notification" : "Vitals saved successfully");
  } catch (error) {
   setStatus(error.message);
  }
 };

 const applySimulatedSensorReadings = () => {
  const generated = generateSimulatedHealthData();
  setSimulatedSensorJson(generated);

  const temperatureF = Number(((generated.temperature * 9) / 5 + 32).toFixed(1));

  setVitalForm({
   heartRate: String(generated.heartRate),
   bloodPressure: vitalForm.bloodPressure,
   spo2: String(generated.spo2),
   temperature: String(temperatureF)
  });

  setStatus("Simulated sensor readings generated and applied to form");
 };

 const handleSelectSensorMode = () => {
  setVitalInputMode("sensor");
  applySimulatedSensorReadings();
 };

 const saveMedication = async (event) => {
  event.preventDefault();
  setStatus("Saving medication...");

  try {
   await apiRequest("/medications/add", {
    method: "POST",
    body: JSON.stringify({ ...medForm, userId: user.id, taken: false })
   });
   setMedForm({ medicineName: "", dosage: "", date: todayISO, time: "" });
   await loadData();
   setStatus("Medication added");
    setActiveTab("medications");
  } catch (error) {
   setStatus(error.message);
  }
 };

 const sendSOS = async () => {
 const latestDoctorId = [...appointments]
   .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
   .find((item) => item.doctorId)?.doctorId;

 if (!latestDoctorId) {
   setStatus("No assigned doctor found. Request a consultation first.");
   return;
 }

 if (!emergencyMessage.trim()) {
   setStatus("Please enter urgency details before sending.");
   return;
 }

  try {
   await apiRequest("/sos", {
    method: "POST",
      body: JSON.stringify({
       userId: user.id,
       doctorId: latestDoctorId,
         description: emergencyMessage,
         priority: emergencyPriority
      })
   });
    setEmergencyMessage("");
   await loadData();
    setStatus("Urgency message sent to your doctor");
  } catch (error) {
   setStatus(error.message);
  }
 };

 const submitContact = async (event) => {
    event.preventDefault();
    setStatus("Sending message...");

    try {
     await apiRequest("/contact", {
        method: "POST",
        body: JSON.stringify(contactForm)
     });
     setContactForm((prev) => ({ ...prev, message: "" }));
     setStatus("Message sent to support team");
    } catch (error) {
     setStatus(error.message);
    }
 };

 const generateAndSendReport = async () => {
  setStatus("Generating report...");
  try {
   const alertCount = notifications.filter((n) => n.type === "vital-alert" || n.type === "emergency").length;
   const doc = new jsPDF();

   doc.setFillColor(0, 150, 136);
   doc.rect(0, 0, 210, 30, "F");
   doc.setTextColor(255, 255, 255);
   doc.setFontSize(20);
   doc.text("HealthApp \u2014 Patient Health Report", 20, 20);

   doc.setTextColor(0, 0, 0);
   doc.setFontSize(12);
   doc.text(`Patient: ${user.name}`, 20, 45);
   doc.text(`Email: ${user.email}`, 20, 55);
   doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 65);

   doc.setFontSize(14);
   doc.setTextColor(0, 150, 136);
   doc.text("Latest Vitals", 20, 85);
   doc.setTextColor(0, 0, 0);
   doc.setFontSize(11);
   doc.text(`Heart Rate: ${latestVital?.heartRate ?? "N/A"}`, 20, 97);
   doc.text(`Blood Pressure: ${latestVital?.bloodPressure ?? "N/A"}`, 20, 107);
   doc.text(`SpO2: ${latestVital?.spo2 ?? "N/A"}%`, 20, 117);
   doc.text(`Temperature: ${latestVital?.temperature ?? "N/A"}\u00b0F`, 20, 127);

   doc.setFontSize(14);
   doc.setTextColor(0, 150, 136);
   doc.text("Health Summary", 20, 147);
   doc.setTextColor(0, 0, 0);
   doc.setFontSize(11);
   doc.text(`Total Vitals Records: ${vitals.length}`, 20, 159);
   doc.text(`Total Medications: ${medications.length}`, 20, 169);
   doc.text(`Total Appointments: ${appointments.length}`, 20, 179);
   doc.text(`Alerts Received: ${alertCount}`, 20, 189);

   const fileName = `health-report-${user.name.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.pdf`;
   doc.save(fileName);

   const assignedDoctorId = appointments.find((a) => a.doctorId)?.doctorId || null;

   await apiRequest("/reports/add", {
    method: "POST",
    body: JSON.stringify({
     patientId: user.id,
     patientName: user.name,
     patientEmail: user.email,
     doctorId: assignedDoctorId,
     latestVitals: latestVital || {},
     vitalCount: vitals.length,
     medicationCount: medications.length,
     appointmentCount: appointments.length,
     alertCount
    })
   });

   setStatus(assignedDoctorId ? `Report downloaded and sent to doctor! (ID: ${assignedDoctorId})` : "Report downloaded. (No assigned doctor yet — request a consultation to send it automatically.)");
  } catch (error) {
   setStatus(error.message);
  }
 };

 const runAiAnalysis = async () => {
  setAiLoading(true);
  setStatus("Running AI analysis...");

  try {
   const heartRateSeries = vitals
    .slice(-50)
    .map((item) => Number(item.heartRate))
    .filter((value) => Number.isFinite(value));

   const spo2Series = vitals
    .slice(-50)
    .map((item) => Number(item.spo2))
    .filter((value) => Number.isFinite(value));

   if (heartRateSeries.length < 2 || spo2Series.length < 2) {
    setStatus("Add at least 2 vitals records to run AI analysis");
    setAiLoading(false);
    return;
   }

   const result = await apiRequest("/ai/unified-analysis", {
    method: "POST",
    body: JSON.stringify({
     heartRate: heartRateSeries,
     spo2: spo2Series,
     reportData: {
      bp: latestVital?.bloodPressure || "",
      hemoglobin: null,
      sugar: null
     },
     question: aiQuestion
    })
   });

   setAiAnalysis(result);
   setStatus("AI analysis completed");
  } catch (error) {
   setStatus(error.message);
  } finally {
   setAiLoading(false);
  }
 };

 const requestConsultation = async (selectedDoctorId) => {
  setStatus("Requesting consultation...");
  try {
    const response = await apiRequest("/appointments/request-consultation", {
    method: "POST",
      body: JSON.stringify({
         patientId: user.id,
         doctorId: selectedDoctorId,
         notes: consultPreference.notes,
         preferredDate: consultPreference.preferredDate,
         preferredTime: consultPreference.preferredTime
      })
   });
   await loadData();
      setStatus(`Request sent to Dr. ${response?.doctor?.name || "Assigned Doctor"} for ${consultPreference.preferredDate} ${consultPreference.preferredTime}. Waiting for approval.`);
    setActiveTab("appointments");
  } catch (error) {
   setStatus(error.message);
  }
 };

 return (
  <div className="min-h-screen bg-slate-100 p-4 md:p-8 dashboard-shell">
     <header className="bg-white rounded-2xl shadow p-4 mb-6 flex items-center justify-between dashboard-topbar">
        <div className="dashboard-header-brand">
       <Link to="/" className="dashboard-brand-link">
      <BrandLogo logoClassName="brand-logo-dashboard" />
       </Link>
        </div>
        <div className="dashboard-header-center">
         <p className="text-sm text-gray-500">Patient Dashboard</p>
         <h1 className="text-xl font-semibold">Welcome, {user.name}</h1>
         <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800 border border-teal-100">
           <i className="fa-solid fa-capsules"></i>
           Medicines Allocated: {allocatedMedicationStats.totalAllocated}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800 border border-blue-100">
           <i className="fa-regular fa-clock"></i>
           Today's Doses: {allocatedMedicationStats.todaysAllocated}
          </span>
         </div>
        </div>
      <div className="flex items-center gap-3 dashboard-header-actions">
         <button
          type="button"
          className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 dashboard-profile-trigger"
          aria-label="Open profile settings"
          onClick={() => setActiveTab("profile")}
         >
            <UserAvatar
             image={user.avatarDataUrl}
             name={user.name}
             className="user-avatar-dashboard"
            />
         </button>
         <button className="submit-btn" onClick={logout}>Logout</button>
        </div>
     </header>

   <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
    <aside className="bg-white rounded-2xl shadow p-5">
         <h2 className="text-xl font-semibold mb-1">Patient Panel</h2>
         <p className="text-sm text-gray-500 mb-4">Accessible Navigation</p>
         <nav aria-label="Patient dashboard sections">
            <ul className="space-y-2 mb-8" role="tablist" aria-orientation="vertical">
             {sidebarItems.map((item) => (
                <li key={item.id}>
                 <button
                    role="tab"
                    aria-selected={activeTab === item.id}
                    aria-controls={`${item.id}-panel`}
                    id={`${item.id}-tab`}
                    className={`w-full text-left text-sm px-3 py-2 rounded transition ${activeTab === item.id ? "bg-teal-100 text-teal-800 font-semibold" : "bg-slate-50 text-gray-700"}`}
                    onClick={() => setActiveTab(item.id)}
                 >
                    {item.label}
                 </button>
                </li>
             ))}
            </ul>
         </nav>
    </aside>

    <main className="space-y-6">
         {activeTab === "overview" ? (
            <section id="overview-panel" role="tabpanel" aria-labelledby="overview-tab" className="bg-white rounded-2xl shadow p-6">
             <h2 className="text-3xl font-semibold mb-3">Dashboard Overview</h2>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 rounded-xl p-4"><p className="text-xs text-gray-500">Heart Rate</p><p className="text-2xl font-bold text-teal-600">{latestVital?.heartRate ? <CountUp to={Number(latestVital.heartRate)} duration={1.6} /> : "--"}</p></div>
                <div className="bg-slate-50 rounded-xl p-4"><p className="text-xs text-gray-500">Blood Pressure</p><p className="text-2xl font-bold text-blue-600">{latestVital?.bloodPressure || "--"}</p></div>
                <div className="bg-slate-50 rounded-xl p-4"><p className="text-xs text-gray-500">SpO2</p><p className="text-2xl font-bold text-green-600">{latestVital?.spo2 ? <><CountUp to={Number(latestVital.spo2)} duration={1.6} />%</> : "--"}</p></div>
                <div className="bg-slate-50 rounded-xl p-4"><p className="text-xs text-gray-500">Temperature</p><p className="text-2xl font-bold text-orange-500">{latestVital?.temperature ? <><CountUp to={Number(latestVital.temperature)} duration={1.6} />°F</> : "--"}</p></div>
             </div>
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-5">
              <MiniLineChart
               title="Heart Rate Trend (Last 8 Entries)"
               data={heartRateTrend}
               color="#0f766e"
               valueSuffix=" bpm"
              />
              <RingProgressChart
               title="Today's Medication Adherence"
               value={todayMedicationStats.adherence}
               subtitle={`${todayMedicationStats.completed} of ${todayMedicationStats.total} scheduled medications marked taken today`}
               color="#2563eb"
              />
             </div>
             <p className="text-xs text-slate-500 mt-3">Charts refresh automatically every 30 seconds with live dashboard updates.</p>
            </section>
         ) : null}

         {activeTab === "vitals" ? (
            <section id="vitals-panel" role="tabpanel" aria-labelledby="vitals-tab" className="bg-white rounded-2xl shadow p-6">
             <form className="space-y-3" onSubmit={saveVital}>
                <h2 className="text-lg font-semibold">My Health Vitals</h2>
                <div className="flex flex-wrap gap-2">
                 <button
                  type="button"
                  className={`text-sm px-3 py-1.5 rounded-full border ${vitalInputMode === "manual" ? "bg-teal-600 text-white border-teal-600" : "bg-white text-slate-700 border-slate-300"}`}
                  onClick={() => setVitalInputMode("manual")}
                 >
                  Manual Entry
                 </button>
                 <button
                  type="button"
                  className={`text-sm px-3 py-1.5 rounded-full border ${vitalInputMode === "sensor" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-300"}`}
                  onClick={handleSelectSensorMode}
                 >
                  Sensor Simulation
                 </button>
                </div>

                {vitalInputMode === "sensor" ? (
                 <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3">
                  <p className="text-xs text-slate-500">Real Ops: live sensor stream connected for HR, SpO2, and temperature. Enter BP manually.</p>
                  {simulatedSensorJson ? (
                   <pre className="text-xs bg-slate-900 text-emerald-200 rounded-lg p-3 overflow-x-auto">{JSON.stringify(simulatedSensorJson, null, 2)}</pre>
                  ) : null}
                 </div>
                ) : null}

                <input className="form-input" placeholder="Heart Rate (bpm)" value={vitalForm.heartRate} onChange={(event) => setVitalForm((prev) => ({ ...prev, heartRate: event.target.value }))} required />
                <input className="form-input" placeholder="Blood Pressure (e.g. 120/80)" value={vitalForm.bloodPressure} onChange={(event) => setVitalForm((prev) => ({ ...prev, bloodPressure: event.target.value }))} required />
                <input className="form-input" placeholder="SpO2 (%)" value={vitalForm.spo2} onChange={(event) => setVitalForm((prev) => ({ ...prev, spo2: event.target.value }))} required />
                <input className="form-input" placeholder="Body Temperature (°F)" value={vitalForm.temperature} onChange={(event) => setVitalForm((prev) => ({ ...prev, temperature: event.target.value }))} required />
                <button className="submit-btn w-full" type="submit">Save Vitals</button>
             </form>
            </section>
         ) : null}

         {activeTab === "medications" ? (
            <section id="medications-panel" role="tabpanel" aria-labelledby="medications-tab" className="bg-white rounded-2xl shadow p-6 space-y-4">
             <form className="space-y-3" onSubmit={saveMedication}>
              <h2 className="text-lg font-semibold">Medication Tracker</h2>
              <input className="form-input" placeholder="Medicine Name" value={medForm.medicineName} onChange={(event) => setMedForm((prev) => ({ ...prev, medicineName: event.target.value }))} required />
              <input className="form-input" placeholder="Dosage" value={medForm.dosage} onChange={(event) => setMedForm((prev) => ({ ...prev, dosage: event.target.value }))} required />
              <input className="form-input" type="date" value={medForm.date} onChange={(event) => setMedForm((prev) => ({ ...prev, date: event.target.value }))} required />
              <input className="form-input" type="time" placeholder="Reminder Time" value={medForm.time} onChange={(event) => setMedForm((prev) => ({ ...prev, time: event.target.value }))} required />
              <button className="submit-btn w-full" type="submit">Add Medication</button>
             </form>

             <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
               <button
                className="text-sm px-2 py-1 rounded bg-white border"
                onClick={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
               >
                Previous
               </button>
               <p className="font-semibold">
                {calendarMonth.toLocaleString("default", { month: "long", year: "numeric" })}
               </p>
               <button
                className="text-sm px-2 py-1 rounded bg-white border"
                onClick={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
               >
                Next
               </button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-xs text-center font-medium text-gray-500 mb-2">
               <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
              </div>

              <div className="grid grid-cols-7 gap-1">
               {calendarCells.map((cell, index) => {
                if (!cell) {
                 return <div key={`empty-${index}`} className="h-14"></div>;
                }

                const isSelected = selectedMedDate === cell.dateStr;
                const hasMeds = cell.count > 0;

                return (
                 <button
                  key={cell.dateStr}
                  onClick={() => setSelectedMedDate(cell.dateStr)}
                  className={`h-14 rounded text-sm flex flex-col items-center justify-center border ${isSelected ? "bg-teal-600 text-white border-teal-600" : "bg-white border-slate-200 text-gray-700"}`}
                 >
                  <span>{cell.day}</span>
                  {hasMeds ? <span className={`text-[10px] px-1 rounded-full ${isSelected ? "bg-white text-teal-700" : "bg-teal-100 text-teal-700"}`}>{cell.count}</span> : null}
                 </button>
                );
               })}
              </div>

              <div className="mt-4">
               <p className="text-sm font-semibold mb-2">Medicines for {selectedMedDate}</p>
               <div className="space-y-2 max-h-40 overflow-y-auto">
                {selectedDateMeds.length ? selectedDateMeds.map((item) => (
                 <div key={item._id} className="bg-white rounded-lg p-3 text-sm border border-slate-200">
                  <p className="font-semibold">{item.medicineName}</p>
                  <p>Dosage: {item.dosage}</p>
                  <p>Time: {item.time}</p>
                           {item.isDoctorOrder ? <p className="text-xs text-teal-700 mt-1">Doctor Prescribed</p> : null}
                 </div>
                )) : <p className="text-sm text-gray-500">No medications scheduled for this date</p>}
               </div>
              </div>
             </div>
            </section>
         ) : null}

         {activeTab === "appointments" ? (
            <section id="appointments-panel" role="tabpanel" aria-labelledby="appointments-tab" className="bg-white rounded-2xl shadow p-6 space-y-6">
             <div>
              <h2 className="text-lg font-semibold mb-3">My Appointments</h2>
              <div className="space-y-3 max-h-64 overflow-y-auto">
               {appointments.length ? appointments.map((item) => (
                <div key={item._id} className="bg-slate-50 rounded-lg p-3 text-sm">
                 <p><strong>Doctor:</strong> {item.doctor || "Pending"}</p>
                 <p><strong>Date:</strong> {item.date} {item.time || ""}</p>
                         {item.preferredDate || item.preferredTime ? <p><strong>Preferred:</strong> {item.preferredDate || "--"} {item.preferredTime || ""}</p> : null}
                 <p><strong>Token:</strong> {item.token || "NA"}</p>
                 <p><strong>Status:</strong> {item.status}</p>
                         {item.decisionNote ? <p><strong>Doctor Note:</strong> {item.decisionNote}</p> : null}
                </div>
               )) : <p className="text-sm text-gray-500">No appointments yet</p>}
              </div>
             </div>
             <div>
              <h3 className="text-md font-semibold mb-1">Request New Consultation</h3>
              <p className="text-sm text-gray-500 mb-3">Select a doctor. Doctors in your city have a <span className="text-teal-700 font-medium">Near You</span> badge.</p>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                      <input
                        className="form-input"
                        type="date"
                        value={consultPreference.preferredDate}
                        onChange={(event) => setConsultPreference((prev) => ({ ...prev, preferredDate: event.target.value }))}
                      />
                      <input
                        className="form-input"
                        type="time"
                        value={consultPreference.preferredTime}
                        onChange={(event) => setConsultPreference((prev) => ({ ...prev, preferredTime: event.target.value }))}
                      />
                      <input
                        className="form-input"
                        placeholder="Optional note for doctor"
                        value={consultPreference.notes}
                        onChange={(event) => setConsultPreference((prev) => ({ ...prev, notes: event.target.value }))}
                      />
                     </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
               {[...doctors].sort((a, b) => {
                const aLocal = user.city && a.city && a.city.toLowerCase() === user.city.toLowerCase();
                const bLocal = user.city && b.city && b.city.toLowerCase() === user.city.toLowerCase();
                return aLocal === bLocal ? 0 : aLocal ? -1 : 1;
               }).map((doc) => (
                <div key={doc._id} className="bg-slate-50 rounded-lg p-3 text-sm flex justify-between items-center gap-2">
                 <div>
                  <p className="font-semibold">Dr. {doc.name}</p>
                  <p className="text-gray-500 text-xs">{doc.specialization || "General"}</p>
                  {doc.city ? <p className="text-gray-400 text-xs">{doc.city}</p> : null}
                  {user.city && doc.city && doc.city.toLowerCase() === user.city.toLowerCase() ? (
                   <span className="inline-block text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full mt-1">Near You</span>
                  ) : null}
                 </div>
                 <button className="submit-btn text-xs px-3 py-1 shrink-0" onClick={() => requestConsultation(doc._id)}>Request</button>
                </div>
               ))}
               {!doctors.length ? <p className="text-sm text-gray-500 col-span-2">No doctors available right now</p> : null}
              </div>
             </div>
            </section>
         ) : null}

         {activeTab === "nearby" ? (
          <NearbyDoctorsMap
           doctors={doctors}
           patientCity={user.city}
           onRequestConsultation={requestConsultation}
          />
         ) : null}

         {activeTab === "ai" ? (
          <section id="ai-panel" role="tabpanel" aria-labelledby="ai-tab" className="bg-white rounded-2xl shadow p-6 space-y-4">
           <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
             <h2 className="text-lg font-semibold">Unified AI Insights</h2>
             <p className="text-sm text-gray-500">Runs risk, alert, recommendations, monitoring, prediction, and chatbot summary from your latest vitals.</p>
            </div>
            <button type="button" className="submit-btn" onClick={runAiAnalysis} disabled={aiLoading}>
             {aiLoading ? "Analyzing..." : "Run AI Analysis"}
            </button>
           </div>

           <div>
            <label className="text-sm font-medium text-slate-700">Question for AI Context</label>
            <input
             className="form-input mt-2"
             value={aiQuestion}
             onChange={(event) => setAiQuestion(event.target.value)}
             placeholder="Ask: should I consult a doctor now?"
            />
           </div>

           {aiAnalysis ? (
            <>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
               <p className="text-xs text-gray-500">Risk Level</p>
               <p className="text-xl font-bold text-teal-700">{aiAnalysis.risk?.riskLevel || "N/A"}</p>
               <p className="text-xs text-gray-600 mt-1">Confidence: {aiAnalysis.risk?.confidence ?? "--"}</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
               <p className="text-xs text-gray-500">Alert</p>
               <p className="text-xl font-bold text-amber-700">{aiAnalysis.alerts?.severity || "N/A"}</p>
               <p className="text-xs text-gray-600 mt-1">{aiAnalysis.alerts?.message || "No message"}</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
               <p className="text-xs text-gray-500">Monitoring</p>
               <p className="text-lg font-bold text-blue-700">{aiAnalysis.monitoring?.checkFrequency || "N/A"}</p>
               <p className="text-xs text-gray-600 mt-1">Doctor consult: {aiAnalysis.monitoring?.doctorConsult ? "Yes" : "No"}</p>
              </div>
             </div>

             <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <p className="text-sm font-semibold mb-1">Chatbot Summary</p>
              <p className="text-sm text-gray-700">{aiAnalysis.chatbot?.response || "No response"}</p>
              <p className="text-xs text-gray-500 mt-2">Urgency: {aiAnalysis.chatbot?.urgency || "low"} | Suggestion: {aiAnalysis.chatbot?.suggestion || "--"}</p>
             </div>

             <details className="bg-slate-900 text-emerald-200 rounded-xl p-4">
              <summary className="cursor-pointer text-sm font-semibold">View Full JSON</summary>
              <pre className="mt-3 text-xs overflow-x-auto">{JSON.stringify(aiAnalysis, null, 2)}</pre>
             </details>
            </>
           ) : (
            <p className="text-sm text-gray-500">No analysis yet. Click Run AI Analysis to generate insights in-app.</p>
           )}
          </section>
         ) : null}

         {activeTab === "reports" ? (
            <section id="reports-panel" role="tabpanel" aria-labelledby="reports-tab" className="bg-white rounded-2xl shadow p-6">
             <h2 className="text-lg font-semibold mb-2">Health Report</h2>
             <p className="text-sm text-gray-600 mb-4">Downloads a PDF and automatically sends it to your assigned doctor.</p>
             <div className="bg-slate-50 rounded-xl p-4 mb-4 text-sm space-y-1">
              <p><strong>Patient:</strong> {user.name}</p>
              <p><strong>Heart Rate:</strong> {latestVital?.heartRate ?? "N/A"}</p>
              <p><strong>Blood Pressure:</strong> {latestVital?.bloodPressure ?? "N/A"}</p>
              <p><strong>SpO2:</strong> {latestVital?.spo2 ?? "N/A"}%</p>
              <p><strong>Temperature:</strong> {latestVital?.temperature ?? "N/A"}°F</p>
              <p><strong>Vitals Records:</strong> {vitals.length}</p>
              <p><strong>Medications:</strong> {medications.length}</p>
             </div>
             <button className="submit-btn" onClick={generateAndSendReport}>
              <i className="fa-solid fa-file-pdf mr-2"></i>Generate &amp; Send Report
             </button>
            </section>
         ) : null}

         {activeTab === "alerts" ? (
            <section id="alerts-panel" role="tabpanel" aria-labelledby="alerts-tab" className="bg-white rounded-2xl shadow p-6">
             <h2 className="text-lg font-semibold mb-3">Alerts & Notifications</h2>
             <div className="space-y-3 max-h-80 overflow-y-auto">
                {notifications.length ? notifications.map((item) => (
                 <div key={item._id} className="bg-slate-50 rounded-lg p-3 text-sm">
                    <p className="font-semibold">{item.title}</p>
                    <p>{item.message}</p>
                 </div>
                )) : <p className="text-sm text-gray-500">No alerts yet</p>}
             </div>
            </section>
         ) : null}

         {activeTab === "emergency" ? (
            <section id="emergency-panel" role="tabpanel" aria-labelledby="emergency-tab" className="bg-white rounded-2xl shadow p-6">
             <h2 className="text-lg font-semibold mb-3">Emergency Help</h2>
             <p className="text-sm text-gray-600 mb-4">Describe the emergency and send an urgent message directly to your assigned doctor.</p>
             <textarea
              className="form-input mb-4"
              rows="4"
              placeholder="Example: Severe chest pain since 20 minutes, dizziness, please call urgently."
              value={emergencyMessage}
              onChange={(event) => setEmergencyMessage(event.target.value)}
             ></textarea>
             <select className="form-input mb-4" value={emergencyPriority} onChange={(event) => setEmergencyPriority(event.target.value)}>
              <option value="low">Low priority</option>
              <option value="medium">Medium priority</option>
              <option value="high">High priority</option>
              <option value="critical">Critical priority</option>
             </select>
             <button className="bg-red-600 text-white font-semibold px-5 py-2 rounded-full" onClick={sendSOS}>Send Urgency Message</button>
            </section>
         ) : null}

         {activeTab === "contact" ? (
            <section id="contact-panel" role="tabpanel" aria-labelledby="contact-tab" className="bg-white rounded-2xl shadow p-6">
             <form className="space-y-3" onSubmit={submitContact}>
                <h2 className="text-lg font-semibold">Contact Us</h2>
                <input className="form-input" placeholder="Name" value={contactForm.name} onChange={(event) => setContactForm((prev) => ({ ...prev, name: event.target.value }))} required />
                <input className="form-input" placeholder="Email" value={contactForm.email} onChange={(event) => setContactForm((prev) => ({ ...prev, email: event.target.value }))} required />
                <textarea className="form-input" rows="4" placeholder="Message" value={contactForm.message} onChange={(event) => setContactForm((prev) => ({ ...prev, message: event.target.value }))} required></textarea>
                <button className="submit-btn" type="submit">Send Message</button>
             </form>
            </section>
         ) : null}

         {activeTab === "profile" ? (
            <section id="profile-panel" role="tabpanel" aria-labelledby="profile-tab" className="bg-white rounded-2xl shadow p-6">
             <h2 className="text-lg font-semibold mb-3">Profile Settings</h2>
             <form className="space-y-4" onSubmit={saveProfile}>
              <div className="flex items-center gap-4">
               <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-200 flex items-center justify-center">
                {profileForm.avatarDataUrl ? <img src={profileForm.avatarDataUrl} alt="Profile" className="w-full h-full object-cover" /> : <i className="fa-solid fa-user text-slate-500"></i>}
               </div>
               <div>
                <p className="text-xs text-gray-500 mb-1">Display Picture</p>
                <input className="form-input" type="file" accept="image/*" onChange={handleProfileAvatarChange} />
               </div>
              </div>
              <input className="form-input" placeholder="Full Name" value={profileForm.name} onChange={(event) => setProfileForm((prev) => ({ ...prev, name: event.target.value }))} required />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
               <input className="form-input" placeholder="Phone" value={profileForm.phone} onChange={(event) => setProfileForm((prev) => ({ ...prev, phone: event.target.value }))} />
               <input className="form-input" placeholder="City" value={profileForm.city} onChange={(event) => setProfileForm((prev) => ({ ...prev, city: event.target.value }))} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
               <select className="form-input" value={profileForm.gender} onChange={(event) => setProfileForm((prev) => ({ ...prev, gender: event.target.value }))}>
                <option value="">Select Gender</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
               </select>
               <input className="form-input" type="date" value={profileForm.dateOfBirth} onChange={(event) => setProfileForm((prev) => ({ ...prev, dateOfBirth: event.target.value }))} />
              </div>
              <input className="form-input" placeholder="Address" value={profileForm.address} onChange={(event) => setProfileForm((prev) => ({ ...prev, address: event.target.value }))} />
              <textarea className="form-input" rows="3" placeholder="About me / health notes" value={profileForm.bio} onChange={(event) => setProfileForm((prev) => ({ ...prev, bio: event.target.value }))}></textarea>
              <div className="text-sm space-y-1 text-slate-600">
               <p><strong>Email:</strong> {user.email}</p>
               <p><strong>Role:</strong> {user.role}</p>
              </div>
              <button className="submit-btn" type="submit">Save Profile</button>
             </form>
            </section>
         ) : null}

     {status ? <p className="text-sm text-gray-600">{status}</p> : null}
    </main>
   </div>
  </div>
 );
}
