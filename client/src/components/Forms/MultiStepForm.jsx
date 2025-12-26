// src/components/MultiStepForm.jsx
import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import PatientProfileForm from "./PatientProfileForm";
import MedicalHistoryForm from "./MedicalHistoryForm";
import ChiefComplaintExamForm from "./ChiefComplaintExamForm";
import ProcedureTrackingForm from "./ProcedureTrackingForm";
import ReviewSubmitPage from "./ReviewSubmitPage";

const DRAFT_KEY = "dentalPatientFormDraft";
const DRAFT_VERSION = 2;

// prefixes used by children
const CHILD_PREFIXES = [
  "dental:patientProfile", // exact: dental:patientProfile:draft
  "dental:medicalHistory", // dental:medicalHistory:<pid>:draft
  "dental:chiefComplaintExam", // dental:chiefComplaintExam:<pid>:draft
  "dental:procedureTracking", // dental:procedureTracking:<pid>:draft
];

const isBrowser = () =>
  typeof window !== "undefined" && typeof localStorage !== "undefined";

const jsonReplacer = (_k, v) => {
  if (v instanceof Date) return v.toISOString();
  if (typeof File !== "undefined" && v instanceof File) return undefined;
  if (typeof Blob !== "undefined" && v instanceof Blob) return undefined;
  if (typeof v === "function") return undefined;
  return v;
};

const storage = {
  readDraft() {
    if (!isBrowser()) return null;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        if (parsed.v === DRAFT_VERSION) return parsed;
        // migrate v1 or unknown
        if (!("v" in parsed)) {
          if (parsed.formData) {
            return { v: DRAFT_VERSION, ...parsed };
          }
          return { v: DRAFT_VERSION, formData: parsed, step: 1, savedAt: null };
        }
      }
    } catch {}
    return null;
  },
  writeDraft(obj) {
    if (!isBrowser()) return;
    try {
      const payload = JSON.stringify(
        { v: DRAFT_VERSION, ...obj },
        jsonReplacer
      );
      localStorage.setItem(DRAFT_KEY, payload);
    } catch {}
  },
  clearAll() {
    if (!isBrowser()) return;
    try {
      localStorage.removeItem(DRAFT_KEY);
      // Remove any child drafts by prefix
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (!key) continue;
        if (
          key === "dental:patientProfile:draft" ||
          CHILD_PREFIXES.some((p) => key.startsWith(`${p}:`)) ||
          CHILD_PREFIXES.some((p) => key.startsWith(`${p}`))
        ) {
          localStorage.removeItem(key);
        }
      }
    } catch {}
  },
};

// ---- helpers to migrate per-patient localStorage drafts ----
const migrateSectionDraft = (sectionPrefix, fromId, toId) => {
  if (!isBrowser() || !toId) return;
  const oldKey = `${sectionPrefix}:${fromId}:draft`;
  const newKey = `${sectionPrefix}:${toId}:draft`;
  try {
    const oldVal = localStorage.getItem(oldKey);
    const hasNew = localStorage.getItem(newKey);
    if (oldVal && !hasNew) {
      localStorage.setItem(newKey, oldVal);
      localStorage.removeItem(oldKey);
    }
  } catch {}
};

const migratePerPatientDrafts = (toPatientId) => {
  if (!toPatientId) return;
  migrateSectionDraft("dental:medicalHistory", "new", toPatientId);
  migrateSectionDraft("dental:chiefComplaintExam", "new", toPatientId);
  migrateSectionDraft("dental:procedureTracking", "new", toPatientId);
};

// Debounce helper that stays stable across renders
function useDebouncedFn(fn, delay) {
  const fnRef = useRef(fn);
  const tRef = useRef(null);
  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);
  return useCallback(
    (...args) => {
      if (tRef.current) clearTimeout(tRef.current);
      tRef.current = setTimeout(() => fnRef.current(...args), delay);
    },
    [delay]
  );
}

/** @typedef {Object} FormDataShape
 *  @property {string|null} patientId
 *  @property {Record<string, any>} patientProfile
 *  @property {Record<string, any>} medicalHistory
 *  @property {Record<string, any>} dentalExam
 *  @property {Record<string, any>} procedures
 */
const INITIAL_DATA = {
  patientId: null,
  patientProfile: {},
  medicalHistory: {},
  dentalExam: {},
  procedures: {},
};

