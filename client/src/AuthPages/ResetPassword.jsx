import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../CreateClient';
import { motion } from 'framer-motion';
import { FaTooth, FaLock, FaCheckCircle, FaExclamationTriangle, FaArrowLeft } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import 'aos/dist/aos.css';

const parseParams = () => {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const query = new URLSearchParams(window.location.search);
  return {
    access_token: hash.get('access_token') || query.get('access_token'),
    refresh_token: hash.get('refresh_token') || query.get('refresh_token'),
    type: (hash.get('type') || query.get('type') || '').toLowerCase()
  };
};

const ResetPassword = () => {
  const [ready, setReady] = useState(false);
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [error, setError] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const { access_token, refresh_token, type } = useMemo(parseParams, []);

  useEffect(() => {
    const verifySession = async () => {
      try {
        // 🚦 Make sure this page only handles recovery links
        if (!type) {
          throw new Error('Missing link type. Please use the latest recovery email.');
        }
        if (type !== 'recovery') {
          // Common misroute when verification emails point here
          if (type === 'signup' || type === 'invite') {
            throw new Error(
              'This link is for email verification, not password reset. Please open the verification page or request a new reset link.'
            );
          }
          throw new Error('Invalid or unsupported link type.');
        }

        if (!access_token || !refresh_token) {
          throw new Error('Missing tokens. Please open the reset link directly from your email.');
        }

        const { error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        if (error) throw error;

        // 🧹 Clean URL (remove tokens) after session is set
        try {
          const cleanUrl = window.location.pathname + window.location.search;
          window.history.replaceState({}, '', cleanUrl);
        } catch (_) {
          /* ignore history errors */
        }

        setReady(true);
      } catch (e) {
        setError(e.message || 'Failed to verify your recovery link.');
        setReady(true);
      }
    };

    verifySession();
  }, [access_token, refresh_token, type]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (form.password.length < 8) {
        throw new Error('Password must be at least 8 characters.');
      }
      if (form.password !== form.confirmPassword) {
        throw new Error("Passwords don't match.");
      }

      const { error } = await supabase.auth.updateUser({
        password: form.password.trim(),
      });
      if (error) throw error;

      setIsSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (e) {
      setError(e.message || 'Failed to update password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring', stiffness: 100 },
    },
  };

  if (!ready) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center"
        >
          <div className="animate-pulse flex justify-center">
            <FaTooth className="text-4xl text-teal-500 mb-4" />
          </div>
          <p className="text-gray-700">Verifying your recovery link...</p>
        </motion.div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-100 rounded-full mb-4 mx-auto">
            <FaCheckCircle className="text-3xl text-teal-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Password Updated!</h2>
          <p className="text-gray-600 mb-6">
            Your password has been changed successfully. Redirecting to login...
          </p>
        </motion.div>
      </div>
    );
  }

  const isVerifyMisroute = !!error && /verification|signup|unsupported/i.test(error);

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 flex items-center justify-center p-4"
    >
      <motion.form
        onSubmit={handleSubmit}
        variants={itemVariants}
        className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full"
      >
        <div className="flex flex-col items-center mb-6">
          <FaTooth className="text-4xl text-teal-500 mb-2" />
          <h2 className="text-2xl font-bold text-gray-800">
            {error ? 'Recovery Error' : 'Set New Password'}
          </h2>
          <p className="text-gray-500 mt-1 text-center">
            {error ? 'There was an issue with your link' : 'Create a strong new password'}
          </p>
        </div>

        {error ? (
          <motion.div
            variants={itemVariants}
            className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-lg"
          >
            <div className="flex items-start">
              <FaExclamationTriangle className="text-red-500 mt-1 mr-3 flex-shrink-0" />
              <div>
                <p className="text-sm text-red-700">{error}</p>

                {isVerifyMisroute ? (
                  <Link
                    to="/email-confirmed"
                    className="inline-block mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
                  >
                    Go to verification page
                  </Link>
                ) : (
                  <Link
                    to="/forgot-password"
                    className="inline-block mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
                  >
                    Request new recovery link
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <>
            <div className="space-y-4">
              <motion.div variants={itemVariants}>
                <label className="block text-gray-700 mb-2">New Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaLock className="text-gray-400" />
                  </div>
                  <input
                    name="password"
                    type="password"
                    placeholder="At least 8 characters"
                    minLength={8}
                    required
                    value={form.password}
                    onChange={handleChange}
                    className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none transition"
                  />
                </div>
              </motion.div>

              <motion.div variants={itemVariants}>
                <label className="block text-gray-700 mb-2">Confirm Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaLock className="text-gray-400" />
                  </div>
                  <input
                    name="confirmPassword"
                    type="password"
                    placeholder="Confirm your new password"
                    required
                    value={form.confirmPassword}
                    onChange={handleChange}
                    className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none transition"
                  />
                </div>
              </motion.div>
            </div>

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
                  Updating...
                </span>
              ) : (
                <span className="flex items-center">
                  Update Password <FaCheckCircle className="ml-2" />
                </span>
              )}
            </motion.button>
          </>
        )}

        <motion.div variants={itemVariants} className="mt-6 text-center text-gray-500">
          <Link
            to="/"
            className="text-teal-600 hover:text-teal-800 font-medium flex items-center justify-center"
          >
            <FaArrowLeft className="mr-2" /> Back to Login
          </Link>
        </motion.div>
      </motion.form>
    </motion.div>
  );
};

export default ResetPassword;
