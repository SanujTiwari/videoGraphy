import React from 'react';
import { X, Download, FileText, CheckCircle } from 'lucide-react';
export const PDFViewerModal = ({ invoiceNumber, onClose }) => {
    if (!invoiceNumber)
        return null;
    const downloadUrl = `http://localhost:5000/api/invoices/${invoiceNumber}/pdf`;
    return (<div className="fixed inset-0 z-50 bg-charcoal-900/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-ivory-50 border border-gold-400/40 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-5 right-5 text-charcoal-400 hover:text-charcoal-800">
          <X className="w-5 h-5"/>
        </button>

        <div className="flex items-center gap-3 pb-4 border-b border-gold-200">
          <div className="w-10 h-10 rounded-full gold-gradient-bg flex items-center justify-center text-white">
            <FileText className="w-5 h-5"/>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-gold-500">Official Studio Document</span>
            <h3 className="font-serif text-xl font-bold text-charcoal-900">Invoice #{invoiceNumber}</h3>
          </div>
        </div>

        <div className="py-6 space-y-4 text-xs text-charcoal-700 text-center">
          <div className="p-6 bg-white rounded-2xl border border-gold-200 shadow-sm space-y-3">
            <CheckCircle className="w-10 h-10 text-gold-500 mx-auto"/>
            <h4 className="font-serif text-lg font-bold text-charcoal-900">PDF Invoice Ready for Download</h4>
            <p className="text-charcoal-500 text-xs">
              Includes Anmol VideoGraphy branding, itemized services, advance paid, GST tax calculations, and cancellation policy.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button onClick={onClose} className="text-xs font-semibold text-charcoal-600 px-4 py-2">
            Close
          </button>

          <a href={downloadUrl} target="_blank" rel="noreferrer" className="gold-gradient-bg text-white font-bold text-xs px-6 py-3 rounded-full shadow-gold-glow flex items-center gap-2 hover:scale-105 transition-all">
            <Download className="w-4 h-4"/> Download Official PDF Invoice
          </a>
        </div>
      </div>
    </div>);
};
