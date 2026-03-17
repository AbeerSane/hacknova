import { Navigate, Route, Routes } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import ContactPage from "./pages/ContactPage";
import LoginPage from "./pages/LoginPage";
import PatientDashboard from "./pages/PatientDashboard";
import DoctorDashboard from "./pages/DoctorDashboard";
import { useAuth } from "./context/AuthContext";

function ProtectedRoute({ children, role }) {
 const { session } = useAuth();

 if (!session?.user) {
  return <Navigate to="/login" replace />;
 }

 if (role && session.user.role !== role) {
  return <Navigate to={session.user.role === "doctor" ? "/doctor" : "/patient"} replace />;
 }

 return children;
}

export default function App() {
 return (
  <Routes>
   <Route path="/" element={<LandingPage />} />
   <Route path="/contact" element={<ContactPage />} />
   <Route path="/login" element={<LoginPage />} />
   <Route
    path="/patient"
    element={
     <ProtectedRoute role="patient">
      <PatientDashboard />
     </ProtectedRoute>
    }
   />
   <Route
    path="/doctor"
    element={
     <ProtectedRoute role="doctor">
      <DoctorDashboard />
     </ProtectedRoute>
    }
   />
   <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
 );
}
