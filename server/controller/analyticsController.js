// controllers/analyticsController.js
const { createClient } = require('@supabase/supabase-js');

/* -------------------------- Supabase per-request -------------------------- */
const supabaseForReq = (req) =>
  createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: req.headers.authorization } },
  });

const sbError = (res, error, status = 400) =>
  res.status(status).json({ error: error?.message || String(error) });

const callRpc = async (req, res, fn, args = {}) => {
  const supabase = supabaseForReq(req);
  const { data, error } = await supabase.rpc(fn, args);
  if (error) return sbError(res, error);
  return res.json(data || []);
};

/* ------------------------------ Helpers ---------------------------------- */
const qInt = (v, def = null) => {
  if (v === undefined || v === null || v === '') return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};
const qDate = (v, def = null) => {
  if (!v) return def;
  // Expect YYYY-MM-DD
  const ok = /^\d{4}-\d{2}-\d{2}$/.test(v);
  return ok ? v : def;
};
const qStr = (v, def = null) => (typeof v === 'string' && v.trim() ? v.trim() : def);

/* ============================== PATIENTS ================================== */
/** GET /api/analytics/patients/by-year */
const patientsByYear = (req, res) =>
  callRpc(req, res, 'analytics_patients_by_year');

/** GET /api/analytics/patients/by-year-month?year=2025 */
const patientsByYearMonth = (req, res) =>
  callRpc(req, res, 'analytics_patients_by_year_month', {
    p_year: qInt(req.query.year, null),
  });

/** GET /api/analytics/patients/by-year-gender?year=2025 */
const patientsByYearGender = (req, res) =>
  callRpc(req, res, 'analytics_patients_by_year_gender', {
    p_year: qInt(req.query.year, null),
  });

/** GET /api/analytics/patients/by-age-group */
const patientsByAgeGroup = (req, res) =>
  callRpc(req, res, 'analytics_patients_by_age_group');

/* =============================== VISITS =================================== */
/** GET /api/analytics/visits/by-year[?tz=Asia/Kolkata] */
const visitsByYear = (req, res) =>
  callRpc(req, res, 'analytics_visits_by_year', {
    p_tz: qStr(req.query.tz, null),
  });

/** GET /api/analytics/visits/by-month?year=2025[&tz=Asia/Kolkata] */
const visitsByMonth = (req, res) =>
  callRpc(req, res, 'analytics_visits_by_month', {
    p_year: qInt(req.query.year, null),
    p_tz: qStr(req.query.tz, null),
  });

/* ============================== REVENUE =================================== */
/** GET /api/analytics/revenue/by-month?year=2025[&tz=Asia/Kolkata] */
const revenueByMonth = (req, res) =>
  callRpc(req, res, 'analytics_revenue_by_month', {
    p_year: qInt(req.query.year, null),
    p_tz: qStr(req.query.tz, null),
  });

/** GET /api/analytics/revenue/by-year[?tz=Asia/Kolkata] */
const revenueByYear = (req, res) =>
  callRpc(req, res, 'analytics_revenue_by_year', {
    p_tz: qStr(req.query.tz, null),
  });

/** GET /api/analytics/revenue/collections-rate-by-month?year=2025[&tz=Asia/Kolkata] */
const collectionsRateByMonth = (req, res) =>
  callRpc(req, res, 'analytics_collections_rate_by_month', {
    p_year: qInt(req.query.year, null),
    p_tz: qStr(req.query.tz, null),
  });

/** GET /api/analytics/revenue/rolling-12m[?end=YYYY-MM-DD][&tz=Asia/Kolkata] */
const revenueRolling12m = (req, res) =>
  callRpc(req, res, 'analytics_revenue_rolling_12m', {
    p_end_date: qDate(req.query.end, null),
    p_tz: qStr(req.query.tz, null),
  });

/* ============================== EXPORTS =================================== */
module.exports = {
  // Patients
  patientsByYear,
  patientsByYearMonth,
  patientsByYearGender,
  patientsByAgeGroup,

  // Visits
  visitsByYear,
  visitsByMonth,

  // Revenue
  revenueByMonth,
  revenueByYear,
  collectionsRateByMonth,
  revenueRolling12m,
};
