// routes/campSubmission.js
const express = require("express");
const {
  listCampSubmissions,
  getCampSubmission,
  createCampSubmission,
  updateCampSubmission,
  deleteCampSubmission,
  listCampSubmissionLogs,
  getCampSubmissionLogsById,
} = require("../controller/campSubmissionController"); // ← ensure this path is correct

const router = express.Router();

// Collection routes
router.get("/", listCampSubmissions);
router.post("/", createCampSubmission);

// Logs MUST come before any `/:id` route to avoid being captured by it
router.get("/logs", listCampSubmissionLogs);

// Item routes
router.get("/:id", getCampSubmission);
router.patch("/:id", updateCampSubmission);
router.delete("/:id", deleteCampSubmission);

// Item-specific logs
router.get("/:id/logs", getCampSubmissionLogsById);

module.exports = router;
