// src/App.jsx
import React from "react";
import { HashRouter as Router, Routes, Route, Navigate, useParams } from "react-router-dom";

import ImageKitProvider from "./components/Forms/ImageKitProvider";
import Login from "./AuthPages/Login";
import ForgotPassword from "./AuthPages/ForgotPassword";
import ResetPassword from "./AuthPages/ResetPassword";
import Register from "./AuthPages/Register";
import VerifyOtp from "./AuthPages/VerifyOtp";
import EmailConfirmed from "./AuthPages/EmailConfirmed";

import ProtectedRoute from "./ProtectedRoute";
import DoctorLayout from "./components/Doctor/DoctorLayout";
import Patients from "./components/Doctor/Patients";
import PatientDetail from "./components/Doctor/PatientDetail";
import VisitDetail from "./components/Doctor/VisitDetail";
import Analytics from "./components/Doctor/Analytics";
import FollowUps from "./components/Doctor/FollowUps";
import AppointmentDashboard from "./components/Doctor/Appointments";
import MultiStepForm from "./components/Forms/MultiStepForm";

// 🔥 Audit Logs component
import AuditLogs from "./components/Doctor/AuditLogs";

// 🔥 NEW: Camp Submissions page (adjust path/name if yours differs)
import CampSubmissions from "./components/Doctor/CampSubmissions";

/* --------- Legacy path redirect helpers (preserve :params) --------- */
const RedirectPatientsId = () => {
  const { id } = useParams();
  return <Navigate to={`/doctor/patients/${id}`} replace />;
};

const RedirectVisitId = () => {
  const { visitId } = useParams();
  return <Navigate to={`/doctor/visits/${visitId}`} replace />;
};

const App = () => {
  return (
    <ImageKitProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/verify-otp" element={<VerifyOtp />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/email-confirmed" element={<EmailConfirmed />} />

          {/* Doctor area (includes its own Navbar in DoctorLayout) */}
          <Route
            path="/doctor"
            element={
              <ProtectedRoute>
                <DoctorLayout />
              </ProtectedRoute>
            }
          >
            {/* Patients is the index/start page */}
            <Route index element={<AppointmentDashboard />} />
            <Route path="patients" element={<Patients />} />
            <Route path="patients/:id" element={<PatientDetail />} />
            <Route path="visits/:visitId" element={<VisitDetail />} />
            <Route path="form" element={<MultiStepForm />} />
            <Route path="followups" element={<FollowUps />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="appointments" element={<AppointmentDashboard />} />

            {/* 🔥 Audit Logs route */}
            <Route
              path="audit"
              element={
                <AuditLogs
                  mode="recent"
                  tableSchema="public"
                  tableName="patients"
                  pageSize={25}
                />
              }
            />

            {/* ✅ NEW: Camp Submissions route */}
            <Route path="camp-submissions" element={<CampSubmissions />} />
          </Route>

          {/* ---- Backward-compatible redirects for old paths ---- */}
          <Route path="/patients/:id" element={<RedirectPatientsId />} />
          <Route path="/patients" element={<Navigate to="/doctor/patients" replace />} />
          <Route path="/visits/:visitId" element={<RedirectVisitId />} />
          <Route path="/form" element={<Navigate to="/doctor/form" replace />} />
          <Route path="/followups" element={<Navigate to="/doctor/followups" replace />} />
          <Route path="/analytics" element={<Navigate to="/doctor/analytics" replace />} />
          <Route path="/appointments" element={<Navigate to="/doctor/appointments" replace />} />
          {/* Legacy redirect straight to doctor audit */}
          <Route path="/audit" element={<Navigate to="/doctor/audit" replace />} />
          {/* Legacy redirect for Camp Submissions */}
          <Route path="/camp-submissions" element={<Navigate to="/doctor/camp-submissions" replace />} />

          {/* Optional: default redirect */}
          <Route path="*" element={<Navigate to="/doctor" replace />} />
        </Routes>
      </Router>
    </ImageKitProvider>
  );
};

export default App;
