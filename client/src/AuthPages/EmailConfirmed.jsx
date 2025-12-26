import { useEffect, useState } from 'react';
import { supabase } from '../CreateClient';
import { motion } from 'framer-motion';
import { FaCheckCircle, FaSpinner } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const EmailConfirmed = () => {
  const [message, setMessage] = useState('Verifying your email...');
  const [isVerified, setIsVerified] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          setMessage('Email successfully verified!');
          setIsVerified(true);
          setTimeout(() => navigate('/dashboard'), 1500);
        } else {
          setMessage('Email verified! Please sign in to continue.');
          setIsVerified(true);
        }
      } catch (error) {
        setMessage('Verification failed. Please try again.');
      }
    };

    verifyEmail();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center"
      >
        <div className="flex justify-center mb-4">
          {isVerified ? (
            <FaCheckCircle className="text-5xl text-teal-500" />
          ) : (
            <FaSpinner className="text-5xl text-blue-500 animate-spin" />
          )}
        </div>
        
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          {isVerified ? 'Verification Complete!' : 'Verifying Email'}
        </h2>
        
        <p className="text-gray-600 mb-6">{message}</p>
        
        {!isVerified && (
          <p className="text-sm text-gray-500">
            This may take a moment...
          </p>
        )}
        
        {isVerified && !message.includes('Redirecting') && (
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            Go to Sign In
          </button>
        )}
      </motion.div>
    </div>
  );
};

export default EmailConfirmed;