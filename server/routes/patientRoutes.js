// routes/patientRoutes.js
const express = require("express");
const {
  uploadPhoto,        // ← Multer single('photo')
  createPatient,
  getAllPatients,
  getPatient,
  updatePatient,
  deletePatient,
  updatePhoto,
} = require("../controller/patientController"); // ensure this path matches your project

const { requireUser } = require("../middleware/auth");

const router = express.Router();

// All patient routes require an authenticated user (JWT in Authorization header)
router.get("/", requireUser, getAllPatients);
router.get("/:id", requireUser, getPatient);

// Create: allow optional file under "photo" (multipart) OR JSON-only
router.post("/", requireUser, uploadPhoto, createPatient);

// Update base fields: allow optional file under "photo"
router.put("/:id", requireUser, uploadPhoto, updatePatient);


router.patch("/:id/photo", requireUser, uploadPhoto, updatePhoto);

router.delete("/:id", requireUser, deletePatient);

module.exports = router;
