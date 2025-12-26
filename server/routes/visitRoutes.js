const express = require("express");
const { requireUser } = require("../middleware/auth");
const {
  createVisit,
  listVisitsByPatient,
  getVisit,
  updateVisit,
  deleteVisit,
  getNextApptForVisit,
  getNextApptsForVisit,
  getOverallNextAppts,
  addVisitProcedure,
  updateVisitProcedureByIndex,
  deleteVisitProcedureByIndex,
} = require("../controller/visitController");

const router = express.Router();

// All visit routes require an authenticated user (JWT via Authorization header)
router.use(requireUser);

// --- Static paths first
router.get("/appointments/next", getOverallNextAppts);

// --- Patient-scoped list/create
router.post("/:patientId/visits", createVisit);
router.get("/:patientId/visits", listVisitsByPatient);

// --- More specific visit subpaths BEFORE the bare :visitId
router.get("/:visitId/next-appt", getNextApptForVisit);
router.get("/:visitId/next-appts", getNextApptsForVisit);

// --- Bare :visitId last (will otherwise catch everything)
router.get("/:visitId", getVisit);
router.patch("/:visitId", updateVisit);
router.delete("/:visitId", deleteVisit);


// Procedures
router.post('/:visitId/procedures', addVisitProcedure);
router.patch('/:visitId/procedures/:index', updateVisitProcedureByIndex);
router.delete('/:visitId/procedures/:index', deleteVisitProcedureByIndex);


module.exports = router;
