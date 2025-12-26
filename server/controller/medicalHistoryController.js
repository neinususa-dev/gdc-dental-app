// controllers/medicalHistoryController.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

/* ---------- Supabase client bound to THIS request's JWT ---------- */
const supabaseForReq = (req) =>
  createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: req.headers.authorization } },
    auth: { persistSession: false },
  });

/* ---------- helpers ---------- */
const yn = (v) => {
  if (v === '' || v === undefined || v === null) return '';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  const s = String(v).trim().toLowerCase();
  if (['yes', 'y', 'true', '1'].includes(s)) return 'Yes';
  if (['no', 'n', 'false', '0'].includes(s)) return 'No';
  return '';
};

const mapBodyToRow = (body = {}) => {
  const problems = body.problems || {};
  const row = {
    // tri-state strings:
    surgery_or_hospitalized: yn(body.surgeryOrHospitalized),
    surgery_details: body.surgeryDetails,

    fever_cold_cough: yn(body.feverColdCough),
    fever_details: body.feverDetails,

    abnormal_bleeding_history: yn(body.abnormalBleedingHistory),
    abnormal_bleeding_details: body.abnormalBleedingDetails,

    taking_medicine: yn(body.takingMedicine),
    medicine_details: body.medicineDetails,

    medication_allergy: yn(body.medicationAllergy),
    medication_allergy_details: body.medicationAllergyDetails,

    past_dental_history: body.pastDentalHistory,

    // flattened problems booleans:
    artificial_valves_pacemaker: !!problems.artificialValvesPacemaker,
    asthma: !!problems.asthma,
    allergy: !!problems.allergy,
    bleeding_tendency: !!problems.bleedingTendency,
    epilepsy_seizure: !!problems.epilepsySeizure,
    heart_disease: !!problems.heartDisease,
    hyp_hypertension: !!problems.hypHypertension,
    hormone_disorder: !!problems.hormoneDisorder,
    jaundice_liver: !!problems.jaundiceLiver,
    stomach_ulcer: !!problems.stomachUlcer,
    low_high_pressure: !!problems.lowHighPressure,
    arthritis_joint: !!problems.arthritisJoint,
    kidney_problems: !!problems.kidneyProblems,
    thyroid_problems: !!problems.thyroidProblems,
    other_problem: !!problems.otherProblem,
    other_problem_text: problems.otherProblemText,
  };

  // If "other_problem" is false, clear any stale text
  if (!row.other_problem) row.other_problem_text = null;

  // drop undefined so we don't overwrite with null unintentionally
  Object.keys(row).forEach((k) => row[k] === undefined && delete row[k]);
  return row;
};

const sbError = (res, error, status = 400) =>
  res.status(status).json({ error: error?.message || String(error) });

/* ---------- controllers ---------- */

// Upsert (one per patient)
const upsertMedicalHistory = async (req, res) => {
  try {
    if (!req.headers.authorization) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const supabase = supabaseForReq(req);
    const { patientId } = req.params;

    // Prefer req.user (from your requireUser middleware); fallback to Supabase auth
    let userId = req.user?.id || null;
    if (!userId) {
      const { data: uData, error: uErr } = await supabase.auth.getUser();
      if (uErr) return sbError(res, uErr, 401);
      userId = uData?.user?.id || null;
    }
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // 1) Ensure the patient exists & is visible under RLS (owned by this user)
    const { data: patient, error: pErr } = await supabase
      .from('patients')
      .select('id')
      .eq('id', patientId)
      .single();

    if (pErr?.code === 'PGRST116' || (!patient && !pErr)) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    if (pErr) return sbError(res, pErr);

    const row = mapBodyToRow(req.body);

    // 2) Try update first (keeps existing created_by)
    const { data: updated, error: uErr } = await supabase
      .from('medical_histories')
      .update(row)
      .eq('patient_id', patientId)
      .select('*')
      .single();

    if (!uErr && updated) {
      return res.json(updated);
    }
    // If error other than "no rows found", return it
    if (uErr && uErr.code !== 'PGRST116') return sbError(res, uErr);

    // 3) Not found -> insert (needs created_by + patient_id for RLS WITH CHECK)
    const insertRow = { ...row, created_by: userId, patient_id: patientId };
    const { data: inserted, error: iErr } = await supabase
      .from('medical_histories')
      .insert(insertRow)
      .select('*')
      .single();

    if (iErr) return sbError(res, iErr);
    return res.json(inserted);
  } catch (err) {
    return sbError(res, err);
  }
};

const getMedicalHistory = async (req, res) => {
  try {
    if (!req.headers.authorization) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const supabase = supabaseForReq(req);
    const { patientId } = req.params;

    const { data, error } = await supabase
      .from('medical_histories')
      .select('*')
      .eq('patient_id', patientId)
      .single();

    if (error?.code === 'PGRST116' || (!data && !error)) {
      return res.status(404).json({ error: 'Medical history not found' });
    }
    if (error) return sbError(res, error);

    return res.json(data);
  } catch (err) {
    return sbError(res, err);
  }
};

module.exports = { upsertMedicalHistory, getMedicalHistory };
