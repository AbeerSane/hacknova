import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../config";
import { useAuth } from "../context/AuthContext";

const initialRegister = {
 name: "",
 email: "",
 password: "",
 role: "patient",
 phone: "",
 specialization: "",
 city: ""
};

export default function LoginPage() {
 const navigate = useNavigate();
 const { login } = useAuth();
 const [mode, setMode] = useState("login");
 const [loginForm, setLoginForm] = useState({ email: "", password: "" });
 const [registerForm, setRegisterForm] = useState(initialRegister);
 const [status, setStatus] = useState("");

 const submitLogin = async (event) => {
  event.preventDefault();
  setStatus("Signing in...");

  try {
   const response = await apiRequest("/users/login", {
    method: "POST",
    body: JSON.stringify(loginForm)
   });

   login(response);
   setStatus("Login successful");
   navigate(response.user.role === "doctor" ? "/doctor" : "/patient");
  } catch (error) {
   setStatus(error.message);
  }
 };

 const submitRegister = async (event) => {
  event.preventDefault();
  setStatus("Creating account...");

  try {
   await apiRequest("/users/register", {
    method: "POST",
    body: JSON.stringify(registerForm)
   });
   setMode("login");
   setStatus("Account created. Please login.");
   setLoginForm({ email: registerForm.email, password: "" });
   setRegisterForm(initialRegister);
  } catch (error) {
   setStatus(error.message);
  }
 };

 return (
  <section className="min-h-screen login-stage px-4 py-10 md:py-14">
   <div className="w-full max-w-6xl mx-auto login-grid rounded-3xl overflow-hidden shadow-2xl">
    <aside className="login-hero p-8 md:p-10 lg:p-12">
     <p className="login-kicker">HealthApp Secure Access</p>
     <h1 className="text-3xl md:text-4xl font-semibold text-white leading-tight mb-4">
      <strong>One portal.</strong> <em className="login-em">Two powerful roles.</em>
     </h1>
     <p className="text-white/90 text-base md:text-lg mb-6">
      Patients track, doctors monitor, and emergency response stays connected in real time.
     </p>
     <div className="login-highlight space-y-3">
      <div className="login-highlight-item"><i className="fa-solid fa-heart-pulse"></i><span>Vitals + critical alerting workflow</span></div>
      <div className="login-highlight-item"><i className="fa-solid fa-calendar-check"></i><span>Doctor assignment with tokenized consultations</span></div>
      <div className="login-highlight-item"><i className="fa-brands fa-whatsapp"></i><span>Instant WhatsApp care escalation</span></div>
      <div className="login-highlight-item"><i className="fa-solid fa-file-pdf"></i><span>Report sharing from patient to doctor</span></div>
     </div>
     <Link to="/" className="inline-block mt-8 text-white/90 underline underline-offset-4">Back to Home</Link>
    </aside>

    <div className="login-panel p-6 md:p-10 lg:p-12">
     <div className="mb-6">
      <p className="text-sm uppercase tracking-widest text-teal-700 font-semibold">Welcome Back</p>
      <h2 className="text-3xl font-bold text-slate-800">HealthApp Access</h2>
      <p className="text-sm text-slate-500 mt-1">Use your role credentials to continue.</p>
     </div>

     <div className="login-tabs mb-6">
      <button className={`login-tab ${mode === "login" ? "active" : ""}`} onClick={() => setMode("login")}>Login</button>
      <button className={`login-tab ${mode === "register" ? "active" : ""}`} onClick={() => setMode("register")}>Register</button>
     </div>

     {mode === "login" ? (
      <form className="space-y-4" onSubmit={submitLogin}>
       <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</label>
       <input
        className="form-input login-input"
        type="email"
        placeholder="you@example.com"
        value={loginForm.email}
        onChange={(event) => setLoginForm((prev) => ({ ...prev, email: event.target.value }))}
        required
       />
       <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Password</label>
       <input
        className="form-input login-input"
        type="password"
        placeholder="Enter password"
        value={loginForm.password}
        onChange={(event) => setLoginForm((prev) => ({ ...prev, password: event.target.value }))}
        required
       />
       <button type="submit" className="submit-btn w-full login-submit">Sign In Securely</button>
      </form>
     ) : (
      <form className="space-y-4" onSubmit={submitRegister}>
       <input className="form-input login-input" placeholder="Full Name" value={registerForm.name} onChange={(event) => setRegisterForm((prev) => ({ ...prev, name: event.target.value }))} required />
       <input className="form-input login-input" type="email" placeholder="Email" value={registerForm.email} onChange={(event) => setRegisterForm((prev) => ({ ...prev, email: event.target.value }))} required />
       <input className="form-input login-input" type="password" placeholder="Password" value={registerForm.password} onChange={(event) => setRegisterForm((prev) => ({ ...prev, password: event.target.value }))} required />
       <input className="form-input login-input" placeholder="Phone" value={registerForm.phone} onChange={(event) => setRegisterForm((prev) => ({ ...prev, phone: event.target.value }))} />
       <select className="form-input login-input" value={registerForm.role} onChange={(event) => setRegisterForm((prev) => ({ ...prev, role: event.target.value }))}>
        <option value="patient">Patient</option>
        <option value="doctor">Doctor</option>
       </select>
       {registerForm.role === "doctor" ? (
        <input className="form-input login-input" placeholder="Specialization" value={registerForm.specialization} onChange={(event) => setRegisterForm((prev) => ({ ...prev, specialization: event.target.value }))} />
       ) : null}
       <input className="form-input login-input" placeholder="City (e.g. Mumbai, Delhi)" value={registerForm.city} onChange={(event) => setRegisterForm((prev) => ({ ...prev, city: event.target.value }))} />
       <button type="submit" className="submit-btn w-full login-submit">Create Account</button>
      </form>
     )}

     {status ? <p className="text-sm mt-4 login-status">{status}</p> : null}
    </div>
   </div>
  </section>
 );
}
