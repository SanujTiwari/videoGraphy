import React from 'react';
import { Link } from 'react-router-dom';
import { Camera, Phone, Mail, MapPin, MessageCircle, Heart } from 'lucide-react';

// Crisp official vector logos for social platforms
const InstagramIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
  </svg>
);

const FacebookIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const YoutubeIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

export const Footer = () => {
    return (
      <footer className="bg-charcoal-900 text-ivory-100 pt-16 pb-8 border-t border-gold-400/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12 mb-12">
            
            {/* Brand Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full gold-gradient-bg flex items-center justify-center text-white shadow-md">
                  <Camera className="w-5 h-5"/>
                </div>
                <span className="font-serif text-2xl font-bold text-white tracking-wide">
                  Anmol <span className="gold-gradient-text">VideoGraphy</span>
                </span>
              </div>
              <p className="text-charcoal-300 text-sm leading-relaxed">
                Capturing eternal wedding memories with cinematic film craft, grand aerial views, and candid photo storytelling across Jharkhand and India.
              </p>
              
              {/* Social Media Links with authentic logos */}
              <div className="flex items-center space-x-3 pt-2">
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Instagram"
                  title="Follow us on Instagram"
                  className="w-10 h-10 rounded-full bg-charcoal-800 border border-gold-400/20 flex items-center justify-center text-gold-400 hover:text-white hover:bg-gradient-to-tr hover:from-amber-600 hover:via-rose-600 hover:to-purple-600 hover:border-transparent transition-all shadow-sm"
                >
                  <InstagramIcon className="w-5 h-5"/>
                </a>
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Facebook"
                  title="Connect on Facebook"
                  className="w-10 h-10 rounded-full bg-charcoal-800 border border-gold-400/20 flex items-center justify-center text-gold-400 hover:text-white hover:bg-[#1877F2] hover:border-transparent transition-all shadow-sm"
                >
                  <FacebookIcon className="w-4 h-4"/>
                </a>
                <a
                  href="https://youtube.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="YouTube"
                  title="Watch our films on YouTube"
                  className="w-10 h-10 rounded-full bg-charcoal-800 border border-gold-400/20 flex items-center justify-center text-gold-400 hover:text-white hover:bg-[#FF0000] hover:border-transparent transition-all shadow-sm"
                >
                  <YoutubeIcon className="w-5 h-5"/>
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div className="space-y-4">
              <h4 className="font-serif text-lg font-semibold text-gold-400 border-b border-gold-400/20 pb-2">Quick Navigation</h4>
              <ul className="space-y-2.5 text-sm text-charcoal-300">
                <li><Link to="/" className="hover:text-gold-400 transition-colors">Home Page</Link></li>
                <li><Link to="/about" className="hover:text-gold-400 transition-colors">About Anmol Studio</Link></li>
                <li><Link to="/services" className="hover:text-gold-400 transition-colors">Wedding Services</Link></li>
                <li><Link to="/packages" className="hover:text-gold-400 transition-colors">Our Packages</Link></li>
                <li><Link to="/portfolio" className="hover:text-gold-400 transition-colors">Portfolio & Films</Link></li>
                <li><Link to="/track" className="hover:text-gold-400 transition-colors">Track Booking Status</Link></li>
              </ul>
            </div>

            {/* Dedicated Services */}
            <div className="space-y-4">
              <h4 className="font-serif text-lg font-semibold text-gold-400 border-b border-gold-400/20 pb-2">Our Specializations</h4>
              <ul className="space-y-2.5 text-sm text-charcoal-300">
                <li>Cinematic Wedding Films</li>
                <li>Candid Ritual Photography</li>
                <li>Pre-Wedding Storytelling</li>
                <li>4K Aerial Drone Shoots</li>
                <li>Multi-Cam Live Streaming</li>
                <li>Handcrafted Flush Mount Albums</li>
              </ul>
            </div>

            {/* Contact Details */}
            <div className="space-y-4">
              <h4 className="font-serif text-lg font-semibold text-gold-400 border-b border-gold-400/20 pb-2">Studio Contact</h4>
              <div className="space-y-3 text-sm text-charcoal-300">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gold-400 shrink-0 mt-0.5"/>
                  <span>Kanhachatti, Chatra, Jharkhand</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-gold-400 shrink-0"/>
                  <a href="tel:+918383813876" className="hover:text-gold-400 transition-colors">
                    +91 8383813876
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-gold-400 shrink-0"/>
                  <a href="mailto:contact@anmolvideography.com" className="hover:text-gold-400 transition-colors">
                    contact@anmolvideography.com
                  </a>
                </div>
                <a
                  href="https://wa.me/918383813876"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 mt-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold tracking-wider uppercase transition-all shadow-sm"
                >
                  <MessageCircle className="w-4 h-4"/>
                  <span>WhatsApp Direct Chat</span>
                </a>
              </div>
            </div>

          </div>

          {/* Bottom copyright */}
          <div className="pt-8 border-t border-charcoal-800 text-center text-xs text-charcoal-400 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p>© {new Date().getFullYear()} Anmol VideoGraphy. All Rights Reserved.</p>
            <p className="flex items-center gap-1">
              Crafted with <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500"/> for Eternal Royal Weddings
            </p>
          </div>

        </div>
      </footer>
    );
};
