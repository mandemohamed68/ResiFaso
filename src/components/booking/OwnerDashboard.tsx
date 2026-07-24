import { CustomDatePicker } from "../common/CustomDatePicker";
import { formatCurrency } from '../../utils/currency';
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useDataRefresh } from '../../contexts/DataRefreshContext';
import { apiFetch } from '../../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  useOwnerResidences, 
  useOwnerBookings, 
  useOwnerWithdrawals, 
  useGlobalSettings,
  useUserProfile
} from '../../hooks/useQueries';
import { queryClient as globalQueryClient } from '../../lib/queryClient';
import { 
  getOwnerResidences, 
  getOwnerBookings, 
  createResidence, 
  updateResidence, 
  updateBookingStatus, 
  deleteResidence,
  sendNotification,
  createWithdrawalRequest,
  getOwnerWithdrawals,
  getBackendDbType,
  getAllResidences,
  getAllBookings,
  updateUserProfile,
  getGlobalSettings,
  markNotificationAsRead,
  markAllNotificationsAsRead
} from '../../lib/db';
import { CustomSelect } from '../common/CustomSelect';
import { Message, Conversation, Residence, Booking, WithdrawalRequest, MobileMoneyProvider } from '../../types';
import { BURKINA_LOCATIONS } from '../../constants/locations';
import { useLocations } from '../../hooks/useLocations';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatDateFr } from '../../lib/utils';
import { 
  BarChart3, Plus, Home, CalendarCheck, Wallet, ArrowRight, ArrowLeft, 
  Upload, Trash2, Eye, ShieldAlert, ShieldCheck, Check, X, RefreshCw, Layers, Pencil,
  MessageSquare, Send, Star, Percent, History, Clock, Filter, Download,
  ChevronLeft, ChevronRight, Compass
} from 'lucide-react';
import { resizeImage } from '../../lib/imageResize';
import { InvoiceModal } from './InvoiceModal';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { BookingVerificationSection } from './BookingVerificationSection';
import { RoleGuide } from '../common/RoleGuide';


const formatPaymentStatus = (status?: string) => {
  if (!status) return 'NON PAYÉ';
  switch (status.toLowerCase()) {
    case 'fully_paid':
      return 'SOLDÉ';
    case 'advance_paid':
      return 'ACOMPTE PAYÉ';
    case 'pending':
      return 'EN ATTENTE';
    case 'failed':
      return 'ÉCHOUÉ';
    default:
      return status.toUpperCase();
  }
};

// Fix Leaflet icons
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const MapContainerAny = MapContainer as any;
const TileLayerAny = TileLayer as any;

function LocationMarker({ position, onChange }: { position: { lat: number, lng: number }, onChange: (pos: { lat: number, lng: number }) => void }) {
  useMapEvents({
    click(e) {
      onChange(e.latlng);
      // Optional: reverse geocoding logic could fetch address here
    },
  });

  return position ? (
    <Marker position={[position.lat, position.lng]} />
  ) : null;
}

const reverseGeocode = async (lat: number, lng: number) => {
  try {
    const resp = await apiFetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
    const data = await resp.json();
    return data;
  } catch (err) {
    console.error("Reverse geocode error:", err);
    return null;
  }
};

interface ResidenceHistoryModalProps {
  residenceId: string;
  residences: Residence[];
  bookings: Booking[];
  onClose: () => void;
}

