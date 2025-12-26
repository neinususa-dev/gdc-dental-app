import { useState } from 'react';
import { supabase } from '../CreateClient';
import { motion } from 'framer-motion';
import { FaTooth, FaEnvelope, FaKey, FaCheck, FaRedo, FaArrowRight } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import 'aos/dist/aos.css';

const VerifyOtp = () => {
  const [form, setForm] = useState({
    email: '',
    token: ''
  });
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const onVerify = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMsg({ text: '', type: '' });
    
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: form.email.toLowerCase().trim(),
        token: form.token.trim(),
        type: 'signup',
      });

      if (error) throw error;
      
      setMsg({ 
        text: 'Email verified successfully! Redirecting to login...', 
        type: 'success' 
      });
      // Clear form after successful verification
      setForm({ email: '', token: '' });
    } catch (error) {
      setMsg({ 
        text: error.message || 'Verification failed. Please try again.', 
        type: 'error' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onResend = async () => {
    setIsResending(true);
    setMsg({ text: '', type: '' });
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: form.email.toLowerCase().trim(),
      });

      if (error) throw error;
      
      setMsg({ 
        text: 'New verification code sent. Please check your email.', 
        type: 'success' 
      });
    } catch (error) {
      setMsg({ 
        text: error.message || 'Failed to resend code. Please try again.', 
        type: 'error' 
      });
    } finally {
      setIsResending(false);
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
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: 'spring', stiffness: 100 }
    },
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 flex items-center justify-center p-4"
    >
      <motion.form
        onSubmit={onVerify}
        variants={itemVariants}
        data-aos="fade-up"
        className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full"
      >
        <div className="flex flex-col items-center mb-6">
          <FaTooth className="text-4xl text-teal-500 mb-2" />
          <h2 className="text-2xl font-bold text-gray-800">Verify Your Email</h2>
          <p className="text-gray-500 mt-1">Enter the code sent to your email</p>
        </div>

        <div className="space-y-4">
          {/* Email */}
          <motion.div variants={itemVariants}>
            <label className="block text-gray-700 mb-2">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaEnvelope className="text-gray-400" />
              </div>
              <input
                name="email"
                placeholder="your@email.com"
                type="email"
                required
                value={form.email}
                onChange={handleChange}
                className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none transition"
              />
            </div>
          </motion.div>

          {/* OTP Code */}
          <motion.div variants={itemVariants}>
            <label className="block text-gray-700 mb-2">Verification Code</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaKey className="text-gray-400" />
              </div>
              <input
                name="token"
                placeholder="Enter 6-digit code"
                required
                maxLength={6}
                value={form.token}
                onChange={handleChange}
                className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none transition"
              />
            </div>
          </motion.div>
        </div>

        {/* Verify Button */}
        <motion.button
          variants={itemVariants}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          disabled={isLoading}
          type="submit"
          className={`w-full mt-6 py-3 rounded-lg font-semibold text-white transition-colors shadow-md flex items-center justify-center ${
            isLoading ? 'bg-teal-400' : 'bg-teal-600 hover:bg-teal-700'
          }`}
        >
          {isLoading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Verifying...
            </span>
          ) : (
            <span className="flex items-center">
              Verify Email <FaCheck className="ml-2" />
            </span>
          )}
        </motion.button>

        {/* Resend Button */}
        <motion.button
          variants={itemVariants}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={onResend}
          disabled={isResending || !form.email}
          className={`w-full mt-4 py-3 rounded-lg font-semibold transition-colors shadow-md flex items-center justify-center ${
            isResending ? 'bg-blue-400' : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {isResending ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Sending...
            </span>
          ) : (
            <span className="flex items-center">
              Resend Code <FaRedo className="ml-2" />
            </span>
          )}
        </motion.button>

        {/* Message */}
        {msg.text && (
          <motion.div
            variants={itemVariants}
            className={`mt-4 p-3 rounded-lg text-center ${
              msg.type === 'error' 
                ? 'bg-red-100 text-red-700' 
                : 'bg-teal-100 text-teal-700'
            }`}
          >
            {msg.text}
          </motion.div>
        )}

        {/* Back to Login Link */}
        <motion.div variants={itemVariants} className="mt-6 text-center text-gray-500">
          <Link 
            to="/" 
            className="text-teal-600 hover:text-teal-800 font-medium flex items-center justify-center"
          >
            <FaArrowRight className="mr-1 transform rotate-180" /> Back to Login
          </Link>
        </motion.div>
      </motion.form>
    </motion.div>
  );
};

export default VerifyOtp;