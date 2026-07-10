const fs = require('fs');
const p = 'src/components/booking/OwnerDashboard.tsx';
let txt = fs.readFileSync(p, 'utf8');

// Add state
txt = txt.replace(
  'const [selectedBookingForDetails, setSelectedBookingForDetails] = useState<Booking | null>(null);',
  'const [selectedBookingForDetails, setSelectedBookingForDetails] = useState<Booking | null>(null);\n  const [selectedBookingForVerifications, setSelectedBookingForVerifications] = useState<Booking | null>(null);'
);

// Add button
txt = txt.replace(
  /<button\n\s*onClick=\{\(\) => setSelectedBookingForDetails\(b\)\}/g,
  '<div className="flex items-center gap-2 mt-1.5">\n                  <button\n                    onClick={() => setSelectedBookingForDetails(b)}'
);

txt = txt.replace(
  /                    Détails\n                  <\/button>/g,
  '                    Détails\n                  </button>\n                  <button\n                    onClick={() => setSelectedBookingForVerifications(b)}\n                    className="flex items-center gap-1 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer w-fit p-1 px-1.5"\n                  >\n                    <ShieldAlert size={12} />\n                    Vérifications\n                  </button>\n                  </div>'
);

// Add modal rendering
const modalCode = `
      {/* Verifications Modal */}
      <AnimatePresence>
        {selectedBookingForVerifications && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setSelectedBookingForVerifications(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg bg-white rounded-[32px] shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 sm:p-8 flex-1 overflow-y-auto">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Vérifications Requises</h3>
                    <p className="text-sm font-semibold text-slate-500">Validez les documents du client.</p>
                  </div>
                  <button 
                    onClick={() => setSelectedBookingForVerifications(null)}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
                
                <BookingVerificationSection 
                  bookingId={selectedBookingForVerifications.id}
                  clientId={selectedBookingForVerifications.clientId}
                  isPast={isPast || selectedBookingForVerifications.bookingStatus === 'completed'}
                  canEdit={user?.uid === selectedBookingForVerifications.ownerId || user?.role === 'admin'}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
`;

txt = txt.replace(
  '      {/* Details Modal */}',
  modalCode + '\n      {/* Details Modal */}'
);

fs.writeFileSync(p, txt);
