// controllers/auditController.js (only getAuditRecent changed)
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseForReq = (req) =>
  createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: req.headers.authorization || '' } },
    auth: { persistSession: false },
  });

const sbError = (res, error, status = 400) => {
  const msg = error?.message || String(error);
  const hint = /relation .* does not exist|schema cache|permission denied|not found/i.test(msg)
    ? ' (check that the view public.audit_event_log exists, is granted to authenticated/anon, and API cache is refreshed)'
    : '';
  return res.status(status).json({ error: msg + hint });
};

const getLimitOffset = (req, defLimit = 50, maxLimit = 200) => {
  const limit = Math.max(1, Math.min(Number(req.query.limit || defLimit), maxLimit));
  const offset = Math.max(0, Number(req.query.offset || 0));
  return { limit, offset, range: [offset, offset + limit - 1] };
};

/**
 * GET /audit/recent?action=INSERT|UPDATE|DELETE&limit=50&offset=0
 * Reads from PUBLIC VIEW: public.audit_event_log
 */
const getAuditRecent = async (req, res) => {
  try {
    const supabase = supabaseForReq(req);
    if (!req.headers.authorization) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { limit, range } = getLimitOffset(req);
    const action = (req.query.action || '').toString().toUpperCase();

    // quick diagnostics
    const counts = {};
    {
      const all = await supabase
        .from('audit_event_log')
        .select('id', { count: 'exact', head: true });
      counts.total_all = all.count ?? null;

      const ins = await supabase
        .from('audit_event_log')
        .select('id', { count: 'exact', head: true })
        .eq('action', 'INSERT');
      counts.total_insert = ins.count ?? null;

      const upd = await supabase
        .from('audit_event_log')
        .select('id', { count: 'exact', head: true })
        .eq('action', 'UPDATE');
      counts.total_update = upd.count ?? null;

      const del = await supabase
        .from('audit_event_log')
        .select('id', { count: 'exact', head: true })
        .eq('action', 'DELETE');
      counts.total_delete = del.count ?? null;
    }

    let q = supabase
      .from('audit_event_log')
      .select('*', { count: 'exact' })
      .order('happened_at', { ascending: false })
      .order('id', { ascending: false })
      .range(range[0], range[1]);

    if (action === 'INSERT' || action === 'UPDATE' || action === 'DELETE') {
      q = q.eq('action', action);
    }

    const { data, error, count } = await q;
    if (error) return sbError(res, error);

    return res.json({
      limit,
      offset: range[0],
      total: count ?? null,
      items: data || [],
      meta: counts, // <— helpful hint why you might be seeing zero rows
    });
  } catch (err) {
    return sbError(res, err, 500);
  }
};

module.exports = {
  getAuditRecent,
};
