import React, { useEffect, useMemo, useState, useCallback } from "react";
import Select from "react-select";
import { getOverallNextAppts } from "../../utils/api"; // calls /visits/appointments/next

/* ===================== Constants ===================== */
const PAGE_SIZE_OPTIONS = [
  { value: 5, label: "5 / page" },
  { value: 10, label: "10 / page" },
  { value: 20, label: "20 / page" },
  { value: 50, label: "50 / page" },
];

// react-select portal target to avoid overlap issues
const portalTarget =
  typeof window !== "undefined" ? document.body : null;

// Tailwind-friendly react-select styles
const selectStyles = {
  control: (provided, state) => ({
    ...provided,
    minHeight: 38,
    borderRadius: 8,
    borderColor: state.isFocused ? "#6366f1" : "#E5E7EB",
    boxShadow: state.isFocused ? "0 0 0 1px #6366f1" : "none",
    "&:hover": { borderColor: state.isFocused ? "#6366f1" : "#CBD5E1" },
    fontSize: 14,
  }),
  menu: (provided) => ({
    ...provided,
    zIndex: 9999,
    borderRadius: 8,
    overflow: "hidden",
    boxShadow:
      "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)",
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected
      ? "#6366f1"
      : state.isFocused
      ? "#EEF2FF"
      : "white",
    color: state.isSelected ? "white" : "#374151",
    cursor: "pointer",
  }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
};

/* ===================== Helpers & Hooks ===================== */
const formatDateYYYYMMDDToLocal = (d) => {
  if (!d || typeof d !== "string") return "—";
  const parts = d.split("-");
  if (parts.length !== 3) return "—";
  const [y, m, day] = parts.map(Number);
  if (!y || !m || !day) return "—";
  const dt = new Date(Date.UTC(y, m - 1, day));
  if (Number.isNaN(dt.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(dt);
};

const useDebounced = (value, delay = 300) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
};

const SortIcon = ({ dir }) => (
  <span className="inline-flex items-center">
    {dir === "asc" ? (
      <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M3 12l7-8 7 8H3z" />
      </svg>
    ) : (
      <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M17 8l-7 8-7-8h14z" />
      </svg>
    )}
  </span>
);

const DownloadCSV = ({ rows }) => {
  const handle = () => {
    if (!rows?.length) return;
    const headers = [
      "date",
      "patientName",
      "chiefComplaint",
      "procedure",
      "patientId",
      "visitId",
    ];
    const safe = (v) => {
      const s = v == null ? "" : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };
    const body = rows
      .map((r) =>
        [
          r.date ?? "",
          r.patientName ?? "",
          r.chiefComplaint ?? "",
          r.procedure ?? "",
          r.patientId ?? "",
          r.visitId ?? "",
        ]
          .map(safe)
          .join(",")
      )
      .join("\n");

    const csv = [headers.join(","), body].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `followups_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handle}
      className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 transition px-4 py-2"
      title="Export table as CSV"
    >
      <svg
        className="h-4 w-4"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" x2="12" y1="15" y2="3" />
      </svg>
      Export CSV
    </button>
  );
};

/* ===================== Component ===================== */
const FollowUps = () => {
  const [rows, setRows] = useState([]); // [{ patientName, date, chiefComplaint, procedure, visitId, patientId }]
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[1].value); // default 10
  const [page, setPage] = useState(0);
  const [searchText, setSearchText] = useState("");
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const [sort, setSort] = useState({ key: "date", dir: "asc" }); // "date" | "patientName" | "procedure"

  const offset = page * pageSize;
  const debouncedSearch = useDebounced(searchText, 250);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getOverallNextAppts({ limit: pageSize, offset });
      setRows(Array.isArray(data) ? data : []);
      setLastRefreshed(new Date());
    } catch (e) {
      const msg = String(e?.message || "").toLowerCase();
      if (msg.includes("no upcoming") || msg.includes("not found")) {
        setRows([]);
        setLastRefreshed(new Date());
      } else {
        setError(e?.message || "Failed to load follow-ups");
      }
    } finally {
      setLoading(false);
    }
  }, [pageSize, offset]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = useMemo(() => {
    if (!debouncedSearch) return rows;
    const q = debouncedSearch.toLowerCase();
    return rows.filter((r) => {
      const patient = String(r.patientName || "").toLowerCase();
      const cc = String(r.chiefComplaint || "").toLowerCase();
      const proc = String(r.procedure || "").toLowerCase();
      const pid = String(r.patientId || "").toLowerCase();
      const vid = String(r.visitId || "").toLowerCase();
      const dateStr = String(r.date || "");
      return (
        patient.includes(q) ||
        cc.includes(q) ||
        proc.includes(q) ||
        pid.includes(q) ||
        vid.includes(q) ||
        dateStr.includes(q)
      );
    });
  }, [rows, debouncedSearch]);

  const sorted = useMemo(() => {
    const xs = [...filtered];
    const { key, dir } = sort;
    xs.sort((a, b) => {
      const av = a?.[key] ?? "";
      const bv = b?.[key] ?? "";
      if (key === "date") {
        return dir === "asc"
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av));
      }
      return dir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return xs;
  }, [filtered, sort]);

  const canPrev = page > 0;
  const canNext = rows.length === pageSize;

  const toggleSort = (key) => {
    setSort((s) => {
      if (s.key !== key) return { key, dir: "asc" };
      return { key, dir: s.dir === "asc" ? "desc" : "asc" };
    });
  };

  const openPatient = (patientId) => {
    if (!patientId) return;
    // e.g. navigate(`/patients/${patientId}`)
    console.info("open patient", patientId);
  };

  const openVisit = (visitId) => {
    if (!visitId) return;
    // e.g. navigate(`/visits/${visitId}`)
    console.info("open visit", visitId);
  };

  const skeletonRows = Array.from({ length: Math.min(pageSize, 6) });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-indigo-50 py-8 px-4">
      <div className="w-full max-w-6xl mx-auto rounded-2xl shadow-lg border border-gray-200 bg-white overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="bg-indigo-100 text-indigo-600 rounded-xl p-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M8 2v4" />
                <path d="M16 2v4" />
                <rect width="18" height="18" x="3" y="4" rx="2" />
                <path d="M3 10h18" />
              </svg>
            </span>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                Upcoming Follow-ups
              </h2>
              <p className="text-xs text-gray-500">
                Patients due for next appointment or review
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:w-72">
              <svg
                className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-300 bg-white"
                placeholder="Search patient, complaint, procedure, ID, date…"
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  setPage(0);
                }}
              />
            </div>

            {/* Page Size (react-select) */}
            <div className="sm:w-40">
              <Select
                options={PAGE_SIZE_OPTIONS}
                value={PAGE_SIZE_OPTIONS.find((o) => o.value === pageSize)}
                onChange={(opt) => {
                  setPageSize(opt.value);
                  setPage(0);
                }}
                isSearchable={false}
                styles={selectStyles}
                classNamePrefix="react-select"
                menuPortalTarget={portalTarget}
                menuPosition="fixed"
              />
            </div>

            {/* Export */}
            <DownloadCSV rows={sorted} />

            {/* Refresh */}
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition px-4 py-2 disabled:opacity-60"
            >
              {loading ? (
                <svg
                  className="h-4 w-4 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              ) : (
                <svg
                  className="h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                  <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                  <path d="M16 16h5v5" />
                </svg>
              )}
              Refresh
            </button>
          </div>
        </div>

        {/* Last refreshed */}
        <div className="px-6 pt-3 text-xs text-gray-500">
          {lastRefreshed && (
            <>
              Last refreshed{" "}
              {new Intl.DateTimeFormat(undefined, {
                hour: "2-digit",
                minute: "2-digit",
              }).format(lastRefreshed)}
            </>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-100 shadow-sm">
            <table className="w-full text-sm text-gray-700">
              <thead className="sticky top-0 z-10">
                <tr className="bg-indigo-50 text-indigo-700 border-b">
                  <th
                    className="py-3 px-4 font-semibold text-left cursor-pointer select-none"
                    onClick={() => toggleSort("date")}
                  >
                    <span className="inline-flex items-center gap-1">
                      Date {sort.key === "date" && <SortIcon dir={sort.dir} />}
                    </span>
                  </th>
                  <th
                    className="py-3 px-4 font-semibold text-left cursor-pointer select-none"
                    onClick={() => toggleSort("patientName")}
                  >
                    <span className="inline-flex items-center gap-1">
                      Patient{" "}
                      {sort.key === "patientName" && <SortIcon dir={sort.dir} />}
                    </span>
                  </th>
                  <th className="py-3 px-4 font-semibold text-left">
                    Chief Complaint
                  </th>
                  <th
                    className="py-3 px-4 font-semibold text-left cursor-pointer select-none"
                    onClick={() => toggleSort("procedure")}
                  >
                    <span className="inline-flex items-center gap-1">
                      Procedure{" "}
                      {sort.key === "procedure" && <SortIcon dir={sort.dir} />}
                    </span>
                  </th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading &&
                  skeletonRows.map((_, i) => (
                    <tr key={`sk-${i}`} className="border-b last:border-0">
                      <td className="py-3 px-4">
                        <div className="h-4 w-24 bg-slate-200 animate-pulse rounded" />
                      </td>
                      <td className="py-3 px-4">
                        <div className="h-4 w-40 bg-slate-200 animate-pulse rounded" />
                      </td>
                      <td className="py-3 px-4">
                        <div className="h-4 w-48 bg-slate-200 animate-pulse rounded" />
                      </td>
                      <td className="py-3 px-4">
                        <div className="h-4 w-36 bg-slate-200 animate-pulse rounded" />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="h-8 w-24 bg-slate-200 animate-pulse rounded-md ml-auto" />
                      </td>
                    </tr>
                  ))}

                {!loading && !error && sorted.length === 0 && (
                  <tr>
                    <td className="py-10 text-center text-gray-400" colSpan={5}>
                      No upcoming follow-ups
                    </td>
                  </tr>
                )}

                {!loading && error && (
                  <tr>
                    <td className="py-10 text-center text-rose-600" colSpan={5}>
                      {error}
                    </td>
                  </tr>
                )}

                {!loading &&
                  !error &&
                  sorted.map((r) => (
                    <tr
                      key={`${r.visitId}-${r.date}-${r.procedure || ""}`}
                      className="border-b last:border-0 hover:bg-indigo-50/40 transition"
                    >
                      <td className="py-3 px-4 whitespace-nowrap font-medium">
                        {formatDateYYYYMMDDToLocal(r.date)}
                      </td>
                      <td className="py-3 px-4">
                        {r.patientName || <span className="text-gray-400">—</span>}
                      </td>
                      <td className="py-3 px-4">
                        {r.chiefComplaint || <span className="text-gray-400">—</span>}
                      </td>
                      <td className="py-3 px-4">
                        {r.procedure ? (
                          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 text-amber-700 px-2 py-0.5 text-xs">
                            {r.procedure}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openPatient(r.patientId)}
                            className="rounded-md border border-gray-200 bg-white hover:bg-gray-50 px-3 py-1.5 text-xs"
                            disabled={!r.patientId}
                            title={r.patientId ? "Open patient" : "No patient ID"}
                          >
                            Patient
                          </button>
                          <button
                            onClick={() => openVisit(r.visitId)}
                            className="rounded-md border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-1.5 text-xs"
                            disabled={!r.visitId}
                            title={r.visitId ? "Open visit" : "No visit ID"}
                          >
                            Visit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="md:hidden space-y-3">
            {loading &&
              skeletonRows.map((_, i) => (
                <div
                  key={`skm-${i}`}
                  className="rounded-lg border border-gray-100 p-4 shadow-sm"
                >
                  <div className="h-4 w-28 bg-slate-200 animate-pulse rounded mb-2" />
                  <div className="h-4 w-40 bg-slate-200 animate-pulse rounded mb-2" />
                  <div className="h-4 w-48 bg-slate-200 animate-pulse rounded mb-3" />
                  <div className="flex gap-2">
                    <div className="h-8 w-20 bg-slate-200 animate-pulse rounded" />
                    <div className="h-8 w-20 bg-slate-200 animate-pulse rounded" />
                  </div>
                </div>
              ))}

            {!loading && !error && sorted.length === 0 && (
              <div className="text-center text-gray-400 py-8">
                No upcoming follow-ups
              </div>
            )}

            {!loading &&
              !error &&
              sorted.map((r) => (
                <div
                  key={`m-${r.visitId}-${r.date}-${r.procedure || ""}`}
                  className="rounded-lg border border-gray-100 p-4 shadow-sm bg-white"
                >
                  <div className="text-xs text-gray-500">
                    {formatDateYYYYMMDDToLocal(r.date)}
                  </div>
                  <div className="text-base font-semibold text-gray-900">
                    {r.patientName || "—"}
                  </div>
                  <div className="text-sm text-gray-700 mt-1">
                    <span className="font-medium">Complaint:</span>{" "}
                    {r.chiefComplaint || "—"}
                  </div>
                  <div className="mt-2">
                    {r.procedure ? (
                      <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 text-amber-700 px-2 py-0.5 text-xs">
                        {r.procedure}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
                    )}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => openPatient(r.patientId)}
                      className="flex-1 rounded-md border border-gray-200 bg-white hover:bg-gray-50 px-3 py-2 text-xs"
                      disabled={!r.patientId}
                    >
                      Patient
                    </button>
                    <button
                      onClick={() => openVisit(r.visitId)}
                      className="flex-1 rounded-md border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-2 text-xs"
                      disabled={!r.visitId}
                    >
                      Visit
                    </button>
                  </div>
                </div>
              ))}

            {!loading && error && (
              <div className="text-center text-rose-600 py-8">{error}</div>
            )}
          </div>

          {/* Pagination */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-500">
              Page{" "}
              <span className="font-semibold text-indigo-700">{page + 1}</span>
            </div>
            <div className="flex gap-2">
              <button
                disabled={!canPrev || loading}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="rounded-lg border border-gray-200 bg-white hover:bg-indigo-50 text-gray-700 transition px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              <button
                disabled={!canNext || loading}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FollowUps;
