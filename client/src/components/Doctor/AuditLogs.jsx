// src/components/AuditLogs.jsx
import React, { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import { getAuditRecent } from "../../utils/api";

const ACTION_UI_TO_DB = { Added: "INSERT", Edited: "UPDATE", Deleted: "DELETE" };
const ACTION_DB_TO_UI = { INSERT: "Added", UPDATE: "Edited", DELETE: "Deleted" };

// Friendly names for known tables (fallback will title-case)
const ENTITY_MAP = {
  patients: "Patient",
  medical_histories: "Medical History",
  visits: "Visit",
};

const ACTION_OPTIONS = [
  { value: "All", label: "All" },
  { value: "Added", label: "Added" },
  { value: "Edited", label: "Edited" },
  { value: "Deleted", label: "Deleted" },
];

const PAGE_OPTIONS = [10, 25, 50, 100, 200].map((n) => ({ value: n, label: String(n) }));

// Tailwind-friendly react-select base styles
const selectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 40,
    borderColor: state.isFocused ? "#6366f1" : "#d1d5db",
    boxShadow: state.isFocused ? "0 0 0 1px #6366f1" : "none",
    "&:hover": { borderColor: state.isFocused ? "#6366f1" : "#9ca3af" },
    borderRadius: 8,
    cursor: "pointer",
  }),
  valueContainer: (base) => ({ ...base, padding: "0 0.5rem" }),
  placeholder: (base) => ({ ...base, color: "#9ca3af" }),
  input: (base) => ({ ...base, margin: 0, padding: 0 }),
  singleValue: (base) => ({ ...base, margin: 0 }),
  indicatorsContainer: (base) => ({ ...base, paddingRight: 6 }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
};

const titleCase = (s = "") =>
  s
    .toString()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

/** Try to extract a human name from a row object */
const nameFromRowData = (row = {}) => {
  if (!row || typeof row !== "object") return null;
  const fn =
    row.first_name || row.firstName || row.firstname || row.given_name || row.givenName;
  const ln =
    row.last_name || row.lastName || row.lastname || row.family_name || row.familyName;
  const full = [fn, ln].filter(Boolean).join(" ").trim();
  if (full) return full;
  return row.name || row.patient_name || null;
};

/** Find the patient name for an event (best effort) */
const derivePatientName = (ev) => {
  // For patients table, use the row itself
  if (ev?.table_name === "patients") {
    return nameFromRowData(ev.new_data) || nameFromRowData(ev.old_data) || null;
  }

  // Otherwise try common patterns inside the row or nested patient object
  const src = ev?.new_data || ev?.old_data || {};
  if (src && typeof src === "object") {
    // Nested patient object?
    if (src.patient && typeof src.patient === "object") {
      const nm = nameFromRowData(src.patient);
      if (nm) return nm;
    }
    // Sometimes APIs denormalize name fields on related rows
    const nm2 = nameFromRowData(src);
    if (nm2) return nm2;
    // Fallback to short patient id if present
    const pid = src.patient_id || src.patientId;
    if (pid) return `#${String(pid).slice(0, 8)}…`;
  }
  return null;
};

const AuditLogs = () => {
  const [items, setItems] = useState([]);
  const [limit, setLimit] = useState(25);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // react-select selections
  const [actionOpt, setActionOpt] = useState(ACTION_OPTIONS[0]); // default: All
  const [pageOpt, setPageOpt] = useState(PAGE_OPTIONS.find((o) => o.value === 25) || PAGE_OPTIONS[1]);

  const formatDateTime = (v) => {
    if (!v) return "—";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const actionUi = actionOpt?.value || "All";
      const dbAction = actionUi === "All" ? undefined : ACTION_UI_TO_DB[actionUi];
      const r = await getAuditRecent({
        action: dbAction,
        limit,
        offset,
      });
      setItems(Array.isArray(r?.items) ? r.items : []);
    } catch (e) {
      setErr(e?.message || "Failed to load logs");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial + whenever filters/pagination change
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionOpt, limit, offset]);

  // Keep limit in sync with react-select page size
  useEffect(() => {
    setLimit(pageOpt?.value || 25);
  }, [pageOpt]);

  // Reset page when action filter changes
  useEffect(() => {
    setOffset(0);
  }, [actionOpt]);

  const badgeClass = (dbAction) => {
    const base = "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium";
    if (dbAction === "INSERT") return `${base} bg-green-100 text-green-800`;
    if (dbAction === "UPDATE") return `${base} bg-blue-100 text-blue-800`;
    if (dbAction === "DELETE") return `${base} bg-red-100 text-red-800`;
    return `${base} bg-gray-100 text-gray-800`;
  };

  const entityFromEvent = (ev) => {
    const t = ev?.table_name || "";
    return ENTITY_MAP[t] || titleCase(t || "Item");
  };

  const Row = ({ ev }) => {
    const friendlyAction = ACTION_DB_TO_UI[ev.action] || ev.action;
    const entity = entityFromEvent(ev);
    const patientName = derivePatientName(ev);

    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-col sm:flex-row sm:items-start gap-3 justify-between">
          {/* Left: what happened */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={badgeClass(ev.action)}>{friendlyAction}</span>
              <span className="text-sm font-semibold text-gray-900">
                {entity}
                {patientName ? ` (${patientName})` : ""}
              </span>
            </div>

            <div className="mt-1 text-xs text-gray-500">
              By{" "}
              <span className="font-medium text-gray-700">
                {ev.actor_email || ev.actor_id || "Unknown"}
              </span>
            </div>
          </div>

          {/* Right: when */}
          <div className="text-right">
            <div className="text-xs text-gray-500">When</div>
            <div className="text-sm font-medium text-gray-800">
              {formatDateTime(ev.happened_at)}
            </div>
          </div>
        </div>

        {/* Details removed per request */}
      </div>
    );
  };

  const headerTitle = useMemo(() => "Audit Logs", []);

  return (
    <div className="bg-gray-50 min-h-[60vh] p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{headerTitle}</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        {/* Filters: Action (react-select) + Page size (react-select) */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Show</label>
              <Select
                options={ACTION_OPTIONS}
                value={actionOpt}
                onChange={(opt) => setActionOpt(opt)}
                isClearable={false}
                styles={selectStyles}
                menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                menuPosition="fixed"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Page size</label>
              <Select
                options={PAGE_OPTIONS}
                value={pageOpt}
                onChange={(opt) => setPageOpt(opt)}
                isClearable={false}
                styles={selectStyles}
                menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                menuPosition="fixed"
              />
            </div>
          </div>
        </div>

        {/* Error & Empty states */}
        {err && (
          <div className="bg-white rounded-xl border border-red-200 p-4">
            <div className="text-sm text-red-700">{err}</div>
          </div>
        )}
        {!err && loading && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-600">
            Loading logs…
          </div>
        )}
        {!err && !loading && items.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-600">
            No events found.
          </div>
        )}

        {/* List */}
        {!err && !loading && items.length > 0 && (
          <div className="space-y-3">
            {items.map((ev) => (
              <Row key={`${ev.id}-${ev.happened_at}`} ev={ev} />
            ))}
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-sm text-gray-500">Showing up to {limit} events</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOffset((o) => Math.max(0, o - limit))}
              className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
              disabled={loading || offset === 0}
            >
              Previous
            </button>
            <button
              onClick={() => setOffset((o) => o + limit)}
              className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
              disabled={loading || items.length < limit}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;
