import { useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../config";

export default function ContactPage() {
 const [form, setForm] = useState({ name: "", email: "", message: "" });
 const [status, setStatus] = useState("");

 const onSubmit = async (event) => {
  event.preventDefault();
  setStatus("Sending...");

  try {
   await apiRequest("/contact", {
    method: "POST",
    body: JSON.stringify(form)
   });
   setStatus("Message received successfully");
   setForm({ name: "", email: "", message: "" });
  } catch (error) {
   setStatus(error.message);
  }
 };

 return (
  <div>
   <nav className="navbar fixed top-0 w-full z-50 shadow-md">
    <div className="container mx-auto px-4 py-3 flex justify-between items-center">
     <span className="font-bold text-2xl text-gray-800">HealthApp</span>
     <div className="hidden md:flex space-x-6 text-gray-700">
      <Link className="hover:text-teal-500 transition-colors" to="/">Home</Link>
      <Link className="hover:text-teal-500 transition-colors" to="/login">Login</Link>
     </div>
    </div>
   </nav>

   <section className="min-h-screen pt-24 contact-section flex items-center justify-center">
    <div className="container mx-auto px-4 text-center">
     <h1 className="text-5xl md:text-6xl font-semibold leading-tight mb-4 text-gray-800">Get in Touch</h1>
     <p className="text-lg md:text-xl max-w-2xl mx-auto text-gray-700 mb-8">
      Send us your questions and our team will respond quickly.
     </p>

     <form className="max-w-xl mx-auto bg-white p-8 rounded-lg shadow-lg space-y-6" onSubmit={onSubmit}>
      <input
       type="text"
       className="form-input"
       placeholder="Full Name"
       value={form.name}
       onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
       required
      />
      <input
       type="email"
       className="form-input"
       placeholder="Email Address"
       value={form.email}
       onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
       required
      />
      <textarea
       className="form-input resize-none"
       rows="5"
       placeholder="Your Message"
       value={form.message}
       onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
       required
      ></textarea>
      <button type="submit" className="submit-btn w-full">Send Message</button>
      {status ? <p className="text-sm text-gray-700">{status}</p> : null}
     </form>
    </div>
   </section>
  </div>
 );
}
