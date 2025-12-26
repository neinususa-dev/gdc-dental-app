// src/pages/VisitDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getVisit,
  updateVisit,
  deleteVisit,
  addVisitProcedure,
  updateVisitProcedureByIndex,
  deleteVisitProcedureByIndex,
} from "../../utils/api";

/* ---------- Icons ---------- */
const EditIcon = ({ className = "w-4 h-4" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const DeleteIcon = ({ className = "w-4 h-4" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const CloseIcon = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const BackIcon = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const SaveIcon = ({ className = "w-4 h-4" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const CancelIcon = ({ className = "w-4 h-4" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const AddIcon = ({ className = "w-4 h-4" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
);

/* ---------- helpers ---------- */
const formatDate = (v) => {
  if (!v) return "Not specified";
  const d = new Date(v);
  return isNaN(d.getTime())
    ? "Not specified"
    : d.toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });
};

const formatDateTime = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("en-IN", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
};

const inr = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(Number(value || 0))
    .replace("₹", "₹ ");

const displayText = (v) => {
  if (v === null || v === undefined) return "—";
  const s = String(v).trim();
  if (!s) return "—";
  if (s.toLowerCase() === "null") return "—";
  return s;
};

const getGradeClass = (grade) => {
  switch (grade) {
    case "A":
      return "bg-green-100 text-green-800";
    case "B":
      return "bg-yellow-100 text-yellow-800";
    case "C":
      return "bg-orange-100 text-orange-800";
    case "D":
      return "bg-red-100 text-red-800";
    case "E":
      return "bg-red-200 text-red-900";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

// map DB row -> edit form (camelCase keys expected by API)
const visitToForm = (v) => {
  const toLocalInput = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    // yyyy-MM-ddTHH:mm for <input type="datetime-local">
    const pad = (n) => String(n).padStart(2, "0");
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  };
  return {
    chiefComplaint: v?.chief_complaint || "",
    durationOnset: v?.duration_onset || "",
    triggerFactors: Array.isArray(v?.trigger_factors) ? v.trigger_factors : [],
    diagnosisNotes: v?.diagnosis_notes || "",
    treatmentPlanNotes: v?.treatment_plan_notes || "",
    visitAt: toLocalInput(v?.visit_at) || "",
  };
};

const parseTriggerFactorsInput = (s) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

/* ---------- page ---------- */
const VisitDetail = () => {
  const { visitId } = useParams();
  const navigate = useNavigate();

  const [visit, setVisit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Visit-level editing
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(visitToForm({}));
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState("");

  // Delete visit
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Add procedure
  const [addingProc, setAddingProc] = useState(false);
  const [addProcErr, setAddProcErr] = useState("");
  const [addProcForm, setAddProcForm] = useState({
    visitDate: "",
    procedure: "",
    nextApptDate: "",
    total: "",
    paid: "",
    notes: "",
  });

  // Edit procedure (per-index)
  const [editingIndex, setEditingIndex] = useState(null);
  const [editProcErr, setEditProcErr] = useState("");
  const [editProcForm, setEditProcForm] = useState({
    visitDate: "",
    procedure: "",
    nextApptDate: "",
    total: "",
    paid: "",
    notes: "",
  });

  useEffect(() => {
    let mounted = true;

    if (!visitId) {
      setErr("Missing visit id");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        setLoading(true);
        setErr("");
        const v = await getVisit(visitId);
        if (!mounted) return;
        setVisit(v || null);
        if (v) {
          setForm(visitToForm(v));
        }
      } catch (e) {
        if (!mounted) return;
        setErr(e?.message || "Failed to load visit");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [visitId]);

  const procs = useMemo(() => (Array.isArray(visit?.procedures) ? visit.procedures : []), [visit]);
  const procSummary = useMemo(
    () =>
      procs.reduce(
        (acc, r) => {
          const t = Number(r.total || 0);
          const p = Number(r.paid || 0);
          return {
            total: acc.total + t,
            paid: acc.paid + p,
            due: acc.due + Math.max(t - p, 0),
          };
        },
        { total: 0, paid: 0, due: 0 }
      ),
    [procs]
  );

  const renderFindings = (arr = [], jawLabel) => {
    const shown = (arr || []).filter((f) => f?.grade || f?.status);
    if (!shown.length) {
      return (
        <div className="mt-2 text-sm text-gray-500">
          No {jawLabel.toLowerCase()} jaw findings recorded.
        </div>
      );
    }
    return (
      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {shown.map((f, i) => (
          <div key={`${jawLabel}-${i}`} className="border border-gray-200 rounded-lg p-3 bg-white shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">Tooth {f.tooth}</span>
              <span className={`text-xs px-2 py-1 rounded-full ${getGradeClass(f.grade || "")}`}>
                {f.grade || "—"}
              </span>
            </div>
            <div className="mt-1 text-xs text-gray-600">Status: {displayText(f.status)}</div>
          </div>
        ))}
      </div>
    );
  };

  /* -------------------- Visit: edit handlers -------------------- */
  const startEditVisit = () => {
    setSaveErr("");
    if (visit) setForm(visitToForm(visit));
    setEditMode(true);
  };

  const cancelEditVisit = () => {
    setSaveErr("");
    if (visit) setForm(visitToForm(visit));
    setEditMode(false);
  };

  const onVisitField = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onVisitSave = async (e) => {
    e?.preventDefault?.();
    if (!visitId) return;
    try {
      setSaving(true);
      setSaveErr("");

      const payload = {
        chiefComplaint: form.chiefComplaint,
        durationOnset: form.durationOnset,
        triggerFactors: Array.isArray(form.triggerFactors)
          ? form.triggerFactors
          : parseTriggerFactorsInput(String(form.triggerFactors || "")),
        diagnosisNotes: form.diagnosisNotes,
        treatmentPlanNotes: form.treatmentPlanNotes,
        visitAt: form.visitAt || undefined, // datetime-local string OK
      };

      const updated = await updateVisit(visitId, payload);
      setVisit(updated);
      setForm(visitToForm(updated));
      setEditMode(false);
  } catch (e) {
      setSaveErr(e?.message || "Failed to update visit");
    } finally {
      setSaving(false);
    }
  };

  /* -------------------- Visit: delete -------------------- */
  const onDeleteVisit = async () => {
    if (!visitId) return;
    try {
      setDeleting(true);
      await deleteVisit(visitId);
      // Navigate back to the patient page if we know it, else go back
      if (visit?.patient_id) navigate(`/patients/${visit.patient_id}`);
      else navigate(-1);
    } catch (e) {
      setErr(e?.message || "Failed to delete visit");
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  /* -------------------- Procedures: add -------------------- */
  const onAddProcField = (e) => {
    const { name, value } = e.target;
    setAddProcForm((f) => ({ ...f, [name]: value }));
  };

  const submitAddProcedure = async (e) => {
    e?.preventDefault?.();
    setAddProcErr("");
    if (!visitId) return;
    try {
      const data = {
        procedure: addProcForm.procedure || "",
        visitDate: addProcForm.visitDate || "",
        nextApptDate: addProcForm.nextApptDate || "",
        total: addProcForm.total === "" ? undefined : Number(addProcForm.total),
        paid: addProcForm.paid === "" ? undefined : Number(addProcForm.paid),
        notes: addProcForm.notes || "",
      };
      const updated = await addVisitProcedure(visitId, data);
      setVisit(updated);
      setAddingProc(false);
      setAddProcForm({
        visitDate: "",
        procedure: "",
        nextApptDate: "",
        total: "",
        paid: "",
        notes: "",
      });
    } catch (e) {
      setAddProcErr(e?.message || "Failed to add procedure");
    }
  };

  /* -------------------- Procedures: edit by index -------------------- */
  const beginEditProc = (i) => {
    setEditProcErr("");
    const r = procs[i] || {};
    setEditingIndex(i);
    setEditProcForm({
      visitDate: r.visitDate || r.visit_date || "",
      procedure: r.procedure || "",
      nextApptDate: r.nextApptDate || r.next_appt_date || "",
      total: r.total ?? "",
      paid: r.paid ?? "",
      notes: r.notes || "",
    });
  };

  const cancelEditProc = () => {
    setEditingIndex(null);
    setEditProcErr("");
  };

  const onEditProcField = (e) => {
    const { name, value } = e.target;
    setEditProcForm((f) => ({ ...f, [name]: value }));
  };

  const submitEditProcedure = async (e) => {
    e?.preventDefault?.();
    if (!visitId || editingIndex == null) return;
    try {
      const idx = editingIndex;
      const data = {
        procedure: editProcForm.procedure || undefined,
        visitDate: editProcForm.visitDate || undefined,
        nextApptDate: editProcForm.nextApptDate || undefined,
        total: editProcForm.total === "" ? undefined : Number(editProcForm.total),
        paid: editProcForm.paid === "" ? undefined : Number(editProcForm.paid),
        notes: editProcForm.notes || undefined,
      };
      const updated = await updateVisitProcedureByIndex(visitId, idx, data);
      setVisit(updated);
      setEditingIndex(null);
    } catch (e) {
      setEditProcErr(e?.message || "Failed to update procedure");
    }
  };

  /* -------------------- Procedures: delete by index -------------------- */
  const removeProcedure = async (idx) => {
    if (!visitId) return;
    if (!window.confirm("Delete this procedure?")) return;
    try {
      const updated = await deleteVisitProcedureByIndex(visitId, idx);
      setVisit(updated);
    } catch (e) {
      setErr(e?.message || "Failed to delete procedure");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Visit Details</h1>
            {visit && (
              <p className="text-sm text-gray-600 mt-1">Visited on {formatDateTime(visit.visit_at)}</p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm border border-gray-300 hover:bg-gray-50"
            >
              <BackIcon className="w-4 h-4" />
              Back
            </button>
          </div>
        </div>

        {loading && (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-sm text-gray-500 shadow-sm">
            Loading…
          </div>
        )}

        {err && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 shadow-sm">
            {err}
          </div>
        )}

        {!loading && !err && !visit && (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-sm text-gray-500 shadow-sm">
            Visit not found.
          </div>
        )}

        {visit && (
          <div className="space-y-6">
            {/* Visit: actions */}
            <div className="flex flex-col sm:flex-row items-end justify-end gap-4 p-4 rounded-xl ">
              <div className="flex items-end gap-2">
                {!editMode ? (
                  <button
                    type="button"
                    onClick={startEditVisit}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <EditIcon className="w-4 h-4" />
                    Edit 
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={cancelEditVisit}
                      className="inline-flex items-center gap-2 px-4 py-2.5  text-gray-700 border border-gray-300 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors"
                      disabled={saving}
                    >
                      <CancelIcon className="w-4 h-4" />
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={onVisitSave}
                      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-colors ${
                        saving ? "bg-indigo-400" : "bg-indigo-600 hover:bg-indigo-700"
                      }`}
                      disabled={saving}
                    >
                      <SaveIcon className="w-4 h-4" />
                      {saving ? "Saving…" : "Save Changes"}
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-red-700 border border-red-200 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"
                >
                  <DeleteIcon className="w-4 h-4" />
                  Delete 
                </button>
              </div>
            </div>

            {/* Edit error */}
            {saveErr && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 shadow-sm">
                {saveErr}
              </div>
            )}

            {/* Exam */}
            <section className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900">Dental Examination</h2>
              </div>

              {/* Read mode */}
              {!editMode && (
                <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Chief Complaint</p>
                    <p className="font-medium text-gray-900">{displayText(visit.chief_complaint)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Duration & Onset</p>
                    <p className="font-medium text-gray-900">{displayText(visit.duration_onset)}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-500 mb-1">Trigger Factors</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {Array.isArray(visit.trigger_factors) && visit.trigger_factors.length ? (
                        visit.trigger_factors.map((t, i) => (
                          <span key={i} className="px-3 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full">
                            {t}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-500">None</span>
                      )}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-500 mb-1">Diagnosis Notes</p>
                    <div className="bg-gray-50 p-3 rounded-lg mt-1">
                      <p className="text-gray-900">{displayText(visit.diagnosis_notes)}</p>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-500 mb-1">Treatment Plan Notes</p>
                    <div className="bg-gray-50 p-3 rounded-lg mt-1">
                      <p className="text-gray-900">{displayText(visit.treatment_plan_notes)}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Edit mode form */}
              {editMode && (
                <form onSubmit={onVisitSave} className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Chief Complaint</label>
                    <input
                      name="chiefComplaint"
                      value={form.chiefComplaint}
                      onChange={onVisitField}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration & Onset</label>
                    <input
                      name="durationOnset"
                      value={form.durationOnset}
                      onChange={onVisitField}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Trigger Factors (comma-separated)</label>
                    <input
                      name="triggerFactors"
                      value={
                        Array.isArray(form.triggerFactors) ? form.triggerFactors.join(", ") : form.triggerFactors
                      }
                      onChange={onVisitField}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Cold, Sweet, Chewing..."
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosis Notes</label>
                    <textarea
                      name="diagnosisNotes"
                      value={form.diagnosisNotes}
                      onChange={onVisitField}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      rows={3}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Treatment Plan Notes</label>
                    <textarea
                      name="treatmentPlanNotes"
                      value={form.treatmentPlanNotes}
                      onChange={onVisitField}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      rows={3}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Visit Date & Time</label>
                    <input
                      type="datetime-local"
                      name="visitAt"
                      value={form.visitAt}
                      onChange={onVisitField}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </form>
              )}
            </section>

            {/* Findings */}
            <section className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900">Findings</h2>
              </div>
              <div className="px-6 py-5">
                <h3 className="text-md font-medium text-gray-700 mb-3">Upper Jaw</h3>
                {renderFindings(visit.findings?.upper, "Upper")}
                
                <h3 className="text-md font-medium text-gray-700 mt-6 mb-3">Lower Jaw</h3>
                {renderFindings(visit.findings?.lower, "Lower")}
              </div>
            </section>

            {/* Procedures */}
            <section className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-gray-900">Procedures & Payments</h2>
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-gray-600">
                    Total: <span className="font-medium text-gray-800">{inr(procSummary.total)}</span>
                  </div>
                  <div className="text-green-700">
                    Paid: <span className="font-medium">{inr(procSummary.paid)}</span>
                  </div>
                  <div className={procSummary.due > 0 ? "text-red-700" : "text-green-700"}>
                    Due: <span className="font-medium">{inr(procSummary.due)}</span>
                  </div>
                </div>
              </div>

              {/* Add Procedure bar */}
              <div className="px-6 py-4 border-b border-gray-200">
                {!addingProc ? (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setAddProcErr("");
                        setAddingProc(true);
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      <AddIcon className="w-4 h-4" />
                      Add Procedure
                    </button>
                  </div>
                ) : (
                  <div className="w-full">
                    <form onSubmit={submitAddProcedure} className="grid grid-cols-1 md:grid-cols-6 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                        <input
                          type="date"
                          name="visitDate"
                          value={addProcForm.visitDate}
                          onChange={onAddProcField}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Procedure</label>
                        <input
                          name="procedure"
                          value={addProcForm.procedure}
                          onChange={onAddProcField}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Next Appt</label>
                        <input
                          type="date"
                          name="nextApptDate"
                          value={addProcForm.nextApptDate}
                          onChange={onAddProcField}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Total</label>
                        <input
                          type="number"
                          step="0.01"
                          name="total"
                          value={addProcForm.total}
                          onChange={onAddProcField}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-right focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Paid</label>
                        <input
                          type="number"
                          step="0.01"
                          name="paid"
                          value={addProcForm.paid}
                          onChange={onAddProcField}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-right focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                      
                      {addProcErr && (
                        <div className="md:col-span-6 text-sm text-red-600">{addProcErr}</div>
                      )}
                      <div className="md:col-span-6 flex items-center justify-end gap-2">
                        <button
                          type="submit"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
                        >
                          <SaveIcon className="w-4 h-4" />
                          Save Procedure
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAddingProc(false);
                            setAddProcErr("");
                            setAddProcForm({
                              visitDate: "",
                              procedure: "",
                              nextApptDate: "",
                              total: "",
                              paid: "",
                              notes: "",
                            });
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 rounded-lg text-sm font-medium"
                        >
                          <CancelIcon className="w-4 h-4" />
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>

              {procs.length === 0 ? (
                <div className="px-6 py-8 text-center text-sm text-gray-500 bg-gray-50 rounded-lg m-4">
                  No procedures recorded.
                </div>
              ) : (
                <div className="px-6 py-5 overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Procedure
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Next Appt
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Paid
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Due
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {procs.map((r, i) => {
                        const isEditing = editingIndex === i;
                        return (
                          <tr key={i} className={isEditing ? "bg-blue-50" : "hover:bg-gray-50"}>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {!isEditing ? (
                                formatDate(r.visitDate || r.visit_date)
                              ) : (
                                <input
                                  type="date"
                                  name="visitDate"
                                  value={editProcForm.visitDate}
                                  onChange={onEditProcField}
                                  className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {!isEditing ? (
                                displayText(r.procedure)
                              ) : (
                                <input
                                  name="procedure"
                                  value={editProcForm.procedure}
                                  onChange={onEditProcField}
                                  className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {!isEditing ? (
                                formatDate(r.nextApptDate || r.next_appt_date)
                              ) : (
                                <input
                                  type="date"
                                  name="nextApptDate"
                                  value={editProcForm.nextApptDate}
                                  onChange={onEditProcField}
                                  className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                              {!isEditing ? (
                                inr(r.total)
                              ) : (
                                <input
                                  type="number"
                                  step="0.01"
                                  name="total"
                                  value={editProcForm.total}
                                  onChange={onEditProcField}
                                  className="border border-gray-300 rounded px-2 py-1.5 text-sm w-28 text-right focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-green-700">
                              {!isEditing ? (
                                inr(r.paid)
                              ) : (
                                <input
                                  type="number"
                                  step="0.01"
                                  name="paid"
                                  value={editProcForm.paid}
                                  onChange={onEditProcField}
                                  className="border border-gray-300 rounded px-2 py-1.5 text-sm w-28 text-right focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                              <span className={`${Number(r.due || 0) > 0 ? "text-red-600 font-medium" : "text-green-600"}`}>
                                {inr(r.due)}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                              {!isEditing ? (
                                <div className="inline-flex gap-2 justify-end">
                                  <button
                                    type="button"
                                    onClick={() => beginEditProc(i)}
                                    className="p-1.5 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-100 rounded-md transition-colors"
                                    title="Edit procedure"
                                  >
                                    <EditIcon />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeProcedure(i)}
                                    className="p-1.5 text-red-600 hover:text-red-900 hover:bg-red-100 rounded-md transition-colors"
                                    title="Delete procedure"
                                  >
                                    <DeleteIcon />
                                  </button>
                                </div>
                              ) : (
                                <div className="inline-flex gap-2 justify-end">
                                  <button
                                    type="button"
                                    onClick={submitEditProcedure}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700"
                                  >
                                    <SaveIcon className="w-3.5 h-3.5" />
                                    Save
                                  </button>
                                  <button
                                    type="button"
                                    onClick={cancelEditProc}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white text-gray-700 border border-gray-300 rounded text-xs hover:bg-gray-50"
                                  >
                                    <CancelIcon className="w-3.5 h-3.5" />
                                    Cancel
                                  </button>
                                </div>
                              )}
                              {isEditing && editProcErr && (
                                <div className="mt-1 text-xs text-red-600 text-right">{editProcErr}</div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <th
                          colSpan={3}
                          className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Totals
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">{inr(procSummary.total)}</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-green-700">
                          {inr(procSummary.paid)}
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-semibold">
                          <span className={`${procSummary.due > 0 ? "text-red-700" : "text-green-700"}`}>
                            {inr(procSummary.due)}
                          </span>
                        </th>
                        <th />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      {/* ---------- Delete Visit Confirm Modal ---------- */}
      {confirmDelete && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => !deleting && setConfirmDelete(false)} />
          <div className="relative z-50 bg-white w-full max-w-md rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-red-100 p-2 flex-shrink-0">
                <DeleteIcon className="h-6 w-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Delete this visit?</h3>
                <p className="text-sm text-gray-600">This action cannot be undone. All procedure records will be permanently removed.</p>
              </div>
              <button 
                onClick={() => !deleting && setConfirmDelete(false)}
                className="text-gray-400 hover:text-gray-500"
                disabled={deleting}
              >
                <CloseIcon />
              </button>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => !deleting && setConfirmDelete(false)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={onDeleteVisit}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-colors ${
                  deleting ? "bg-red-400" : "bg-red-600 hover:bg-red-700"
                }`}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete Visit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisitDetail;