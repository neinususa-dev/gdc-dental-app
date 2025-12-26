// middleware/auth.js
const { createClient } = require('@supabase/supabase-js');

const supabasePublic = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const requireUser = async (req, res, next) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ success: false, message: 'Missing token' });

  // Works for normal access tokens
  const { data, error } = await supabasePublic.auth.getUser(token);

  if (error || !data?.user) {
    const msg = /expired/i.test(error?.message || '') ? 'Session expired' : 'Invalid token';
    return res.status(401).json({ success: false, message: msg });
  }

  req.user = data.user;
  next();
};

module.exports = { requireUser };