const ResidenceHistoryModal: React.FC<ResidenceHistoryModalProps> = ({ residenceId, residences, bookings, onClose }) => {
  const [filter, setFilter] = useState({ start: '', end: '' });
  const residence = residences.find(r => r.id === residenceId);
  const residenceBookings = bookings.filter(b => b.residenceId === residenceId);

  const filteredBookings = residenceBookings.filter(b => {
    if (!filter.start && !filter.end) return true;
    const checkIn = new Date(b.checkIn);
    if (filter.start && checkIn < new Date(filter.start)) return false;
    if (filter.end && checkIn > new Date(filter.end)) return false;
    return true;
  });

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-xl font-black text-slate-900">Historique & Programme</h3>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{residence?.title}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 border-b border-slate-50 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Filter size={10} /> Date Début
            </label>
            <CustomDatePicker 
              value={filter.start}
              onChange={(val) => setFilter(prev => ({ ...prev, start: val }))}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-900 focus-within:ring-2 focus-within:ring-red-600 outline-none transition-all"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Filter size={10} /> Date Fin
            </label>
            <CustomDatePicker 
              value={filter.end}
              onChange={(val) => setFilter(prev => ({ ...prev, end: val }))}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-900 focus-within:ring-2 focus-within:ring-red-600 outline-none transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {filteredBookings.length === 0 ? (
            <div className="text-center py-12">
              <Clock size={40} className="mx-auto text-slate-200 mb-4" />
              <p className="text-slate-400 font-bold">Aucune réservation trouvée pour cette période.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBookings.map(b => (
                <div key={b.id} className="flex flex-col md:flex-row items-center justify-between p-5 border border-slate-100 rounded-2xl bg-white hover:border-red-100 transition-all gap-4">
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                      new Date(b.checkOut) < new Date() ? "bg-slate-50 text-slate-400" : "bg-red-50 text-red-600"
                    )}>
                      <CalendarCheck size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-black text-slate-900">Du {formatDateFr(b.checkIn)} au {formatDateFr(b.checkOut)}</span>
                        {new Date(b.checkOut) < new Date() ? (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[8px] font-black uppercase">Terminé</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded text-[8px] font-black uppercase">Prévu</span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Voyageur: {b.clientName || b.clientId.slice(0, 8)} &bull; {b.guests} Voyageurs</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-4 md:pt-0">
                    <div className="text-right">
                      <span className="block text-[10px] text-slate-400 font-black uppercase tracking-widest">Montant Total</span>
                      <span className="font-black text-slate-900">{formatCurrency(b.totalPrice)} F CFA</span>
                    </div>
                    <div className="text-right border-l border-slate-100 pl-6">
                      <span className="block text-[10px] text-slate-400 font-black uppercase tracking-widest">Status Paiement</span>
                      <span className={cn(
                        "text-[10px] font-black uppercase",
                        b.paymentStatus === 'fully_paid' ? "text-green-600" : "text-amber-600"
                      )}>
                        {b.paymentStatus === 'fully_paid' ? 'Soldé (100%)' : `Avance: ${formatCurrency(b.advancePaid)} F`}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
            {filteredBookings.length} Réservation(s) affichée(s)
          </p>
        </div>
      </motion.div>
    </div>
  );
};

interface BookingTableProps {
  bookings: Booking[];
  handleApprove: (b: Booking) => void;
  handleDecline: (b: Booking) => void;
  handleMarkAsPaid: (b: Booking) => void;
  handleStartStay: (b: Booking) => void;
  handleEndStay: (b: Booking) => void;
  residences: Residence[];
  isPast?: boolean;
  isProcessingPayment?: string | null;
  onUpdateBooking?: (updatedBooking: Booking) => void;
}

const BookingTable: React.FC<BookingTableProps> = ({ 
  bookings, 
  handleApprove, 
  handleDecline, 
  handleMarkAsPaid, 
  handleStartStay,
  handleEndStay,
  residences, 
  isPast,
  isProcessingPayment,
  onUpdateBooking
}) => {
  const { user } = useAuth();
  const [selectedBookingForDetails, setSelectedBookingForDetails] = useState<Booking | null>(null);
  const [selectedBookingForVerifications, setSelectedBookingForVerifications] = useState<Booking | null>(null);
  const [selectedBookingForInvoice, setSelectedBookingForInvoice] = useState<Booking | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [bookings.length]);

  useEffect(() => {
    const handleOpenBooking = (e: Event) => {
      const customEvent = e as CustomEvent;
      const bookingId = customEvent.detail;
      const target = bookings.find(b => b.id === bookingId);
      if (target) {
        setSelectedBookingForDetails(target);
      }
    };

    window.addEventListener('openBookingDetails', handleOpenBooking);
    return () => window.removeEventListener('openBookingDetails', handleOpenBooking);
  }, [bookings]);

  return (
    <div className="w-full">
      {/* Mobile list view - visible only on small screens */}
      <div className="block md:hidden divide-y divide-slate-100">
        {bookings.slice((currentPage - 1) * 50, currentPage * 50).map(b => {
           const res = residences.find(r => r.id === b.residenceId);
           let verifStatus: Record<string, boolean> = {};
           try {
             if (b.verificationsStatus) {
               verifStatus = typeof b.verificationsStatus === 'string'
                 ? JSON.parse(b.verificationsStatus)
                 : b.verificationsStatus;
             }
           } catch (e) {
             console.error(e);
           }
           const requiredIds = ['id_valid', 'age_check', 'name_match', 'contract_sign'];
           const allVerified = requiredIds.every(id => !!verifStatus[id]);

           return (
             <div key={b.id} className="p-5 space-y-4">
               {/* Top info and status */}
               <div className="flex justify-between items-start">
                 <div>
                   <span className="block font-black text-slate-900 text-xs sm:text-sm">ID: {b.id.slice(0, 8)}</span>
                   <span className="text-[10px] text-slate-400 font-bold uppercase block mt-0.5">Voyageur: {b.clientName || b.clientPhone || b.clientId.slice(0, 5)}</span>
                 </div>
                 <div className="flex flex-col gap-1 items-end">
                   {b.bookingStatus === 'pending' && <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-[9px] font-black uppercase">En Attente</span>}
                   {b.bookingStatus === 'confirmed' && <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-[9px] font-black uppercase">Approuvé</span>}
                   {b.bookingStatus === 'cancelled' && <span className="px-2 py-0.5 bg-red-50 text-red-700 rounded-full text-[9px] font-black uppercase">Décliné</span>}
                   {b.bookingStatus === 'completed' && <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-[9px] font-black uppercase">Terminé</span>}
                   {b.stayStatus === 'ongoing' && (
                     <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[8px] font-black uppercase tracking-wider animate-pulse border border-blue-100">➡️ Séjour en cours</span>
                   )}
                   {b.stayStatus === 'completed' && (
                     <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[8px] font-black uppercase tracking-wider">✔️ Séjour achevé</span>
                   )}
                 </div>
               </div>

               {/* Mid content block */}
               <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 text-xs bg-slate-50/50 p-3.5 rounded-2xl border border-slate-100/50">
                 <div>
                   <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest font-mono">Logement</span>
                   <span className="font-bold text-slate-800 block truncate max-w-[130px]">{res?.title || "Logement Supprimé"}</span>
                 </div>
                 <div>
                   <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest font-mono">Financier</span>
                   <span className="block font-black text-slate-950">{formatCurrency(b.totalPrice)} F CFA</span>
                   <span className="block text-[9px] text-slate-500 font-bold uppercase mt-0.5">
                     {b.paymentStatus === 'fully_paid' ? 'Soldé (100%)' : b.paymentStatus === 'advance_paid' ? `Acompte: ${formatCurrency(b.advancePaid)} F` : `Avance due: ${formatCurrency(b.advancePaid)} F`}
                   </span>
                 </div>
                 <div className="col-span-2">
                   <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest font-mono">Dates de séjour</span>
                   <span className="font-semibold text-slate-700">Du {formatDateFr(b.checkIn)} au {formatDateFr(b.checkOut)}</span>
                 </div>
               </div>

               {/* Lower navigation buttons */}
               <div className="flex gap-2">
                 <button
                   onClick={() => setSelectedBookingForDetails(b)}
                   className="flex-1 justify-center items-center gap-1.5 bg-white hover:bg-red-50 hover:text-red-650 border border-slate-200 hover:border-red-100 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer py-2.5 flex"
                 >
                   <Eye size={12} className="text-red-600" />
                   Détails
                 </button>
                 <button
                   onClick={() => setSelectedBookingForVerifications(b)}
                   className={cn(
                     "flex-1 justify-center items-center gap-1.5 border rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer py-2.5 flex",
                     allVerified 
                       ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200" 
                       : "bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200"
                   )}
                 >
                   {allVerified ? <ShieldCheck size={12} className="text-emerald-600" /> : <ShieldAlert size={12} />}
                   Vérifications
                 </button>
               </div>

               {/* Decisive Actions */}
               {!isPast && (
                 <div className="pt-1">
                   {b.bookingStatus === 'pending' ? (
                     <div className="flex gap-2">
                       <button
                         onClick={() => handleApprove(b)}
                         className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white hover:scale-[1.01] rounded-xl transition-all font-black text-xs uppercase flex items-center justify-center gap-1.5 shadow-sm shadow-green-100"
                       >
                         <Check size={14} />
                         Accepter
                       </button>
                       <button
                         onClick={() => handleDecline(b)}
                         className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white hover:scale-[1.01] rounded-xl transition-all font-black text-xs uppercase flex items-center justify-center gap-1.5 shadow-sm shadow-red-100"
                       >
                         <X size={14} />
                         Refuser
                       </button>
                     </div>
                   ) : (
                     <div className="space-y-2">
                       {b.bookingStatus === 'confirmed' && b.paymentStatus !== 'fully_paid' && (
                         <button
                           onClick={() => handleMarkAsPaid(b)}
                           disabled={!!isProcessingPayment}
                           className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm shadow-amber-100"
                         >
                           <Wallet size={14} />
                           {isProcessingPayment === b.id ? 'Traitement...' : 'Confirmer solde'}
                         </button>
                       )}

                       {b.bookingStatus === 'confirmed' && (!b.stayStatus || b.stayStatus === 'pending') && (
                         <button
                           onClick={() => handleStartStay(b)}
                           className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-blue-100"
                         >
                           <ArrowRight size={14} className="text-white animate-pulse" />
                           Débuter séjour
                         </button>
                       )}

                       {b.stayStatus === 'ongoing' && b.bookingStatus !== 'cancelled' && b.bookingStatus !== 'declined' && (
                         <button
                           onClick={() => handleEndStay(b)}
                           className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-indigo-100"
                         >
                           <Check size={14} className="text-white" />
                           Achever séjour
                         </button>
                       )}
                     </div>
                   )}
                 </div>
               )}
             </div>
           );
        })}
      </div>

      {/* Desktop Table Layout - visible only on medium screens and up */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/40">
              <th className="py-5 px-6">ID Voyage</th>
              <th className="py-5 px-6">Logement</th>
              <th className="py-5 px-6">Dates demandées</th>
              <th className="py-5 px-6">Financier</th>
              <th className="py-5 px-6">Statut</th>
              {!isPast && <th className="py-5 px-6 text-center">Actions décisives</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-sm font-bold text-slate-700">
            {bookings.slice((currentPage - 1) * 50, currentPage * 50).map(b => {
               const res = residences.find(r => r.id === b.residenceId);
               let verifStatus: Record<string, boolean> = {};
               try {
                 if (b.verificationsStatus) {
                   verifStatus = typeof b.verificationsStatus === 'string'
                     ? JSON.parse(b.verificationsStatus)
                     : b.verificationsStatus;
                 }
               } catch (e) {
                 console.error(e);
               }
               const requiredIds = ['id_valid', 'age_check', 'name_match', 'contract_sign'];
               const allVerified = requiredIds.every(id => !!verifStatus[id]);

               return (
                <tr key={b.id}>
                  <td className="py-4 px-6">
                    <span className="block font-black text-slate-900">ID: {b.id.slice(0, 8)}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Voyageur: {b.clientName || b.clientPhone || b.clientId.slice(0, 5)}</span>
                    <div className="flex items-center gap-2 mt-1.5">
                    <button
                      onClick={() => setSelectedBookingForDetails(b)}
                      className="flex items-center gap-1 bg-slate-50 hover:bg-red-50 hover:text-red-650 border border-slate-200 hover:border-red-100 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer w-fit p-1 px-1.5"
                    >
                      <Eye size={12} className="text-red-600" />
                      Détails
                    </button>
                    <button
                      onClick={() => setSelectedBookingForVerifications(b)}
                      className={cn(
                        "flex items-center gap-1 border rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer w-fit p-1 px-1.5",
                        allVerified 
                          ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200" 
                          : "bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200"
                      )}
                    >
                      {allVerified ? <ShieldCheck size={12} className="text-emerald-600" /> : <ShieldAlert size={12} />}
                      Vérifications
                    </button>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="block font-bold text-slate-800 text-xs truncate max-w-[150px]">{res?.title || "Logement Supprimé"}</span>
                  </td>
                  <td className="py-4 px-6 font-semibold">
                    Du {formatDateFr(b.checkIn)} au {formatDateFr(b.checkOut)}
                  </td>
                  <td className="py-4 px-6">
                    <span className="block font-black text-slate-950">{formatCurrency(b.totalPrice)} F CFA</span>
                    <div className="flex flex-col">
                      {b.paymentStatus === 'fully_paid' ? (
                        <span className="text-[10px] font-black text-green-600 uppercase">Soldé (100%)</span>
                      ) : b.paymentStatus === 'advance_paid' ? (
                        <span className="text-[10px] font-black text-blue-600 uppercase">Acompte Payé: {formatCurrency(b.advancePaid)} F</span>
                      ) : (
                        <span className="text-[10px] font-black text-red-500 uppercase">Avance Due: {formatCurrency(b.advancePaid)} F</span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex flex-col gap-1 items-start">
                      {b.bookingStatus === 'pending' && <span className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-[9px] font-black uppercase">En Attente</span>}
                      {b.bookingStatus === 'confirmed' && <span className="px-2.5 py-1 bg-green-50 text-green-700 rounded-full text-[9px] font-black uppercase">Approuvé</span>}
                      {b.bookingStatus === 'cancelled' && <span className="px-2.5 py-1 bg-red-50 text-red-700 rounded-full text-[9px] font-black uppercase">Décliné</span>}
                      {b.bookingStatus === 'completed' && <span className="px-2.5 py-1 bg-slate-100 text-slate-500 rounded-full text-[9px] font-black uppercase">Terminé</span>}
                      
                      {b.stayStatus === 'ongoing' && (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[8px] font-black uppercase tracking-wider animate-pulse border border-blue-100">➡️ Séjour en cours</span>
                      )}
                      {b.stayStatus === 'completed' && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[8px] font-black uppercase tracking-wider">✔️ Séjour achevé</span>
                      )}
                    </div>
                  </td>
                  {!isPast && (
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center gap-2">
                      {b.bookingStatus === 'pending' ? (
                        <>
                          <button
                            onClick={() => handleApprove(b)}
                            className="p-2 bg-green-50 text-green-600 border border-green-100 hover:bg-green-100 rounded-xl transition-all"
                            title="Accepter la demande"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={() => handleDecline(b)}
                            className="p-2 bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 rounded-xl transition-all"
                            title="Refuser la demande"
                          >
                            <X size={16} />
                          </button>
                        </>
                      ) : (
                        <div className="flex flex-col gap-1 w-full items-center min-w-[130px]">
                          {b.bookingStatus === 'confirmed' && b.paymentStatus !== 'fully_paid' && (
                            <button
                              onClick={() => handleMarkAsPaid(b)}
                              disabled={!!isProcessingPayment}
                              className="w-full px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-amber-100 transition-all flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer"
                            >
                              <Wallet size={12} />
                              {isProcessingPayment === b.id ? 'Traitement...' : 'Confirmer solde'}
                            </button>
                          )}

                          {b.bookingStatus === 'confirmed' && (!b.stayStatus || b.stayStatus === 'pending') && (
                            <button
                              onClick={() => handleStartStay(b)}
                              className="w-full px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-blue-100 transition-all flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <ArrowRight size={12} className="text-blue-600 animate-pulse" />
                              Débuter séjour
                            </button>
                          )}

                          {b.stayStatus === 'ongoing' && b.bookingStatus !== 'cancelled' && b.bookingStatus !== 'declined' && (
                            <button
                              onClick={() => handleEndStay(b)}
                              className="w-full px-2 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-indigo-100 transition-all flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Check size={12} className="text-indigo-600" />
                              Achever séjour
                            </button>
                          )}

                          {b.bookingStatus === 'completed' && (
                            <span className="text-[10px] text-slate-400 font-extrabold uppercase">Terminé</span>
                          )}
                          {b.bookingStatus === 'cancelled' && (
                            <span className="text-[10px] text-red-500 font-extrabold uppercase">Annulé</span>
                          )}
                        </div>
                      )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination UI for Bookings */}
      {bookings.length > 50 && (
        <div className="flex items-center justify-between border-t border-slate-100 pt-5 px-6">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              disabled={currentPage === 1}
              onClick={() => {
                setCurrentPage(prev => Math.max(prev - 1, 1));
              }}
              className="relative inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition cursor-pointer"
            >
              Précédent
            </button>
            <button
              disabled={currentPage === Math.ceil(bookings.length / 50)}
              onClick={() => {
                setCurrentPage(prev => Math.min(prev + 1, Math.ceil(bookings.length / 50)));
              }}
              className="relative ml-3 inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition cursor-pointer"
            >
              Suivant
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-xs text-slate-500 font-bold">
                Affichage de <span className="font-extrabold text-slate-800">{Math.min((currentPage - 1) * 50 + 1, bookings.length)}</span> à{' '}
                <span className="font-extrabold text-slate-800">{Math.min(currentPage * 50, bookings.length)}</span> sur{' '}
                <span className="font-extrabold text-slate-800">{bookings.length}</span> réservations
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-xl shadow-xs gap-1" aria-label="Pagination">
                <button
                  disabled={currentPage === 1}
                  onClick={() => {
                    setCurrentPage(prev => Math.max(prev - 1, 1));
                  }}
                  className="relative inline-flex items-center rounded-xl border border-slate-150 bg-white p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
                
                {Array.from({ length: Math.ceil(bookings.length / 50) }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setCurrentPage(p);
                    }}
                    className={cn(
                      "relative inline-flex items-center px-3 py-1.5 text-xs font-black rounded-xl border transition cursor-pointer",
                      currentPage === p
                        ? "z-10 bg-red-600 text-white border-red-600 shadow-sm"
                        : "bg-white text-slate-600 border-slate-150 hover:bg-slate-100"
                    )}
                  >
                    {p}
                  </button>
                ))}

                <button
                  disabled={currentPage === Math.ceil(bookings.length / 50)}
                  onClick={() => {
                    setCurrentPage(prev => Math.min(prev + 1, Math.ceil(bookings.length / 50)));
                  }}
                  className="relative inline-flex items-center rounded-xl border border-slate-150 bg-white p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Complete Booking Details Bento Modal */}
      {selectedBookingForDetails && (() => {
        const currentRes = residences.find(r => r.id === selectedBookingForDetails.residenceId);
        return (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedBookingForDetails(null)} />
            <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 text-slate-800 font-sans">
              
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <span className="px-2.5 py-0.5 bg-red-100 text-red-700 rounded text-[9px] font-black uppercase tracking-widest">DÉTAILS COMPLETS DE RÉSERVATION</span>
                  <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight mt-1">Voyage ID: #{selectedBookingForDetails.id.slice(0, 10).toUpperCase()}</h4>
                </div>
                <button 
                  type="button"
                  onClick={() => setSelectedBookingForDetails(null)}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Sec 1: Residence Locality information */}
                  <div className="space-y-3">
                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-1">🏡 Hébergement & Localité</span>
                    <div className="space-y-1">
                      <span className="text-base font-extrabold text-slate-900 block">{currentRes?.title || "Logement Supprimé"}</span>
                      <p className="text-xs text-slate-500 font-bold leading-normal">
                        {currentRes?.address?.street && `${currentRes.address.street === 'Secteur non configuré' ? 'Secteur non précisé' : currentRes.address.street}, `}
                        {currentRes?.address?.neighborhood && `${currentRes.address.neighborhood}, `}
                        <strong className="text-slate-800 font-bold">{currentRes?.address?.city || "Burkina Faso"}</strong>
                      </p>
                      {currentRes?.address?.coordinates && (
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md text-[9px] font-mono font-bold text-slate-500 mt-1">
                          📍 Lat: {currentRes.address.coordinates.lat.toFixed(5)} / Lng: {currentRes.address.coordinates.lng.toFixed(5)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Sec 2: Travelers & Stay Dates info */}
                  <div className="space-y-3">
                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-1">📅 Séjour et Logistique</span>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 font-bold">Arrivée :</span>
                        <strong className="text-slate-900 font-extrabold">{formatDateFr(selectedBookingForDetails.checkIn)}</strong>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 font-bold">Départ :</span>
                        <strong className="text-slate-900 font-extrabold">{formatDateFr(selectedBookingForDetails.checkOut)}</strong>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 font-bold">Voyageurs :</span>
                        <strong className="text-slate-900 font-extrabold">{selectedBookingForDetails.guests || 2} personnes</strong>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 font-bold">Voyageur :</span>
                        <strong className="text-red-600 font-extrabold">{selectedBookingForDetails.clientName || `ID: ${selectedBookingForDetails.clientId?.substring(0,8)}`}</strong>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 font-bold">Créée le :</span>
                        <span className="text-slate-700 font-bold">{selectedBookingForDetails.createdAt ? new Date(selectedBookingForDetails.createdAt).toLocaleString('fr-FR') : "N/A"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Sec 3: Finance structural audit */}
                  <div className="space-y-3 md:col-span-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-1 mb-2">💰 Structure Financière</span>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs font-sans">
                      <div>
                        <span className="text-slate-400 block pb-0.5 font-bold uppercase text-[9px]">Tarif Total</span>
                        <strong className="text-base font-mono font-black text-slate-950">{formatCurrency(selectedBookingForDetails.totalPrice)} F CFA</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block pb-0.5 font-bold uppercase text-[9px]">Acompte Versé</span>
                        <strong className="text-base font-mono font-black text-green-600">{formatCurrency(selectedBookingForDetails.advancePaid)} F CFA</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block pb-0.5 font-bold uppercase text-[9px]">Solde Restant</span>
                        <strong className="text-base font-mono font-black text-red-600">
                          {formatCurrency((selectedBookingForDetails.totalPrice || 0) - (selectedBookingForDetails.advancePaid || 0))} F CFA
                        </strong>
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-slate-205 border-slate-200/50 flex flex-wrap gap-x-6 gap-y-1.5 text-xs text-slate-500 font-medium items-center justify-between">
                      <div className="flex gap-x-6 gap-y-1.5 flex-wrap">
                        <div>Statut Paiement : <span className="text-slate-800 font-black uppercase text-xs bg-slate-200/55 px-2 py-0.5 rounded-md">{formatPaymentStatus(selectedBookingForDetails.paymentStatus)}</span></div>
                        {selectedBookingForDetails.transactionId && (
                          <div>Transaction ID : <span className="font-mono text-slate-800 font-bold">{selectedBookingForDetails.transactionId}</span></div>
                        )}
                      </div>
                      
                      {(selectedBookingForDetails.paymentStatus === 'advance_paid' || selectedBookingForDetails.paymentStatus === 'fully_paid') && selectedBookingForDetails.bookingStatus !== 'cancelled' && (
                        <button 
                          onClick={() => setSelectedBookingForInvoice(selectedBookingForDetails)}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-[10px] uppercase shadow-sm flex items-center gap-1.5 transition-colors"
                        >
                          <Download size={12} />
                          Télécharger Reçu
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Verification Section */}
                  <div className="md:col-span-2 space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4.5 flex gap-3.5 items-start">
                      <div className="bg-amber-500 text-white p-2 rounded-xl shrink-0 mt-0.5">
                        <ShieldAlert size={18} strokeWidth={2.5} />
                      </div>
                      <div className="space-y-1">
                        <span className="block text-xs font-black uppercase text-amber-950 tracking-wider">⚠️ Directive Étatique & Sécurité Hôte</span>
                        <p className="text-[11px] font-bold text-amber-900 leading-normal">
                          <strong>IMPORTANT :</strong> En tant qu'hôte, l'État vous impose d'effectuer rigoureusement toutes les vérifications réglementaires en vigueur (comparaison de la pièce d'identité physique du voyageur avec les détails ci-dessous) <strong>avant de lui remettre formellement les clés</strong> de l'hébergement.
                        </p>
                      </div>
                    </div>

                    <BookingVerificationSection 
                      bookingId={selectedBookingForDetails.id}
                      clientId={selectedBookingForDetails.clientId}
                      isPast={isPast || selectedBookingForDetails.bookingStatus === 'completed'}
                      canEdit={user?.uid === selectedBookingForDetails.ownerId || user?.role === 'admin'}
                      onStatusChange={(newStatus) => {
                        const serialized = JSON.stringify(newStatus);
                        const updatedBk = { ...selectedBookingForDetails, verificationsStatus: serialized };
                        setSelectedBookingForDetails(prev => prev && prev.id === selectedBookingForDetails.id ? updatedBk : prev);
                        if (onUpdateBooking) {
                          onUpdateBooking(updatedBk);
                        }
                      }}
                    />
                  </div>

                  {/* Sec 4: Tracking cancellation and refund if applicable */}
                  {selectedBookingForDetails.bookingStatus === 'cancelled' && (
                    <div className="space-y-3 md:col-span-2 p-4 bg-red-50 border border-red-200/50 rounded-2xl">
                      <span className="block text-[10px] font-black text-red-700 uppercase tracking-widest border-b border-red-100 pb-1">❌ Journal d'Annulation & Remboursement</span>
                      <div className="space-y-2 text-xs">
                        <div className="flex flex-wrap gap-4 text-slate-500">
                          <div>Annulé par : <strong className="text-slate-900 uppercase font-extrabold">{selectedBookingForDetails.cancelledBy === 'client' ? 'Voyageur' : selectedBookingForDetails.cancelledBy === 'owner' ? 'Hôte' : 'Administrateur'}</strong></div>
                          {selectedBookingForDetails.cancelledAt && (
                            <div>Date : <strong className="text-slate-900">{new Date(selectedBookingForDetails.cancelledAt).toLocaleString('fr-FR')}</strong></div>
                          )}
                        </div>
                        {selectedBookingForDetails.cancellationReason && (
                          <p className="text-slate-700 font-bold italic">
                            Motif : <span className="font-normal text-slate-600">"{selectedBookingForDetails.cancellationReason}"</span>
                          </p>
                        )}
                        {selectedBookingForDetails.refundStatus && selectedBookingForDetails.refundStatus !== 'none' && (
                          <div className="pt-2 border-t border-red-100 space-y-2">
                            <span className="block text-[9px] font-black text-slate-450 uppercase tracking-widest">Sûreté de remboursement Mobile Money</span>
                            <div className="flex flex-wrap items-center gap-3">
                              <div className="px-2.5 py-1 bg-white border rounded">
                                Opérateur : <strong className="text-red-650 text-red-600 font-black uppercase">{selectedBookingForDetails.refundProvider}</strong>
                              </div>
                              <div className="px-2.5 py-1 bg-white border rounded">
                                Téléphone : <strong className="font-mono text-slate-900 font-bold">{selectedBookingForDetails.refundPhone}</strong>
                              </div>
                              <div className="px-2.5 py-1 bg-white border rounded">
                                Montant net : <strong className="text-slate-900 font-black">{formatCurrency(selectedBookingForDetails.refundAmount)} F CFA</strong>
                              </div>
                            </div>
                            <div className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded bg-amber-105 bg-amber-100 text-amber-800 border border-amber-200 uppercase tracking-wide">
                              Statut Remboursement : {selectedBookingForDetails.refundStatus === 'refunded' ? '✅ EFFECTUÉ (SOLDÉ)' : '⏳ EN ATTENTE DE TRANSACTION'}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Sec 5: Checkin checkout timestamps timeline */}
                  <div className="space-y-3 md:col-span-2">
                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-1">⏲️ Journal & Horodatage du Séjour</span>
                    <div className="grid grid-cols-2 gap-4 text-xs font-medium text-slate-500">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[9px] font-black text-slate-400 uppercase block pb-1">🔑 Arrivée EFFECTIVE (Check-In)</span>
                        {selectedBookingForDetails.checkedInAt ? (
                          <strong className="text-slate-900 text-xs font-extrabold">{new Date(selectedBookingForDetails.checkedInAt).toLocaleString('fr-FR')}</strong>
                        ) : (
                          <span className="text-slate-400 italic">Non encore enregistré</span>
                        )}
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[9px] font-black text-slate-400 uppercase block pb-1">🚪 Départ EFFECTIF (Check-Out)</span>
                        {selectedBookingForDetails.checkedOutAt ? (
                          <strong className="text-slate-900 text-xs font-bold font-extrabold">{new Date(selectedBookingForDetails.checkedOutAt).toLocaleString('fr-FR')}</strong>
                        ) : (
                          <span className="text-slate-400 italic">Non encore enregistré</span>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
                <button 
                  type="button"
                  onClick={() => setSelectedBookingForDetails(null)}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-red-650 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Fermer l'aperçu
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Focused Verification Modal */}
      {selectedBookingForVerifications && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedBookingForVerifications(null)} />
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 text-slate-800 font-sans">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <span className="px-2.5 py-0.5 bg-red-100 text-red-700 rounded text-[9px] font-black uppercase tracking-widest">Contrôle de Sécurité</span>
                <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight mt-1">Vérifications - Voyage #{selectedBookingForVerifications.id.slice(0, 10).toUpperCase()}</h4>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedBookingForVerifications(null)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <BookingVerificationSection 
                bookingId={selectedBookingForVerifications.id}
                clientId={selectedBookingForVerifications.clientId}
                isPast={selectedBookingForVerifications.bookingStatus === 'completed'}
                canEdit={user?.uid === selectedBookingForVerifications.ownerId || user?.role === 'admin'}
                onStatusChange={(newStatus) => {
                  const serialized = JSON.stringify(newStatus);
                  const updatedBk = { ...selectedBookingForVerifications, verificationsStatus: serialized };
                  if (selectedBookingForDetails?.id === selectedBookingForVerifications.id) {
                    setSelectedBookingForDetails(prev => prev ? { ...prev, verificationsStatus: serialized } : null);
                  }
                  if (onUpdateBooking) {
                    onUpdateBooking(updatedBk);
                  }
                }}
              />
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
              <button 
                type="button"
                onClick={() => setSelectedBookingForVerifications(null)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-red-650 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Fermer
              </button>
            </div>

          </div>
        </div>
      )}

      <InvoiceModal
        isOpen={!!selectedBookingForInvoice}
        onClose={() => setSelectedBookingForInvoice(null)}
        booking={selectedBookingForInvoice}
        residence={selectedBookingForInvoice ? residences.find(r => r.id === selectedBookingForInvoice.residenceId) : null}
        clientName={selectedBookingForInvoice?.clientName || "Voyageur"}
      />
    </div>
  );
};

export const PREDEFINED_TYPES = [
  "Appartement meublé",
  "Villa basse",
  "Villa duplex",
  "Chambre d'hôte",
  "Auberge / Hôtel",
  "Studio moderne",
  "Maison complète",
  "Célibaterium",
  "Loft",
  "Paillote / Bungalow"
];

export const OwnerDashboard: React.FC<{ isTestMode?: boolean; onBackToTraveler?: () => void }> = ({ isTestMode, onBackToTraveler }) => {
  const { user, profile, refreshProfile } = useAuth();
  const { lastRefresh, refreshData } = useDataRefresh();
  const queryClient = useQueryClient();

  const { data: resData, isLoading: resLoading } = useOwnerResidences(user?.uid);
  const { data: bookData, isLoading: bookLoading } = useOwnerBookings(user?.uid);
  const { data: withData } = useOwnerWithdrawals(user?.uid);
  const { data: settingsData } = useGlobalSettings();
  const { data: profileData } = useUserProfile(user?.uid);

  const [residences, setResidences] = useState<Residence[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (resData) {
      const sorted = [...resData].sort((a, b) => 
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
      setResidences(sorted);
    }
  }, [resData]);

  useEffect(() => {
    if (bookData) {
      const sorted = [...bookData].sort((a, b) => 
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
      setBookings(sorted);
    }
  }, [bookData]);

  useEffect(() => {
    setLoading(resLoading || bookLoading);
  }, [resLoading, bookLoading]);
  const [listingsPage, setListingsPage] = useState(1);
  const [withdrawalsPage, setWithdrawalsPage] = useState(1);

  useEffect(() => {
    setListingsPage(1);
  }, [residences.length]);

  useEffect(() => {
    setWithdrawalsPage(1);
  }, [bookings.length]);
  const [activeTab, setActiveTab] = useState<'stats' | 'listings' | 'bookings' | 'revenue' | 'messages' | 'notifications' | 'policy'>('stats');
  const [commissionRate, setCommissionRate] = useState<number>(8);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  
  // Scroll to top when tab changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);
  
  // Real-time notifications and host dynamic cancellation policy settings states
  const [dbNotifications, setDbNotifications] = useState<any[]>([]);
  const [hostCancellationFee, setHostCancellationFee] = useState<number>(1000);
  const [hostCancellationRulesText, setHostCancellationRulesText] = useState<string>('');
  const [isSavingPolicy, setIsSavingPolicy] = useState<boolean>(false);

  // Messaging state
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [participantsInfo, setParticipantsInfo] = useState<Record<string, any>>({});

  // Sync withdrawals and settings from React Query
  useEffect(() => {
    if (withData) setWithdrawals(withData);
  }, [withData]);

  useEffect(() => {
    const s = settingsData as any;
    if (profileData?.commissionPercentage !== undefined) {
      setCommissionRate(profileData.commissionPercentage);
    } else if (s?.commissionRate !== undefined) {
      setCommissionRate(s.commissionRate);
    }
  }, [settingsData, profileData]);

  useEffect(() => {
    if (profileData) {
      if (profileData.hostCancellationFee !== undefined) {
        setHostCancellationFee(Number(profileData.hostCancellationFee));
      }
      if (profileData.hostCancellationRulesText !== undefined) {
        setHostCancellationRulesText(profileData.hostCancellationRulesText);
      }
    }
  }, [profileData]);

  // Withdrawal features states
  const { allLocations } = useLocations();
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [withdrawalAmount, setWithdrawalAmount] = useState<string>('');
  const [withdrawalPhone, setWithdrawalPhone] = useState<string>('');
  const [withdrawalProvider, setWithdrawalProvider] = useState<MobileMoneyProvider>('orange');
  const [withdrawalLoading, setWithdrawalLoading] = useState<boolean>(false);
  const [withdrawalSuccess, setWithdrawalSuccess] = useState<string | null>(null);
  const [withdrawalError, setWithdrawalError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || bookings.length === 0 || residences.length === 0) return;
    
    // Auto-progress bookings
    const autoProcessStays = async () => {
      const today = new Date();
      // Reset hours to compare dates fairly
      today.setHours(0, 0, 0, 0);

      for (const b of bookings) {
        if (b.bookingStatus === 'cancelled') continue;

        const checkInD = new Date(b.checkIn);
        const checkOutD = new Date(b.checkOut);
        
        // Auto Check-in (if confirmed, fully paid or advance paid, and today >= checkIn)
        if (b.bookingStatus === 'confirmed' && (!b.stayStatus || b.stayStatus === 'pending')) {
          if (today >= checkInD) {
            try {
              const res = residences.find(r => r.id === b.residenceId);
              await updateBookingStatus(b.id, {
                stayStatus: 'ongoing',
                checkedInAt: new Date().toISOString()
              });
              await sendNotification({
                userId: b.ownerId,
                title: "🔑 Séjour auto-débuté !",
                message: `Le séjour à la résidence "${res?.title || 'Logement'}" a commencé automatiquement à la date prévue.`,
                type: 'system',
                referenceId: b.id
              });
            } catch (err) {
              console.error("Auto check-in error:", err);
            }
          }
        }
        
        // Auto Check-out (if ongoing, and today >= checkOut)
        if (b.stayStatus === 'ongoing') {
          if (today >= checkOutD) {
            try {
              const res = residences.find(r => r.id === b.residenceId);
              await updateBookingStatus(b.id, {
                stayStatus: 'completed',
                bookingStatus: 'completed',
                checkedOutAt: new Date().toISOString()
              });
              await sendNotification({
                userId: b.ownerId,
                title: "🚪 Séjour auto-terminé !",
                message: `Le séjour à la résidence "${res?.title || 'Logement'}" est arrivé à son terme automatique aujourd'hui.`,
                type: 'system',
                referenceId: b.id
              });
            } catch (err) {
              console.error("Auto check-out error:", err);
            }
          }
        }
      }
    };

    autoProcessStays();
  }, [user, bookings, residences]);

  const [dbType, setDbType] = useState<string>('sql');

  const fetchData = async () => {
    if (!user) return;
    const isInitial = residences.length === 0 && bookings.length === 0;
    if (isInitial) setLoading(true);
    try {
      const type = await getBackendDbType();
      setDbType(type);
      
      const [resList, bookList, withList, settingsData] = await Promise.all([
        getOwnerResidences(user.uid),
        getOwnerBookings(user.uid),
        getOwnerWithdrawals(user.uid),
        getGlobalSettings()
      ]);
      
      if (resList) {
        const sortedRes = (resList || []).sort((a, b) => 
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
        setResidences(sortedRes);
      }
      
      if (bookList) {
        const sortedBookings = (bookList || []).sort((a, b) => 
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
        setBookings(sortedBookings);
      }

      if (withList) {
        setWithdrawals(withList);
      }

      if (settingsData && settingsData.commissionRate !== undefined) {
        setCommissionRate(settingsData.commissionRate);
      }

      // Fetch user profile for policy
      const response = await apiFetch(`/api/users/${user.uid}`);
      if (response.ok) {
        const profile = await response.json();
        if (profile.hostCancellationFee !== undefined) {
          setHostCancellationFee(Number(profile.hostCancellationFee));
        }
        if (profile.hostCancellationRulesText !== undefined) {
          setHostCancellationRulesText(profile.hostCancellationRulesText);
        }
      }

    } catch (err) {
      console.error("Error fetching data:", err);
      // addToast("Erreur lors de la récupération des données.", "error");
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      queryClient.invalidateQueries({ queryKey: ['owner-residences', user?.uid] });
      queryClient.invalidateQueries({ queryKey: ['owner-bookings', user?.uid] });
      queryClient.invalidateQueries({ queryKey: ['owner-withdrawals', user?.uid] });
      queryClient.invalidateQueries({ queryKey: ['user-profile', user?.uid] });
    }
  }, [user, lastRefresh]);

  // Modification/Decline flows
  const [bookingToDecline, setBookingToDecline] = useState<Booking | null>(null);
  const [declineReasonType, setDeclineReasonType] = useState("dates_unavailable");
  const [declineReason, setDeclineReason] = useState("");
  const [isDeclineLoading, setIsDeclineLoading] = useState(false);
  const { addToast } = useToast();

  const triggerSuccess = (message: string) => {
    addToast(message, 'success');
  };

  // Addition flow modal of residence
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step, activeTab]);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('appartement');
  const [selectedCityId, setSelectedCityId] = useState('');
  const [selectedNeighborhoodId, setSelectedNeighborhoodId] = useState('');
  const [street, setStreet] = useState('');
  const [pricePerNight, setPricePerNight] = useState('');
  const [utilitiesIncluded, setUtilitiesIncluded] = useState({ water: false, electricity: false });
  const [pricingTiers, setPricingTiers] = useState<{ minNights: number, pricePerNight: number }[]>([]);
  const [advancePercentage, setAdvancePercentage] = useState(100);
  const [cleaningFee, setCleaningFee] = useState('');
  const [serviceFee, setServiceFee] = useState('0');
  const [useServiceFee, setUseServiceFee] = useState(false);
  const [weeklyDiscount, setWeeklyDiscount] = useState('0');
  const [monthlyDiscount, setMonthlyDiscount] = useState('0');
  const [promoPrice, setPromoPrice] = useState('');
  const [capacity, setCapacity] = useState('2');
  const [bedrooms, setBedrooms] = useState('1');
  const [beds, setBeds] = useState('1');
  const [bathrooms, setBathrooms] = useState('1');
  const [rooms, setRooms] = useState('1');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [coordinates, setCoordinates] = useState({ lat: 12.3714, lng: -1.5197 });
  const [editingResidenceId, setEditingResidenceId] = useState<string | null>(null);
  const [availabilityStatus, setAvailabilityStatus] = useState<'available' | 'occupied' | 'maintenance'>('available');
  const [selectedHistoryResidenceId, setSelectedHistoryResidenceId] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState({ start: '', end: '' });

  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);

  // Selected city object
  const currentCity = allLocations.find(c => c.id === selectedCityId);

  const availableAmenities = [
    'Wi-Fi', 'Climatisation', 'Piscine', 'Parking', 'Sécurité 24/7', 'Cuisine équipée', 'Jardin', 'Groupe Électrogène', 'Forage Eau'
  ];

  // Fetch conversations from SQL API for owner
  useEffect(() => {
    if (!user || activeTab !== 'messages') return;

    const fetchConversations = () => {
      apiFetch('/api/conversations', { 
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` } 
      })
        .then(res => res.json())
        .then(data => {
          setConversations(data || []);
        })
        .catch(err => console.error("Error fetching conversations:", err));
    };

    fetchConversations();
    const intv = setInterval(fetchConversations, 5000);
    return () => clearInterval(intv);
  }, [user, activeTab]);

  // Fetch participant profiles for owner conversations
  useEffect(() => {
    if (conversations.length === 0 || !user) return;

    const otherParticipants = Array.from(new Set(
      conversations.flatMap(c => {
        const parts = Array.isArray(c.participants) ? c.participants : [];
        return parts.filter(p => p !== user?.uid);
      })
    ));

    if (otherParticipants.length === 0) return;

    const fetchProfiles = async () => {
      try {
        const res = await apiFetch('/api/users/public', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}` 
          },
          body: JSON.stringify({ uids: otherParticipants })
        });
        const data = await res.json();
        setParticipantsInfo(prev => ({ ...prev, ...data }));
      } catch (err) {
        console.error("Error fetching participant profiles:", err);
      }
    };
    fetchProfiles();
  }, [conversations, user]);

  // Fetch messages for selected conversation
  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      return;
    }

    const fetchMessages = () => {
      apiFetch(`/api/conversations/${selectedConversationId}/messages`, { 
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` } 
      })
        .then(res => res.json())
        .then(data => {
          setMessages(data || []);
          if (data && data.some((m: any) => (!m.isRead && !m.is_read) && m.senderId !== user?.uid)) {
            apiFetch(`/api/conversations/${selectedConversationId}/read`, {
              method: 'PUT',
              headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
            }).then(() => {
              setConversations(prev => prev.map(c => c.id === selectedConversationId ? { ...c, unreadCount: 0 } : c));
            }).catch(() => {});
          }
        })
        .catch(err => console.error("Error fetching messages:", err));
    };

    fetchMessages();
    const intv = setInterval(fetchMessages, 3000);
    return () => clearInterval(intv);
  }, [selectedConversationId]);

  // Selected conversation information computed properties
  const activeSelectedConv = conversations.find(c => c.id === selectedConversationId);
  const activeOpponentId = activeSelectedConv ? (Array.isArray(activeSelectedConv.participants) ? activeSelectedConv.participants.find(p => p !== user?.uid) : null) : null;
  const activeOpponentProfile = activeOpponentId ? participantsInfo[activeOpponentId] : null;
  const activeOpponentName = activeOpponentProfile?.displayName || activeOpponentProfile?.email || 'Voyageur';
  const activeOpponentInitials = activeOpponentName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  // Group bookings by time
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Extract and segregate pending bookings for immediate approval
  const pendingBookings = bookings.filter(b => b.bookingStatus === 'pending');
  const nonPendingBookings = bookings.filter(b => b.bookingStatus !== 'pending');

  const pastBookings = nonPendingBookings.filter(b => new Date(b.checkOut) < now);
  const presentBookings = nonPendingBookings.filter(b => {
    const start = new Date(b.checkIn);
    const end = new Date(b.checkOut);
    return start <= now && end >= now;
  });
  const futureBookings = nonPendingBookings.filter(b => new Date(b.checkIn) > now);

  // Check if a residence is currently occupied
  const isResidenceOccupied = (resId: string) => {
    return presentBookings.some(b => 
      b.residenceId === resId && 
      b.bookingStatus === 'confirmed' && 
      (b.paymentStatus === 'paid' || b.paymentStatus === 'advance_paid' || b.paymentStatus === 'fully_paid')
    );
  };

  // Compute metrics
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const monthlyBookings = bookings.filter(b => {
    const d = new Date(b.createdAt || b.checkIn);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear && b.bookingStatus !== 'cancelled';
  });

  const monthlyGains = monthlyBookings
    .filter(b => (b.paymentStatus === 'fully_paid' || b.paymentStatus === 'advance_paid') && b.bookingStatus !== 'cancelled')
    .reduce((acc, curr) => {
      const totalPrice = Number(curr.totalPrice) || 0;
      const advancePaid = Number(curr.advancePaid) || 0;
      const platformCollected = curr.paymentStatus === 'fully_paid' ? totalPrice : (advancePaid || Math.round(totalPrice * 0.3));
      const platformCommission = totalPrice * (Number(commissionRate) / 100);
      const gain = Math.max(0, Math.round(platformCollected - platformCommission));
      return acc + gain;
    }, 0);

  const monthlyCommissions = monthlyBookings
    .filter(b => b.paymentStatus === 'fully_paid' || b.paymentStatus === 'advance_paid')
    .reduce((acc, curr) => acc + Math.round(Number(curr.totalPrice || 0) * (Number(commissionRate) / 100)), 0);

  const totalNetEarned = bookings
    .filter(b => (b.paymentStatus === 'fully_paid' || b.paymentStatus === 'advance_paid') && b.bookingStatus !== 'cancelled')
    .reduce((acc, curr) => {
      const totalPrice = Number(curr.totalPrice) || 0;
      const advancePaid = Number(curr.advancePaid) || 0;
      const platformCollected = curr.paymentStatus === 'fully_paid' ? totalPrice : (advancePaid || Math.round(totalPrice * 0.3));
      const platformCommission = totalPrice * (Number(commissionRate) / 100);
      const gain = Math.max(0, Math.round(platformCollected - platformCommission));
      return acc + gain;
    }, 0);

  const totalWithdrawn = withdrawals
    .filter(w => w.status === 'approved')
    .reduce((acc, w) => acc + (Number(w.amount) || 0), 0);

  const totalPendingWithdrawal = withdrawals
    .filter(w => w.status === 'pending')
    .reduce((acc, w) => acc + (Number(w.amount) || 0), 0);

  const retirableBalance = Math.max(0, totalNetEarned - totalWithdrawn - totalPendingWithdrawal);

  const totalRevenue = totalNetEarned;

  const occupancyRate = residences.length > 0
    ? Math.round((bookings.filter(b => b.bookingStatus === 'confirmed').length / (residences.length * 5)) * 100)
    : 0;

  const handleStatusUpdate = async (resId: string, newStatus: Residence['availabilityStatus']) => {
    if (!confirm("Changer la disponibilité de ce logement ?")) return;
    
    setIsUpdatingStatus(resId);
    try {
      await updateResidence(resId, { availabilityStatus: newStatus });
      await fetchData();
    } catch (err) {
      console.error(err);
      addToast("Erreur lors de la mise à jour de la disponibilité.", "error");
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  const handleActiveToggle = async (res: Residence) => {
    const newStatus = res.status === 'published' ? 'suspended' : 'published';
    try {
      await updateResidence(res.id, { status: newStatus });
      triggerSuccess(newStatus === 'published' ? "Résidence activée !" : "Résidence désactivée.");
      await fetchData();
    } catch (err) {
      console.error(err);
      addToast("Erreur lors de la modification du statut.", "error");
    }
  };

  const handlePromoteToggle = async (res: Residence) => {
    try {
      await updateResidence(res.id, { promoted: !res.promoted });
      triggerSuccess(res.promoted ? "Promotion désactivée." : "Résidence mise en avant avec succès !");
      await fetchData();
    } catch (err) {
      console.error(err);
      addToast("Erreur lors de la mise en avant.", "error");
    }
  };

  const handleLocationPick = async (pos: { lat: number, lng: number }) => {
    setCoordinates(pos);
    // Reverse geocode to fill fields
    const addr = await reverseGeocode(pos.lat, pos.lng);
    if (addr && addr.address) {
      const city = addr.address.city || addr.address.town || addr.address.village;
      const road = addr.address.road || addr.address.suburb || addr.address.neighbourhood;
      
      if (city) {
        const foundCity = allLocations.find(c => c.name.toLowerCase().includes(city.toLowerCase()));
        if (foundCity) {
          setSelectedCityId(foundCity.id);
          if (road) {
            setStreet(road);
            const foundNb = foundCity.neighborhoods.find(n => road.toLowerCase().includes(n.name.toLowerCase()));
            if (foundNb) setSelectedNeighborhoodId(foundNb.id);
          }
        }
      }
    }
  };

  const handleRequestWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setWithdrawalError(null);
    setWithdrawalSuccess(null);

    const amountNum = parseFloat(withdrawalAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setWithdrawalError("Saisissez un montant valide.");
      return;
    }

    if (!withdrawalPhone || withdrawalPhone.trim().length < 8) {
      setWithdrawalError("Saisissez un numéro de paiement mobile Burkina valide (8 chiffres).");
      return;
    }

    const availableBalance = retirableBalance;

    if (amountNum > availableBalance && !isTestMode) {
      setWithdrawalError(`Solde disponible insuffisant. Votre solde retirable est de ${formatCurrency(availableBalance)} F CFA.`);
      return;
    }

    setWithdrawalLoading(true);
    try {
      await createWithdrawalRequest({
        ownerId: user.uid,
        ownerName: user.displayName || 'Hôte ResiFaso',
        ownerEmail: user.email || '',
        amount: amountNum,
        phone: withdrawalPhone.trim(),
        provider: withdrawalProvider,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      await sendNotification({
        userId: user.uid,
        title: "Demande de Retrait Enregistrée ! 💸",
        message: `Votre demande de retrait de ${formatCurrency(amountNum)} F CFA via ${withdrawalProvider.toUpperCase()} a été enregistrée avec succès.`,
        type: 'payment'
      });

      setWithdrawalSuccess("Votre demande de retrait a été transmise à l'administrateur avec succès.");
      setWithdrawalAmount('');
    } catch (err) {
      console.error(err);
      setWithdrawalError("Une erreur est survenue lors de l'enregistrement de votre retrait.");
    } finally {
      setWithdrawalLoading(false);
    }
  };

  const handleApproveBooking = async (booking: Booking) => {
    try {
      const dbType = await getBackendDbType();
      await updateBookingStatus(booking.id, { bookingStatus: 'confirmed' });
      
      await sendNotification({
        userId: booking.clientId,
        title: "Réservation Approuvée ! 🎉",
        message: `Votre hôte a approuvé votre demande pour la résidence. Vous pouvez procéder au paiement de l'avance.`,
        type: 'booking',
        referenceId: booking.id
      });
      
      await fetchData();
      refreshData();
      triggerSuccess("Réservation approuvée avec succès !");
    } catch (err: any) {
      console.error("[handleApproveBooking] Error:", err);
      addToast(err.message || "Erreur lors de l'approbation.", 'error');
    }
  };

  const handleDeclineBooking = async (booking: Booking) => {
    setBookingToDecline(booking);
    setDeclineReasonType("dates_unavailable");
    setDeclineReason("Dates déjà réservées ou indisponibles");
  };

  const handleConfirmDeclineBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingToDecline || !declineReason.trim()) return;
    setIsDeclineLoading(true);
    try {
      await updateBookingStatus(bookingToDecline.id, { 
        bookingStatus: 'cancelled',
        cancelledBy: 'owner',
        cancellationReason: declineReason,
        cancelledAt: new Date().toISOString()
      });
      await sendNotification({
        userId: bookingToDecline.clientId,
        title: "Réservation Déclinée par l'Hôte 😔",
        message: `Désolé, l'hôte a dû décliner votre demande de réservation. Voici le motif : "${declineReason}". Nous vous invitons à choisir un autre logement.`,
        type: 'booking',
        referenceId: bookingToDecline.id
      });
      triggerSuccess("Réservation refusée avec succès et le voyageur a été notifié.");
      setBookingToDecline(null);
      await fetchData();
    } catch (err) {
      console.error(err);
      addToast("Erreur lors du traitement du refus.", "error");
    } finally {
      setIsDeclineLoading(false);
    }
  };

  const handleMarkAsPaid = async (booking: Booking) => {
    const balance = booking.totalPrice - (booking.advancePaid || 0);
    const confirmMsg = isTestMode 
      ? `[MODE TEST] Confirmer la réception du solde de ${formatCurrency(balance)} F CFA ?`
      : `Confirmez-vous que le voyageur a payé le solde restant de ${formatCurrency(balance)} F CFA ?`;

    if (!confirm(confirmMsg)) {
      return;
    }
    
    setIsProcessingPayment(booking.id);
    try {
      await updateBookingStatus(booking.id, {
        paymentStatus: 'fully_paid',
        bookingStatus: 'confirmed'
      });
      
      await sendNotification({
        userId: booking.clientId,
        title: "Séjour Soldé ! ✅",
        message: `Votre hôte a confirmé la réception du solde de votre séjour. Votre dossier est maintenant complet. Merci !`,
        type: 'booking',
        referenceId: booking.id
      });
      triggerSuccess("Le solde a été marqué comme payé avec succès !");
      await fetchData();
    } catch (err) {
      console.error(err);
      addToast("Erreur lors de la mise à jour du paiement.", "error");
    } finally {
      setIsProcessingPayment(null);
    }
  };

  const handleStartStay = async (booking: Booking) => {
    try {
      const res = residences.find(r => r.id === booking.residenceId);
      await updateBookingStatus(booking.id, {
        stayStatus: 'ongoing',
        checkedInAt: new Date().toISOString()
      });

      // Notify host
      await sendNotification({
        userId: booking.ownerId,
        title: "🔑 Début de séjour enregistré !",
        message: `Le séjour du voyageur à la résidence "${res?.title || 'Logement'}" a bien commencé aujourd'hui.`,
        type: 'booking',
        referenceId: booking.id
      });

      // Notify traveler
      await sendNotification({
        userId: booking.clientId,
        title: "🔑 Bon séjour ! 🇧🇫",
        message: `Votre arrivée/Check-In à la résidence "${res?.title || 'Logement'}" a été validée par votre hôte. Passez de merveilleux moments !`,
        type: 'booking',
        referenceId: booking.id
      });

      triggerSuccess("Début de séjour enregistré avec succès !");
      await fetchData();
    } catch (err) {
      console.error(err);
      addToast("Erreur lors de l'enregistrement du check-in.", "error");
    }
  };

  const handleEndStay = async (booking: Booking) => {
    try {
      const res = residences.find(r => r.id === booking.residenceId);
      await updateBookingStatus(booking.id, {
        stayStatus: 'completed',
        bookingStatus: 'completed',
        checkedOutAt: new Date().toISOString()
      });

      // Notify host
      await sendNotification({
        userId: booking.ownerId,
        title: "🚪 Fin de séjour enregistrée !",
        message: `Le séjour à la résidence "${res?.title || 'Logement'}" est terminé. La résidence est de nouveau entièrement disponible.`,
        type: 'booking',
        referenceId: booking.id
      });

      // Notify traveler
      await sendNotification({
        userId: booking.clientId,
        title: "🚪 Séjour terminé chez Faso Loft",
        message: `Votre départ/Check-Out de la résidence "${res?.title || 'Logement'}" a été enregistré. Merci de votre confiance ! Pensez à laisser un avis pour partager votre expérience.`,
        type: 'booking',
        referenceId: booking.id
      });

      triggerSuccess("Fin de séjour enregistrée avec succès !");
      await fetchData();
    } catch (err) {
      console.error(err);
      addToast("Erreur lors du check-out.", "error");
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversationId || !user) return;

    try {
      const text = newMessage;
      setNewMessage('');

      await apiFetch(`/api/conversations/${selectedConversationId}/messages`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}` 
        },
        body: JSON.stringify({ senderId: user.uid, text })
      });
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCloseAddModal = () => {
    setIsAddOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setType('appartement');
    setSelectedCityId('');
    setSelectedNeighborhoodId('');
    setStreet('');
    setPricePerNight('');
    setAdvancePercentage(100);
    setCleaningFee('');
    setServiceFee('0');
    setUseServiceFee(false);
    setWeeklyDiscount('0');
    setMonthlyDiscount('0');
    setPromoPrice('');
    setCapacity('2');
    setBedrooms('1');
    setBeds('1');
    setBathrooms('1');
    setRooms('1');
    setOwnerPhone('');
    setImages([]);
    setAmenities([]);
    setCoordinates({ lat: 12.3714, lng: -1.5197 });
    setUtilitiesIncluded({ water: false, electricity: false });
    setPricingTiers([]);
    setEditingResidenceId(null);
    setAvailabilityStatus('available');
    setStep(1);
    setIsSubmitting(false);
  };

  const handleMarkNotificationAsRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      await fetchData();
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const handleClearAllNotifications = async () => {
    if (!user) return;
    try {
      await markAllNotificationsAsRead(user.uid);
      await fetchData();
    } catch (err) {
      console.error("Error clearing all notifications:", err);
    }
  };

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSavingPolicy(true);
    try {
      await updateUserProfile(user.uid, {
        hostCancellationFee: hostCancellationFee,
        hostCancellationRulesText: hostCancellationRulesText
      });
      if (refreshProfile) {
        await refreshProfile();
      }
      await fetchData();
      triggerSuccess("Votre politique de remboursement personnalisée a été enregistrée avec succès ! Elle s'appliquera désormais à tous vos futurs séjours.");
    } catch (err) {
      console.error("Error saving policy: ", err);
      addToast("Erreur lors de l'enregistrement de la politique : " + (err instanceof Error ? err.message : String(err)), "error");
    } finally {
      setIsSavingPolicy(false);
    }
  };

  const handleEditClick = (res: Residence) => {
    console.log("Editing residence:", res);
    console.log("Residence ownerPhone value:", res.ownerPhone);
    setTitle(res.title);
    setDescription(res.description);
    
    let finalType: string = res.type || 'appartement';
    const typeMapping: Record<string, string> = {
      'appartement': 'Appartement meublé',
      'villa': 'Villa basse',
      'chambre': "Chambre d'hôte",
      'auberge': 'Auberge / Hôtel',
    };
    if (typeMapping[finalType.toLowerCase()]) {
      finalType = typeMapping[finalType.toLowerCase()];
    } else {
      const found = PREDEFINED_TYPES.find(t => t.toLowerCase() === finalType.toLowerCase());
      if (found) finalType = found;
    }
    setType(finalType as any);

    const normalize = (s: string) => {
      if (!s) return '';
      return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
    };

    const cityName = res.address?.city || res.city;
    const cityIdFromDoc = res.address?.cityId || '';
    const city = allLocations.find(c => 
      c.id === cityIdFromDoc || 
      c.id === cityName || 
      normalize(c.name) === normalize(cityName) || 
      normalize(c.id) === normalize(cityName)
    );
    setSelectedCityId(city?.id || cityName || '');

    const hoodName = res.address?.neighborhood || res.neighborhood;
    const hoodIdFromDoc = res.address?.neighborhoodId || '';
    const hood = city?.neighborhoods.find(n => 
      n.id === hoodIdFromDoc || 
      n.id === hoodName || 
      normalize(n.name) === normalize(hoodName) || 
      normalize(n.id) === normalize(hoodName)
    );
    setSelectedNeighborhoodId(hood?.id || hoodName || '');

    setStreet(res.address?.street || res.street || '');
    setPricePerNight(res.pricePerNight.toString());
    setAdvancePercentage(res.advancePercentage);
    setCleaningFee(res.cleaningFee.toString());
    setServiceFee((res.serviceFee || 0).toString());
    setUseServiceFee((res.serviceFee || 0) > 0);
    setWeeklyDiscount((res.weeklyDiscount || 0).toString());
    setMonthlyDiscount((res.monthlyDiscount || 0).toString());
    setPromoPrice((res.promoPrice || '').toString());
    setCapacity(res.capacity.toString());
    setBedrooms(res.bedrooms.toString());
    setBeds(res.beds.toString());
    setBathrooms(res.bathrooms?.toString() || '0');
    setRooms((res.rooms || 1).toString());
    setOwnerPhone(res.ownerPhone || (res as any).owner_phone || profile?.phoneNumber || '');
    setImages(res.images || []);
    setAmenities(res.amenities || []);
    if (res.address?.coordinates || (res.lat && res.lng)) {
      setCoordinates(res.address?.coordinates || { lat: res.lat, lng: res.lng });
    }
    setAvailabilityStatus(res.availabilityStatus || 'available');
    setUtilitiesIncluded(res.utilitiesIncluded || { water: false, electricity: false });
    setPricingTiers(res.pricingTiers || []);
    setEditingResidenceId(res.id);
    setStep(1);
    setIsAddOpen(true);
  };

  const handleAmenityToggle = (amenity: string) => {
    setAmenities(prev =>
      prev.includes(amenity) ? prev.filter(item => item !== amenity) : [...prev, amenity]
    );
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    try {
      const newImages: string[] = [];
      for (let i = 0; i < files.length; i++) {
        // limit size approx
        if (files[i].size > 5 * 1024 * 1024) {
          addToast(`L'image ${files[i].name} dépasse 5 Mo.`, "error");
          continue;
        }
        const compressed = await resizeImage(files[i], 800);
        newImages.push(compressed);
      }
      setImages(prev => [...prev, ...newImages]);
    } catch (err) {
      console.error(err);
      addToast("Erreur lors de la compression des images.", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!title || !description || !ownerPhone) {
        addToast("Veuillez remplir le titre, la description et votre numéro de contact.", "error");
        return;
      }
    } else if (step === 2) {
      if (!selectedCityId || !selectedNeighborhoodId) {
        addToast("Veuillez sélectionner une ville et un quartier.", "error");
        return;
      }
    } else if (step === 3) {
      // No strict validation for Step 3 (images/equipments are often optional)
    }
    setStep(prev => prev + 1);
  };

  const handleAddResidenceSubmit = async (e?: React.FormEvent, forceSave = false) => {
    if (e) e.preventDefault();
    if (step < 4 && !forceSave) {
      handleNextStep();
      return;
    }
    
    if (!user || isSubmitting) return;

    if (!title || !description || !pricePerNight || !selectedCityId || !selectedNeighborhoodId || !ownerPhone) {
      addToast("Veuillez remplir tous les champs obligatoires (Titre, Description, Prix, Ville, Quartier, Contact).", "error");
      return;
    }

    setIsSubmitting(true);

    const defaultUnsplashImg = type === 'villa' 
      ? 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&q=80&w=1200'
      : 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=1200';

    const finalImages = images.length > 0 ? images : [defaultUnsplashImg];

    const newResidence: Omit<Residence, 'id'> = {
      ownerId: user.uid,
      title,
      description,
      type: type as any,
      pricePerNight: Number(pricePerNight),
      advancePercentage,
      cleaningFee: Number(cleaningFee) || 0,
      serviceFee: useServiceFee ? (Number(serviceFee) || 0) : 0,
      weeklyDiscount: Number(weeklyDiscount) || 0,
      monthlyDiscount: Number(monthlyDiscount) || 0,
      promoPrice: promoPrice ? Number(promoPrice) : null,
      address: {
        city: currentCity?.name || selectedCityId || 'Ouagadougou',
        neighborhood: currentCity?.neighborhoods.find(n => n.id === selectedNeighborhoodId)?.name || selectedNeighborhoodId || 'Inconnu',
        street: street || 'Secteur non précisé',
        coordinates: coordinates
      },
      amenities,
      images: finalImages,
      capacity: Number(capacity),
      bedrooms: Number(bedrooms),
      rooms: Number(rooms),
      ownerPhone: ownerPhone,
      beds: Number(beds),
      bathrooms: Number(bathrooms),
      utilitiesIncluded: utilitiesIncluded,
      pricingTiers: pricingTiers,
      status: editingResidenceId ? undefined : 'pending', // Keeps old status if editing
      availabilityStatus: availabilityStatus,
      ownerName: user.displayName || 'Hôte vérifié',
      createdAt: new Date().toISOString()
    };

    try {
      if (editingResidenceId) {
        // Exclure les champs qui ne doivent pas être écrasés s'ils sont indéfinis
        const { status, createdAt, ...updateData } = newResidence;
        await updateResidence(editingResidenceId, updateData);
        triggerSuccess("Votre résidence a été modifiée avec succès !");
      } else {
        newResidence.status = isTestMode ? 'published' : 'pending';
        await createResidence(newResidence);
        if (isTestMode) {
          triggerSuccess("Votre résidence a été publiée avec succès !");
        } else {
          triggerSuccess("Votre résidence a été soumise avec succès ! Elle apparaîtra en ligne une fois validée par un modérateur.");
        }
      }
      
      setIsAddOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
      addToast("Une erreur est survenue lors de la soumission. Veuillez vérifier votre connexion.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNavigateToAdd = () => {
    resetForm();
    if (user && user.phoneNumber) {
      setOwnerPhone(user.phoneNumber);
    } else if (profile && profile.phoneNumber) {
      setOwnerPhone(profile.phoneNumber);
    }
    setEditingResidenceId(null);
    setStep(1);
    setIsAddOpen(true);
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center max-w-7xl mx-auto px-4">
        <h2 className="text-2xl font-black text-slate-900 mb-2">Accès au tableau de bord Hôte</h2>
        <p className="text-slate-500 font-medium font-bold text-sm">Veuillez vous connecter pour accéder à votre espace Hôte.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <RefreshCw size={40} className="text-red-600 animate-spin mb-4" />
        <p className="text-slate-500 font-bold text-sm">Chargement du Tableau de Bord Hôte...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-500">
      <RoleGuide role="owner" isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />

      {onBackToTraveler && (
        <button
          onClick={onBackToTraveler}
          className="mb-6 flex items-center gap-2 text-slate-500 hover:text-red-600 font-black text-xs uppercase tracking-widest transition-all cursor-pointer bg-slate-50 hover:bg-slate-100 px-4 py-2 rounded-xl border border-slate-200"
        >
          <ArrowLeft size={14} />
          Retour Accueil Voyageur
        </button>
      )}
      
      {/* Upper Panel */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
        <div className="max-w-xs xl:max-w-sm">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-2 underline decoration-yellow-400 decoration-4 underline-offset-4">Espace Propriétaire</h2>
          <p className="text-slate-500 text-sm font-medium">Gérez vos biens immobiliers et optimisez vos rendements au Burkina.</p>
        </div>
        
        {/* Directives de l'hôte obligatoires */}
        <div className="flex-1 max-w-xl bg-amber-50/70 border border-amber-200/50 rounded-2xl p-4 flex gap-4 items-center">
          <div className="bg-amber-500 text-white p-2 rounded-xl shrink-0">
            <ShieldAlert size={18} />
          </div>
          <div className="text-xs leading-snug">
            <span className="font-black text-amber-950 uppercase tracking-widest block mb-1">📌 Directives Obligatoires de l'Hôte</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-slate-700 font-semibold">
              <div className="flex items-center gap-1.5">
                <span className="text-amber-500 font-black">•</span>
                <span>Acompte de 100% par défaut à la réservation</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-amber-500 font-black">•</span>
                <span>Contrôle physique rigoureux de la pièce d'identité (KYC)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-amber-500 font-black">•</span>
                <span>Forage ou plaques solaires recommandés (SONABEL)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-amber-500 font-black">•</span>
                <span>Enregistrement obligatoire de l'heure d'arrivée/départ</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start lg:self-auto shrink-0">
          <button 
            onClick={() => setIsGuideOpen(true)}
            className="flex items-center gap-2 px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 font-black text-xs uppercase tracking-wider rounded-2xl transition-all cursor-pointer border border-slate-200/40"
          >
            <Compass size={16} className="text-indigo-600 animate-pulse" />
            Guide Hôte
          </button>
          <button
            onClick={handleNavigateToAdd}
            className="flex items-center justify-center gap-2 px-5 py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all hover:scale-[1.02] shadow-lg shadow-red-50 active:scale-[0.98] cursor-pointer"
          >
            <Plus size={16} />
            Ajouter une résidence
          </button>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-slate-100 gap-6 mb-8 overflow-x-auto no-scrollbar">
        {[
          { id: 'stats', label: 'Tableau de bord', icon: BarChart3 },
          { id: 'listings', label: 'Mes résidences', icon: Home, count: residences.length },
          { id: 'bookings', label: 'Réservations', icon: CalendarCheck, count: bookings.filter(b => b.bookingStatus === 'pending').length },
          { id: 'revenue', label: 'Gains', icon: Wallet },
          { id: 'messages', label: 'Messagerie', icon: Layers },
          { id: 'notifications', label: 'Notifications', icon: ShieldAlert, count: dbNotifications.filter(n => !n.isRead).length },
          { id: 'policy', label: 'Charte de Remboursement', icon: Percent }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-4 text-sm font-black flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-red-600 text-red-700'
                : 'border-transparent text-slate-400 hover:text-slate-900'
            }`}
          >
            <tab.icon size={16} />
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${activeTab === tab.id ? 'bg-red-100 text-red-700' : 'bg-slate-150 text-slate-600'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Panels rendering */}
      <AnimatePresence mode="wait">
        {activeTab === 'stats' && (
          <motion.div 
            key="stats"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            {/* KPI grid counts */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              
              <div className="bg-white p-6 rounded-[28px] border-b-4 border-b-red-600 border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center shrink-0">
                  <Wallet size={20} />
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-black tracking-wider">Revenu Net (Retirable)</span>
                  <span className="text-xl font-black text-slate-900">{formatCurrency(retirableBalance)} F CFA</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-[28px] border-b-4 border-b-green-600 border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center shrink-0">
                  <Home size={20} />
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-black tracking-wider">Total Hébergements</span>
                  <span className="text-xl font-black text-slate-900">{residences.length}</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-[28px] border-b-4 border-b-yellow-400 border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-50 text-yellow-600 rounded-2xl flex items-center justify-center shrink-0">
                  <CalendarCheck size={20} />
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-black tracking-wider">Taux d'Occupation</span>
                  <span className="text-xl font-black text-slate-900">{occupancyRate}%</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
                  <Eye size={20} />
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-black tracking-wider">Vues Totales</span>
                  <span className="text-xl font-black text-slate-900">482</span>
                </div>
              </div>

            </div>

            {/* Burkina local context notifications */}
            <div className="bg-amber-50/60 border border-amber-200/50 rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center shrink-0">
                  <ShieldAlert size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">Note relative à l'Électricité (SONABEL) et l'Eau</h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-semibold">Pour attirer les voyageurs haut de gamme à Ouaga 2000, l'intégration d'un climatiseur n'est plus suffisante. Les voyageurs préfèrent désormais les logements pré-équipés d'un **Groupe électrogène automatique** ou de **Plaques solaires**, ainsi que d'un **Forage d'eau fonctionnel**.</p>
                </div>
              </div>
              <button 
                onClick={() => setActiveTab('listings')}
                className="px-4 py-2 bg-white rounded-xl border border-amber-200 text-amber-800 text-xs font-black uppercase tracking-wider shrink-0"
              >
                Mettre à jour
              </button>
            </div>
          </motion.div>
        )}

        {activeTab === 'listings' && (
          <motion.div 
            key="listings"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {residences.length === 0 ? (
              <div className="text-center py-16 bg-white border border-slate-100 rounded-3xl">
                <p className="text-slate-400 font-bold text-sm">Vous n'avez pas encore d'hébergements enregistrés.</p>
              </div>
            ) : (
              <div className="overflow-x-auto bg-white border border-slate-100 rounded-3xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/40">
                      <th className="py-5 px-6">Hébergement</th>
                      <th className="py-5 px-6">Localisation</th>
                      <th className="py-5 px-6">Tarif nuit</th>
                      <th className="py-5 px-6">Statut Modérateur</th>
                      <th className="py-5 px-6 text-center">Visibilité</th>
                      <th className="py-5 px-6 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-sm font-bold text-slate-700">
                    {residences.slice((listingsPage - 1) * 50, listingsPage * 50).map(res => (
                      <tr key={res.id}>
                        <td className="py-4 px-6 flex items-center gap-3">
                          <img src={res.images?.[0]} className="w-12 h-10 object-cover rounded-md shadow-sm shrink-0" />
                          <div>
                            <span className="block font-black text-slate-900 leading-tight">{res.title}</span>
                            <span className="text-[10px] text-slate-400 capitalize">{res.type} &bull; max {res.capacity} pers.</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 font-medium text-slate-500">
                          {res.address?.neighborhood || res.neighborhood}, {res.address?.city || res.city}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex flex-col gap-1">
                            <span className="font-black text-slate-950">
                              {formatCurrency(res.pricePerNight)} F CFA
                            </span>
                            {res.promoPrice && (
                              <span className="text-[10px] bg-yellow-400 text-slate-900 px-1.5 py-0.5 rounded font-black w-fit animate-pulse">
                                FLASH: {formatCurrency(res.promoPrice)} F
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex flex-col gap-1">
                            {res.status === 'pending' && <span className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-[9px] font-black uppercase w-fit">En Attente de Revue</span>}
                            {res.status === 'published' && <span className="px-2.5 py-1 bg-green-50 text-green-700 rounded-full text-[9px] font-black uppercase w-fit">En Ligne (Approuvé)</span>}
                            {res.status === 'hidden' && <span className="px-2.5 py-1 bg-slate-100 text-slate-500 rounded-full text-[9px] font-black uppercase w-fit">Désactivé par vous</span>}
                            
                            {/* Occupancy Indicator */}
                            {res.status === 'published' && (
                              isResidenceOccupied(res.id) ? (
                                <span className="px-2.5 py-1 bg-red-50 text-red-700 rounded-full text-[9px] font-black uppercase w-fit">Occupé</span>
                              ) : (
                                <span className="px-2.5 py-1 bg-green-50 text-green-700 rounded-full text-[9px] font-black uppercase w-fit">Disponible</span>
                              )
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <button
                            onClick={() => handleActiveToggle(res)}
                            disabled={res.status === 'pending'}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase cursor-pointer disabled:opacity-40 select-none ${
                              res.status === 'published'
                                ? 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                                : 'bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200'
                            }`}
                          >
                            {res.status === 'published' ? 'Masquer' : 'Afficher'}
                          </button>
                        </td>
                        <td className="py-4 px-6 text-center flex items-center justify-center gap-1">
                          <button
                            onClick={() => setSelectedHistoryResidenceId(res.id)}
                            className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all"
                            title="Historique des réservations"
                          >
                            <History size={16} />
                          </button>
                          <button
                            onClick={() => handlePromoteToggle(res)}
                            className={`p-2 rounded-xl transition-all ${res.promoted ? 'text-yellow-500 bg-yellow-50' : 'text-slate-400 hover:text-yellow-500 hover:bg-yellow-50'}`}
                            title={res.promoted ? "Retirer de la mise en avant" : "Mettre en avant (Promotion)"}
                          >
                            <Star size={16} fill={res.promoted ? "currentColor" : "none"} />
                          </button>
                          <button
                            onClick={() => {
                              handleEditClick(res);
                              setStep(3); // Go to Price & Promo step
                            }}
                            className="p-2 text-slate-400 hover:text-green-500 hover:bg-green-50 rounded-xl transition-all"
                            title="Gérer les prix et promotions"
                          >
                            <Percent size={16} />
                          </button>
                          <button
                            onClick={() => handleEditClick(res)}
                            className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                            title="Modifier"
                          >
                            <Pencil size={16} />
                          </button>
                          {confirmDeleteId === res.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={async () => {
                                  await deleteResidence(res.id);
                                  setConfirmDeleteId(null);
                                  await fetchData();
                                }}
                                className="px-2 py-1 bg-red-600 text-white hover:bg-red-700 rounded text-[10px] font-bold"
                              >
                                Oui
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-1 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded text-[10px] font-bold"
                              >
                                Non
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-2">
                              <div className="relative group">
                                <select
                                  value={res.availabilityStatus || 'available'}
                                  onChange={(e) => handleStatusUpdate(res.id, e.target.value as any)}
                                  disabled={isUpdatingStatus === res.id}
                                  className={cn(
                                    "text-[10px] font-black uppercase px-3 py-1.5 border rounded-xl appearance-none pr-8 cursor-pointer transition-all",
                                    res.availabilityStatus === 'available' ? "bg-green-50 text-green-700 border-green-200" :
                                    res.availabilityStatus === 'occupied' ? "bg-red-50 text-red-700 border-red-200" :
                                    "bg-amber-50 text-amber-700 border-amber-200"
                                  )}
                                >
                                  <option value="available">En ligne / Dispo</option>
                                  <option value="occupied">Occupé (Manuel)</option>
                                  <option value="maintenance">Maintenance</option>
                                </select>
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                  {isUpdatingStatus === res.id ? <RefreshCw size={10} className="animate-spin" /> : <Layers size={10} />}
                                </div>
                              </div>
                              
                              {/* Auto-detected status badge */}
                              {res.status === 'published' && isResidenceOccupied(res.id) && res.availabilityStatus === 'available' && (
                                <span className="flex items-center gap-1.5 text-[8px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded animate-pulse">
                                  <Clock size={8} /> OCCUPÉ DÉTECTÉ
                                </span>
                              )}
                              
                              <button
                                onClick={() => setConfirmDeleteId(res.id)}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                title="Supprimer"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination UI for Listings */}
                {residences.length > 50 && (
                  <div className="flex items-center justify-between border-t border-slate-100 pt-5 px-6 mt-4 text-slate-700">
                    <div className="flex flex-1 justify-between sm:hidden">
                      <button
                        disabled={listingsPage === 1}
                        onClick={() => {
                          setListingsPage(prev => Math.max(prev - 1, 1));
                        }}
                        className="relative inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition cursor-pointer"
                      >
                        Précédent
                      </button>
                      <button
                        disabled={listingsPage === Math.ceil(residences.length / 50)}
                        onClick={() => {
                          setListingsPage(prev => Math.min(prev + 1, Math.ceil(residences.length / 50)));
                        }}
                        className="relative ml-3 inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition cursor-pointer"
                      >
                        Suivant
                      </button>
                    </div>
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs text-slate-500 font-bold">
                          Affichage de <span className="font-extrabold text-slate-800">{Math.min((listingsPage - 1) * 50 + 1, residences.length)}</span> à{' '}
                          <span className="font-extrabold text-slate-800">{Math.min(listingsPage * 50, residences.length)}</span> sur{' '}
                          <span className="font-extrabold text-slate-800">{residences.length}</span> hébergements
                        </p>
                      </div>
                      <div>
                        <nav className="isolate inline-flex -space-x-px rounded-xl shadow-xs gap-1" aria-label="Pagination">
                          <button
                            disabled={listingsPage === 1}
                            onClick={() => {
                              setListingsPage(prev => Math.max(prev - 1, 1));
                            }}
                            className="relative inline-flex items-center rounded-xl border border-slate-150 bg-white p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          
                          {Array.from({ length: Math.ceil(residences.length / 50) }, (_, i) => i + 1).map((p) => (
                            <button
                              key={p}
                              onClick={() => {
                                setListingsPage(p);
                              }}
                              className={cn(
                                "relative inline-flex items-center px-3 py-1.5 text-xs font-black rounded-xl border transition cursor-pointer",
                                listingsPage === p
                                  ? "z-10 bg-red-600 text-white border-red-600 shadow-sm"
                                  : "bg-white text-slate-600 border-slate-150 hover:bg-slate-100"
                              )}
                            >
                              {p}
                            </button>
                          ))}

                          <button
                            disabled={listingsPage === Math.ceil(residences.length / 50)}
                            onClick={() => {
                              setListingsPage(prev => Math.min(prev + 1, Math.ceil(residences.length / 50)));
                            }}
                            className="relative inline-flex items-center rounded-xl border border-slate-150 bg-white p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer"
                          >
                            <ChevronRight size={16} />
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'bookings' && (
          <motion.div 
            key="bookings"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-10"
          >
            {bookings.length === 0 ? (
              <div className="text-center py-16 bg-white border border-slate-100 rounded-3xl">
                <p className="text-slate-400 font-bold text-sm">Aucune demande de réservation passée ou en cours.</p>
              </div>
            ) : (
              <>
                {/* Demandes en attente d'approbation */}
                {pendingBookings.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-black text-slate-900 border-l-4 border-amber-500 pl-4 flex items-center gap-2 font-bold uppercase tracking-wider">
                      <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse" />
                      Demandes en attente d'approbation ({pendingBookings.length})
                    </h3>
                    <div className="bg-amber-50/20 border border-amber-200/50 rounded-3xl overflow-hidden shadow-sm">
                      <BookingTable 
                        bookings={pendingBookings} 
                        handleApprove={handleApproveBooking} 
                        handleDecline={handleDeclineBooking} 
                        handleMarkAsPaid={handleMarkAsPaid} 
                        handleStartStay={handleStartStay}
                        handleEndStay={handleEndStay}
                        residences={residences} 
                        isProcessingPayment={isProcessingPayment}
                        onUpdateBooking={(updatedBk) => setBookings(prev => prev.map(bk => bk.id === updatedBk.id ? updatedBk : bk))}
                      />
                    </div>
                  </div>
                )}

                {/* Present Bookings */}
                {presentBookings.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-black text-slate-900 border-l-4 border-red-500 pl-4">Séjours en cours</h3>
                    <div className="bg-white border border-red-100 rounded-3xl overflow-hidden shadow-sm">
                      <BookingTable 
                        bookings={presentBookings} 
                        handleApprove={handleApproveBooking} 
                        handleDecline={handleDeclineBooking} 
                        handleMarkAsPaid={handleMarkAsPaid} 
                        handleStartStay={handleStartStay}
                        handleEndStay={handleEndStay}
                        residences={residences} 
                        isProcessingPayment={isProcessingPayment}
                        onUpdateBooking={(updatedBk) => setBookings(prev => prev.map(bk => bk.id === updatedBk.id ? updatedBk : bk))}
                      />
                    </div>
                  </div>
                )}

                {/* Future Bookings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-black text-slate-900 border-l-4 border-green-500 pl-4">Rérservations à venir</h3>
                  {futureBookings.length > 0 ? (
                    <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                      <BookingTable 
                        bookings={futureBookings} 
                        handleApprove={handleApproveBooking} 
                        handleDecline={handleDeclineBooking} 
                        handleMarkAsPaid={handleMarkAsPaid} 
                        handleStartStay={handleStartStay}
                        handleEndStay={handleEndStay}
                        residences={residences} 
                        isProcessingPayment={isProcessingPayment}
                        onUpdateBooking={(updatedBk) => setBookings(prev => prev.map(bk => bk.id === updatedBk.id ? updatedBk : bk))}
                      />
                    </div>
                  ) : (
                    <p className="text-slate-400 text-sm font-bold pl-4">Aucune réservation future.</p>
                  )}
                </div>

                {/* Past Bookings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-black text-slate-900 border-l-4 border-slate-300 pl-4">Historique (Passées)</h3>
                  {pastBookings.length > 0 ? (
                    <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden opacity-75 grayscale-[0.3]">
                      <BookingTable 
                        bookings={pastBookings} 
                        handleApprove={handleApproveBooking} 
                        handleDecline={handleDeclineBooking} 
                        handleMarkAsPaid={handleMarkAsPaid} 
                        handleStartStay={handleStartStay}
                        handleEndStay={handleEndStay}
                        residences={residences} 
                        isPast 
                        onUpdateBooking={(updatedBk) => setBookings(prev => prev.map(bk => bk.id === updatedBk.id ? updatedBk : bk))}
                      />
                    </div>
                  ) : (
                    <p className="text-slate-400 text-sm font-bold pl-4">Aucun historique de réservation.</p>
                  )}
                </div>
              </>
            )}
          </motion.div>
        )}

        {activeTab === 'revenue' && (
          <motion.div
            key="revenue"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white border text-center border-slate-100 rounded-2xl p-6 shadow-sm">
                <p className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Gains Nets du mois</p>
                <p className="text-3xl font-black text-slate-900 leading-tight">
                  {formatCurrency(monthlyGains)} F CFA
                </p>
                <div className="mt-4 flex justify-center">
                  <span className="text-xs bg-green-50 text-green-700 font-bold px-2 py-1 rounded-lg">Versements nets après commission</span>
                </div>
              </div>

              <div className="bg-white border text-center border-slate-100 rounded-2xl p-6 shadow-sm">
                <p className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Taux de Commission</p>
                <p className="text-3xl font-black text-red-600 leading-tight">
                  {commissionRate}%
                </p>
                <p className="text-xs text-slate-500 font-bold mt-2">Frais de service plateforme</p>
              </div>

              <div className="bg-slate-900 text-center rounded-2xl p-6 shadow-sm relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-600/20 rounded-full blur-2xl"></div>
                <p className="text-sm font-black text-slate-300 uppercase tracking-widest mb-1 relative z-10">Déjà Retiré / En cours</p>
                <p className="text-3xl font-black text-white leading-tight relative z-10">
                  {formatCurrency(totalWithdrawn + totalPendingWithdrawal)} F CFA
                </p>
                <div className="mt-4 flex justify-center gap-2">
                  <span className="text-[10px] bg-white/10 text-white/60 font-bold px-2 py-1 rounded-lg">Retirés: {formatCurrency(totalWithdrawn)}</span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-400 font-bold px-2 py-1 rounded-lg">En attente: {formatCurrency(totalPendingWithdrawal)}</span>
                </div>
              </div>
            </div>

            {/* Withdrawal request and balance check section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Withdrawal Request Form */}
              <div className="lg:col-span-5 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Demander un Retrait</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1.5">Configurez et soumettez votre transfert</p>
                </div>

                <div className="bg-red-50/50 p-4 rounded-2xl border border-red-100/50 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-black text-red-800 uppercase block tracking-wider">Solde Actuellement Retirable</span>
                      <span className="text-xs font-bold text-slate-500">Prêt pour transfert</span>
                    </div>
                    <span className="text-xl font-black text-red-700 underline underline-offset-4">
                      {formatCurrency(retirableBalance)} F CFA
                    </span>
                  </div>
                  <div className="pt-2 border-t border-red-100/30 flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    <span>Gains Cumulés: {formatCurrency(totalNetEarned)} F</span>
                    <span className="text-red-500">Retraits: - {formatCurrency(totalWithdrawn + totalPendingWithdrawal)} F</span>
                  </div>
                </div>

                <form onSubmit={handleRequestWithdrawal} className="space-y-4">
                  {withdrawalError && (
                    <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-600">
                      ⚠️ {withdrawalError}
                    </div>
                  )}

                  {withdrawalSuccess && (
                     <div className="p-3.5 bg-green-50 border border-green-200 rounded-xl text-xs font-bold text-green-700">
                      🎉 {withdrawalSuccess}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Opérateur Mobile Money</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { id: 'orange', logo: '/orange.png' },
                        { id: 'moov', logo: '/moov-1.png' },
                        { id: 'telecel', logo: '/telecel.png' },
                        { id: 'coris', logo: '/coris.png' }
                      ].map((prov) => (
                        <button
                          key={prov.id}
                          type="button"
                          onClick={() => setWithdrawalProvider(prov.id as MobileMoneyProvider)}
                          className={cn(
                            "p-2.5 rounded-xl border flex items-center justify-center bg-white transition-all cursor-pointer",
                            withdrawalProvider === prov.id 
                              ? "border-red-500 shadow-sm ring-2 ring-red-500/10 scale-105" 
                              : "border-slate-150 hover:bg-slate-50"
                          )}
                        >
                          <img src={prov.logo} alt={prov.id} className="w-8 h-8 object-contain rounded" referrerPolicy="no-referrer" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Montant à Retirer (F CFA)</label>
                    <input
                      type="number"
                      required
                      placeholder="Ex: 25000"
                      value={withdrawalAmount}
                      onChange={(e) => setWithdrawalAmount(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Numéro Mobile de Versement</label>
                    <input
                      type="tel"
                      required
                      placeholder="Ex: 70000000"
                      value={withdrawalPhone}
                      onChange={(e) => setWithdrawalPhone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={withdrawalLoading}
                    className="w-full bg-red-600 hover:bg-black text-white font-black py-3 rounded-2xl text-xs uppercase tracking-widest disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    {withdrawalLoading ? "Soumission..." : "SOUMETTRE LA DEMANDE"}
                  </button>
                </form>
              </div>

              {/* Withdrawals Requests History Log */}
              <div className="lg:col-span-7 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Historique des demandes</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1.5">Historique de vos virements et statuts d'approbations</p>
                </div>

                {withdrawals.length > 0 ? (
                  <>
                    <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400">
                          <th className="pb-3 font-black uppercase tracking-wider text-[10px]">Date</th>
                          <th className="pb-3 font-black uppercase tracking-wider text-[10px]">Montant</th>
                          <th className="pb-3 font-black uppercase tracking-wider text-[10px]">Versement</th>
                          <th className="pb-3 font-black uppercase tracking-wider text-[10px] text-center">Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {withdrawals.slice((withdrawalsPage - 1) * 50, withdrawalsPage * 50).map((item) => (
                          <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                            <td className="py-3.5 font-bold text-slate-500">
                              {formatDateFr(item.createdAt)}
                            </td>
                            <td className="py-3.5 font-extrabold text-slate-900">{formatCurrency(item.amount)} F CFA</td>
                            <td className="py-3.5 flex items-center gap-2">
                              <img src={`/${item.provider}.png`} alt={item.provider} className="w-5 h-5 object-contain rounded" referrerPolicy="no-referrer" />
                              <span className="font-mono text-slate-600 font-bold">{item.phone}</span>
                            </td>
                            <td className="py-3.5 text-center">
                              {item.status === 'pending' && (
                                <span className="inline-block bg-yellow-50 text-yellow-700 border border-yellow-100 font-black px-2 mt-0.5 py-1 rounded-lg text-[9px] uppercase tracking-wide">
                                  En attente
                                </span>
                              )}
                              {item.status === 'approved' && (
                                <span className="inline-block bg-green-50 text-green-700 border border-green-100 font-black px-2 mt-0.5 py-1 rounded-lg text-[9px] uppercase tracking-wide">
                                  Approuvé &amp; Payé
                                </span>
                              )}
                              {item.status === 'rejected' && (
                                <span className="inline-block bg-red-50 text-red-750 border border-red-100 font-black px-2 mt-0.5 py-1 rounded-lg text-[9px] uppercase tracking-wide">
                                  Refusé
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination UI for Withdrawals */}
                  {withdrawals.length > 50 && (
                    <div className="flex items-center justify-between border-t border-slate-100 pt-5 px-2 mt-4 text-slate-700">
                      <div className="flex flex-1 justify-between sm:hidden">
                        <button
                          disabled={withdrawalsPage === 1}
                          onClick={() => {
                            setWithdrawalsPage(prev => Math.max(prev - 1, 1));
                          }}
                          className="relative inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition cursor-pointer"
                        >
                          Précédent
                        </button>
                        <button
                          disabled={withdrawalsPage === Math.ceil(withdrawals.length / 50)}
                          onClick={() => {
                            setWithdrawalsPage(prev => Math.min(prev + 1, Math.ceil(withdrawals.length / 50)));
                          }}
                          className="relative ml-3 inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition cursor-pointer"
                        >
                          Suivant
                        </button>
                      </div>
                      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs text-slate-500 font-bold">
                            Affichage de <span className="font-extrabold text-slate-800">{Math.min((withdrawalsPage - 1) * 50 + 1, withdrawals.length)}</span> à{' '}
                            <span className="font-extrabold text-slate-800">{Math.min(withdrawalsPage * 50, withdrawals.length)}</span> sur{' '}
                            <span className="font-extrabold text-slate-800">{withdrawals.length}</span> demandes
                          </p>
                        </div>
                        <div>
                          <nav className="isolate inline-flex -space-x-px rounded-xl shadow-xs gap-1" aria-label="Pagination">
                            <button
                              disabled={withdrawalsPage === 1}
                              onClick={() => {
                                setWithdrawalsPage(prev => Math.max(prev - 1, 1));
                              }}
                              className="relative inline-flex items-center rounded-xl border border-slate-150 bg-white p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer"
                            >
                              <ChevronLeft size={16} />
                            </button>
                            
                            {Array.from({ length: Math.ceil(withdrawals.length / 50) }, (_, i) => i + 1).map((p) => (
                              <button
                                key={p}
                                onClick={() => {
                                  setWithdrawalsPage(p);
                                }}
                                className={cn(
                                  "relative inline-flex items-center px-3 py-1.5 text-xs font-black rounded-xl border transition cursor-pointer",
                                  withdrawalsPage === p
                                    ? "z-10 bg-red-600 text-white border-red-600 shadow-sm"
                                    : "bg-white text-slate-600 border-slate-150 hover:bg-slate-100"
                                )}
                              >
                                {p}
                              </button>
                            ))}

                            <button
                              disabled={withdrawalsPage === Math.ceil(withdrawals.length / 50)}
                              onClick={() => {
                                setWithdrawalsPage(prev => Math.min(prev + 1, Math.ceil(withdrawals.length / 50)));
                              }}
                              className="relative inline-flex items-center rounded-xl border border-slate-150 bg-white p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer"
                            >
                              <ChevronRight size={16} />
                            </button>
                          </nav>
                        </div>
                      </div>
                    </div>
                  )}
                  </>
                ) : (
                  <div className="text-center py-12">
                    <Wallet className="mx-auto h-12 w-12 text-slate-200 mb-3" />
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-wide">Aucune demande soumise.</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'messages' && (
          <motion.div
            key="messages"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white border border-slate-100 rounded-[32px] min-h-[650px] flex overflow-hidden shadow-xl"
          >
            {/* Sidebar Conversatons */}
            <div className="w-1/3 border-r border-slate-100 flex flex-col bg-slate-50/50">
              <div className="p-6 border-b border-slate-100 bg-white">
                <h3 className="font-black text-slate-900 text-lg">Conversations</h3>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mt-1.5 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  Gérez vos demandes
                </p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                {conversations.length > 0 ? conversations.map((conv) => {
                  const opponentId = Array.isArray(conv.participants) ? conv.participants.find(p => p !== user.uid) : null;
                  const opponentProfile = opponentId ? participantsInfo[opponentId] : null;
                  const opponentName = opponentProfile?.displayName || opponentProfile?.email || (opponentId ? `${opponentId.slice(0, 8)}...` : 'Utilisateur');
                  const isSelected = selectedConversationId === conv.id;
                  
                  // Generate visual initials
                  const initials = opponentName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

                  return (
                    <div 
                      key={conv.id} 
                      onClick={() => setSelectedConversationId(conv.id)}
                      className={`p-4 rounded-[24px] cursor-pointer transition-all border flex items-center gap-3 ${
                        isSelected 
                          ? 'bg-white border-red-500 shadow-md ring-2 ring-red-500/10' 
                          : 'bg-white border-slate-100 hover:border-red-200 shadow-sm'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full flex-shrink-0 bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs overflow-hidden">
                        {(opponentProfile?.photoUrl || opponentProfile?.photoURL) ? (
                          <img src={opponentProfile.photoUrl || opponentProfile.photoURL} alt="" className="w-full h-full object-cover" />
                        ) : (
                          initials || '?'
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-bold text-slate-900 text-sm truncate pr-2">
                            {opponentName}
                          </span>
                          <div className="flex items-center gap-1">
                            {!!conv.unreadCount && conv.unreadCount > 0 && (
                              <span className="px-1.5 py-0.5 bg-red-600 text-white font-black text-[9px] rounded-full shrink-0 shadow-xs animate-bounce">
                                {conv.unreadCount}
                              </span>
                            )}
                            <span className="text-[9px] text-slate-400 font-black uppercase whitespace-nowrap">
                              {new Date(conv.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium line-clamp-1 italic">
                          {conv.lastMessage || "Nouvelle conversation"}
                        </p>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="text-center text-slate-400 text-sm mt-10 font-black uppercase tracking-widest opacity-40">Aucune conversation.</div>
                )}
              </div>
            </div>

            {/* Chat Body */}
            <div className="w-2/3 flex flex-col bg-white">
              {selectedConversationId ? (
                <>
                  {/* Chat Header */}
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-red-600 text-yellow-400 flex items-center justify-center font-black text-xl shadow-lg shadow-red-100 overflow-hidden border border-red-700">
                        {(activeOpponentProfile?.photoUrl || activeOpponentProfile?.photoURL) ? (
                          <img src={activeOpponentProfile.photoUrl || activeOpponentProfile.photoURL} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-sm font-black text-white">{activeOpponentInitials || '★'}</span>
                        )}
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 text-base leading-none">{activeOpponentName}</h4>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                          Canal Sécurisé
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Messages list */}
                  <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/40">
                    {messages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.senderId === user.uid ? 'justify-end' : 'justify-start'}`}>
                        <div className={`p-4 rounded-[24px] max-w-[85%] shadow-sm ${
                          msg.senderId === user.uid 
                            ? 'bg-red-600 text-white rounded-tr-none' 
                            : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none'
                        }`}>
                          <p className="text-sm font-bold leading-relaxed">{msg.text}</p>
                          <span className={`block text-[9px] mt-2 font-black tracking-widest ${
                            msg.senderId === user.uid ? 'text-white/60' : 'text-slate-400'
                          }`}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Input area */}
                  <form onSubmit={handleSendMessage} className="p-6 bg-white border-t border-slate-100 flex gap-3">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Écrivez votre réponse ici..."
                      className="flex-1 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-red-500 rounded-2xl px-5 py-4 text-sm font-bold outline-none transition-all"
                    />
                    <button 
                      type="submit"
                      disabled={!newMessage.trim()}
                      className="w-14 h-14 bg-red-600 text-white rounded-2xl hover:bg-black transition-all shadow-xl flex items-center justify-center disabled:opacity-50"
                    >
                      <Send size={20} />
                    </button>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-slate-50/30">
                  <div className="w-24 h-24 bg-white rounded-[40px] shadow-xl flex items-center justify-center mb-8">
                    <MessageSquare size={36} className="text-red-600" />
                  </div>
                  <h3 className="text-slate-900 font-extrabold text-2xl tracking-tight mb-3">Messagerie Instantanée</h3>
                  <p className="text-slate-500 text-sm font-bold max-w-sm leading-relaxed">Sélectionnez un voyageur pour discuter des détails de son séjour.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'notifications' && (
          <motion.div
            key="notifications"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4 max-w-3xl mx-auto"
          >
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <div>
                  <h3 className="text-lg font-black text-slate-1000 flex items-center gap-2">
                    <ShieldAlert className="text-red-600" size={20} /> Alertes et Rappels en Temps Réel
                  </h3>
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase mt-0.5">Vos notifications de réservation, séjour et transferts</p>
                </div>
                {dbNotifications.some(n => !n.isRead) && (
                  <button
                    type="button"
                    onClick={handleClearAllNotifications}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition cursor-pointer"
                  >
                    Tout marquer comme lu
                  </button>
                )}
              </div>

              {dbNotifications.length === 0 ? (
                <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <ShieldAlert className="text-slate-300 mx-auto mb-3" size={32} />
                  <p className="text-sm font-extrabold text-slate-550 text-slate-500">Aucune alerte reçue pour le moment.</p>
                  <p className="text-xs text-slate-400 mt-1">Vous serez informé en temps réel des actions des voyageurs.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dbNotifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleMarkNotificationAsRead(notif.id)}
                      className={cn(
                        "p-4 rounded-2xl border transition-all flex items-start gap-4 cursor-pointer hover:bg-slate-50/50",
                        notif.isRead 
                          ? "bg-white border-slate-100" 
                          : "bg-red-50/40 border-red-100 shadow-xs ring-1 ring-red-500/5"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                        notif.type === 'booking' ? "bg-red-105 bg-red-100 text-red-600" :
                        notif.type === 'payment' ? "bg-green-100 text-green-700" :
                        "bg-slate-100 text-slate-650"
                      )}>
                        <CalendarCheck size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-extrabold text-slate-900 text-sm truncate">{notif.title}</h4>
                          {!notif.isRead && (
                            <span className="w-2.5 h-2.5 bg-red-600 rounded-full shrink-0 animate-pulse" />
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">{notif.message}</p>
                        <p className="text-[9px] text-slate-400 font-bold mt-2 font-mono uppercase">
                          {new Date(notif.createdAt).toLocaleString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'policy' && (
          <motion.div
            key="policy"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6 max-w-3xl mx-auto"
          >
            <form onSubmit={handleSavePolicy} className="bg-white border border-slate-150 rounded-3xl p-6 shadow-sm space-y-6">
              <div>
                <h3 className="text-lg font-black text-slate-950 flex items-center gap-2 uppercase tracking-tight">
                  🛡️ Personnalisation de la Charte de Remboursement
                </h3>
                <p className="text-[10px] text-slate-400 font-black uppercase mt-0.5 tracking-wider">
                  Configurez vos frais d'annulation locaux et règles administratives
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest font-bold">
                    Frais administratifs fixes retenus (F CFA) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min={0}
                      step={100}
                      value={hostCancellationFee}
                      onChange={(e) => setHostCancellationFee(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 font-extrabold text-slate-900 text-sm focus:bg-white focus:border-red-500 transition-all outline-none"
                    />
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 uppercase">
                      F CFA
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-normal font-sans">
                    Frais retenus sur le remboursement d'un voyageur en cas d'annulation de son initiative. Par défaut de 1 000 F CFA.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest font-bold">
                    Conditions Locales Additionnelles (Facultatif)
                  </label>
                  <textarea
                    rows={4}
                    value={hostCancellationRulesText}
                    onChange={(e) => setHostCancellationRulesText(e.target.value)}
                    placeholder="Ex: Toute annulation à moins de 24 heures de l'arrivée n'est plus éligible au remboursement..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-xs focus:bg-white focus:border-red-500 transition-all outline-none resize-none"
                  />
                  <p className="text-[10px] text-slate-400 leading-normal font-sans">
                    Remarques particulières que vous aimeriez afficher sur le justificatif d'annulation du voyageur.
                  </p>
                </div>
              </div>

              {/* Real-time Scenario Simulators */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block border-b pb-1.5">
                  🔍 Prévisualisation interactive des scénarios de remboursement :
                </span>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-white p-3 border border-slate-150 rounded-xl space-y-1.5">
                    <span className="text-[9px] font-black text-red-650 text-red-600 uppercase tracking-wider block">
                      Cas A : Acompte seul payé
                    </span>
                    <p className="text-[11px] text-slate-500 font-medium leading-normal">
                      Le voyageur a payé une avance de <strong className="font-extrabold text-slate-800">10 000 F</strong>. En annulant :
                    </p>
                    <div className="text-[11px] font-bold text-slate-700 font-mono bg-slate-50 p-1.5 rounded text-center">
                      Refund: {formatCurrency(Math.max(0, 10000 - hostCancellationFee))} F CFA
                      <span className="block text-[8px] text-slate-400 font-sans font-normal lowercase mt-0.5">
                        (acompte - {formatCurrency(hostCancellationFee)} F de frais)
                      </span>
                    </div>
                  </div>

                  <div className="bg-white p-3 border border-slate-150 rounded-xl space-y-1.5">
                    <span className="text-[9px] font-black text-red-650 text-red-600 uppercase tracking-wider block">
                      Cas B : Séjour Entièrement Soldé
                    </span>
                    <p className="text-[11px] text-slate-500 font-medium leading-normal">
                      Le voyageur a réglé <strong className="font-extrabold text-slate-800">50 000 F</strong>. En annulant :
                    </p>
                    <div className="text-[11px] font-bold text-slate-700 font-mono bg-slate-50 p-1.5 rounded text-center">
                      Refund: {formatCurrency(Math.max(0, 50000 - hostCancellationFee))} F CFA
                      <span className="block text-[8px] text-slate-400 font-sans font-normal lowercase mt-0.5">
                        (solde - {formatCurrency(hostCancellationFee)} F de frais)
                      </span>
                    </div>
                  </div>

                  <div className="bg-white p-3 border border-slate-150 rounded-xl space-y-1.5">
                    <span className="text-[9px] font-black text-red-650 text-red-600 uppercase tracking-wider block">
                      Cas C : Interruption de séjour
                    </span>
                    <p className="text-[11px] text-slate-500 font-medium leading-normal">
                      6 nuits restantes sur 10. Total payé <strong className="font-extrabold text-slate-800">100 000 F</strong>.
                    </p>
                    <div className="text-[11px] font-bold text-slate-700 font-mono bg-slate-50 p-1.5 rounded text-center">
                      Refund: {formatCurrency(Math.max(0, 60000 - hostCancellationFee))} F CFA
                      <span className="block text-[8px] text-slate-400 font-sans font-normal lowercase mt-0.5">
                        (prorata nuits - {formatCurrency(hostCancellationFee)} F de frais)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit panel */}
              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingPolicy}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-black uppercase text-xs tracking-wider rounded-xl transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSavingPolicy ? (
                    <>
                      <RefreshCw className="animate-spin" size={14} /> Enregistrement...
                    </>
                  ) : (
                    "Mettre à jour la charte globale"
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Residence History Modal */}
      <AnimatePresence>
        {selectedHistoryResidenceId && (
          <ResidenceHistoryModal 
            residenceId={selectedHistoryResidenceId}
            residences={residences}
            bookings={bookings}
            onClose={() => setSelectedHistoryResidenceId(null)}
          />
        )}
      </AnimatePresence>

      {/* Multistage Form modal overlay */}
      <AnimatePresence>
        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={handleCloseAddModal} />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl border border-slate-100 shadow-2xl p-8 max-h-[90vh] overflow-y-auto z-10"
            >
              <button 
                onClick={handleCloseAddModal}
                className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:bg-slate-50 transition-colors"
              >
                <X size={18} />
              </button>

              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
                    {editingResidenceId ? 'Modifier le Logement' : 'Nouveau Logement'}
                  </h3>
                  <p className="text-slate-400 text-xs font-semibold mt-1">Étape {step} sur 4 &bull; {editingResidenceId ? 'Mise à jour sécurisée' : 'Soumission sécurisée'}</p>
                </div>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4].map(s => (
                    <span key={s} className={`w-2.5 h-2.5 rounded-full transition-all ${s === step ? 'bg-red-600 scale-125' : 'bg-slate-100'}`} />
                  ))}
                </div>
              </div>

              <form 
                onSubmit={handleAddResidenceSubmit} 
                className="space-y-6"
              >
                
                {/* STEP 1: Basic logic inputs */}
                {step === 1 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Titre du logement *</label>
                      <input
                        type="text"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Ex: Villa d'Hôte Lumineuse avec Forage - Patte d'Oie"
                        className="w-full bg-slate-50 border border-slate-100 focus:bg-white focus:border-red-500 rounded-2xl py-3.5 px-4 outline-none text-sm font-bold transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Description détaillée *</label>
                      <textarea
                        required
                        rows={4}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Fournissez un descriptif des pièces, de l'état du forage ou générateur, et de la proximité avec le goudron..."
                        className="w-full bg-slate-50 border border-slate-100 focus:bg-white focus:border-red-500 rounded-2xl py-3.5 px-4 outline-none text-sm font-bold transition-all resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Type de bâtiment / logement</label>
                      <select
                        value={PREDEFINED_TYPES.includes(type) ? type : (type === '' ? '' : 'Autre')}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'Autre') {
                            setType('');
                          } else {
                            setType(val);
                          }
                        }}
                        className="w-full bg-slate-50 border border-slate-100 focus:bg-white focus:border-red-500 rounded-2xl py-3.5 px-4 outline-none text-sm font-bold transition-all"
                      >
                        <option value="">-- Sélectionnez un type --</option>
                        {PREDEFINED_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                        <option value="Autre">Autre (Saisir manuellement)...</option>
                      </select>

                      {(!PREDEFINED_TYPES.includes(type) || type === '') && (
                        <div className="mt-3">
                          <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5">Saisir le type personnalisé</label>
                          <input 
                            type="text"
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            placeholder="Ex: Yourte, Conteneur aménagé, etc."
                            className="w-full bg-slate-50 border border-slate-100 focus:bg-white focus:border-red-500 rounded-2xl py-3.5 px-4 outline-none text-sm font-bold transition-all"
                            required
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Numéro WhatsApp / Contact *</label>
                      <input
                        type="tel"
                        required
                        value={ownerPhone}
                        onChange={(e) => setOwnerPhone(e.target.value)}
                        placeholder="Ex: +226 70 00 00 00"
                        className="w-full bg-slate-50 border border-slate-100 focus:bg-white focus:border-red-500 rounded-2xl py-3.5 px-4 outline-none text-sm font-bold transition-all"
                      />
                    </div>
                  </motion.div>
                )}

                {/* STEP 2: Location logic inputs */}
                {step === 2 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4 relative z-[100]">
                      <div className="relative z-[200]">
                      <CustomSelect
                        label="Ville (Burkina Faso) *"
                        placeholder="Sélectionnez ou tapez la ville"
                        options={allLocations.map(c => ({ id: c.id, name: c.name }))}
                        value={selectedCityId}
                        onChange={(val) => {
                          setSelectedCityId(val);
                          setSelectedNeighborhoodId('');
                        }}
                      />
                    </div>

                    <div className="relative z-[150]">
                      <CustomSelect
                        label="Quartier / Zone *"
                        placeholder="Sélectionnez ou tapez le quartier"
                        options={currentCity?.neighborhoods.map(nb => ({ id: nb.id, name: nb.name }))}
                        value={selectedNeighborhoodId}
                        onChange={(val) => setSelectedNeighborhoodId(val)}
                      />
                    </div>

                    <div className="relative z-10">
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Rue / Indication d'adresse</label>
                      <input
                        type="text"
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                        placeholder="Ex: Rue 15.28, face à l'école Saint-Jean"
                        className="w-full bg-slate-50 border border-slate-100 focus:bg-white focus:border-red-500 rounded-2xl py-3.5 px-4 outline-none text-sm font-bold transition-all"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-wider">Position sur la carte *</label>
                        <div className="flex gap-2">
                          <button 
                            type="button"
                            onClick={() => {
                              if (navigator.geolocation) {
                                navigator.geolocation.getCurrentPosition((pos) => {
                                  handleLocationPick({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                                });
                              }
                            }}
                            className="text-[10px] bg-slate-900 text-white px-2 py-1 rounded-lg font-black uppercase tracking-wider hover:bg-red-600 transition-colors"
                          >
                            📍 Ma position
                          </button>
                          <span className="text-[10px] text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded italic">OU cliquez sur la carte</span>
                        </div>
                      </div>
                      <div className="h-[250px] rounded-2xl overflow-hidden border border-slate-100 shadow-inner z-0 relative">
                        <MapContainerAny center={[coordinates.lat, coordinates.lng]} zoom={13} style={{ height: '100%', width: '100%' }}>
                          <TileLayerAny
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          />
                          <LocationMarker position={coordinates} onChange={handleLocationPick} />
                        </MapContainerAny>
                      </div>
                      <p className="text-[9px] text-slate-400 font-medium italic">Latitude: {coordinates.lat.toFixed(6)}, Longitude: {coordinates.lng.toFixed(6)}</p>
                    </div>
                  </motion.div>
                )}

                {/* STEP 3: Images upload, specs and equipments */}
                {step === 3 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Photos de la résidence</label>
                      <div className="p-6 border-2 border-dashed border-slate-200 bg-slate-50 rounded-2xl text-center relative hover:bg-slate-100 transition-colors">
                        <input
                          type="file"
                          multiple
                          accept="image/jpeg, image/png, image/webp"
                          onChange={handleImageUpload}
                          disabled={isUploading}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                        />
                        <Upload size={24} className="mx-auto text-red-500 mb-2" />
                        <p className="text-sm font-bold text-slate-600">
                          {isUploading ? "Compression de l'image en cours..." : "Cliquez ou glissez vos photos ici"}
                        </p>
                        <p className="text-xs font-medium text-slate-400 mt-1">JPG, PNG (max 5 Mo). Multiple autorisée.</p>
                      </div>

                      {images.length > 0 && (
                        <div className="flex gap-3 mt-4 overflow-x-auto pb-2">
                          {images.map((img, idx) => (
                            <div key={idx} className="relative w-20 h-20 shrink-0 rounded-xl overflow-hidden shadow-sm group">
                              <img src={img} className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))}
                                className="absolute inset-0 bg-red-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="md:col-span-2">
                        <h4 className="text-xs font-black text-red-600 uppercase tracking-[0.2em] mb-4">Informations Structurelles</h4>
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2">Max Voyageurs</label>
                        <input
                          type="number"
                          value={capacity}
                          onChange={(e) => setCapacity(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-3 outline-none text-sm font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2">Chambres</label>
                        <input
                          type="number"
                          value={bedrooms}
                          onChange={(e) => setBedrooms(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-3 outline-none text-sm font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2">Pièces Totales</label>
                        <input
                          type="number"
                          value={rooms}
                          onChange={(e) => setRooms(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-3 outline-none text-sm font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2">Lits</label>
                        <input
                          type="number"
                          value={beds}
                          onChange={(e) => setBeds(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-3 outline-none text-sm font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2">Douches</label>
                        <input
                          type="number"
                          value={bathrooms}
                          onChange={(e) => setBathrooms(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-3 outline-none text-sm font-bold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-6">
                      <div className="col-span-2">
                         <h4 className="text-xs font-black text-red-600 uppercase tracking-[0.2em] mb-4">Charges & Tarifs</h4>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Inclus dans le prix</label>
                        <div className="flex gap-6">
                          <label className="flex items-center gap-3 cursor-pointer group">
                             <input 
                               type="checkbox" 
                               checked={utilitiesIncluded.water} 
                               onChange={(e) => setUtilitiesIncluded(prev => ({...prev, water: e.target.checked}))} 
                               className="w-5 h-5 rounded-lg border-slate-300 text-red-600 focus:ring-red-500 transition-all cursor-pointer"
                             />
                             <span className="text-sm font-black group-hover:text-red-600 transition-colors">💧 Eau (Inclus)</span>
                          </label>
                          <label className="flex items-center gap-3 cursor-pointer group">
                             <input 
                               type="checkbox" 
                               checked={utilitiesIncluded.electricity} 
                               onChange={(e) => setUtilitiesIncluded(prev => ({...prev, electricity: e.target.checked}))} 
                               className="w-5 h-5 rounded-lg border-slate-300 text-red-600 focus:ring-red-500 transition-all cursor-pointer"
                             />
                             <span className="text-sm font-black group-hover:text-red-600 transition-colors">⚡ Électricité (Inclus)</span>
                          </label>
                        </div>
                        <p className="mt-3 text-[10px] text-slate-500 italic font-bold bg-slate-50 p-2 rounded-lg border border-slate-100">
                           💡 Cochez si ces charges sont <span className="text-red-600">comprises dans le prix de la nuitée</span>. Si décoché, le voyageur devra payer sa consommation sur place.
                        </p>
                      </div>
                      <div className="col-span-2">
                         <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Paliers de prix dégressifs (par nombre de nuitées)</label>
                         {pricingTiers.map((tier, index) => (
                           <div key={index} className="flex gap-2 mb-2 items-center">
                             <input 
                               type="number" 
                               placeholder="Min nuitées" 
                               value={tier.minNights} 
                               onChange={(e) => setPricingTiers(prev => prev.map((t, i) => i === index ? {...t, minNights: parseInt(e.target.value) || 0} : t))} 
                               className="w-1/2 bg-slate-50 border border-slate-100 rounded-xl py-2 px-3 outline-none text-sm font-bold" 
                             />
                             <input 
                               type="number" 
                               placeholder="Prix par nuit" 
                               value={tier.pricePerNight} 
                               onChange={(e) => setPricingTiers(prev => prev.map((t, i) => i === index ? {...t, pricePerNight: parseInt(e.target.value) || 0} : t))} 
                               className="w-1/2 bg-slate-50 border border-slate-100 rounded-xl py-2 px-3 outline-none text-sm font-bold" 
                             />
                             <button type="button" onClick={() => setPricingTiers(prev => prev.filter((_, i) => i !== index))} className="text-red-500 font-bold text-xs">Retirer</button>
                           </div>
                         ))}
                         <button type="button" onClick={() => setPricingTiers(prev => [...prev, { minNights: 0, pricePerNight: 0 }])} className="text-blue-600 font-bold text-xs">+ Ajouter un palier</button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Équipements inclus</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {availableAmenities.map(item => {
                          const hasAm = amenities.includes(item);
                          return (
                            <button
                              key={item}
                              type="button"
                              onClick={() => handleAmenityToggle(item)}
                              className={`p-3 rounded-xl text-left border text-xs font-bold transition-all relative ${
                                hasAm ? 'bg-red-50 border-red-300 text-red-800' : 'bg-slate-50 border-slate-100 text-slate-600'
                              }`}
                            >
                              {item}
                              {hasAm && <Check size={12} className="absolute right-3 top-3 text-red-600" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* STEP 4: Tarifs per night, advance % selector */}
                {step === 4 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4 font-bold">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Tarif par nuit (F CFA) *</label>
                        <input
                          type="number"
                          required
                          value={pricePerNight}
                          onChange={(e) => setPricePerNight(e.target.value)}
                          placeholder="Ex: 45000"
                          className="w-full bg-slate-50 border border-slate-100 focus:bg-white focus:border-red-500 rounded-2xl py-3.5 px-4 outline-none text-sm transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Frais de ménage (F CFA)</label>
                        <input
                          type="number"
                          value={cleaningFee}
                          onChange={(e) => setCleaningFee(e.target.value)}
                          placeholder="Ex: 5000"
                          className="w-full bg-slate-50 border border-slate-100 focus:bg-white focus:border-red-500 rounded-2xl py-3.5 px-4 outline-none text-sm transition-all"
                        />
                      </div>
                    </div>

                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <label className="block text-xs font-black text-slate-900 uppercase tracking-wider">Frais de service Additionnel</label>
                          <p className="text-[10px] text-slate-400 font-bold italic">Activez pour facturer des frais fixes (ex: électricité, entretien spécial).</p>
                        </div>
                        <button 
                          type="button"
                          onClick={() => setUseServiceFee(!useServiceFee)}
                          className={`w-12 h-6 rounded-full transition-all relative ${useServiceFee ? 'bg-red-600' : 'bg-slate-300'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${useServiceFee ? 'left-7' : 'left-1'}`} />
                        </button>
                      </div>
                      
                      {useServiceFee && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                          <input
                            type="number"
                            value={serviceFee}
                            onChange={(e) => setServiceFee(e.target.value)}
                            placeholder="Montant en F CFA (ex: 2000)"
                            className="w-full bg-white border border-red-100 focus:border-red-500 rounded-xl py-3 px-4 outline-none text-sm font-black text-red-600"
                          />
                        </motion.div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-red-50/30 rounded-[32px] border border-red-100/50">
                      <div className="md:col-span-2">
                        <h4 className="text-xs font-black text-red-600 uppercase tracking-[0.2em] mb-4">Promotions & Réductions Durée</h4>
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Remise Hebdomadaire (%)</label>
                        <input
                          type="number"
                          value={weeklyDiscount}
                          onChange={(e) => setWeeklyDiscount(e.target.value)}
                          placeholder="Ex: 10"
                          className="w-full bg-white border border-slate-100 focus:border-red-500 rounded-2xl py-3.5 px-4 outline-none text-sm transition-all"
                        />
                        <p className="mt-2 text-[10px] text-slate-400 font-bold">Pour les séjours de 7 nuits ou plus.</p>
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Remise Mensuelle (%)</label>
                        <input
                          type="number"
                          value={monthlyDiscount}
                          onChange={(e) => setMonthlyDiscount(e.target.value)}
                          placeholder="Ex: 25"
                          className="w-full bg-white border border-slate-100 focus:border-red-500 rounded-2xl py-3.5 px-4 outline-none text-sm transition-all"
                        />
                        <p className="mt-2 text-[10px] text-slate-400 font-bold">Pour les séjours de 28 nuits ou plus.</p>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Prix Promotionnel par nuit (F CFA)</label>
                        <input
                          type="number"
                          value={promoPrice}
                          onChange={(e) => setPromoPrice(e.target.value)}
                          placeholder="Laisser vide pour utiliser le prix normal"
                          className="w-full bg-white border border-slate-100 focus:border-red-500 rounded-2xl py-3.5 px-4 outline-none text-sm transition-all font-black text-red-600 placeholder:font-normal placeholder:text-slate-300"
                        />
                        <p className="mt-2 text-[10px] text-slate-400 font-bold italic">Si défini, ce prix remplacera le prix normal (ex: offre Flash).</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Pourcentage exigé en avance</label>
                      <div className="grid grid-cols-3 gap-3">
                        {[30, 50, 100].map(pct => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => setAdvancePercentage(pct)}
                            className={`py-3.5 rounded-2xl border text-xs font-black tracking-wider transition-all ${
                              advancePercentage === pct 
                                ? 'bg-red-50 border-red-500 text-red-700 shadow-sm'
                                : 'bg-slate-50 border-slate-100 text-slate-500'
                            }`}
                          >
                            {pct}% {pct === 100 ? '(Séjour Complet)' : '(Avance standard)'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-semibold leading-relaxed text-slate-500">
                      Un frais de transaction de <strong className="text-red-700">10%</strong> sera prélevé par la plateforme sur chaque nuitée pour le fonctionnement des APIs Mobile Money SMS de ResiFaso. Les fonds restants (90%) sont versés en continu sur votre compte Orange Money, Moov Money, Telecel Money ou Coris Money.
                    </div>
                  </motion.div>
                )}

                {/* Wizard navigation bar buttons */}
                <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                  {step > 1 ? (
                    <button
                      type="button"
                      onClick={() => setStep(prev => prev - 1)}
                      className="px-5 py-3 rounded-xl border border-slate-205 text-slate-600 hover:bg-slate-50 transition-colors font-bold text-xs uppercase tracking-wider flex items-center gap-2"
                    >
                      <ArrowLeft size={14} />
                      Précédent
                    </button>
                  ) : (
                    <div />
                  )}

                  {step < 4 ? (
                    <div className="flex gap-2">
                       {editingResidenceId && (
                         <button
                           type="button"
                           disabled={isSubmitting}
                           onClick={() => {
                             // Force validation for essential fields regardless of step
                             if (!title || !description || !selectedCityId || !selectedNeighborhoodId || !ownerPhone || !pricePerNight) {
                               addToast("Veuillez remplir au moins les informations de base (Titre, Description, Contact, Ville, Quartier et Prix) avant d'enregistrer.", "error");
                               return;
                             }
                             handleAddResidenceSubmit(undefined, true);
                           }}
                           className="px-5 py-3 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
                         >
                           {isSubmitting ? '...' : 'Enregistrer Directement'}
                         </button>
                       )}
                      <button
                        type="button"
                        onClick={handleNextStep}
                        className="px-5 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-red-100"
                      >
                        Suivant
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-xs uppercase tracking-[0.1em] shadow-lg shadow-red-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          Traitement...
                        </>
                      ) : (
                        editingResidenceId ? 'Enregistrer les modifications' : 'Soumettre pour Validation'
                      )}
                    </button>
                  )}
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {selectedHistoryResidenceId && (
          <ResidenceHistoryModal
            residenceId={selectedHistoryResidenceId}
            residences={residences}
            bookings={bookings}
            onClose={() => setSelectedHistoryResidenceId(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {bookingToDecline && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setBookingToDecline(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl w-full max-w-lg overflow-hidden relative shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
                <h3 className="font-black text-slate-900 truncate">Décliner la réservation</h3>
                <button 
                  onClick={() => setBookingToDecline(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-500 hover:bg-red-50 hover:text-red-600 transition"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleConfirmDeclineBooking} className="p-6 space-y-5">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest font-bold mb-2">
                      Motif Principal du refus *
                    </label>
                    <select
                      value={declineReasonType}
                      onChange={(e) => {
                        setDeclineReasonType(e.target.value);
                        if (e.target.value !== "other") {
                          setDeclineReason(e.target.options[e.target.selectedIndex].text);
                        } else {
                          setDeclineReason("");
                        }
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 focus:bg-white focus:border-red-500 transition-all outline-none appearance-none"
                    >
                      <option value="dates_unavailable">Dates déjà réservées ou indisponibles</option>
                      <option value="maintenance">Logement en travaux ou maintenance</option>
                      <option value="criteria">Le profil ou la demande ne correspond pas aux critères de la résidence</option>
                      <option value="duration">La durée du séjour est inadaptée (trop courte/trop longue)</option>
                      <option value="other">Autre motif de refus</option>
                    </select>
                  </div>
                  
                  {declineReasonType === "other" && (
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest font-bold">
                        Veuillez préciser le motif *
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={declineReason}
                        onChange={(e) => setDeclineReason(e.target.value)}
                        placeholder="Expliquez brièvement au voyageur pourquoi vous ne pouvez pas accepter sa demande..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium focus:bg-white focus:border-red-500 transition outline-none resize-none"
                      />
                    </div>
                  )}
                  <p className="text-[10px] text-slate-400 mt-1">Le voyageur recevra expressément ce motif par notification.</p>
                </div>
                
                <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
                  <button
                    type="button"
                    disabled={isDeclineLoading}
                    onClick={() => setBookingToDecline(null)}
                    className="px-5 py-2.5 text-xs font-black text-slate-600 hover:bg-slate-100 uppercase rounded-xl transition"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isDeclineLoading}
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition disabled:opacity-50 flex items-center gap-2"
                  >
                    {isDeclineLoading ? "Traitement..." : "Confirmer le refus"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
