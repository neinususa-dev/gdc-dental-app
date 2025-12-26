// routes/appointments.js
const express = require('express');
const router = express.Router();
const {
  listAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
} = require('../controller/appointmentsController');
const { requireUser } = require('../middleware/auth');

router.get('/', requireUser, listAppointments);
router.post('/', requireUser, createAppointment);
router.patch('/:id', requireUser, updateAppointment);
router.delete('/:id', requireUser, deleteAppointment);

module.exports = router;
