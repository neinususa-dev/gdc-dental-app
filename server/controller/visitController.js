// controllers/visit.controller.js
const { createClient } = require('@supabase/supabase-js');

// Build an anon client bound to THIS request's JWT
const supabaseForReq = (req) =>
  createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: req.headers.authorization } },
  });

/* -------------------------------- helpers -------------------------------- */

const toIso = (v) => {
  if (!v) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
};

const mapVisitBodyToRow = (body = {}, { forUpdate = false } = {}) => {
  const row = {};
  const set = (k, v) => { if (v !== undefined) row[k] = v; };

  if (!forUpdate) {
    set('created_by', body.created_by || body.createdBy); // will be overridden with req.user.id
    set('patient_id', body.patient_id || body.patient);
  }

  set('chief_complaint', body.chiefComplaint);
  set('duration_onset', body.durationOnset);
  set('trigger_factors', Array.isArray(body.triggerFactors) ? body.triggerFactors : undefined);
  set('diagnosis_notes', body.diagnosisNotes);
  set('treatment_plan_notes', body.treatmentPlanNotes);

  // findings & procedures come as JSON; DB trigger will normalize and compute "due"
  if (body.findings) set('findings', body.findings);
  if (body.procedures) set('procedures', body.procedures);

  set('visit_at', toIso(body.visitAt));

  return row;
};

const sbError = (res, error, status = 400) =>
  res.status(status).json({ error: error?.message || error?.details || String(error) });

/** Extract earliest upcoming nextApptDate from a visit's procedures array. Returns Date or null. */
const getEarliestNextApptFromProcedures = (procedures) => {
  if (!Array.isArray(procedures)) return null;
  const today = new Date(new Date().toDateString()); // midnight today
  const dates = procedures
    .map((p) => p?.nextApptDate || p?.next_appt_date)
    .filter(Boolean)
    .map((d) => new Date(String(d).length === 10 ? `${d}T00:00:00Z` : d))
    .filter((dt) => !Number.isNaN(dt.getTime()) && dt >= today);
  if (dates.length === 0) return null;
  dates.sort((a, b) => a - b);
  return dates[0];
};

const normalizeToDate = (d) => {
  if (!d) return null;
  const s = String(d);
  const iso = s.length === 10 ? `${s}T00:00:00Z` : s;
  const dt = new Date(iso);
  return Number.isNaN(dt.getTime()) ? null : dt;
};

/** Get patient name (first_name + last_name) with a tiny in-memory cache for batch lookups. */
const getPatientName = async (supabase, patientId, cache) => {
  if (!patientId) return null;
  if (cache && cache.has(patientId)) return cache.get(patientId);

  const { data, error } = await supabase
    .from('patients')
    .select('id, first_name, last_name')
    .eq('id', patientId)
    .single();

  let val = null;
  if (!error && data) {
    val = [data.first_name, data.last_name].filter(Boolean).join(' ').trim();
  }
  if (cache) cache.set(patientId, val);
  return val;
};

/* -------------------------- procedure helpers ---------------------------- */