const MultiStepForm = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(INITIAL_DATA);
  const [restoredAt, setRestoredAt] = useState(null);
  const [savedAt, setSavedAt] = useState(null);

  // ---- Load any saved draft on mount ----
  useEffect(() => {
    const saved = storage.readDraft();
    if (!saved) return;
    if (saved.formData) setFormData(saved.formData || INITIAL_DATA);
    const s = Number(saved.step);
    setStep(s >= 1 && s <= 5 ? s : 1);
    setRestoredAt(saved.savedAt || null);
    setSavedAt(saved.savedAt || null);
  }, []);

  // Cross-tab sync
  useEffect(() => {
    if (!isBrowser()) return;
    const onStorage = (e) => {
      if (e.key !== DRAFT_KEY || !e.newValue) return;
      try {
        const { formData: fd, step: st, savedAt: sa } = JSON.parse(e.newValue);
        if (fd) setFormData(fd);
        if (typeof st === "number") setStep(st >= 1 && st <= 5 ? st : 1);
        setSavedAt(sa || null);
        setRestoredAt(sa || null);
      } catch {}
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // ---- Persist whole wizard state (atomic) ----
  const persist = useCallback((nextData, nextStepValue) => {
    const when = new Date().toISOString();
    storage.writeDraft({
      formData: nextData,
      step: nextStepValue,
      savedAt: when,
    });
    setSavedAt(when);
  }, []);

  // Atomic apply: update data + step + persist
  const apply = useCallback(
    (deltaOrUpdater) => {
      setFormData((prev) => {
        const currentStep = step;
        const { data: nextData, step: nextStepVal } =
          typeof deltaOrUpdater === "function"
            ? deltaOrUpdater(prev, currentStep)
            : { data: { ...prev, ...deltaOrUpdater }, step: currentStep };
        const clampedStep = Math.min(
          Math.max(nextStepVal ?? currentStep, 1),
          5
        );
        setStep(clampedStep);
        persist(nextData, clampedStep);
        return nextData;
      });
    },
    [persist, step]
  );

  const nextStep = useCallback(
    (delta) => {
      apply((prev, s) => ({
        data: { ...prev, ...delta },
        step: Math.min(s + 1, 5),
      }));
    },
    [apply]
  );

  const prevStep = useCallback(
    (delta) => {
      apply((prev, s) => ({
        data: { ...prev, ...delta },
        step: Math.max(s - 1, 1),
      }));
    },
    [apply]
  );

  // Debounced saveDraft (does not move steps)
  const debouncedPersist = useDebouncedFn((data, s) => persist(data, s), 300);
  const saveDraft = useCallback(
    (delta) => {
      setFormData((prev) => {
        const updated = { ...prev, ...delta };
        debouncedPersist(updated, step);
        return updated;
      });
    },
    [debouncedPersist, step]
  );

  const hardReset = useCallback(() => {
    if (!isBrowser()) return;
    const ok = window.confirm("Clear all data and start over?");
    if (!ok) return;
    storage.clearAll();
    setFormData(INITIAL_DATA);
    setStep(1);
    setRestoredAt(null);
    setSavedAt(null);
  }, []);

  // After ReviewSubmitPage successfully submits to API
  const submitForm = useCallback((result) => {
    storage.clearAll();
    alert(
      `Patient record submitted successfully!${
        result?.patientId ? `\nPatient ID: ${result.patientId}` : ""
      }`
    );
    setFormData({ ...INITIAL_DATA, patientId: result?.patientId || null });
    setStep(1);
    setRestoredAt(null);
    setSavedAt(null);
  }, []);

  // ---- Unload guard when we have draft-like state ----
  const hasAnyData = useMemo(() => {
    const sections = Object.values(formData || {});
    return sections.some(
      (s) => s && typeof s === "object" && Object.keys(s).length > 0
    );
  }, [formData]);

  useEffect(() => {
    if (!isBrowser()) return;
    const shouldGuard =
      step > 1 || hasAnyData || !!localStorage.getItem(DRAFT_KEY);
    if (!shouldGuard) return;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [step, hasAnyData]);

  // ---- Stepper click handling (allow back & revisit; block jumping ahead) ----
  const handleStepClick = useCallback(
    (target) => {
      if (target < step) apply((prev) => ({ data: prev, step: target }));
    },
    [apply, step]
  );

  useEffect(() => {
    // scroll to top smoothly whenever step changes
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [step]);

  // Helper to safely extract ID from server result
  const extractId = (obj) =>
    obj?.id || obj?.patient?.id || obj?.patient_id || obj?.data?.id || null;

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <PatientProfileForm
            initial={formData.patientProfile}
            onNext={(saved) => {
              // saved is the payload from PatientProfileForm (already using ImageKit URL)
              const pid = extractId(saved) || formData.patientId;
              // --- NEW: migrate "new" per-patient drafts to this patientId
              if (pid && isBrowser()) migratePerPatientDrafts(pid);

              nextStep({
                patientId: pid || null,
                patientProfile: {
                  ...formData.patientProfile,
                  ...(saved || {}),
                },
              });
            }}
            onSave={(payload) => saveDraft({ patientProfile: payload })}
          />
        );
      case 2:
        return (
          <MedicalHistoryForm
            patientId={formData.patientId}
            initial={formData.medicalHistory}
            onBack={(data) => prevStep({ medicalHistory: data })}
            onNext={(data) => nextStep({ medicalHistory: data })}
            onSave={(data) => saveDraft({ medicalHistory: data })}
          />
        );
      case 3:
        return (
          <ChiefComplaintExamForm
            patientId={formData.patientId}
            initial={formData.dentalExam}
            onNext={(data) => nextStep({ dentalExam: data })}
            onBack={(data) => prevStep({ dentalExam: data })}
            onSave={(data) => saveDraft({ dentalExam: data })}
          />
        );
      case 4:
        return (
          <ProcedureTrackingForm
            initial={formData.procedures}
            patientId={formData.patientId}
            onNext={(data) => {
              const merged = { procedures: data };
              saveDraft(merged);
              nextStep(merged);
            }}
            onBack={(data) => prevStep({ procedures: data })}
            onSave={(data) => saveDraft({ procedures: data })}
          />
        );
      case 5:
        return (
          <ReviewSubmitPage
            formData={formData}
            onEdit={(stepNumber) =>
              apply((prev) => ({ data: prev, step: stepNumber }))
            }
            onBack={() => apply((prev) => ({ data: prev, step: 4 }))}
            onSubmit={submitForm}
          />
        );
      default:
        return (
          <PatientProfileForm
            initial={formData.patientProfile}
            onNext={(saved) => {
              const pid = extractId(saved) || formData.patientId;
              if (pid && isBrowser()) migratePerPatientDrafts(pid);
              nextStep({
                patientId: pid || null,
                patientProfile: {
                  ...formData.patientProfile,
                  ...(saved || {}),
                },
              });
            }}
            onSave={(payload) => saveDraft({ patientProfile: payload })}
          />
        );
    }
  };

  const stepMeta = [
    { n: 1, label: "Profile" },
    { n: 2, label: "Medical History" },
    { n: 3, label: "Examination" },
    { n: 4, label: "Procedures" },
    { n: 5, label: "Review" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 mb-3">
          <div className="flex items-center gap-3 min-h-[1.25rem]">
            {restoredAt ? (
              <span className="text-xs text-gray-500">
                Draft restored {new Date(restoredAt).toLocaleString("en-IN")}
              </span>
            ) : null}
            {savedAt ? (
              <span className="text-[11px] text-gray-400">
                Saved • {new Date(savedAt).toLocaleTimeString("en-IN")}
              </span>
            ) : null}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={hardReset}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              title="Clear all data and drafts"
            >
              Reset / Clear drafts
            </button>
          </div>
        </div>

        {/* Progress Stepper */}
        <div className="mb-8 px-6">
          <ol
            className="flex justify-between relative"
            role="list"
            aria-label="Form steps"
          >
            {/* Progress line */}
            <div className="absolute top-4 left-0 right-0 h-1 bg-gray-200 -z-10">
              <div
                className="h-full bg-indigo-600 transition-all duration-300"
                style={{ width: `${((step - 1) / 4) * 100}%` }}
                aria-hidden
              />
            </div>

            {/* Steps */}
            {stepMeta.map(({ n, label }) => {
              const reached = step >= n;
              const isCurrent = step === n;
              return (
                <li key={n} className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => reached && handleStepClick(n)}
                    aria-current={isCurrent ? "step" : undefined}
                    aria-disabled={!reached}
                    className={`flex flex-col items-center group focus:outline-none ${
                      !reached ? "opacity-60 cursor-not-allowed" : ""
                    }`}
                    title={
                      n > step
                        ? "Complete previous steps to continue"
                        : `Go to ${label}`
                    }
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors
                        ${
                          reached
                            ? "bg-indigo-600 text-white"
                            : "bg-white border-2 border-gray-300 text-gray-500 group-hover:border-gray-400"
                        }`}
                    >
                      {n}
                    </div>
                    <span
                      className={`text-xs mt-2 font-medium transition-colors ${
                        reached
                          ? "text-indigo-600"
                          : "text-gray-500 group-hover:text-gray-600"
                      }`}
                    >
                      {label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Current Form Step */}
        {renderStep()}
      </div>
    </div>
  );
};

export default MultiStepForm;
