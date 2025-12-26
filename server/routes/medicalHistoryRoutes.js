
const express = require('express');
const { requireUser } = require('../middleware/auth');
const { upsertMedicalHistory, getMedicalHistory } = require('../controller/medicalHistoryController');

const router = express.Router();
router.use(requireUser);
router.get('/:patientId/medical-history', getMedicalHistory);
router.put('/:patientId/medical-history', upsertMedicalHistory);


module.exports = router;
