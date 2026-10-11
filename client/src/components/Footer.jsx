import React from 'react';
import { Link } from 'react-router-dom';
import { Camera, Phone, Mail, MapPin, Share2, Globe, Play, Heart } from 'lucide-react';
export const Footer = () => {
    return (<footer className="bg-charcoal-900 text-ivory-100 pt-16 pb-8 border-t border-gold-400/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12 mb-12">
          
          {/* Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full gold-gradient-bg flex items-center justify-center text-white">
                <Camera className="w-5 h-5"/>
              </div>
              <span className="font-serif text-2xl font-bold text-white">
                Anmol <span className="gold-gradient-text">VideoGraphy</span>
              </span>
            </div>
            <p className="text-charcoal-300 text-sm leading-relaxed">
              Capturing eternal wedding memories with cinematic film craft, grand aerial views, and candid photo storytelling across India.
            </p>
            <div className="flex items-center space-x-4 pt-2">
              <a href="https://instagram.com" target="_blank" rel="noreferrer" className="w-9 h-9 rounded-full bg-charcoal-800 flex items-center justify-center text-gold-400 hover:bg-gold-500 hover:text-white transition-colors">
                <Share2 className="w-4 h-4"/>
              </a>
              <a href="https://facebook.com" target="_blank" rel="noreferrer" className="w-9 h-9 rounded-full bg-charcoal-800 flex items-center justify-center text-gold-400 hover:bg-gold-500 hover:text-white transition-colors">
                <Globe className="w-4 h-4"/>
              </a>
              <a href="https://youtube.com" target="_blank" rel="noreferrer" className="w-9 h-9 rounded-full bg-charcoal-800 flex items-center justify-center text-gold-400 hover:bg-gold-500 hover:text-white transition-colors">
                <Play className="w-4 h-4"/>
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
                <span>101 Royal Wedding Square, Studio Road, City Center</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-gold-400 shrink-0"/>
                <span>+91 98765 43210</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-gold-400 shrink-0"/>
                <span>contact@anmolvideography.com</span>
              </div>
              <a href="https://wa.me/919876543210" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-semibold tracking-wider uppercase transition-colors">
                WhatsApp Direct Chat
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
    </footer>);
};
