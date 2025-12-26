require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const ImageKit = require('imagekit');

const {requireUser} = require("./middleware/auth")

const app = express();
const port = process.env.PORT || 5000;

/* 0) Validate required env */
['IK_PUBLIC_KEY', 'IK_PRIVATE_KEY', 'IK_URL_ENDPOINT'].forEach((k) => {
  if (!process.env[k]) {
    console.error(`❌ Missing ${k} in environment`);
    process.exit(1);
  }
});

/* 1) Global middleware */
app.set('trust proxy', 1); // if behind proxy (safe even if not)
app.use(helmet());

const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true); // allow non-browser tools
    if (ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));



app.use(express.json({ limit: '1mb' })); // adjust as needed

/* 2) ImageKit setup */
const imagekit = new ImageKit({
  publicKey: process.env.IK_PUBLIC_KEY,
  privateKey: process.env.IK_PRIVATE_KEY, // server-only
  urlEndpoint: process.env.IK_URL_ENDPOINT,
});

/* 3) Auth endpoint */
app.get('/api/imagekit-auth', (req, res, next) => {
  try {
    const auth = imagekit.getAuthenticationParameters(); // { token, expire, signature }
    res.json(auth);
  } catch (err) {
    next(err);
  }
});

app.post('/api/imagekit-delete', requireUser, async (req, res, next) => {
  try {
    const { fileId } = req.body;
    if (!fileId) return res.status(400).json({ error: 'fileId required' });
    const resp = await imagekit.deleteFile(fileId);
    res.json({ ok: true, resp });
  } catch (e) {
    next(e);
  }
});

/* 4) Routes */
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/patients', require('./routes/patientRoutes'));
app.use('/api/visits', require('./routes/visitRoutes'));
app.use('/api/medicalhistory', require('./routes/medicalHistoryRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/appointments', require('./routes/appointmentsRoutes'));
app.use('/api/audit', require('./routes/auditRoutes'));
app.use('/api/camp-submissions', require('./routes/campSubmissionRoutes'));

/* 4.5) 404 */
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

/* 4.6) Error handler */
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal Server Error' });
});



/* 5) Start */
app.listen(port, () => console.log(`🚀 Server running on :${port}`));
