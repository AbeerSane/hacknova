import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { apiRequest } from "../config";
import { useAuth } from "../context/AuthContext";

const initialRegister = {
 name: "",
 email: "",
 password: "",
 role: "patient",
 phone: "",
 specialization: "",
 city: "",
 doctorIdentityFile: "",
 doctorIdentityFileName: ""
};

const initialForgot = {
 email: "",
 otp: "",
 newPassword: "",
 confirmPassword: ""
};

export default function LoginPage() {
 const navigate = useNavigate();
 const [searchParams] = useSearchParams();
 const { login, session } = useAuth();
 const [mode, setMode] = useState("login");
 const [loginForm, setLoginForm] = useState({ email: "", password: "" });
 const [registerForm, setRegisterForm] = useState(initialRegister);
 const [forgotForm, setForgotForm] = useState(initialForgot);
 const [otpRequested, setOtpRequested] = useState(false);
 const [status, setStatus] = useState("");

 const handleIdentityUpload = (event) => {
  const file = event.target.files?.[0];
  if (!file) {
   setRegisterForm((prev) => ({ ...prev, doctorIdentityFile: "", doctorIdentityFileName: "" }));
   return;
  }

  if (file.size > 2 * 1024 * 1024) {
   setStatus("Identity file must be under 2MB");
   return;
  }

  const reader = new FileReader();
  reader.onload = () => {
   setRegisterForm((prev) => ({
    ...prev,
    doctorIdentityFile: String(reader.result || ""),
    doctorIdentityFileName: file.name
   }));
  };
  reader.readAsDataURL(file);
 };

 useEffect(() => {
  const requestedMode = searchParams.get("mode");
  if (requestedMode === "register" || requestedMode === "login") {
   setMode(requestedMode);
  }
  if (requestedMode === "forgot") {
   setMode("forgot");
  }
 }, [searchParams]);

 if (session?.user) {
  return <Navigate to={session.user.role === "doctor" ? "/doctor" : "/patient"} replace />;
 }

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

    if (registerForm.role === "doctor" && !registerForm.doctorIdentityFile) {
     setStatus("Doctor identity document is mandatory");
     return;
    }

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

 const requestResetOtp = async (event) => {
  event.preventDefault();
  setStatus("Sending OTP...");

  try {
   const response = await apiRequest("/users/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email: forgotForm.email })
   });
   setOtpRequested(true);
   setStatus(response.message || "OTP sent to your email");
  } catch (error) {
   setStatus(error.message);
  }
 };

 const submitForgotReset = async (event) => {
  event.preventDefault();

  if (!forgotForm.otp) {
   setStatus("Enter the OTP sent to your email");
   return;
  }

  if (forgotForm.newPassword !== forgotForm.confirmPassword) {
   setStatus("New password and confirm password must match");
   return;
  }

  setStatus("Resetting password...");
  try {
   const response = await apiRequest("/users/reset-password", {
    method: "POST",
    body: JSON.stringify({
     email: forgotForm.email,
     otp: forgotForm.otp,
     newPassword: forgotForm.newPassword
    })
   });
   setStatus(response.message || "Password reset successful. Please login.");
   setMode("login");
   setOtpRequested(false);
   setLoginForm((prev) => ({ ...prev, email: forgotForm.email }));
   setForgotForm(initialForgot);
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
         <button type="button" className="text-xs text-teal-700 underline underline-offset-4" onClick={() => setMode("forgot")}>Forgot password?</button>
       <button type="submit" className="submit-btn w-full login-submit">Sign In Securely</button>
      </form>
       ) : mode === "register" ? (
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
            <>
             <input className="form-input login-input" placeholder="Specialization" value={registerForm.specialization} onChange={(event) => setRegisterForm((prev) => ({ ...prev, specialization: event.target.value }))} required />
             <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Doctor Identity Document (Mandatory)</label>
             <input className="form-input login-input" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleIdentityUpload} required />
             {registerForm.doctorIdentityFileName ? <p className="text-xs text-slate-500">Uploaded: {registerForm.doctorIdentityFileName}</p> : null}
            </>
       ) : null}
       <input className="form-input login-input" placeholder="City (e.g. Mumbai, Delhi)" value={registerForm.city} onChange={(event) => setRegisterForm((prev) => ({ ...prev, city: event.target.value }))} />
       <button type="submit" className="submit-btn w-full login-submit">Create Account</button>
      </form>
      ) : (
       <form className="space-y-4" onSubmit={otpRequested ? submitForgotReset : requestResetOtp}>
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</label>
        <input
         className="form-input login-input"
         type="email"
         placeholder="Registered email"
         value={forgotForm.email}
         onChange={(event) => setForgotForm((prev) => ({ ...prev, email: event.target.value }))}
         required
        />
        {otpRequested ? (
         <>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">OTP</label>
          <input
        className="form-input login-input"
        placeholder="6-digit OTP"
        value={forgotForm.otp}
        onChange={(event) => setForgotForm((prev) => ({ ...prev, otp: event.target.value }))}
        required
          />
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">New Password</label>
          <input
        className="form-input login-input"
        type="password"
        placeholder="New password"
        value={forgotForm.newPassword}
        onChange={(event) => setForgotForm((prev) => ({ ...prev, newPassword: event.target.value }))}
        required
          />
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Confirm Password</label>
          <input
        className="form-input login-input"
        type="password"
        placeholder="Confirm new password"
        value={forgotForm.confirmPassword}
        onChange={(event) => setForgotForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
        required
          />
         </>
        ) : null}
        <button type="submit" className="submit-btn w-full login-submit">{otpRequested ? "Verify OTP & Reset Password" : "Send OTP"}</button>
       </form>
     )}

     {status ? <p className="text-sm mt-4 login-status">{status}</p> : null}
    </div>
   </div>
  </section>
 );
}
