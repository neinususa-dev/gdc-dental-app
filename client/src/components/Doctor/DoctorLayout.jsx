import React, { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../CreateClient"; 
import GDC from "../../assets/gdc.png"; // make sure the file exists at src/assets/gdc.png

// Icons
import {
  FaUser, FaSignOutAlt, FaTooth, FaSignInAlt, FaUserPlus, FaBars, FaTimes,
  FaUserInjured, FaUserFriends, FaCalendarAlt, FaChartLine, FaHistory, FaClipboardList, // ← added FaClipboardList
} from "react-icons/fa";
import { FaRegCalendarCheck } from "react-icons/fa6";

/* --------------------------- Nav Items (Left Sidebar) --------------------------- */
const navItems = [
  { to: "/doctor",                   label: "Appointments",     icon: FaRegCalendarCheck ,exact: true  },
  { to: "/doctor/patients",          label: "Patients",         icon: FaUserFriends, },
  { to: "/doctor/form",              label: "New Patient",      icon: FaUserInjured },
  { to: "/doctor/followups",         label: "Follow-ups",       icon: FaCalendarAlt },
  { to: "/doctor/camp-submissions",  label: "Camp Submissions", icon: FaClipboardList }, // ← NEW
  { to: "/doctor/analytics",         label: "Statistics",       icon: FaChartLine },
  { to: "/doctor/audit",             label: "Patient Logs",     icon: FaHistory },
];

const SIDEBAR_W = 320;

/* ---------------------------------- Navbar ---------------------------------- */
const TopNavbar = ({ onMenuClick, menuOpen = false }) => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (mounted) setUser(data.session?.user ?? null);
    })();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setUser(session?.user ?? null);
    });
    return () => { mounted = false; subscription?.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (typeof onMenuClick === "function" && menuOpen) onMenuClick(false);
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const displayName =
    user?.user_metadata?.username ??
    user?.email?.split("@")[0] ??
    "User";

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-white/85 border-b border-gray-200">
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center">
           
            <Link to="/doctor" className="ml-2 text-lg font-bold text-gray-900">
              <img src={GDC} alt="GDC" className="h-14 w-auto" />
            </Link>
          </motion.div>

          <div className="flex items-center">
            {!user ? (
              <div className="hidden sm:flex space-x-2">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link
                    to="/"
                    className="p-2 md:px-4 md:py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center"
                    aria-label="Sign In"
                  >
                    <FaSignInAlt className="md:mr-2" />
                    <span className="hidden md:inline">Sign In</span>
                  </Link>
                </motion.div>

                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link
                    to="/register"
                    className="p-2 md:px-4 md:py-2 bg-sky-600 text-white rounded-lg text-sm font-medium hover:bg-sky-700 flex items-center"
                    aria-label="Sign Up"
                  >
                    <FaUserPlus className="md:mr-2" />
                    <span className="hidden md:inline">Sign Up</span>
                  </Link>
                </motion.div>
              </div>
            ) : (
              <div className="hidden md:flex items-center md:ml-6">
                <div className="flex items-center">
                  <FaUser className="h-5 w-5 text-gray-500" />
                  <span className="ml-2 text-sm font-medium text-gray-700">
                    Dr. {displayName}
                  </span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleLogout}
                  className="ml-4 p-2 rounded-full text-gray-500 hover:text-sky-600 hover:bg-gray-100 cursor-pointer focus:outline-none"
                  title="Logout"
                >
                  <FaSignOutAlt className="h-5 w-5" />
                </motion.button>
              </div>
            )}

            {typeof onMenuClick === "function" && (
              <button
                onClick={() => onMenuClick(!menuOpen)}
                className="ml-2 p-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 lg:hidden cursor-pointer"
                aria-label={menuOpen ? "Close sidebar" : "Open sidebar"}
                aria-expanded={menuOpen}
                aria-controls="doctor-sidebar"
              >
                {menuOpen ? <FaTimes /> : <FaBars />}
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

/* ------------------------------- Doctor Layout ------------------------------- */
const DoctorLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [authUser, setAuthUser] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (mounted) setAuthUser(data.session?.user ?? null);
    })();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setAuthUser(session?.user ?? null);
    });
    return () => { mounted = false; subscription?.unsubscribe(); };
  }, []);

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    const onChange = (e) => setIsDesktop(e.matches);
    setIsDesktop(mql.matches);
    if (mql.addEventListener) mql.addEventListener("change", onChange);
    else mql.addListener(onChange);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", onChange);
      else mql.removeListener(onChange);
    };
  }, []);

  useEffect(() => { if (!isDesktop) setSidebarOpen(false); }, [location.pathname, isDesktop]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setSidebarOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const sidebarX = isDesktop ? 0 : (sidebarOpen ? 0 : SIDEBAR_W);

  const handleSidebarLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const displayName =
    authUser?.user_metadata?.username ??
    authUser?.email?.split("@")[0] ??
    "User";

  return (
    <div className="min-h-screen bg-sky-50">
      <TopNavbar onMenuClick={setSidebarOpen} menuOpen={sidebarOpen} />

      <div className="w-full mx-auto px-4 md:px-6">
        <div className="flex gap-6 py-6">
          <AnimatePresence>
            {sidebarOpen && !isDesktop && (
              <motion.button
                type="button"
                aria-label="Close sidebar"
                onClick={() => setSidebarOpen(false)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-x-0 top-16 bottom-0 bg-black/50 z-40 lg:hidden"
              />
            )}
          </AnimatePresence>

          <motion.aside
            id="doctor-sidebar"
            initial={false}
            animate={{ x: sidebarX, boxShadow: !isDesktop && sidebarOpen ? "0 0 20px rgba(0,0,0,0.15)" : "none" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className={[
              "fixed lg:sticky z-50 lg:z-10",
              "top-16 lg:top-16",
              "h-[calc(100vh-4rem)]",
              "w-[320px]",
              "bg-gradient-to-b from-sky-900 to-sky-800 text-white",
              "overflow-y-auto rounded-l-2xl lg:rounded-2xl",
              "right-0 lg:right-auto lg:left-0",
            ].join(" ")}
            aria-hidden={!isDesktop && !sidebarOpen}
          >
            <div className="flex flex-col justify-between h-full">
              <div>
                <div className="p-6 border-b border-sky-700">
                  <div className="flex items-center gap-3">
                    <FaUser className="text-xl" aria-hidden="true" />
                    <h3 className="font-semibold">Dr. {displayName}</h3>
                  </div>
                </div>

                <nav className="p-4 space-y-2">
                  {navItems.map(({ to, label, icon: Icon, exact }) => (
                    <NavLink
                      key={to}
                      to={to}
                      end={exact}
                      onClick={() => !isDesktop && setSidebarOpen(false)}
                      className={({ isActive }) =>
                        [
                          "group relative flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 focus:outline-none",
                          "focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-sky-800",
                          isActive
                            ? "bg-sky-700 text-white shadow-lg"
                            : "text-sky-100 hover:bg-sky-800 hover:text-white",
                        ].join(" ")
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span
                            aria-hidden="true"
                            className={[
                              "absolute left-0 top-1/2 -translate-y-1/2 h-7 w-1 rounded-r",
                              isActive ? "bg-sky-300" : "bg-transparent",
                            ].join(" ")}
                          />
                          <Icon className="text-lg shrink-0" />
                          <span className="font-medium">{label}</span>
                        </>
                      )}
                    </NavLink>
                  ))}
                </nav>
              </div>

              <div className="p-4 border-t border-sky-700">
                <button
                  className="flex items-center gap-4 px-4 py-3 rounded-xl text-sky-100 hover:bg-sky-800 hover:text-white w-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                  type="button"
                  onClick={handleSidebarLogout}
                >
                  <FaSignOutAlt className="text-lg" />
                  <span className="font-medium cursor-pointer">Logout</span>
                </button>
              </div>
            </div>
          </motion.aside>

          <main className="flex-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100"
            >
              <Outlet />
            </motion.div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default DoctorLayout;
