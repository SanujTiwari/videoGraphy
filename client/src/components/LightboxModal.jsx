import React from 'react';
import { X, Play, Camera } from 'lucide-react';
export const LightboxModal = ({ item, onClose }) => {
    if (!item)
        return null;
    return (<div className="fixed inset-0 z-50 bg-charcoal-900/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      <button onClick={onClose} className="absolute top-6 right-6 text-white/70 hover:text-white bg-white/10 p-2.5 rounded-full backdrop-blur-md transition-colors">
        <X className="w-6 h-6"/>
      </button>

      <div className="max-w-5xl w-full bg-charcoal-900 border border-gold-400/30 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row">
        
        {/* Media Preview Container */}
        <div className="md:w-3/4 bg-black flex items-center justify-center min-h-[250px] sm:min-h-[350px] max-h-[50vh] md:max-h-[75vh] relative">
          {item.media_type === 'video' ? (<div className="relative w-full h-full flex items-center justify-center">
              <video src={item.url} controls autoPlay className="max-h-[50vh] md:max-h-[75vh] w-full object-contain" poster={item.thumbnail_url}/>
            </div>) : (<img src={item.url} alt={item.title} className="max-h-[50vh] md:max-h-[75vh] w-full object-contain"/>)}
        </div>

        {/* Media Info Sidebar */}
        <div className="md:w-1/4 p-6 flex flex-col justify-between border-t md:border-t-0 md:border-l border-gold-400/20 bg-charcoal-900 text-white">
          <div className="space-y-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gold-400 gold-gradient-bg/20 px-3 py-1 rounded-full border border-gold-400/30 inline-block">
              {item.category}
            </span>
            <h3 className="font-serif text-2xl font-bold">{item.title}</h3>
            {item.description && (<p className="text-xs text-charcoal-300 leading-relaxed">{item.description}</p>)}
            
            <div className="pt-4 border-t border-charcoal-800 text-xs text-charcoal-400 space-y-1">
              <p className="flex items-center gap-2">
                {item.media_type === 'video' ? <Play className="w-3.5 h-3.5 text-gold-400"/> : <Camera className="w-3.5 h-3.5 text-gold-400"/>}
                <span>Captured by Anmol Master Film Crew</span>
              </p>
              <p>4K Ultra-HD Master Delivery</p>
            </div>
          </div>

          <div className="pt-6">
            <button onClick={onClose} className="w-full gold-gradient-bg text-white font-semibold text-xs py-2.5 rounded-full shadow-gold-glow">
              Close Gallery View
            </button>
          </div>
        </div>

      </div>
    </div>);
};
