import { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../config";
import CountUp from "../components/CountUp";
import { MiniLineChart, StatusBarChart } from "../components/RealtimeCharts";

const sections = [
 { id: "overview", label: "Dashboard Overview" },
 { id: "patients", label: "Assigned Patients" },
 { id: "patientData", label: "Patient Health Data" },
 { id: "appointments", label: "Appointments" },
 { id: "recommendations", label: "Prescriptions / Recommendations" },
 { id: "reports", label: "Patient Reports" },
 { id: "emergency", label: "Emergency Alerts" },
 { id: "notifications", label: "Notifications" },
 { id: "contact", label: "Contact Support" },
 { id: "profile", label: "Doctor Profile & Availability" }
];

export default function DoctorDashboard() {
 const { session, logout } = useAuth();
 const user = session.user;
 const [appointments, setAppointments] = useState([]);
 const [patients, setPatients] = useState([]);
 const [notifications, setNotifications] = useState([]);
 const [patientId, setPatientId] = useState("");
 const [patientVitals, setPatientVitals] = useState([]);
 const [status, setStatus] = useState("");
 const [activeTab, setActiveTab] = useState("overview");
 const [recommendationForm, setRecommendationForm] = useState({
  patientId: "",
  medicineName: "",
  dosage: "",
  frequencyPerDay: 1,
  durationDays: 7,
  startDate: new Date().toISOString().slice(0, 10),
  customTimes: "",
  notes: ""
 });
 const [recommendations, setRecommendations] = useState([]);
 const [contactForm, setContactForm] = useState({ name: user.name || "", email: user.email || "", message: "" });
 const [reports, setReports] = useState([]);

 const loadData = async () => {
  try {
  const [appointmentData, patientsData, notificationData, reportsData, prescriptionData] = await Promise.all([
    apiRequest(`/appointments/doctor/${user.id}`),
    apiRequest(`/appointments/doctor/${user.id}/patients`),
    apiRequest(`/notifications/${user.id}`),
    apiRequest(`/reports/doctor/${user.id}`),
    apiRequest(`/prescriptions/doctor/${user.id}`)
   ]);

   setAppointments(appointmentData);
   setPatients(patientsData);
   setNotifications(notificationData);
    setReports(reportsData);
  setRecommendations(prescriptionData);
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

 const appointmentStatusItems = useMemo(() => {
  const scheduled = appointments.filter((item) => item.status === "scheduled").length;
  const completed = appointments.filter((item) => item.status === "completed").length;
  const cancelled = appointments.filter((item) => item.status === "cancelled").length;

  return [
   { label: "Scheduled", value: scheduled, color: "#0d9488" },
   { label: "Completed", value: completed, color: "#2563eb" },
   { label: "Cancelled", value: cancelled, color: "#dc2626" }
  ];
 }, [appointments]);

 const recentAlertTrend = useMemo(() => {
  const now = Date.now();
  const bucketSize = 10 * 60 * 1000;
  const buckets = Array.from({ length: 6 }, (_, index) => ({
   start: now - (6 - index) * bucketSize,
   end: now - (5 - index) * bucketSize,
   count: 0
  }));

  notifications
   .filter((item) => item.type === "vital-alert" || item.type === "emergency")
   .forEach((item) => {
    const time = new Date(item.createdAt || item.date || 0).getTime();
    const bucket = buckets.find((entry) => time >= entry.start && time < entry.end);
    if (bucket) {
     bucket.count += 1;
    }
   });

  return buckets.map((entry) => entry.count);
 }, [notifications]);

 const selectedPatientHeartRateTrend = useMemo(() => {
  return patientVitals.slice(-8).map((item) => Number(item.heartRate)).filter((value) => Number.isFinite(value));
 }, [patientVitals]);

 const viewPatientVitals = async (event) => {
  event.preventDefault();
  if (!patientId) {
   return;
  }

  try {
   const vitals = await apiRequest(`/vitals/${patientId}`);
   setPatientVitals(vitals);
   setStatus(`Loaded ${vitals.length} records`);
   setActiveTab("patientData");
  } catch (error) {
   setStatus(error.message);
  }
 };

 const submitRecommendation = async (event) => {
  event.preventDefault();
  setStatus("Saving prescription and generating schedule...");

  try {
   const response = await apiRequest("/prescriptions/add", {
    method: "POST",
    body: JSON.stringify({
     doctorId: user.id,
     patientId: recommendationForm.patientId,
     medicineName: recommendationForm.medicineName,
     dosage: recommendationForm.dosage,
     frequencyPerDay: Number(recommendationForm.frequencyPerDay),
     durationDays: Number(recommendationForm.durationDays),
     startDate: recommendationForm.startDate,
     customTimes: recommendationForm.customTimes,
     notes: recommendationForm.notes
    })
   });

   setRecommendationForm({
    patientId: "",
    medicineName: "",
    dosage: "",
    frequencyPerDay: 1,
    durationDays: 7,
    startDate: new Date().toISOString().slice(0, 10),
    customTimes: "",
    notes: ""
   });

   await loadData();
   setStatus(`Prescription created. ${response.scheduleCount} medication reminders added to patient calendar.`);
  } catch (error) {
   setStatus(error.message);
  }
 };

 const submitSupportMessage = async (event) => {
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

 const downloadReportPDF = (report) => {
  const doc = new jsPDF();

  doc.setFillColor(0, 150, 136);
  doc.rect(0, 0, 210, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text("HealthApp \u2014 Patient Health Report", 20, 20);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.text(`Patient: ${report.patientName}`, 20, 45);
  doc.text(`Email: ${report.patientEmail || "N/A"}`, 20, 55);
  doc.text(`Report Date: ${new Date(report.createdAt).toLocaleString()}`, 20, 65);

  doc.setFontSize(14);
  doc.setTextColor(0, 150, 136);
  doc.text("Latest Vitals", 20, 85);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  const v = report.latestVitals || {};
  doc.text(`Heart Rate: ${v.heartRate ?? "N/A"}`, 20, 97);
  doc.text(`Blood Pressure: ${v.bloodPressure ?? "N/A"}`, 20, 107);
  doc.text(`SpO2: ${v.spo2 ?? "N/A"}%`, 20, 117);
  doc.text(`Temperature: ${v.temperature ?? "N/A"}\u00b0F`, 20, 127);

  doc.setFontSize(14);
  doc.setTextColor(0, 150, 136);
  doc.text("Health Summary", 20, 147);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.text(`Vital Records: ${report.vitalCount}`, 20, 159);
  doc.text(`Medications: ${report.medicationCount}`, 20, 169);
  doc.text(`Appointments: ${report.appointmentCount}`, 20, 179);
  doc.text(`Alerts: ${report.alertCount}`, 20, 189);

  const fileName = `report-${(report.patientName || "patient").replace(/\s+/g, "-").toLowerCase()}-${new Date(report.createdAt).toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
 };

 return (
   <div className="min-h-screen bg-slate-100 p-4 md:p-8 dashboard-shell">
    <header className="bg-white rounded-2xl shadow p-4 mb-6 flex items-center justify-between dashboard-topbar">
    <div>
     <p className="text-sm text-gray-500">Doctor Dashboard</p>
     <h1 className="text-xl font-semibold">Welcome, Dr. {user.name}</h1>
    </div>
    <div className="flex items-center gap-3">
     <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-700" aria-hidden="true">
      <i className="fa-solid fa-user-doctor"></i>
     </div>
     <button className="submit-btn" onClick={logout}>Logout</button>
    </div>
   </header>

   <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
    <aside className="bg-white rounded-2xl shadow p-5">
     <h2 className="text-xl font-semibold mb-1">Doctor Panel</h2>
     <p className="text-sm text-gray-500 mb-4">Accessible Navigation</p>
     <nav aria-label="Doctor dashboard sections">
      <ul className="space-y-2 mb-8" role="tablist" aria-orientation="vertical">
       {sections.map((item) => (
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
       <div className="grid grid-cols-3 gap-4">
         <div className="bg-slate-50 rounded-xl p-4"><p className="text-xs text-gray-500">Assigned Patients</p><p className="text-2xl font-bold text-teal-600"><CountUp to={patients.length} duration={1.8} /></p></div>
         <div className="bg-slate-50 rounded-xl p-4"><p className="text-xs text-gray-500">Pending Consultations</p><p className="text-2xl font-bold text-blue-600"><CountUp to={appointments.filter((item) => item.status === "scheduled").length} duration={1.8} /></p></div>
         <div className="bg-slate-50 rounded-xl p-4"><p className="text-xs text-gray-500">Emergency Alerts</p><p className="text-2xl font-bold text-red-600"><CountUp to={notifications.filter((item) => item.type === "vital-alert" || item.type === "emergency").length} duration={1.8} /></p></div>
       </div>
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-5">
        <StatusBarChart title="Appointment Pipeline" items={appointmentStatusItems} />
        <MiniLineChart
         title="Alert Load (Last 60 mins)"
         data={recentAlertTrend}
         color="#dc2626"
         valueSuffix=" alerts"
        />
       </div>
       <p className="text-xs text-slate-500 mt-3">Charts refresh every 30 seconds to keep triage decisions current.</p>
      </section>
     ) : null}

     {activeTab === "patients" ? (
      <section id="patients-panel" role="tabpanel" aria-labelledby="patients-tab" className="bg-white rounded-2xl shadow p-6">
       <h2 className="text-lg font-semibold mb-3">Assigned Patients</h2>
       <div className="space-y-3 max-h-80 overflow-y-auto">
        {patients.length ? patients.map((item) => (
         <div key={item._id} className="bg-slate-50 rounded-lg p-3 text-sm">
          <p className="font-semibold">{item.name}</p>
          <p>{item.email}</p>
          <p>{item.phone || "No phone"}</p>
          <p className="text-xs text-gray-500 mt-1">ID: {item._id}</p>
         </div>
        )) : <p className="text-sm text-gray-500">No assigned patients yet</p>}
       </div>
      </section>
     ) : null}

     {activeTab === "patientData" ? (
      <section id="patientData-panel" role="tabpanel" aria-labelledby="patientData-tab" className="bg-white rounded-2xl shadow p-6 space-y-4">
       <form className="space-y-3" onSubmit={viewPatientVitals}>
        <h2 className="text-lg font-semibold">Patient Health Data</h2>
        <input className="form-input" placeholder="Enter patient ID" value={patientId} onChange={(event) => setPatientId(event.target.value)} required />
        <button className="submit-btn" type="submit">View Vitals</button>
       </form>

       <MiniLineChart
        title="Selected Patient Heart Rate Trend"
        data={selectedPatientHeartRateTrend}
        color="#ea580c"
        valueSuffix=" bpm"
       />

       <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
         <thead>
          <tr className="text-left text-gray-500 border-b">
           <th className="py-2">Date</th>
           <th className="py-2">Heart Rate</th>
           <th className="py-2">BP</th>
           <th className="py-2">SpO2</th>
           <th className="py-2">Temp</th>
           <th className="py-2">Alert</th>
          </tr>
         </thead>
         <tbody>
          {patientVitals.map((item) => (
           <tr key={item._id} className="border-b">
            <td className="py-2">{new Date(item.date).toLocaleString()}</td>
            <td className="py-2">{item.heartRate}</td>
            <td className="py-2">{item.bloodPressure}</td>
            <td className="py-2">{item.spo2}</td>
            <td className="py-2">{item.temperature}</td>
            <td className="py-2">{item.isAbnormal ? "Yes" : "No"}</td>
           </tr>
          ))}
         </tbody>
        </table>
       </div>
      </section>
     ) : null}

     {activeTab === "appointments" ? (
      <section id="appointments-panel" role="tabpanel" aria-labelledby="appointments-tab" className="bg-white rounded-2xl shadow p-6">
       <h2 className="text-lg font-semibold mb-3">Appointments</h2>
       <div className="space-y-3 max-h-80 overflow-y-auto">
        {appointments.length ? appointments.map((item) => (
         <div key={item._id} className="bg-slate-50 rounded-lg p-3 text-sm">
          <p><strong>Patient ID:</strong> {item.patientId || item.userId}</p>
          <p><strong>Date:</strong> {item.date} {item.time || ""}</p>
          <p><strong>Token:</strong> {item.token || "NA"}</p>
          <p><strong>Status:</strong> {item.status}</p>
         </div>
        )) : <p className="text-sm text-gray-500">No consultations scheduled</p>}
       </div>
      </section>
     ) : null}

     {activeTab === "recommendations" ? (
      <section id="recommendations-panel" role="tabpanel" aria-labelledby="recommendations-tab" className="bg-white rounded-2xl shadow p-6 space-y-4">
       <form className="space-y-3" onSubmit={submitRecommendation}>
          <h2 className="text-lg font-semibold">Prescription Planner</h2>
          <input className="form-input" placeholder="Patient ID" value={recommendationForm.patientId} onChange={(event) => setRecommendationForm((prev) => ({ ...prev, patientId: event.target.value }))} required />
          <input className="form-input" placeholder="Medicine Name" value={recommendationForm.medicineName} onChange={(event) => setRecommendationForm((prev) => ({ ...prev, medicineName: event.target.value }))} required />
          <input className="form-input" placeholder="Dosage (e.g. 500mg)" value={recommendationForm.dosage} onChange={(event) => setRecommendationForm((prev) => ({ ...prev, dosage: event.target.value }))} required />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
           <select className="form-input" value={recommendationForm.frequencyPerDay} onChange={(event) => setRecommendationForm((prev) => ({ ...prev, frequencyPerDay: event.target.value }))}>
            <option value={1}>1 time per day</option>
            <option value={2}>2 times per day</option>
            <option value={3}>3 times per day</option>
            <option value={4}>4 times per day</option>
           </select>
           <input className="form-input" type="number" min="1" max="60" placeholder="Duration (days)" value={recommendationForm.durationDays} onChange={(event) => setRecommendationForm((prev) => ({ ...prev, durationDays: event.target.value }))} required />
          </div>
          <input className="form-input" type="date" value={recommendationForm.startDate} onChange={(event) => setRecommendationForm((prev) => ({ ...prev, startDate: event.target.value }))} required />
          <input className="form-input" placeholder="Custom times (optional, comma separated: 08:00,14:00,20:00)" value={recommendationForm.customTimes} onChange={(event) => setRecommendationForm((prev) => ({ ...prev, customTimes: event.target.value }))} />
          <textarea className="form-input" rows="3" placeholder="Notes (optional)" value={recommendationForm.notes} onChange={(event) => setRecommendationForm((prev) => ({ ...prev, notes: event.target.value }))}></textarea>
          <button className="submit-btn" type="submit">Create Prescription & Generate Calendar</button>
       </form>
       <div className="space-y-2 max-h-56 overflow-y-auto">
        {recommendations.length ? recommendations.map((item) => (
           <div key={item._id} className="bg-slate-50 rounded-lg p-3 text-sm">
          <p><strong>Patient ID:</strong> {item.patientId}</p>
            <p><strong>Medicine:</strong> {item.medicineName} ({item.dosage})</p>
            <p><strong>Plan:</strong> {item.frequencyPerDay}x/day for {item.durationDays} days</p>
            <p><strong>Start:</strong> {item.startDate} <strong>End:</strong> {item.endDate}</p>
            <p className="text-xs text-gray-500 mt-1">{new Date(item.createdAt).toLocaleString()}</p>
         </div>
          )) : <p className="text-sm text-gray-500">No prescriptions created yet</p>}
       </div>
      </section>
     ) : null}

     {activeTab === "reports" ? (
        <section id="reports-panel" role="tabpanel" aria-labelledby="reports-tab" className="bg-white rounded-2xl shadow p-6">
         <h2 className="text-lg font-semibold mb-3">Patient Reports</h2>
         <div className="space-y-4 max-h-[600px] overflow-y-auto">
          {reports.length ? reports.map((item) => (
           <div key={item._id} className="bg-slate-50 rounded-xl p-4 text-sm">
            <div className="flex justify-between items-start mb-3">
             <div>
              <p className="font-semibold text-base">{item.patientName}</p>
              <p className="text-gray-500">{item.patientEmail}</p>
              <p className="text-xs text-gray-400 mt-0.5">{new Date(item.createdAt).toLocaleString()}</p>
             </div>
             <button className="submit-btn text-xs" onClick={() => downloadReportPDF(item)}>
              <i className="fa-solid fa-file-pdf mr-1"></i>Download PDF
             </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
             <div className="bg-white rounded-lg p-2 text-center"><p className="text-xs text-gray-500">Vitals</p><p className="font-bold text-teal-600">{item.vitalCount}</p></div>
             <div className="bg-white rounded-lg p-2 text-center"><p className="text-xs text-gray-500">Medications</p><p className="font-bold text-blue-600">{item.medicationCount}</p></div>
             <div className="bg-white rounded-lg p-2 text-center"><p className="text-xs text-gray-500">Appointments</p><p className="font-bold text-green-600">{item.appointmentCount}</p></div>
             <div className="bg-white rounded-lg p-2 text-center"><p className="text-xs text-gray-500">Alerts</p><p className="font-bold text-red-600">{item.alertCount}</p></div>
            </div>
            {item.latestVitals && Object.keys(item.latestVitals).length > 0 ? (
             <p className="text-xs text-gray-600 mt-2">HR: {item.latestVitals.heartRate} | BP: {item.latestVitals.bloodPressure} | SpO2: {item.latestVitals.spo2}% | Temp: {item.latestVitals.temperature}°F</p>
            ) : null}
           </div>
          )) : <p className="text-sm text-gray-500">No patient reports received yet</p>}
         </div>
        </section>
     ) : null}

     {activeTab === "emergency" ? (
      <section id="emergency-panel" role="tabpanel" aria-labelledby="emergency-tab" className="bg-white rounded-2xl shadow p-6">
       <h2 className="text-lg font-semibold mb-3">Emergency Alerts</h2>
       <div className="space-y-3 max-h-80 overflow-y-auto">
            {notifications.filter((item) => item.type === "vital-alert" || item.type === "emergency").length ? notifications
         .filter((item) => item.type === "vital-alert" || item.type === "emergency")
         .map((item) => (
               <div key={item._id} className={`rounded-lg p-3 text-sm border ${item.priority === "critical" ? "bg-red-100 border-red-400" : item.priority === "high" ? "bg-red-50 border-red-200" : item.priority === "medium" ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-200"}`}>
           <p className="font-semibold text-red-700">{item.title}</p>
                <p className="text-red-700">{item.message}</p>
                <div className="mt-2">
                  <span className={`inline-block text-[11px] px-2 py-0.5 rounded-full font-semibold ${item.priority === "critical" ? "bg-red-600 text-white animate-pulse" : item.priority === "high" ? "bg-red-200 text-red-800" : item.priority === "medium" ? "bg-amber-200 text-amber-800" : "bg-slate-200 text-slate-700"}`}>
                   Priority: {(item.priority || "medium").toUpperCase()}
                  </span>
                </div>
          </div>
         )) : <p className="text-sm text-gray-500">No emergency alerts right now</p>}
       </div>
      </section>
     ) : null}

     {activeTab === "notifications" ? (
      <section id="notifications-panel" role="tabpanel" aria-labelledby="notifications-tab" className="bg-white rounded-2xl shadow p-6">
       <h2 className="text-lg font-semibold mb-3">Notifications</h2>
       <div className="space-y-3 max-h-80 overflow-y-auto">
        {notifications.length ? notifications.map((item) => (
         <div key={item._id} className="bg-slate-50 rounded-lg p-3 text-sm">
          <p className="font-semibold">{item.title}</p>
          <p>{item.message}</p>
         </div>
        )) : <p className="text-sm text-gray-500">No notifications yet</p>}
       </div>
      </section>
     ) : null}

     {activeTab === "contact" ? (
      <section id="contact-panel" role="tabpanel" aria-labelledby="contact-tab" className="bg-white rounded-2xl shadow p-6">
       <form className="space-y-3" onSubmit={submitSupportMessage}>
        <h2 className="text-lg font-semibold">Contact Support</h2>
        <input className="form-input" placeholder="Name" value={contactForm.name} onChange={(event) => setContactForm((prev) => ({ ...prev, name: event.target.value }))} required />
        <input className="form-input" placeholder="Email" value={contactForm.email} onChange={(event) => setContactForm((prev) => ({ ...prev, email: event.target.value }))} required />
        <textarea className="form-input" rows="4" placeholder="Message" value={contactForm.message} onChange={(event) => setContactForm((prev) => ({ ...prev, message: event.target.value }))} required></textarea>
        <button className="submit-btn" type="submit">Send Message</button>
       </form>
      </section>
     ) : null}

     {activeTab === "profile" ? (
      <section id="profile-panel" role="tabpanel" aria-labelledby="profile-tab" className="bg-white rounded-2xl shadow p-6">
       <h2 className="text-lg font-semibold mb-3">Doctor Profile & Availability</h2>
       <div className="text-sm space-y-2">
        <p><strong>Name:</strong> Dr. {user.name}</p>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Role:</strong> {user.role}</p>
        <p><strong>Availability:</strong> Active</p>
       </div>
      </section>
     ) : null}

     {status ? <p className="text-sm text-gray-600">{status}</p> : null}
    </main>
   </div>
  </div>
 );
}
