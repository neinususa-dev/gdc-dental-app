// controllers/appointmentsController.js
const { createClient } = require('@supabase/supabase-js');

const supabaseForReq = (req) =>
  createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: req.headers.authorization } },
  });

const sbError = (res, error, status = 400) =>
  res.status(status).json({ error: error?.message || String(error) });

// Normalize to HH:MM 24h; clamps to 00-23 / 00-59 and pads.
const asHHMM = (v) => {
  if (!v && v !== 0) return v;
  const m = String(v).match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return v;
  const h = String(Math.min(23, Math.max(0, parseInt(m[1], 10)))).padStart(2, '0');
  const mm = String(Math.min(59, Math.max(0, parseInt(m[2], 10)))).padStart(2, '0');
  return `${h}:${mm}`;
};

const mapCreate = (body = {}, userId) => ({
  created_by: userId,
  patient_id: body.patient_id || null,
  patient_name: String(body.patient_name || '').trim(),
  phone: String(body.phone || '').trim(),
  date: body.date || null,
  time_slot: asHHMM(body.time_slot || null),
  service_type: body.service_type || 'Checkup',
  status: body.status || 'Pending',
  rescheduled_date: body.rescheduled_date ?? null,
  rescheduled_time: body.rescheduled_time ? asHHMM(body.rescheduled_time) : null,
  notes: body.notes ?? null,
});

const mapPatch = (body = {}) => {
  const row = {};
  const set = (k, v) => v !== undefined && (row[k] = v);

  set('patient_id', body.patient_id ?? undefined);
  set('patient_name', body.patient_name ? String(body.patient_name).trim() : undefined);
  set('phone', body.phone ? String(body.phone).trim() : undefined);
  set('date', body.date ?? undefined);
  set('time_slot', body.time_slot ? asHHMM(body.time_slot) : undefined);
  set('service_type', body.service_type ?? undefined);
  set('status', body.status ?? undefined);
  set('rescheduled_date', body.rescheduled_date === null ? null : body.rescheduled_date);
  set('rescheduled_time',
    body.rescheduled_time ? asHHMM(body.rescheduled_time)
    : (body.rescheduled_time === null ? null : undefined)
  );
  set('notes', body.notes === undefined ? undefined : (body.notes ?? null));

  return row;
};

// GET /appointments?date=YYYY-MM-DD
// GET /appointments?from=YYYY-MM-DD&to=YYYY-MM-DD
const listAppointments = async (req, res) => {
  try {
    const supabase = supabaseForReq(req);
    const { date, from, to, limit, offset } = req.query;

    let q = supabase.from('appointments').select('*');

    if (date) {
      q = q.eq('date', date);
    } else if (from && to) {
      q = q.gte('date', from).lte('date', to);
    } else {
      // default to current month range
      const now = new Date();
      const first = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
      q = q.gte('date', first).lte('date', last);
    }

    q = q.order('date', { ascending: true }).order('time_slot', { ascending: true });

    if (limit) {
      const l = Number(limit);
      const o = Number(offset || 0);
      q = q.range(o, o + l - 1);
    }

    const { data, error } = await q;
    if (error) return sbError(res, error);
    return res.json(data || []);
  } catch (err) {
    return sbError(res, err);
  }
};

// POST /appointments
const createAppointment = async (req, res) => {
  try {
    const supabase = supabaseForReq(req);
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const row = mapCreate(req.body || {}, userId);

    // Basic guardrails before DB checks
    if (!row.patient_name) return res.status(400).json({ error: 'patient_name is required' });
    if (!row.phone) return res.status(400).json({ error: 'phone is required' });
    if (!row.date) return res.status(400).json({ error: 'date is required' });
    if (!row.time_slot) return res.status(400).json({ error: 'time_slot is required' });

    // If Rescheduled, require both fields (matches DB trigger) and promote into canonical
    if (row.status === 'Rescheduled') {
      if (!row.rescheduled_date) {
        return res.status(400).json({ error: 'rescheduled_date is required when status = Rescheduled' });
      }
      if (!row.rescheduled_time) {
        return res.status(400).json({ error: 'rescheduled_time is required when status = Rescheduled' });
      }
      // Promote so listing by canonical date/time shows the updated day
      row.date = row.rescheduled_date;
      row.time_slot = asHHMM(row.rescheduled_time);
      // Keep rescheduled_* for history & to satisfy DB constraint
    }

    const { data, error } = await supabase
      .from('appointments')
      .insert(row)
      .select('*')
      .single();

    if (error) return sbError(res, error);
    return res.status(201).json(data);
  } catch (err) {
    return sbError(res, err);
  }
};

// PATCH /appointments/:id
const updateAppointment = async (req, res) => {
  try {
    const supabase = supabaseForReq(req);
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Missing id' });

    const patch = mapPatch(req.body || {});
    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Load current row so we can validate the merged state
    const { data: current, error: getErr } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', id)
      .single();

    if (getErr?.code === 'PGRST116' || (!current && !getErr)) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    if (getErr) return sbError(res, getErr);

    const merged = { ...current, ...patch };

    // If status will be Rescheduled, require both fields (aligns with DB trigger)
    if (merged.status === 'Rescheduled') {
      if (!merged.rescheduled_date) {
        return res.status(400).json({ error: 'rescheduled_date is required when status = Rescheduled' });
      }
      if (!merged.rescheduled_time) {
        return res.status(400).json({ error: 'rescheduled_time is required when status = Rescheduled' });
      }
    }

    // Promote rescheduled_* into canonical date/time unless explicitly overridden in this patch
    const hasReschedDate = Object.prototype.hasOwnProperty.call(patch, 'rescheduled_date') && patch.rescheduled_date;
    const hasReschedTime = Object.prototype.hasOwnProperty.call(patch, 'rescheduled_time') && patch.rescheduled_time !== null;
    const hasDate = Object.prototype.hasOwnProperty.call(patch, 'date');
    const hasTime = Object.prototype.hasOwnProperty.call(patch, 'time_slot');

    // Use the merged values to promote correctly even if only one of the two is present in this patch
    if ((hasReschedDate || patch.status === 'Rescheduled') && !hasDate) {
      patch.date = merged.rescheduled_date || patch.date || current.date;
    }
    if ((hasReschedTime || patch.status === 'Rescheduled') && !hasTime) {
      patch.time_slot = asHHMM(merged.rescheduled_time || patch.time_slot || current.time_slot);
    }

    // Do NOT clear rescheduled_*; your DB trigger requires them when status='Rescheduled'
    // and keeping them preserves metadata/history.

    const { data, error } = await supabase
      .from('appointments')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();

    if (error?.code === 'PGRST116' || (!data && !error)) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    if (error) return sbError(res, error);
    return res.json(data);
  } catch (err) {
    return sbError(res, err);
  }
};

// DELETE /appointments/:id
const deleteAppointment = async (req, res) => {
  try {
    const supabase = supabaseForReq(req);
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Missing id' });

    const { data, error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id)
      .select('*')
      .single();

    if (error?.code === 'PGRST116' || (!data && !error)) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    if (error) return sbError(res, error);
    return res.json({ message: 'Appointment deleted successfully' });
  } catch (err) {
    return sbError(res, err);
  }
};

module.exports = {
  listAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
};