const clampNum = (v, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

const cleanDate = (d) => {
  if (!d) return undefined;
  const s = String(d);
  const iso = s.length === 10 ? `${s}T00:00:00Z` : s;
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return undefined;
  // keep original simple date if provided as YYYY-MM-DD to match your UI output
  return s.length === 10 ? s : iso;
};

const sanitizeProcedure = (p = {}) => {
  const visitD = p.visitDate ?? p.visit_date;
  const nextD  = p.nextApptDate ?? p.next_appt_date;

  const out = {
    // free text
    procedure: p.procedure ?? "",
    notes: p.notes ?? "",
    // dates (stored as strings inside JSON)
    visitDate: cleanDate(visitD) ?? null,
    nextApptDate: cleanDate(nextD) ?? null,
    // numbers (DB trigger will re-normalize anyway)
    total: clampNum(p.total, 0),
    paid: clampNum(p.paid, 0),
  };

  // also mirror snake_case for legacy readers
  out.visit_date = out.visitDate;
  out.next_appt_date = out.nextApptDate;
  return out;
};

const readVisitForProcedures = async (supabase, visitId) => {
  const { data: v, error } = await supabase
    .from('visits')
    .select('id, procedures')
    .eq('id', visitId)
    .single();
  if (error?.code === 'PGRST116' || (!v && !error)) return { notFound: true };
  if (error) return { error };
  return { visit: v };
};

/* ------------------------------- controllers ----------------------------- */

// Create a new Visit
const createVisit = async (req, res) => {
  try {
    const supabase = supabaseForReq(req);
    const { patientId } = req.params;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Ensure patient exists & is visible under RLS (owned by this user)
    const { data: patient, error: pErr } = await supabase
      .from('patients')
      .select('id')
      .eq('id', patientId)
      .single();

    if (pErr?.code === 'PGRST116' || (!patient && !pErr)) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    if (pErr) return sbError(res, pErr);

    const row = mapVisitBodyToRow(req.body || {});
    row.created_by = userId;      // RLS WITH CHECK requires this to match auth.uid()
    row.patient_id = patientId;

    const { data, error } = await supabase
      .from('visits')
      .insert(row)
      .select('*')
      .single();

    if (error) return sbError(res, error);
    return res.status(201).json(data);
  } catch (err) {
    return sbError(res, err);
  }
};

// List visits for a patient (most recent first)
const listVisitsByPatient = async (req, res) => {
  try {
    const supabase = supabaseForReq(req);
    const { patientId } = req.params;
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const offset = Number(req.query.offset) || 0;

    // Optional: 404 if patient doesn't exist/visible
    const { data: patient, error: pErr } = await supabase
      .from('patients')
      .select('id')
      .eq('id', patientId)
      .single();
    if (pErr?.code === 'PGRST116' || (!patient && !pErr)) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    if (pErr) return sbError(res, pErr);

    const { data, error } = await supabase
      .from('visits')
      .select('*')
      .eq('patient_id', patientId)
      .order('visit_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return sbError(res, error);
    return res.json(data);
  } catch (err) {
    return sbError(res, err);
  }
};

// Get one visit
const getVisit = async (req, res) => {
  try {
    const supabase = supabaseForReq(req);
    const { visitId } = req.params;

    const { data, error } = await supabase
      .from('visits')
      .select('*')
      .eq('id', visitId)
      .single();

    if (error?.code === 'PGRST116' || (!data && !error)) {
      return res.status(404).json({ error: 'Visit not found' });
    }
    if (error) return sbError(res, error);

    return res.json(data);
  } catch (err) {
    return sbError(res, err);
  }
};

// Update a visit
const updateVisit = async (req, res) => {
  try {
    const supabase = supabaseForReq(req);
    const { visitId } = req.params;

    const row = mapVisitBodyToRow(req.body || {}, { forUpdate: true });
    if (Object.keys(row).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const { data, error } = await supabase
      .from('visits')
      .update(row)
      .eq('id', visitId)
      .select('*')
      .single();

    if (error?.code === 'PGRST116' || (!data && !error)) {
      return res.status(404).json({ error: 'Visit not found' });
    }
    if (error) return sbError(res, error);

    return res.json(data);
  } catch (err) {
    return sbError(res, err);
  }
};

// Delete a visit
const deleteVisit = async (req, res) => {
  try {
    const supabase = supabaseForReq(req);
    const { visitId } = req.params;

    // delete and return the deleted row to distinguish 404 vs 204 easily
    const { data, error } = await supabase
      .from('visits')
      .delete()
      .eq('id', visitId)
      .select('id')
      .single();

    if (error?.code === 'PGRST116' || (!data && !error)) {
      return res.status(404).json({ error: 'Visit not found' });
    }
    if (error) return sbError(res, error);

    return res.status(204).send();
  } catch (err) {
    return sbError(res, err);
  }
};

// Get the earliest upcoming appointment for a specific visit
// GET /visits/:visitId/next-appt
const getNextApptForVisit = async (req, res) => {
  try {
    const supabase = supabaseForReq(req);
    const { visitId } = req.params;

    // Try embedding patient (requires FK in schema cache). If not present, fallback.
    const { data: v, error } = await supabase
      .from('visits')
      .select('id, patient_id, chief_complaint, visit_at, procedures, patients ( first_name, last_name )')
      .eq('id', visitId)
      .single();

    if (error?.code === 'PGRST116' || (!v && !error)) {
      return res.status(404).json({ error: 'Visit not found' });
    }
    if (error) return sbError(res, error);

    const nextDate = getEarliestNextApptFromProcedures(v.procedures);
    if (!nextDate) {
      return res.status(404).json({ error: 'No upcoming appointment found' });
    }

    // Resolve patient name (embed or fallback query)
    let patientName = [v?.patients?.first_name, v?.patients?.last_name].filter(Boolean).join(' ').trim();
    if (!patientName) {
      patientName = await getPatientName(supabase, v.patient_id, new Map());
    }

    return res.json({
      patientName: patientName || 'Unknown Patient',
      date: nextDate.toISOString().slice(0, 10), // YYYY-MM-DD
      chiefComplaint: v.chief_complaint,
      visitId: v.id,
      patientId: v.patient_id,
    });
  } catch (err) {
    return sbError(res, err);
  }
};

// Get ALL upcoming appointments for a specific visit
// GET /visits/:visitId/next-appts
const getNextApptsForVisit = async (req, res) => {
  try {
    const supabase = supabaseForReq(req);
    const { visitId } = req.params;

    const { data: v, error } = await supabase
      .from('visits')
      .select('id, patient_id, chief_complaint, procedures, patients ( first_name, last_name )')
      .eq('id', visitId)
      .single();

    if (error?.code === 'PGRST116' || (!v && !error)) {
      return res.status(404).json({ error: 'Visit not found' });
    }
    if (error) return sbError(res, error);

    const today = new Date(new Date().toDateString());

    // Resolve patient name (embed or fallback)
    let patientName = [v?.patients?.first_name, v?.patients?.last_name].filter(Boolean).join(' ').trim();
    if (!patientName) {
      patientName = await getPatientName(supabase, v.patient_id, new Map());
    }

    const rows = [];
    if (Array.isArray(v.procedures)) {
      for (const p of v.procedures) {
        const d = p?.nextApptDate || p?.next_appt_date;
        if (!d) continue;
        const dt = new Date(String(d).length === 10 ? `${d}T00:00:00Z` : d);
        if (Number.isNaN(dt.getTime()) || dt < today) continue;

        rows.push({
          patientName: patientName || 'Unknown Patient',
          date: dt.toISOString().slice(0, 10),
          chiefComplaint: v.chief_complaint,
          visitId: v.id,
          patientId: v.patient_id,
          procedure: p?.procedure ?? null,
        });
      }
    }

    rows.sort((a, b) => a.date.localeCompare(b.date));
    if (rows.length === 0) {
      return res.status(404).json({ error: 'No upcoming appointment found' });
    }
    return res.json(rows);
  } catch (err) {
    return sbError(res, err);
  }
};

// Get ALL upcoming appointments across all visits (visible under RLS)
// GET /visits/appointments/next
const getOverallNextAppts = async (req, res) => {
  try {
    const supabase = supabaseForReq(req);

    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const offset = Number(req.query.offset) || 0;

    // Try embed; if FK not recognized in schema cache, v.patients may be undefined; we'll fallback per-row.
    const { data: visits, error } = await supabase
      .from('visits')
      .select(`
        id,
        patient_id,
        chief_complaint,
        procedures,
        patients ( first_name, last_name )
      `);

    if (error) return sbError(res, error);

    const today = new Date(new Date().toDateString()); // midnight local
    const cache = new Map(); // patientId -> name

    // Flatten all future nextApptDate entries from procedures arrays
    const rows = [];
    for (const v of visits || []) {
      if (!Array.isArray(v.procedures)) continue;

      // Resolve patient name via embed or cached fallback
      let patientName = [v?.patients?.first_name, v?.patients?.last_name].filter(Boolean).join(' ').trim();
      if (!patientName) {
        patientName = await getPatientName(supabase, v.patient_id, cache);
      }

      for (const p of v.procedures) {
        const dt = normalizeToDate(p?.nextApptDate || p?.next_appt_date);
        if (!dt) continue;
        if (dt < today) continue;

        rows.push({
          patientName: patientName || 'Unknown Patient',
          date: dt.toISOString().slice(0, 10),       // YYYY-MM-DD
          chiefComplaint: v.chief_complaint || null,
          visitId: v.id,
          patientId: v.patient_id,
          procedure: p?.procedure ?? null,
        });
      }
    }

    // Sort soonest → latest, then stable by patient/visit to keep deterministic order
    rows.sort((a, b) =>
      a.date.localeCompare(b.date) ||
      String(a.patientId).localeCompare(String(b.patientId)) ||
      String(a.visitId).localeCompare(String(b.visitId))
    );

    // Pagination in-memory (because filtering happens app-side)
    const paged = rows.slice(offset, offset + limit);

    if (paged.length === 0) {
      // If there are absolutely no future appts at all, 404 is fine; otherwise return empty page.
      return res.status(rows.length === 0 ? 404 : 200).json(paged);
    }

    return res.json(paged);
  } catch (err) {
    return sbError(res, err);
  }
};

/* ----------------------- procedures (index-based) ------------------------ */

// POST /visits/:visitId/procedures
const addVisitProcedure = async (req, res) => {
  try {
    const supabase = supabaseForReq(req);
    const { visitId } = req.params;

    const { visit, error, notFound } = await readVisitForProcedures(supabase, visitId);
    if (error) return sbError(res, error);
    if (notFound) return res.status(404).json({ error: 'Visit not found' });

    const procs = Array.isArray(visit.procedures) ? [...visit.procedures] : [];
    // append at END to keep prior indices stable
    procs.push(sanitizeProcedure(req.body || {}));

    const { data: updated, error: uErr } = await supabase
      .from('visits')
      .update({ procedures: procs })
      .eq('id', visitId)
      .select('*')
      .single();

    if (uErr) return sbError(res, uErr);
    return res.json(updated);
  } catch (err) {
    return sbError(res, err);
  }
};

// PATCH /visits/:visitId/procedures/:index  (0-based)
// (You may also map PUT to this same handler in your router.)
const updateVisitProcedureByIndex = async (req, res) => {
  try {
    const supabase = supabaseForReq(req);
    const { visitId, index } = req.params;
    const idx = parseInt(index, 10);
    if (!Number.isInteger(idx) || idx < 0) {
      return res.status(400).json({ error: 'Invalid procedure index' });
    }

    const { visit, error, notFound } = await readVisitForProcedures(supabase, visitId);
    if (error) return sbError(res, error);
    if (notFound) return res.status(404).json({ error: 'Visit not found' });

    const procs = Array.isArray(visit.procedures) ? [...visit.procedures] : [];
    if (idx >= procs.length) {
      return res.status(404).json({ error: 'Procedure index out of range' });
    }

    const patch = sanitizeProcedure(req.body || {});
    const existing = procs[idx] || {};

    procs[idx] = {
      ...existing,
      ...patch,
      // keep mirrored snake_case for any legacy readers
      visit_date: patch.visitDate ?? existing.visit_date ?? existing.visitDate ?? null,
      next_appt_date: patch.nextApptDate ?? existing.next_appt_date ?? existing.nextApptDate ?? null,
    };

    const { data: updated, error: uErr } = await supabase
      .from('visits')
      .update({ procedures: procs })
      .eq('id', visitId)
      .select('*')
      .single();

    if (uErr) return sbError(res, uErr);
    return res.json(updated);
  } catch (err) {
    return sbError(res, err);
  }
};

// DELETE /visits/:visitId/procedures/:index  (0-based)
const deleteVisitProcedureByIndex = async (req, res) => {
  try {
    const supabase = supabaseForReq(req);
    const { visitId, index } = req.params;
    const idx = parseInt(index, 10);
    if (!Number.isInteger(idx) || idx < 0) {
      return res.status(400).json({ error: 'Invalid procedure index' });
    }

    const { visit, error, notFound } = await readVisitForProcedures(supabase, visitId);
    if (error) return sbError(res, error);
    if (notFound) return res.status(404).json({ error: 'Visit not found' });

    const procs = Array.isArray(visit.procedures) ? [...visit.procedures] : [];
    if (idx >= procs.length) {
      return res.status(404).json({ error: 'Procedure index out of range' });
    }

    procs.splice(idx, 1);

    const { data: updated, error: uErr } = await supabase
      .from('visits')
      .update({ procedures: procs })
      .eq('id', visitId)
      .select('*')
      .single();

    if (uErr) return sbError(res, uErr);
    return res.json(updated);
  } catch (err) {
    return sbError(res, err);
  }
};

/* -------------------------------- exports -------------------------------- */

module.exports = {
  createVisit,
  listVisitsByPatient,
  getVisit,
  updateVisit,
  deleteVisit,
  getNextApptForVisit,
  getNextApptsForVisit,
  getOverallNextAppts,

  // procedures
  addVisitProcedure,
  updateVisitProcedureByIndex,
  deleteVisitProcedureByIndex,
};
