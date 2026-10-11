import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Camera,
  Bell,
  Calendar,
  User,
  LogOut,
  Menu,
  X,
  Shield,
  Settings,
  CreditCard,
  History,
  Heart,
  ChevronDown,
  UserCircle,
  Package,
  Clock
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useBooking } from '../context/BookingContext';

const WHATSAPP_NUMBER = '918383813876';

const WHATSAPP_MESSAGE =
  'Hello Anmol VideoGraphy, I am interested in your wedding photography and videography services. I would like to know more about your packages.';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const { openWizard } = useBooking();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const userMenuRef = useRef(null);

  const navigate = useNavigate();

  const isManagerOrOwner =
    user && (user.role === 'owner' || user.role === 'manager' || user.role === 'admin');

  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    WHATSAPP_MESSAGE
  )}`;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target)
      ) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    setIsUserMenuOpen(false);
    logout();
    navigate('/');
  };

  const handleMobileBookNow = () => {
    setIsMobileMenuOpen(false);
    openWizard();
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-ivory-100/95 backdrop-blur-md border-b border-blue-200/40 shadow-sm">

      <div className="w-full max-w-[1450px] mx-auto px-5 xl:px-7">

        <div className="flex items-center min-h-[82px] gap-5">

          {/* =====================================================
              LOGO
          ====================================================== */}

          <Link
            to="/"
            className="flex items-center gap-3 shrink-0 group"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-700 via-blue-600 to-blue-400 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform duration-300 shrink-0">
              <Camera className="w-6 h-6" />
            </div>

            <div className="flex flex-col leading-none">

              <span className="font-serif text-[24px] xl:text-[27px] font-bold tracking-tight text-charcoal-800 whitespace-nowrap">
                Anmol{' '}
                <span className="gold-gradient-text font-normal">
                  VideoGraphy
                </span>
              </span>

              <span className="mt-1 text-[9px] tracking-[0.18em] uppercase text-charcoal-400 font-sans whitespace-nowrap">
                Wedding Studio & Management
              </span>

            </div>
          </Link>


          {/* =====================================================
              DESKTOP NAVIGATION
          ====================================================== */}

          <nav className="hidden xl:flex items-center gap-6 2xl:gap-7 ml-auto">

            <Link to="/" className="navbar-link">
              Home
            </Link>

            <Link to="/about" className="navbar-link">
              About Us
            </Link>

            <Link to="/services" className="navbar-link">
              Services
            </Link>

            <Link to="/packages" className="navbar-link">
              Packages
            </Link>

            <Link to="/portfolio" className="navbar-link">
              Portfolio
            </Link>

            <Link to="/contact" className="navbar-link">
              Contact
            </Link>

            <Link
              to="/track"
              className="track-booking-btn"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Track Booking</span>
            </Link>

          </nav>


          {/* =====================================================
              DESKTOP RIGHT SIDE
          ====================================================== */}

          <div className="hidden lg:flex items-center gap-3 ml-auto shrink-0">

            {/* ADMIN NOTIFICATION */}

            {isManagerOrOwner && (
              <button
                type="button"
                onClick={() =>
                  navigate('/admin/dashboard?tab=notifications')
                }
                className="relative p-2.5 rounded-full text-charcoal-700 hover:text-blue-600 hover:bg-blue-50 transition-all"
                title="Notifications"
              >
                <Bell className="w-[19px] h-[19px]" />

                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-600 rounded-full shadow-md">
                    {unreadCount}
                  </span>
                )}
              </button>
            )}


            {/* =================================================
                USER ACCOUNT
            ================================================== */}

            {user ? (
              <div
                className="relative"
                ref={userMenuRef}
              >

                <button
                  type="button"
                  onClick={() =>
                    setIsUserMenuOpen((previous) => !previous)
                  }
                  className={`user-menu-button ${
                    isUserMenuOpen ? 'user-menu-active' : ''
                  }`}
                  aria-label="Open account menu"
                  aria-expanded={isUserMenuOpen}
                >

                  <UserCircle className="w-[22px] h-[22px]" />

                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      isUserMenuOpen ? 'rotate-180' : ''
                    }`}
                  />

                </button>


                {/* USER DROPDOWN */}

                {isUserMenuOpen && (
                  <div className="user-dropdown">

                    {/* USER INFORMATION */}

                    {/* USER / ADMIN INFORMATION */}
                    <div className="user-dropdown-header">
                      <div className="user-avatar">
                        {isManagerOrOwner
                          ? 'A'
                          : user?.full_name || user?.name
                          ? (user.full_name || user.name).charAt(0).toUpperCase()
                          : 'U'}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="user-dropdown-name">
                            {isManagerOrOwner
                              ? (user?.full_name || user?.name || 'Studio Admin')
                              : (user?.full_name || user?.name || 'Customer')}
                          </p>
                          {isManagerOrOwner && (
                            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                              {user?.role === 'owner' ? 'Owner' : 'Admin'}
                            </span>
                          )}
                        </div>

                        <p className="user-dropdown-email truncate">
                          {user?.email || (user?.mobile ? `+91 ${user.mobile}` : isManagerOrOwner ? 'Owner Account' : 'Customer Account')}
                        </p>
                      </div>
                    </div>

                    {/* ACCOUNT OPTIONS (ADMIN PERSPECTIVE VS CUSTOMER PERSPECTIVE) */}
                    <div className="user-dropdown-body">
                      {isManagerOrOwner ? (
                        <>
                          <Link
                            to="/admin/dashboard"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="user-dropdown-item"
                          >
                            <Shield className="user-dropdown-icon" />
                            <span>Dashboard Overview</span>
                          </Link>

                          <Link
                            to="/admin/dashboard?tab=bookings"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="user-dropdown-item"
                          >
                            <Calendar className="user-dropdown-icon" />
                            <span>Manage Bookings</span>
                          </Link>

                          <Link
                            to="/admin/dashboard?tab=packages"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="user-dropdown-item"
                          >
                            <Package className="user-dropdown-icon" />
                            <span>Packages & Pricing</span>
                          </Link>

                          <Link
                            to="/admin/dashboard?tab=availability"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="user-dropdown-item"
                          >
                            <Clock className="user-dropdown-icon" />
                            <span>Availability & Resources</span>
                          </Link>

                          <Link
                            to="/admin/dashboard?tab=settings"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="user-dropdown-item"
                          >
                            <Settings className="user-dropdown-icon" />
                            <span>Studio Settings</span>
                          </Link>

                          <Link
                            to="/admin/dashboard?tab=inquiries"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="user-dropdown-item"
                          >
                            <History className="user-dropdown-icon" />
                            <span>Inquiries & Audit</span>
                          </Link>
                        </>
                      ) : (
                        <>
                          <Link
                            to="/portal"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="user-dropdown-item"
                          >
                            <User className="user-dropdown-icon" />
                            <span>Profile</span>
                          </Link>

                          <Link
                            to="/portal?tab=bookings"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="user-dropdown-item"
                          >
                            <Calendar className="user-dropdown-icon" />
                            <span>Your Bookings</span>
                          </Link>

                          <Link
                            to="/portal?tab=payments"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="user-dropdown-item"
                          >
                            <CreditCard className="user-dropdown-icon" />
                            <span>Payments</span>
                          </Link>

                          <Link
                            to="/portal?tab=history"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="user-dropdown-item"
                          >
                            <History className="user-dropdown-icon" />
                            <span>Booking History</span>
                          </Link>

                          <Link
                            to="/portal?tab=wishlist"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="user-dropdown-item"
                          >
                            <Heart className="user-dropdown-icon" />
                            <span>Wishlist</span>
                          </Link>

                          <Link
                            to="/portal?tab=settings"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="user-dropdown-item"
                          >
                            <Settings className="user-dropdown-icon" />
                            <span>Settings</span>
                          </Link>
                        </>
                      )}
                    </div>

                    {/* LOGOUT */}
                    <div className="user-dropdown-footer">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="user-dropdown-logout"
                      >
                        <LogOut className="w-[17px] h-[17px]" />
                        <span>Logout</span>
                      </button>
                    </div>

                  </div>
                )}

              </div>
            ) : (
              <Link
                to="/login"
                className="sign-in-link"
              >
                Sign In
              </Link>
            )}


            {/* =================================================
                BOOK NOW
            ================================================== */}

            <button
              type="button"
              onClick={() => openWizard()}
              aria-label="Book a wedding photography package"
              className="book-now-btn"
            >

              <span className="book-now-shine pointer-events-none absolute inset-0"></span>

              <span className="book-now-inner-glow pointer-events-none absolute inset-0 rounded-full"></span>

              <span className="relative z-10">
                Book Now
              </span>

            </button>


            {/* =================================================
                WHATSAPP ICON
                IMAGE FROM /public/whatsapp.png
            ================================================== */}

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="whatsapp-icon-button"
              aria-label="Chat with Anmol VideoGraphy on WhatsApp"
              title="Chat on WhatsApp"
            >

              <span className="whatsapp-icon-shine"></span>

              <img
                src="/whatsapp.png"
                alt="WhatsApp"
                className="whatsapp-icon-image"
              />

            </a>

          </div>


          {/* =====================================================
              MOBILE HEADER
          ====================================================== */}

          <div className="flex lg:hidden items-center gap-2 ml-auto">

            {user && (
              <button
                type="button"
                onClick={() =>
                  setIsUserMenuOpen((previous) => !previous)
                }
                className="p-2 text-charcoal-800"
                aria-label="Account"
              >
                <UserCircle className="w-6 h-6" />
              </button>
            )}


            {isManagerOrOwner && (
              <button
                type="button"
                onClick={() =>
                  navigate('/admin/dashboard?tab=notifications')
                }
                className="relative p-2 text-charcoal-700"
                aria-label="Notifications"
              >

                <Bell className="w-5 h-5" />

                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-600 rounded-full"></span>
                )}

              </button>
            )}


            <button
              type="button"
              onClick={() =>
                setIsMobileMenuOpen((previous) => !previous)
              }
              className="p-2 text-charcoal-800"
              aria-label="Toggle navigation menu"
            >

              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}

            </button>

          </div>

        </div>

      </div>


      {/* =========================================================
          MOBILE MENU
      ========================================================== */}

      {isMobileMenuOpen && (
        <div className="lg:hidden bg-ivory-50 border-b border-blue-200/30 px-5 pt-4 pb-6 shadow-lg">

          <div className="flex flex-col gap-1">

            <Link
              to="/"
              onClick={closeMobileMenu}
              className="mobile-nav-link"
            >
              Home
            </Link>

            <Link
              to="/about"
              onClick={closeMobileMenu}
              className="mobile-nav-link"
            >
              About Us
            </Link>

            <Link
              to="/services"
              onClick={closeMobileMenu}
              className="mobile-nav-link"
            >
              Services
            </Link>

            <Link
              to="/packages"
              onClick={closeMobileMenu}
              className="mobile-nav-link"
            >
              Packages
            </Link>

            <Link
              to="/portfolio"
              onClick={closeMobileMenu}
              className="mobile-nav-link"
            >
              Portfolio
            </Link>

            <Link
              to="/contact"
              onClick={closeMobileMenu}
              className="mobile-nav-link"
            >
              Contact
            </Link>

            <Link
              to="/track"
              onClick={closeMobileMenu}
              className="mobile-nav-link text-blue-600"
            >
              Track Booking
            </Link>

          </div>


          {/* MOBILE ACCOUNT */}
          {user && (
            <div className="mt-4 pt-4 border-t border-blue-100">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs uppercase tracking-wider text-charcoal-400 font-semibold">
                  {isManagerOrOwner ? 'Studio Administration' : 'My Account'}
                </p>
                {isManagerOrOwner && (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                    {user?.role === 'owner' ? 'Owner' : 'Admin'}
                  </span>
                )}
              </div>

              {isManagerOrOwner ? (
                <>
                  <Link
                    to="/admin/dashboard"
                    onClick={closeMobileMenu}
                    className="mobile-account-link"
                  >
                    <Shield className="w-4 h-4" />
                    Dashboard Overview
                  </Link>

                  <Link
                    to="/admin/dashboard?tab=bookings"
                    onClick={closeMobileMenu}
                    className="mobile-account-link"
                  >
                    <Calendar className="w-4 h-4" />
                    Manage Bookings
                  </Link>

                  <Link
                    to="/admin/dashboard?tab=packages"
                    onClick={closeMobileMenu}
                    className="mobile-account-link"
                  >
                    <Package className="w-4 h-4" />
                    Packages & Pricing
                  </Link>

                  <Link
                    to="/admin/dashboard?tab=availability"
                    onClick={closeMobileMenu}
                    className="mobile-account-link"
                  >
                    <Clock className="w-4 h-4" />
                    Availability & Resources
                  </Link>

                  <Link
                    to="/admin/dashboard?tab=settings"
                    onClick={closeMobileMenu}
                    className="mobile-account-link"
                  >
                    <Settings className="w-4 h-4" />
                    Studio Settings
                  </Link>

                  <Link
                    to="/admin/dashboard?tab=inquiries"
                    onClick={closeMobileMenu}
                    className="mobile-account-link"
                  >
                    <History className="w-4 h-4" />
                    Inquiries & Audit
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/portal"
                    onClick={closeMobileMenu}
                    className="mobile-account-link"
                  >
                    <User className="w-4 h-4" />
                    Profile
                  </Link>

                  <Link
                    to="/portal?tab=bookings"
                    onClick={closeMobileMenu}
                    className="mobile-account-link"
                  >
                    <Calendar className="w-4 h-4" />
                    Your Bookings
                  </Link>

                  <Link
                    to="/portal?tab=payments"
                    onClick={closeMobileMenu}
                    className="mobile-account-link"
                  >
                    <CreditCard className="w-4 h-4" />
                    Payments
                  </Link>

                  <Link
                    to="/portal?tab=history"
                    onClick={closeMobileMenu}
                    className="mobile-account-link"
                  >
                    <History className="w-4 h-4" />
                    Booking History
                  </Link>

                  <Link
                    to="/portal?tab=wishlist"
                    onClick={closeMobileMenu}
                    className="mobile-account-link"
                  >
                    <Heart className="w-4 h-4" />
                    Wishlist
                  </Link>

                  <Link
                    to="/portal?tab=settings"
                    onClick={closeMobileMenu}
                    className="mobile-account-link"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </Link>
                </>
              )}

              <button
                type="button"
                onClick={() => {
                  closeMobileMenu();
                  handleLogout();
                }}
                className="mobile-account-link text-red-600 mt-2"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          )}


          {!user && (
            <Link
              to="/login"
              onClick={closeMobileMenu}
              className="mobile-sign-in"
            >
              Sign In
            </Link>
          )}


          {/* MOBILE CTA */}

          <div className="mt-5 pt-4 border-t border-blue-100 flex flex-col gap-3">

            {/* BOOK NOW FIRST */}

            <button
              type="button"
              onClick={handleMobileBookNow}
              className="book-now-btn w-full"
            >

              <span className="book-now-shine pointer-events-none absolute inset-0"></span>

              <span className="book-now-inner-glow pointer-events-none absolute inset-0 rounded-full"></span>

              <span className="relative z-10">
                Book Now
              </span>

            </button>


            {/* WHATSAPP SECOND */}

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={closeMobileMenu}
              className="whatsapp-mobile-button"
              aria-label="Chat on WhatsApp"
            >

              <img
                src="/whatsapp.png"
                alt="WhatsApp"
                className="whatsapp-mobile-image"
              />

              <span>
                Chat on WhatsApp
              </span>

            </a>

          </div>

        </div>
      )}

    </header>
  );
};