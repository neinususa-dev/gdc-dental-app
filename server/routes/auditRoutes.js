// routes/auditRoutes.js
const express = require('express');
const {
  getAuditRecent,
  
} = require('../controller/auditController');

const router = express.Router();

// Order matters: put the specific route before the generic :schema/:table/:rowId
router.get('/recent', getAuditRecent);


module.exports = router;
