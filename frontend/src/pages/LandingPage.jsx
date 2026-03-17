import { useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../config";
import CountUp from "../components/CountUp";
import BrandLogo from "../components/BrandLogo";
import UserAvatar from "../components/UserAvatar";
import { useAuth } from "../context/AuthContext";

const features = [
 { icon: "fa-pills", title: "Medication Reminders", text: "Smart scheduling, dosage instructions, and adaptive alerts." },
 { icon: "fa-calendar-check", title: "Appointments Tracking", text: "Digital consultations with appointment status and tokens." },
 { icon: "fa-heartbeat", title: "Vital Monitoring", text: "Track heart rate, BP, SpO2, and temperature in real time." },
 { icon: "fa-users", title: "Family Notifications", text: "Caregiver and doctor alerts for abnormal vitals and SOS." },
 { icon: "fa-chart-line", title: "Compliance Insights", text: "Track adherence and generate personalized health recommendations." },
 { icon: "fa-lightbulb", title: "Doctor Dashboard", text: "Remote patient monitoring and recommendation workflows." }
];

export default function LandingPage() {
 const { session, logout } = useAuth();
 const [showChat, setShowChat] = useState(false);
 const [messages, setMessages] = useState([
  { text: "Hi! I'm HealthApp's AI assistant. How can I help you today?", sender: "bot" }
 ]);
 const [input, setInput] = useState("");
 const [loading, setLoading] = useState(false);
 const dashboardPath = session?.user?.role === "doctor" ? "/doctor" : "/patient";
 const profilePath = `${dashboardPath}?tab=profile`;
 const enterPath = session?.user ? dashboardPath : "/login";

 const sendMessage = async () => {
  if (!input.trim()) return;

  const userMessage = { text: input, sender: "user" };
  setMessages((prev) => [...prev, userMessage]);
  setInput("");
  setLoading(true);

  try {
   const response = await apiRequest("/chatbot/chat", {
    method: "POST",
    body: JSON.stringify({ message: input })
   });

   const botMessage = { text: response.reply, sender: "bot" };
   setMessages((prev) => [...prev, botMessage]);
  } catch (error) {
   const errorMessage = { text: "Sorry, I couldn't process that. Please try again.", sender: "bot" };
   setMessages((prev) => [...prev, errorMessage]);
   console.error("Chat error:", error);
  } finally {
   setLoading(false);
  }
 };

 return (
  <div className="landing-canvas">
   <nav className="navbar navbar-expand-lg navbar-dark bg-dark shadow-sm fixed-top app-nav">
    <div className="container-fluid">
     <Link className="navbar-brand fw-bold brand-link" to="/">
      <BrandLogo logoClassName="brand-logo-nav" />
     </Link>
     <ul className="navbar-nav me-auto mb-2 mb-lg-0">
      <li className="nav-item"><a className="nav-link active" href="#hero">Home</a></li>
      <li className="nav-item"><a className="nav-link" href="#features">Features</a></li>
      <li className="nav-item"><Link className="nav-link" to="/contact">Contact</Link></li>
     </ul>
     <div className="landing-nav-actions">
      {session?.user ? (
       <>
        <Link className="landing-nav-profile" to={profilePath} aria-label="Open dashboard profile">
         <UserAvatar
          image={session.user.avatarDataUrl}
          name={session.user.name}
          className="user-avatar-nav"
         />
         <span>{session.user.name}</span>
        </Link>
        <button className="landing-nav-chip landing-nav-logout" type="button" onClick={logout}>
         <i className="fa-solid fa-right-from-bracket"></i>
         Logout
        </button>
       </>
      ) : (
       <>
        <Link className="landing-nav-chip" to="/login">Login</Link>
        <Link className="landing-nav-primary" to="/login?mode=register">Sign Up</Link>
       </>
      )}
     </div>
    </div>
   </nav>

   <section id="hero" className="vh-100 d-flex align-items-center hero-section">
    <div className="container">
     <div className="row align-items-center">
        <div className="col-lg-6 col-md-12 text-center text-lg-start hero-copy reveal-up">
       <p className="hero-kicker mb-2">AI-Powered Preventive Care</p>
       <h1 className="fw-semibold display-4 text-white">
        Transforming <span className="highlight-text">Healthcare & Wellness</span> <em className="hero-emphasis">for everyday life</em>
       </h1>
       <p className="mt-3 fs-5 text-gray-200 hero-lead">
        A full-stack platform for digital patient care, remote doctor monitoring, and emergency health alerts.
       </p>
      <Link to={enterPath} className="btn btn-light btn-lg mt-3 hero-cta">{session?.user ? "Go to Dashboard" : "Enter HealthApp"}</Link>
      </div>
        <div className="col-lg-6 col-md-12 mt-4 mt-lg-0 reveal-up reveal-delay-2">
       <div className="hero-insight-wrap">
        <div className="hero-insight-card">
         <p className="hero-insight-label">Live Care Overview</p>
         <h3 className="hero-insight-title"><strong>Meaningful</strong> health actions in one place</h3>
         <div className="hero-insight-grid">
          <div className="hero-insight-item">
           <p className="hero-insight-key">Doctor Consult Queue</p>
           <p className="hero-insight-value"><CountUp to={12} duration={2} /> active</p>
          </div>
          <div className="hero-insight-item">
           <p className="hero-insight-key">Medication Adherence</p>
           <p className="hero-insight-value"><CountUp to={91} duration={2.2} />%</p>
          </div>
          <div className="hero-insight-item">
           <p className="hero-insight-key">Emergency Routing</p>
           <p className="hero-insight-value">&lt; <CountUp to={30} duration={2.4} /> sec</p>
          </div>
          <div className="hero-insight-item">
           <p className="hero-insight-key">AI Assistant</p>
           <p className="hero-insight-value"><em>Online</em></p>
          </div>
         </div>
         <p className="hero-insight-note">From symptom reporting to doctor response, every step is traceable and real-time.</p>
        </div>
       </div>
      </div>
     </div>
    </div>
   </section>

   <section id="features" className="py-24 relative features-section-bg">
    <div className="relative container mx-auto text-center">
       <h2 className="text-4xl font-semibold mb-3 text-[#333333]">Features</h2>
       <p className="feature-subtitle mb-12"><em>Calm design.</em> <strong>Clinical-grade workflow.</strong></p>
     <div className="grid grid-cols-1 md:grid-cols-3 gap-12 px-4">
      {features.map((feature, index) => (
         <div className="feature-card-style premium-card p-6 rounded-lg shadow-lg transform transition-transform duration-300 hover:-translate-y-2 hover:shadow-2xl feature-reveal" style={{ animationDelay: `${0.12 * (index + 1)}s` }} key={feature.title}>
        <i className={`fas ${feature.icon} text-4xl mb-4`}></i>
        <h4 className="text-2xl font-medium mb-2">{feature.title}</h4>
        <p>{feature.text}</p>
       </div>
      ))}
     </div>
    </div>
   </section>

     <footer className="bg-black text-gray-400 py-10 px-8 text-center app-footer">
      <p>© 2026 MyHealthApp. <em>Built for proactive care.</em> All Rights Reserved.</p>
   </footer>

   {/* Floating Chatbot Widget */}
   <div className="fixed bottom-6 right-6 z-50">
    {!showChat ? (
     <button
      onClick={() => setShowChat(true)}
      className="w-14 h-14 rounded-full bg-teal-600 text-white shadow-lg hover:bg-teal-700 transition flex items-center justify-center chatbot-fab"
      aria-label="Open chatbot"
     >
      <i className="fa-solid fa-comments text-xl"></i>
     </button>
    ) : (
     <div className="bg-white rounded-2xl shadow-2xl w-96 overflow-hidden flex flex-col h-[600px]">
      {/* Header */}
      <div className="bg-teal-600 text-white p-4 flex justify-between items-center">
       <h3 className="font-semibold">HealthApp Assistant</h3>
       <button
        onClick={() => setShowChat(false)}
        className="text-white hover:text-gray-200"
        aria-label="Close chatbot"
       >
        <i className="fa-solid fa-times"></i>
       </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-3">
       {messages.map((msg, idx) => (
        <div
         key={idx}
         className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
        >
         <div
          className={`max-w-xs px-4 py-2 rounded-lg ${
           msg.sender === "user"
            ? "bg-teal-600 text-white rounded-br-none"
            : "bg-gray-200 text-gray-800 rounded-bl-none"
          }`}
         >
          <p className="text-sm">{msg.text}</p>
         </div>
        </div>
       ))}
       {loading && (
        <div className="flex justify-start">
         <div className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg rounded-bl-none">
          <p className="text-sm">Thinking...</p>
         </div>
        </div>
       )}
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-gray-200">
       <div className="flex gap-2">
        <input
         type="text"
         placeholder="Type a message..."
         value={input}
         onChange={(e) => setInput(e.target.value)}
         onKeyDown={(e) => e.key === "Enter" && sendMessage()}
         className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
         disabled={loading}
        />
        <button
         onClick={sendMessage}
         disabled={loading}
         className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 disabled:opacity-50 transition"
        >
         <i className="fa-solid fa-paper-plane"></i>
        </button>
       </div>
      </div>
     </div>
    )}
   </div>
  </div>
 );
}
