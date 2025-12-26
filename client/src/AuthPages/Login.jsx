// src/pages/Login.jsx (dark theme with user icon inside Username field)
import { useState, useEffect } from 'react';
import { supabase } from '../CreateClient';
import { motion } from 'framer-motion';
import { FaUser, FaLock, FaArrowRight } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import CreatableSelect from 'react-select/creatable';
import 'aos/dist/aos.css';
import GDC from "../assets/gdc.png";

const isEmail = (v = '') => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
  (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL) ||
  '';

const USERNAMES = [
  "Natarajan@gdc.com","Kaviyaa@gdc.com","Swetha@gdc.com","Mythili@gdc.com","Premkumar@gdc.com","Vignesh@gdc.com",
  "Srinath@gdc.com","Venkatesh@gdc.com","Kesavaraj@gdc.com","Yokesh@gdc.com",
];
const USER_OPTIONS = USERNAMES.map(n => ({ value: n, label: n }));

/* ------------------------ React-Select dark styles ----------------------- */
/* Matches the screenshot vibe: dark input with pink focus-ring and space for a left icon */
const selectStyles = {
  control: (base, state) => ({
    ...base,
    backgroundColor: '#0b1220',               // slate-950-ish
    borderColor: state.isFocused ? '#f43f5e' : '#334155', // ring-rose-500 on focus, slate-700 otherwise
    boxShadow: state.isFocused ? '0 0 0 2px rgba(244,63,94,0.35)' : 'none',
    '&:hover': { borderColor: state.isFocused ? '#f43f5e' : '#475569' },
    minHeight: 48,
    paddingLeft: 44,                           // ← room for the user icon
    borderRadius: 10,
    color: '#e5e7eb',
  }),
  valueContainer: (base) => ({ ...base, padding: '0 10px', color: '#e5e7eb' }),
  input: (base) => ({ ...base, color: '#e5e7eb', margin: 0, padding: 0 }),
  singleValue: (base) => ({ ...base, color: '#e5e7eb' }),
  placeholder: (base) => ({ ...base, color: '#94a3b8' }),
  dropdownIndicator: (base, state) => ({
    ...base,
    color: state.isFocused ? '#e5e7eb' : '#94a3b8',
    '&:hover': { color: '#e5e7eb' },
  }),
  clearIndicator: (base) => ({ ...base, color: '#94a3b8', '&:hover': { color: '#e5e7eb' } }),
  indicatorSeparator: (base) => ({ ...base, backgroundColor: '#475569' }),
  menu: (base) => ({
    ...base,
    zIndex: 50,
    backgroundColor: '#0b1220',
    border: '1px solid #334155',
    overflow: 'hidden',
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? '#f43f5e'
      : state.isFocused
      ? '#1f2937'
      : '#0b1220',
    color: state.isSelected ? '#ffffff' : '#e5e7eb',
    ':active': { backgroundColor: state.isSelected ? '#f43f5e' : '#111827' },
    cursor: 'pointer',
  }),
};

