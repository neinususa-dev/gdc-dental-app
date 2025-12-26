// routes/analyticsRoutes.js
const express = require('express');
const {
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
} = require('../controller/analyticsController'); // <- folder name matches "controllers"
const router = express.Router();

/* --------------------------- PATIENTS --------------------------- */
router.get('/patients/by-year', patientsByYear);
router.get('/patients/by-year-month', patientsByYearMonth);
router.get('/patients/by-year-gender', patientsByYearGender);
router.get('/patients/by-age-group', patientsByAgeGroup);

/* ---------------------------- VISITS ---------------------------- */
router.get('/visits/by-year', visitsByYear);
router.get('/visits/by-month', visitsByMonth);

/* ---------------------------- REVENUE --------------------------- */
router.get('/revenue/by-month', revenueByMonth);
router.get('/revenue/by-year', revenueByYear);
router.get('/revenue/collections-rate-by-month', collectionsRateByMonth);
router.get('/revenue/rolling-12m', revenueRolling12m);

module.exports = router;
