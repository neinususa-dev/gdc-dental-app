// src/components/CampSubmissions.jsx
import React, { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import { FiEdit, FiTrash2, FiRefreshCw, FiPlus, FiSearch, FiChevronDown, FiChevronUp } from "react-icons/fi";
import {
  listCampSubmissions,
  createCampSubmission,
  updateCampSubmission,
  deleteCampSubmission,
  listCampSubmissionLogs,
  getCampSubmissionLogsById,
} from "../../utils/api";

/* ------------------------------- Helpers -------------------------------- */

const ACTION_DB_TO_UI = { INSERT: "Added", UPDATE: "Edited", DELETE: "Deleted" };
const ACTION_UI_TO_DB = { Added: "INSERT", Edited: "UPDATE", Deleted: "DELETE" };

const INST_TYPE_OPTIONS = [
  { value: "Hospital", label: "Hospital" },
  { value: "Clinic", label: "Clinic" },
  { value: "School", label: "School" },
  { value: "College", label: "College" },
  { value: "NGO", label: "NGO" },
  { value: "Other", label: "Other" },
];

const ACTION_OPTIONS = [
  { value: "All", label: "All" },
  { value: "Added", label: "Added" },
  { value: "Edited", label: "Edited" },
  { value: "Deleted", label: "Deleted" },
];

const cls = (...parts) => parts.filter(Boolean).join(" ");
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
const badge = (a) =>
  a === "INSERT"
    ? "bg-green-100 text-green-700"
    : a === "UPDATE"
    ? "bg-blue-100 text-blue-700"
    : a === "DELETE"
    ? "bg-rose-100 text-rose-700"
    : "bg-gray-100 text-gray-700";

// Keep the phone as a clean 10-digit number in state
const normalizePhone10 = (v) => {
  const digits = String(v || "").replace(/\D/g, "");
  return digits.length <= 10 ? digits : digits.slice(-10);
};

// Optional: pretty print for display only (does not change stored value)
const formatPhone10 = (v) => (v ? String(v).replace(/(\d{5})(\d{5})/, "$1 $2") : "");

// Custom styles for React Select
const customSelectStyles = {
  control: (provided, state) => ({
    ...provided,
    minHeight: '42px',
    borderRadius: '8px',
    borderColor: state.isFocused ? '#3b82f6' : '#d1d5db',
    boxShadow: state.isFocused ? '0 0 0 1px #3b82f6' : 'none',
    '&:hover': {
      borderColor: state.isFocused ? '#3b82f6' : '#9ca3af'
    }
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#eff6ff' : 'white',
    color: state.isSelected ? 'white' : '#1f2937',
    '&:active': {
      backgroundColor: '#dbeafe'
    }
  }),
  placeholder: (provided) => ({
    ...provided,
    color: '#9ca3af',
    fontSize: '0.875rem'
  })
};

/* ------------------------------- Form ----------------------------------- */

const SubmissionForm = ({
  initial = null,
  onSubmit,
  submitting = false,
  submitLabel = "Save",
}) => {
  const [name, setName] = useState(initial?.name || "");
  const [dob, setDob] = useState(initial?.dob || "");
  const [email, setEmail] = useState(initial?.email || "");
  const [phone, setPhone] = useState(normalizePhone10(initial?.phone));
  const [institution, setInstitution] = useState(initial?.institution || "");
  const [institutionType, setInstitutionType] = useState(
    initial?.institution_type || initial?.institutionType || ""
  );
  const [comments, setComments] = useState(initial?.comments || "");
  const [err, setErr] = useState("");

  useEffect(() => {
    setName(initial?.name || "");
    setDob(initial?.dob || "");
    setEmail(initial?.email || "");
    setPhone(normalizePhone10(initial?.phone));
    setInstitution(initial?.institution || "");
    setInstitutionType(initial?.institution_type || initial?.institutionType || "");
    setComments(initial?.comments || "");
    setErr("");
  }, [initial]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");

    // Basic validation
    if (!name.trim()) return setErr("Name is required");
    if (email && !/^\S+@\S+\.\S+$/.test(email)) return setErr("Enter a valid email");
    if (phone && phone.length !== 10) return setErr("Enter a 10-digit phone number");

    // Always send BOTH snake_case and camelCase for maximum backend compatibility.
    // Also normalize empty strings to null where appropriate.
    const safeDob = dob || null;

    const payload = {
      // camelCase
      name: name.trim(),
      dob: safeDob,
      email: email || null,
      phone: phone || null, // already normalized to 10 digits
      comments: comments || null,
      institution: institution || null,
      institutionType: institutionType || null,

      // snake_case mirrors
      institution_type: institutionType || null,
    };

    try {
      await onSubmit(payload);
      // Parent (create/edit modal caller) decides what to do after success
    } catch (e) {
      setErr(e?.message || "Failed to submit");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!!err && (
        <div className="p-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-sm">
          {err}
        </div>
      )}
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
          <input
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">DOB</label>
          <input
            type="date"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={dob || ""}
            onChange={(e) => setDob(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={email || ""}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input
            type="tel"
            inputMode="numeric"
            pattern="[0-9]{10}"
            maxLength={10}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={phone || ""}
            onChange={(e) => setPhone(normalizePhone10(e.target.value))}
            placeholder="10-digit mobile (e.g., 9876543210)"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Institution</label>
          <input
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={institution || ""}
            onChange={(e) => setInstitution(e.target.value)}
            placeholder="City Hospital"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Institution Type</label>
          <Select
            classNamePrefix="rs"
            styles={customSelectStyles}
            options={INST_TYPE_OPTIONS}
            value={
              institutionType
                ? INST_TYPE_OPTIONS.find((o) => o.value === institutionType) || null
                : null
            }
            onChange={(opt) => setInstitutionType(opt?.value || "")}
            placeholder="Select type..."
            isClearable
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Comments</label>
          <textarea
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={3}
            value={comments || ""}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Any notes..."
          />
        </div>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={submitting}
          className={cls(
            "w-full sm:w-auto px-5 py-3 rounded-lg text-white font-medium flex items-center justify-center gap-2",
            submitting ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
          )}
        >
          {submitting ? (
            <>
              <FiRefreshCw className="animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <FiPlus />
              {submitLabel}
            </>
          )}
        </button>
      </div>
    </form>
  );
};

/* ------------------------------- Modals ---------------------------------- */

const Modal = ({ open, onClose, title, children, footer }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 transition-opacity"
        aria-hidden="true"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden mx-2 sm:mx-0">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-white">
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        </div>
        <div className="p-4 sm:p-6 max-h-[70vh] overflow-y-auto">{children}</div>
        {footer && <div className="px-4 sm:px-6 py-4 border-t border-gray-200 bg-gray-50">{footer}</div>}
      </div>
    </div>
  );
};

const ConfirmDeleteModal = ({ open, onCancel, onConfirm, item, loading }) => {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title="Delete submission?"
      footer={
        <div className="flex flex-col sm:flex-row gap-3">
          <button 
            className="flex-1 px-4 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors" 
            onClick={onCancel} 
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="flex-1 px-4 py-3 rounded-lg text-white font-medium bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 transition-colors flex items-center justify-center gap-2"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <FiRefreshCw className="animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </button>
        </div>
      }
    >
      <div className="text-sm text-gray-600 space-y-2">
        <p>
          This will permanently delete{" "}
          <span className="font-medium text-gray-800">{item?.name || "this record"}</span>.
        </p>
        <p>This action cannot be undone.</p>
      </div>
    </Modal>
  );
};

const EditSubmissionModal = ({ open, onClose, onSaved, item }) => {
  const [saving, setSaving] = useState(false);
  const onSubmit = async (payload) => {
    setSaving(true);
    try {
      await updateCampSubmission(item.id, payload);
      onSaved?.();
      onClose?.();
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Edit: ${item?.name || ""}`}
      footer={null}
    >
      {/* key forces form to fully re-mount when switching items */}
      <SubmissionForm
        key={item?.id || "new"}
        initial={item}
        onSubmit={onSubmit}
        submitting={saving}
        submitLabel="Update"
      />
    </Modal>
  );
};

/* ----------------------------- Audit Panel ------------------------------- */

const AuditLogsPanel = () => {
  const [items, setItems] = useState([]);
  const [limit, setLimit] = useState(25);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [actionOpt, setActionOpt] = useState(ACTION_OPTIONS[0]); // All
  const [submissionId, setSubmissionId] = useState(""); // ⬅️ optional filter by one submission

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const action =
        actionOpt?.value === "All" ? undefined : ACTION_UI_TO_DB[actionOpt.value];

      let r;
      if (submissionId.trim()) {
        // Per-submission logs
        r = await getCampSubmissionLogsById(submissionId.trim(), { limit, offset });
      } else {
        // All camp-submission logs
        r = await listCampSubmissionLogs({ action, limit, offset });
      }
      const raw = Array.isArray(r?.items) ? r.items : [];
      setItems(raw);
    } catch (e) {
      setErr(e?.message || "Failed to load logs");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionOpt, limit, offset, submissionId]);

  useEffect(() => setOffset(0), [actionOpt, submissionId]);

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Show</label>
            <Select
              classNamePrefix="rs"
              styles={customSelectStyles}
              options={ACTION_OPTIONS}
              value={actionOpt}
              onChange={(opt) => setActionOpt(opt || ACTION_OPTIONS[0])}
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Submission ID (optional)</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Filter by specific ID…"
              value={submissionId}
              onChange={(e) => setSubmissionId(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Page size</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={limit}
              onChange={(e) => setLimit(Math.max(1, Number(e.target.value) || 25))}
            >
              {[10, 25, 50, 100, 200].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={load}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              disabled={loading}
            >
              <FiRefreshCw className={loading ? "animate-spin" : ""} />
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>
      </div>

      {err && (
        <div className="p-4 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-sm">
          {err}
        </div>
      )}
      {!err && loading && (
        <div className="p-8 rounded-xl border border-gray-200 bg-white text-center text-gray-500 flex flex-col items-center">
          <FiRefreshCw className="animate-spin text-2xl mb-2" />
          Loading logs…
        </div>
      )}

      {!err && !loading && (
        <>
          {items.length === 0 ? (
            <div className="p-8 rounded-xl border border-gray-200 bg-white text-center text-gray-500">
              No events found.
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((ev) => (
                <div
                  key={`${ev.id}-${ev.happened_at}`}
                  className="rounded-lg border border-gray-200 bg-white p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between transition-colors hover:bg-gray-50"
                >
                  <div className="min-w-0 flex-1 mb-2 sm:mb-0">
                    <div className="flex items-center gap-2">
                      <span className={cls("px-2.5 py-1 rounded-full text-xs font-medium", badge(ev.action))}>
                        {ACTION_DB_TO_UI[ev.action] || ev.action}
                      </span>
                      <span className="text-sm text-gray-700 truncate">
                        Camp Submission{ev.row_id ? ` • ${String(ev.row_id).slice(0, 8)}` : ""}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500 truncate">
                      By{" "}
                      <span className="font-medium text-gray-700">
                        {ev.actor_email || ev.actor_id || "Unknown"}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 self-end sm:self-auto">
                    {formatDateTime(ev.happened_at)}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-between pt-4 gap-4">
            <div className="text-sm text-gray-500">Showing up to {limit} events</div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setOffset((o) => Math.max(0, o - limit))}
                className="flex-1 sm:flex-none px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                disabled={loading || offset === 0}
              >
                Previous
              </button>
              <button
                onClick={() => setOffset((o) => o + limit)}
                className="flex-1 sm:flex-none px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                disabled={loading || items.length < limit}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

/* ----------------------------- Mobile Table Row -------------------------- */

const MobileTableRow = ({ row, onEdit, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-3">
      <div 
        className="p-4 flex justify-between items-center cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 truncate">{row.name}</div>
          <div className="text-sm text-gray-500 truncate">{row.email || "—"}</div>
        </div>
        <div className="flex items-center gap-2 ml-2">
          <button
            className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
            title="Edit"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(row);
            }}
          >
            <FiEdit />
          </button>
          <button
            className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
            title="Delete"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(row);
            }}
          >
            <FiTrash2 />
          </button>
          <div className="text-gray-400">
            {expanded ? <FiChevronUp /> : <FiChevronDown />}
          </div>
        </div>
      </div>
      
      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-100">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-gray-500">DOB:</div>
            <div className="text-gray-700">{row.dob || "—"}</div>
            
            <div className="text-gray-500">Phone:</div>
            <div className="text-gray-700">{formatPhone10(row.phone) || "—"}</div>
            
            <div className="text-gray-500">Institution:</div>
            <div className="text-gray-700">{row.institution || "—"}</div>
            
            <div className="text-gray-500">Type:</div>
            <div className="text-gray-700">{row.institution_type || row.institutionType || "—"}</div>
            
            <div className="text-gray-500">Created:</div>
            <div className="text-gray-700">{formatDateTime(row.created_at)}</div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ----------------------------- Main Page --------------------------------- */

const CampSubmissions = () => {
  const [tab, setTab] = useState("form"); // 'form' | 'list' | 'audit'
  const [creating, setCreating] = useState(false);

  // list state
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(null);
  const [limit, setLimit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [q, setQ] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [errList, setErrList] = useState("");

  // edit/delete modals
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [delOpen, setDelOpen] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deletingNow, setDeletingNow] = useState(false);

  const tabs = useMemo(
    () => [
      { key: "form", label: "Add / Edit" },
      { key: "list", label: "Submissions" },
      { key: "audit", label: "Audit Logs" },
    ],
    []
  );

  const loadList = async () => {
    setLoadingList(true);
    setErrList("");
    try {
      const res = await listCampSubmissions({
        q: q || undefined,
        limit,
        offset,
        sort: "created_at.desc",
      });
      setRows(res?.items || []);
      setTotal(Number.isFinite(res?.total) ? res.total : null);
    } catch (e) {
      setErrList(e?.message || "Failed to load submissions");
      setRows([]);
      setTotal(null);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (tab === "list") loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, q, limit, offset]);

  const handleCreate = async (payload) => {
    setCreating(true);
    try {
      await createCampSubmission(payload);
      // move to list and refresh
      setTab("list");
      setOffset(0);
      await loadList();
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (row) => {
    setEditing(row);
    setEditOpen(true);
  };

  const confirmDelete = (row) => {
    setDeleting(row);
    setDelOpen(true);
  };

  const doDelete = async () => {
    if (!deleting?.id) return;
    setDeletingNow(true);
    try {
      await deleteCampSubmission(deleting.id);
      setDelOpen(false);
      setDeleting(null);
      await loadList();
    } finally {
      setDeletingNow(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-4">
      <div className="max-w-6xl mx-auto px-2 sm:px-4 space-y-6">
        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex flex-wrap border-b border-gray-200">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cls(
                  "flex-1 sm:flex-none px-3 py-3 text-sm font-medium border-b-2 transition-colors min-w-0",
                  tab === t.key
                    ? "border-blue-500 text-blue-600 bg-blue-50"
                    : "border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-4 sm:p-6">
            {tab === "form" && (
              <>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Add New Submission</h2>
                <SubmissionForm onSubmit={handleCreate} submitting={creating} submitLabel="Create" />
              </>
            )}

            {tab === "list" && (
              <>
                <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between mb-5">
                  <h2 className="text-xl font-semibold text-gray-800">Submissions</h2>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <div className="relative">
                      <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        value={q}
                        onChange={(e) => {
                          setOffset(0);
                          setQ(e.target.value);
                        }}
                        placeholder="Search name/email/institution…"
                        className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                      />
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={limit}
                        onChange={(e) => {
                          setOffset(0);
                          setLimit(Math.max(1, Number(e.target.value) || 10));
                        }}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {[10, 20, 50, 100].map((n) => (
                          <option key={n} value={n}>
                            {n}/page
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={loadList}
                        disabled={loadingList}
                        className="px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
                      >
                        <FiRefreshCw className={loadingList ? "animate-spin" : ""} />
                        {loadingList ? "Refreshing…" : "Refresh"}
                      </button>
                    </div>
                  </div>
                </div>

                {errList && (
                  <div className="p-4 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-sm mb-4">
                    {errList}
                  </div>
                )}

                {/* Mobile View */}
                <div className="block sm:hidden">
                  {loadingList ? (
                    <div className="p-8 rounded-xl border border-gray-200 bg-white text-center text-gray-500">
                      <div className="flex justify-center items-center">
                        <FiRefreshCw className="animate-spin mr-2" />
                        Loading…
                      </div>
                    </div>
                  ) : rows.length === 0 ? (
                    <div className="p-8 rounded-xl border border-gray-200 bg-white text-center text-gray-500">
                      No records found.
                    </div>
                  ) : (
                    <div>
                      {rows.map((r) => (
                        <MobileTableRow 
                          key={r.id} 
                          row={{ ...r, phone: normalizePhone10(r.phone) }}
                          onEdit={startEdit}
                          onDelete={confirmDelete}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Desktop View */}
                <div className="hidden sm:block overflow-auto border border-gray-200 rounded-xl shadow-sm">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DOB</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Institution</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {loadingList ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-6 text-center text-gray-500">
                            <div className="flex justify-center items-center">
                              <FiRefreshCw className="animate-spin mr-2" />
                              Loading…
                            </div>
                          </td>
                        </tr>
                      ) : rows.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-6 text-center text-gray-500">
                            No records found.
                          </td>
                        </tr>
                      ) : (
                        rows.map((r) => (
                          <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 max-w-xs truncate">{r.name}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{r.dob || "—"}</td>
                            <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">{r.email || "—"}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {formatPhone10(normalizePhone10(r.phone)) || "—"}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">{r.institution || "—"}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{r.institution_type || r.institutionType || "—"}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{formatDateTime(r.created_at)}</td>
                            <td className="px-4 py-3 text-sm text-right">
                              <div className="flex gap-2 justify-end">
                                <button
                                  className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                                  title="Edit"
                                  onClick={() => startEdit(r)}
                                >
                                  <FiEdit />
                                </button>
                                <button
                                  className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                                  title="Delete"
                                  onClick={() => confirmDelete(r)}
                                >
                                  <FiTrash2 />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between mt-4 text-sm gap-3">
                  <div className="text-gray-600">
                    {Number.isFinite(total)
                      ? `Showing ${offset + 1} to ${Math.min(offset + limit, total)} of ${total}`
                      : `Showing ${rows.length} records`}
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => setOffset((o) => Math.max(0, o - limit))}
                      className="flex-1 sm:flex-none px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                      disabled={loadingList || offset === 0}
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setOffset((o) => o + limit)}
                      className="flex-1 sm:flex-none px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                      disabled={loadingList || rows.length < limit}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}

            {tab === "audit" && <AuditLogsPanel />}
          </div>
        </div>
      </div>

      {/* Modals */}
      <EditSubmissionModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={loadList}
        item={editing}
      />
      <ConfirmDeleteModal
        open={delOpen}
        onCancel={() => {
          setDelOpen(false);
          setDeleting(null);
        }}
        onConfirm={doDelete}
        item={deleting}
        loading={deletingNow}
      />
    </div>
  );
};

export default CampSubmissions;
