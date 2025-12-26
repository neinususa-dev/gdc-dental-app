import React from 'react';
import { FaTeeth, FaTeethOpen, FaTooth,  } from 'react-icons/fa';
import { motion } from 'framer-motion';
import 'aos/dist/aos.css';

const Home = () => {
  const services = [
    {
      icon: <FaTooth className="text-4xl text-teal-500" />,
      title: "General Dentistry",
      description: "Comprehensive oral exams, cleanings, and preventive care to maintain your healthy smile."
    },
    {
      icon: <FaTeethOpen className="text-4xl text-blue-500" />,
      title: "Cosmetic Dentistry",
      description: "Teeth whitening, veneers, and smile makeovers to enhance your natural beauty."
    },
    {
      icon: <FaTeeth className="text-4xl text-teal-500" />,
      title: "Orthodontics",
      description: "Modern braces and Invisalign treatments for perfectly aligned teeth."
    },
    {
      icon: <FaTooth className="text-4xl text-blue-500" />,
      title: "Dental Implants",
      description: "Permanent tooth replacement solutions that look and feel natural."
    },
    {
      icon: <FaTeethOpen className="text-4xl text-teal-500" />,
      title: "Pediatric Dentistry",
      description: "Gentle care designed specifically for our youngest patients."
    },
    {
      icon: <FaTeeth className="text-4xl text-blue-500" />,
      title: "Emergency Care",
      description: "Immediate treatment for dental emergencies and severe toothaches."
    }
  ];

  return (
    <div className="font-sans">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-50 to-teal-50 py-20 px-4 text-center">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-4xl md:text-5xl font-bold text-gray-800 mb-6"
        >
          Your Smile Deserves the Best Care
        </motion.h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
          Modern dentistry with a gentle touch. We make dental visits comfortable and stress-free.
        </p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="bg-teal-500 hover:bg-teal-600 text-white font-semibold py-3 px-8 rounded-full shadow-lg"
        >
          Book an Appointment
        </motion.button>
      </section>

      {/* Services Section */}
      <section className="py-16 px-4 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">OUR BEST SERVICES</h2>
          <div className="w-20 h-1 bg-teal-500 mx-auto"></div>
          <p className="text-gray-600 mt-6 max-w-2xl mx-auto">
            We offer comprehensive dental services using the latest technology to ensure your complete oral health.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="bg-white p-8 rounded-xl shadow-md hover:shadow-lg transition-shadow"
              data-aos="fade-up"
            >
              <div className="flex justify-center mb-4">{service.icon}</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3 text-center">{service.title}</h3>
              <p className="text-gray-600 text-center">{service.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="bg-blue-50 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-8">What Our Patients Say</h2>
          <div className="bg-white p-8 rounded-xl shadow-md">
            <p className="text-xl italic text-gray-700 mb-6">
              "The entire team was professional and made me feel comfortable. My dental implants look and feel amazing!"
            </p>
            <p className="font-semibold text-teal-600">— Sarah Johnson</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-teal-500 to-blue-500 text-white text-center">
        <h2 className="text-3xl font-bold mb-6">Ready for a Healthier Smile?</h2>
        <p className="text-xl mb-8 max-w-2xl mx-auto">
          Contact us today to schedule your appointment and experience pain-free dentistry.
        </p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="bg-white text-teal-600 font-semibold py-3 px-8 rounded-full shadow-lg"
        >
          Call Now: (123) 456-7890
        </motion.button>
      </section>
    </div>
  );
};

export default Home;