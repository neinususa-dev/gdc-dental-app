import { useState } from 'react';
import { supabase } from '../CreateClient';
import { motion } from 'framer-motion';
import { FaTooth, FaUser, FaEnvelope, FaLock, FaPhoneAlt, FaSignInAlt, FaEye, FaEyeSlash } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import 'aos/dist/aos.css';

const Register = () => {
  const [form, setForm] = useState({
    email: '',
    password: '',
    username: '',
    phone: '',
    role: 'dentist',
  });
  const [showPwd, setShowPwd] = useState(false); // ← show/hide toggle
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [isLoading, setIsLoading] = useState(false);

  // ✅ Use a different redirect for email verification
  const verifyRedirect =
    import.meta.env.VITE_VERIFY_EMAIL_REDIRECT_URL ||
    `${window.location.origin}/email-confirmed`;

  const onSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMsg({ text: '', type: '' });

    const { email, password, username, phone, role } = form;

    try {
      const { error } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password: password.trim(),
        options: {
          data: {
            username: username.trim(),
            phone: phone.trim(),
            role,
          },
          emailRedirectTo: verifyRedirect,
        },
      });

      if (error) throw error;

      setMsg({
        text: 'Registration successful! Please check your email to verify your account.',
        type: 'success',
      });
      setForm({ email: '', password: '', username: '', phone: '', role: 'dentist' });
      setShowPwd(false);
    } catch (error) {
      setMsg({
        text: error.message || 'Registration failed. Please try again.',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
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
      className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 flex items-center justify-center p-4"
    >
      <motion.form
        onSubmit={onSubmit}
        variants={itemVariants}
        data-aos="fade-up"
        className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full"
      >
        <div className="flex flex-col items-center mb-6">
          <FaTooth className="text-4xl text-teal-500 mb-2" />
          <h2 className="text-2xl font-bold text-gray-800">Create Your Account</h2>
          <p className="text-gray-500 mt-1">Join our dental clinic network</p>
        </div>

        <div className="space-y-4">
          {/* Full Name */}
          <motion.div variants={itemVariants}>
            <label className="block text-gray-700 mb-2">Full Name</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaUser className="text-gray-400" />
              </div>
              <input
                placeholder="Dr. John Smith"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none transition"
              />
            </div>
          </motion.div>

          {/* Email */}
          <motion.div variants={itemVariants}>
            <label className="block text-gray-700 mb-2">Email Address *</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaEnvelope className="text-gray-400" />
              </div>
              <input
                placeholder="your@email.com"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none transition"
                autoComplete="email"
              />
            </div>
          </motion.div>

          {/* Phone */}
          <motion.div variants={itemVariants}>
            <label className="block text-gray-700 mb-2">Phone Number</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaPhoneAlt className="text-gray-400" />
              </div>
              <input
                placeholder="+1 (123) 456-7890"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none transition"
                autoComplete="tel"
              />
            </div>
          </motion.div>

          {/* Password + Show/Hide */}
          <motion.div variants={itemVariants}>
            <label className="block text-gray-700 mb-2">Password *</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaLock className="text-gray-400" />
              </div>
              <input
                placeholder="At least 6 characters"
                type={showPwd ? 'text' : 'password'}
                required
                minLength={6}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full pl-10 pr-12 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none transition"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                aria-label={showPwd ? 'Hide password' : 'Show password'}
                aria-pressed={showPwd}
                title={showPwd ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                {showPwd ? <FaEyeSlash /> : <FaEye />}
              </button>
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
          className={`w-full mt-6 py-3 rounded-lg font-semibold text-white transition-colors shadow-md flex items-center justify-center ${
            isLoading ? 'bg-teal-400' : 'bg-teal-600 hover:bg-teal-700'
          }`}
        >
          {isLoading ? (
            <span className="flex items-center">
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Processing...
            </span>
          ) : (
            'Create Account'
          )}
        </motion.button>

        {/* Message */}
        {msg.text && (
          <motion.div
            variants={itemVariants}
            className={`mt-4 p-3 rounded-lg text-center ${
              msg.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-teal-100 text-teal-700'
            }`}
          >
            {msg.text}
          </motion.div>
        )}

        <motion.div variants={itemVariants} className="mt-4 text-center text-gray-500">
          Already have an account?{' '}
          <Link to="/" className="text-teal-600 hover:text-teal-800 font-medium inline-flex items-center">
            <FaSignInAlt className="mr-1" /> Sign In
          </Link>
        </motion.div>
      </motion.form>
    </motion.div>
  );
};

export default Register;
