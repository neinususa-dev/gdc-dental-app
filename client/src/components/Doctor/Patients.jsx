// src/components/Doctor/Patients.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPatients, getPatient } from "../../utils/api"; // ⬅️ import getPatient

const calcAge = (dob) => {
  if (!dob) return "";
  const d = new Date(dob);
  if (isNaN(d.getTime())) return "";
  const today = new Date();
  let a = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) a--;
  return a >= 0 ? a : "";
};

const formatDate = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
};

/** Detect if a URL is a Supabase Storage signed URL (expires) */
const isSupabaseSignedUrl = (u = "") =>
  typeof u === "string" && /\/storage\/v1\/object\/(?:sign|public)\//.test(u) && !/imagekit\.io/i.test(u);

/** Avatar component that refreshes an expired signed URL once (uses authed API) */
function PatientAvatar({ patient }) {
  const initials =
    `${patient.first_name?.[0] ?? ""}${patient.last_name?.[0] ?? ""}` || "👤";
  const [src, setSrc] = useState(patient.photo_url || "");
  const [triedRefresh, setTriedRefresh] = useState(false);

  useEffect(() => {
    setSrc(patient.photo_url || "");
    setTriedRefresh(false);
  }, [patient.photo_url]);

  const refreshSignedUrl = async () => {
    try {
      const json = await getPatient(patient.id); // ⬅️ includes Supabase JWT
      const fresh = json?.patient?.photo_url || "";
      if (fresh && fresh !== src) {
        setSrc(fresh);
        return true;
      }
    } catch {
      // ignore
    }
    return false;
  };

  if (!src) {
    return (
      <div className="h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-medium text-lg group-hover:bg-indigo-200 transition-colors duration-200">
        {initials}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={`${patient.first_name ?? ""} ${patient.last_name ?? ""}`.trim() || "Patient photo"}
      className="h-12 w-12 rounded-full object-cover border border-gray-200 group-hover:ring-2 group-hover:ring-indigo-200 transition"
      loading="lazy"
      decoding="async"
      onError={async (e) => {
        // Only try to refresh if the URL looks like a signed Supabase URL
        if (!triedRefresh && isSupabaseSignedUrl(src)) {
          setTriedRefresh(true);
          const ok = await refreshSignedUrl();
          if (ok) return; // src updated; browser will retry
        }
        // Final fallback
        e.currentTarget.onerror = null;
        e.currentTarget.src = "/fallback-avatar.png";
      }}
    />
  );
}

const Patients = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const rows = await getPatients({ limit: 500, offset: 0 });
        if (!mounted) return;
        setPatients(Array.isArray(rows) ? rows : []);
      } catch (e) {
        if (!mounted) return;
        setErr(e?.message || "Failed to load patients");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter((p) => {
      const fn = String(p.first_name ?? "").toLowerCase();
      const ln = String(p.last_name ?? "").toLowerCase();
      const ph = String(p.phone ?? "").toLowerCase();
      const em = String(p.email ?? "").toLowerCase();
      return fn.includes(q) || ln.includes(q) || ph.includes(q) || em.includes(q);
    });
  }, [patients, query]);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-3xl font-bold text-gray-900">Patients</h1>
            <p className="text-sm text-gray-600 mt-2">All patients in your care</p>
          </div>
        </div>

        {/* Search and filter card */}
        <div className="bg-white rounded-xl shadow-sm p-5 mb-6 border border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search patients by name, phone, or email…"
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 text-gray-900 placeholder-gray-500 transition-colors duration-200"
              />
            </div>
            <div className="flex items-center gap-3">
              <button className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-200 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filters
              </button>
              <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg">
                {filtered.length} of {patients.length}
              </div>
            </div>
          </div>
        </div>

        {/* Loading skeletons */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div key={item} className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 animate-pulse">
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                  <div className="h-3 bg-gray-200 rounded w-4/6"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {err && !loading && (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-gray-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load patients</h3>
            <p className="text-gray-600 mb-4">{err}</p>
            <button className="text-indigo-600 hover:text-indigo-800 font-medium" onClick={() => window.location.reload()}>
              Try again
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !err && filtered.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-gray-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No patients found</h3>
            <p className="text-gray-600 mb-4">Try adjusting your search or filter to find what you're looking for.</p>
            <button 
              className="text-indigo-600 hover:text-indigo-800 font-medium"
              onClick={() => setQuery("")}
            >
              Clear search
            </button>
          </div>
        )}

        {/* Patients grid */}
        {!loading && !err && filtered.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((p) => (
              <div 
                key={p.id} 
                className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 hover:shadow-md transition-shadow duration-200 cursor-pointer group"
                onClick={() => navigate(`/patients/${p.id}`)}
              >
                <div className="flex items-center gap-4 mb-4">
                  <PatientAvatar patient={p} />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {p.first_name} {p.last_name}
                    </h3>
                    <p className="text-sm text-gray-500 truncate">
                      {p.gender || "—"} • {calcAge(p.dob) || "—"} years
                    </p>
                  </div>
                  <span className="bg-green-100 text-green-800 text-xs px-2.5 py-0.5 rounded-full font-medium">
                    Active
                  </span>
                </div>

                <div className="space-y-2 mb-5">
                  <div className="flex items-center text-sm text-gray-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span>{p.phone || "No phone"}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="truncate">{p.email || "No email"}</span>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Patients;