/* ----------------------------- Safe JSON read ---------------------------- */
async function readJsonSafe(res) {
  const text = await res.text().catch(() => '');
  if (!text) return {};
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

const Login = () => {
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) navigate('/doctor');
    })();
  }, [navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMsg({ text: '', type: '' });

    const identifier = form.identifier.trim();
    const password = form.password.trim();

    if (!identifier || !password) {
      setMsg({ text: 'Please enter username/email and password.', type: 'error' });
      setIsLoading(false);
      return;
    }

    try {
      if (isEmail(identifier)) {
        const { error } = await supabase.auth.signInWithPassword({
          email: identifier.toLowerCase(),
          password
        });
        if (error) throw error;
      } else {
        const res = await fetch(`${API_BASE}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ username: identifier, password })
        });
        const payload = await readJsonSafe(res);
        if (!res.ok) {
          const errMsg = payload.msg || payload.error || payload.message || payload.raw || `Login failed (HTTP ${res.status})`;
          throw new Error(errMsg);
        }
        const { token, refresh_token } = payload;
        if (!token || !refresh_token) throw new Error('Invalid auth response from server.');
        const { error: setErr } = await supabase.auth.setSession({
          access_token: token,
          refresh_token
        });
        if (setErr) throw setErr;
      }
      navigate('/doctor');
    } catch (error) {
      setMsg({ text: error.message || 'Login failed. Please try again.', type: 'error' });
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
  };
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } },
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black flex items-center justify-center px-4"
    >
      <motion.form
        onSubmit={onSubmit}
        variants={itemVariants}
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/70 backdrop-blur p-8 shadow-2xl"
      >
        <div className="flex flex-col items-center mb-6">
          <img src={GDC} alt="Logo" className="mb-3 w-28 h-20 opacity-90" />
          <h2 className="text-2xl font-bold text-slate-100">Welcome Back</h2>
          <p className="text-slate-400 mt-1">Sign in to your dental account</p>
        </div>

        <div className="space-y-5">
          {/* Username / Email - with USER ICON inside the field */}
          <motion.div variants={itemVariants}>
            <label htmlFor="identifier" className="block text-slate-300 mb-2">
              Username or email
            </label>
            <div className="relative">
              {/* Icon */}
              <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
                <FaUser className="text-slate-400" />
              </div>
              <CreatableSelect
                inputId="identifier"
                classNamePrefix="rs-dark"
                styles={selectStyles}
                isClearable
                isSearchable
                options={USER_OPTIONS}
                placeholder="Select a username or type email"
                value={form.identifier ? { value: form.identifier, label: form.identifier } : null}
                onChange={(opt) => setForm({ ...form, identifier: opt?.value || '' })}
                onInputChange={(inputVal, action) => {
                  if (action.action === 'input-change') {
                    setForm((f) => ({ ...f, identifier: inputVal }));
                  }
                }}
                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
              />
            </div>
          </motion.div>

          {/* Password */}
          <motion.div variants={itemVariants}>
            <label className="block text-slate-300 mb-2">Password</label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
                <FaLock className="text-slate-400" />
              </div>
              <input
                placeholder="Enter your password"
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full pl-10 pr-3 py-3 rounded-lg bg-slate-900 text-slate-100 placeholder-slate-500 border border-slate-700 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/40 transition"
                autoComplete="current-password"
              />
            </div>
          </motion.div>
        </div>

        {/* Submit Button */}
        <motion.button
          variants={itemVariants}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={isLoading}
          className={`w-full mt-7 py-3 rounded-lg font-semibold text-white shadow-lg flex items-center justify-center
            ${isLoading ? 'bg-rose-400' : 'bg-rose-600 hover:bg-rose-700'} transition-colors`}
        >
          {isLoading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Signing In...
            </span>
          ) : (
            <span className="flex items-center">
              Sign In <FaArrowRight className="ml-2" />
            </span>
          )}
        </motion.button>

        {/* Footer actions */}
        <motion.div variants={itemVariants} className="mt-4 flex items-center justify-between text-sm">
          <label className="inline-flex items-center text-slate-400 select-none">
            <input type="checkbox" className="mr-2 h-4 w-4 rounded border-slate-600 bg-slate-900 text-rose-600 focus:ring-rose-500" />
            remember me
          </label>
          <Link to="/forgot-password" className="text-rose-400 hover:text-rose-300 font-medium">
            forgot password
          </Link>
        </motion.div>

        {/* Message */}
        {msg.text && (
          <motion.div
            variants={itemVariants}
            className={`mt-4 p-3 rounded-lg text-center ${
              msg.type === 'error' ? 'bg-rose-950/50 text-rose-300 border border-rose-900' : 'bg-emerald-950/40 text-emerald-300 border border-emerald-900'
            }`}
          >
            {msg.text}
          </motion.div>
        )}
      </motion.form>
    </motion.div>
  );
};

export default Login;
