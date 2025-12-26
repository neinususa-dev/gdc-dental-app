import { useState } from 'react';
import { supabase } from '../CreateClient';
import { motion } from 'framer-motion';
import { FaTooth, FaEnvelope, FaPaperPlane, FaArrowLeft, FaCheck } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import 'aos/dist/aos.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMsg({ text: '', type: '' });
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.toLowerCase().trim(), 
        {
          redirectTo: `${window.location.origin}/reset-password`
        }
      );

      if (error) throw error;
      
      setMsg({ 
        text: 'Password reset link sent! Please check your email.', 
        type: 'success' 
      });
      setIsSuccess(true);
    } catch (error) {
      setMsg({ 
        text: error.message || 'Failed to send reset link. Please try again.', 
        type: 'error' 
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
        onSubmit={onSubmit}
        variants={itemVariants}
        data-aos="fade-up"
        className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full"
      >
        <div className="flex flex-col items-center mb-6">
          <FaTooth className="text-4xl text-teal-500 mb-2" />
          <h2 className="text-2xl font-bold text-gray-800">
            {isSuccess ? 'Check Your Email' : 'Reset Your Password'}
          </h2>
          <p className="text-gray-500 mt-1 text-center">
            {isSuccess 
              ? 'We sent a password reset link to your email' 
              : 'Enter your email to receive a reset link'}
          </p>
        </div>

        {!isSuccess ? (
          <>
            {/* Email Input */}
            <motion.div variants={itemVariants} className="mb-6">
              <label className="block text-gray-700 mb-2">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaEnvelope className="text-gray-400" />
                </div>
                <input
                  placeholder="your@email.com"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none transition"
                />
              </div>
            </motion.div>

            {/* Submit Button */}
            <motion.button
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={isLoading}
              type="submit"
              className={`w-full py-3 rounded-lg font-semibold text-white transition-colors shadow-md flex items-center justify-center ${
                isLoading ? 'bg-teal-400' : 'bg-teal-600 hover:bg-teal-700'
              }`}
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending...
                </span>
              ) : (
                <span className="flex items-center">
                  Send Reset Link <FaPaperPlane className="ml-2" />
                </span>
              )}
            </motion.button>
          </>
        ) : (
          /* Success State */
          <motion.div 
            variants={itemVariants}
            className="text-center py-4"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-100 rounded-full mb-4">
              <FaCheck className="text-3xl text-teal-600" />
            </div>
            <p className="text-gray-600 mb-6">
              If an account exists for {email}, you'll receive an email with password reset instructions.
            </p>
            <button
              onClick={() => {
                setIsSuccess(false);
                setEmail('');
              }}
              className="text-teal-600 hover:text-teal-800 font-medium flex items-center justify-center mx-auto"
            >
              <FaPaperPlane className="mr-2" /> Send to another email
            </button>
          </motion.div>
        )}

        {/* Message */}
        {msg.text && !isSuccess && (
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
            <FaArrowLeft className="mr-2" /> Back to Login
          </Link>
        </motion.div>
      </motion.form>
    </motion.div>
  );
};

export default ForgotPassword;