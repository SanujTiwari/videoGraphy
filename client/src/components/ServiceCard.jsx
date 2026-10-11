import React from 'react';
import { Clock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useBooking } from '../context/BookingContext';
export const ServiceCard = ({ id, title, category, description, starting_price, duration_hours, image_url, features = [], }) => {
    const { openWizard } = useBooking();
    return (<div className="group bg-white rounded-3xl overflow-hidden border border-gold-300/30 shadow-sm hover:shadow-2xl transition-all duration-300 flex flex-col justify-between hover:-translate-y-1.5">
      <div>
        {/* Service Image with Category Pill */}
        <div className="relative h-60 overflow-hidden">
          <img src={image_url} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"/>
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/80 via-transparent to-transparent"></div>
          <span className="absolute top-4 left-4 text-[10px] font-bold uppercase tracking-widest text-white gold-gradient-bg px-3 py-1 rounded-full shadow-md">
            {category}
          </span>
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white">
            <span className="text-xs font-semibold flex items-center gap-1 bg-charcoal-900/60 backdrop-blur-md px-2.5 py-1 rounded-full">
              <Clock className="w-3.5 h-3.5 text-gold-400"/> {duration_hours} Hrs Session
            </span>
            <span className="font-serif text-lg font-bold text-gold-300">
              Starts ₹{starting_price.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Details */}
        <div className="p-6 space-y-4">
          <h3 className="font-serif text-2xl font-bold text-charcoal-900 group-hover:text-gold-600 transition-colors">
            {title}
          </h3>
          <p className="text-xs text-charcoal-600 leading-relaxed min-h-[48px]">
            {description}
          </p>

          {features.length > 0 && (<div className="space-y-1.5 pt-2">
              {features.slice(0, 3).map((feat, i) => (<div key={i} className="flex items-center gap-2 text-xs text-charcoal-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-gold-500 shrink-0"/> {feat}
                </div>))}
            </div>)}
        </div>
      </div>

      <div className="p-6 pt-0">
        <button onClick={() => openWizard()} className="w-full bg-ivory-100 hover:bg-gold-500 hover:text-white text-charcoal-800 font-semibold text-xs py-3 rounded-full border border-gold-400/40 transition-all duration-300 flex items-center justify-center gap-2 group-hover:border-gold-500 shadow-sm">
          Book {title} <ArrowRight className="w-4 h-4"/>
        </button>
      </div>
    </div>);
};
