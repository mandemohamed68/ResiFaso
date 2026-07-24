import { formatCurrency } from '../../utils/currency';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Phone, ShieldCheck, ArrowRight, Loader2, CheckCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { apiFetch } from '../../lib/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  residenceTitle: string;
  onSuccess: () => void;
  isTestMode?: boolean;
  utilitiesIncluded?: { water: boolean; electricity: boolean };
  bookingId?: string;
  isFinalPayment?: boolean;
  paymentType?: 'advance' | 'full';
}

type Step = 'provider' | 'phone' | 'otp' | 'success';
type Provider = 'orange' | 'moov' | 'telecel' | 'coris';

const PROCESSOR_IDS: Record<string, string> = {
  orange: "11688813752134336",
  moov: "11688813838374580",
  telecel: "11744695746597207",
  coris: "11702302492453862"
};

export const PaymentModal: React.FC<Props> = ({ isOpen, onClose, amount, residenceTitle, onSuccess, isTestMode, utilitiesIncluded, bookingId, isFinalPayment, paymentType }) => {
  const isFullPayment = paymentType === 'full' || isFinalPayment === true;
  const [step, setStep] = useState<Step>('provider');
  const [provider, setProvider] = useState<Provider | null>(null);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [invoiceId, setInvoiceId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [transId, setTransId] = useState('');
  const [helperMessage, setHelperMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Auto-read SMS OTP on mobile browsers / WebViews (WebOTP API)
  useEffect(() => {
    if (step === 'otp' && typeof window !== 'undefined' && 'OTPCredential' in window) {
      const ac = new AbortController();
      navigator.credentials.get({
        otp: { transport: ['sms'] },
        signal: ac.signal
      } as any)
      .then((otpCredential: any) => {
        if (otpCredential && otpCredential.code) {
          const cleanCode = String(otpCredential.code).replace(/\D/g, '');
          setOtp(cleanCode);
        }
      })
      .catch(() => {
        // Aborted or rejected by user/device
      });
      return () => {
        ac.abort();
      };
    }
  }, [step]);

  const getCleanBFNumber = (rawPhone: string): string => {
    let clean = rawPhone.replace(/\D/g, "");
    if (clean.length > 8) {
      if (clean.startsWith("226")) {
        return clean.slice(3);
      }
      if (clean.startsWith("00226")) {
        return clean.slice(5);
      }
    }
    return clean;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let rawVal = e.target.value.replace(/\D/g, "");
    if (rawVal.startsWith("226") && rawVal.length > 8) {
      rawVal = rawVal.slice(3);
    } else if (rawVal.startsWith("00226") && rawVal.length > 8) {
      rawVal = rawVal.slice(5);
    }
    if (rawVal.length > 8) {
      rawVal = rawVal.slice(0, 8);
    }
    setPhone(rawVal);
  };

  const getFormattedPhone = () => {
    const matches = phone.match(/.{1,2}/g);
    return matches ? matches.join(' ') : phone;
  };

  const handleInitiate = async () => {
    setLoading(true);
    setHelperMessage('');
    setError(null);
    const cleanPhone = getCleanBFNumber(phone);
    try {
      // 1. Initialiser la facture (Sappay Init) via proxy local
      const initResp = await apiFetch('/api/payment/sappay/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          note: isFullPayment ? `Paiement du solde ${residenceTitle}` : `Validation acompte ${residenceTitle}`,
          email: "client@resifaso.com",
          bookingId
        })
      });
      
      let initData: any = {};
      const initContentType = initResp.headers.get("content-type");
      if (initContentType && initContentType.includes("application/json")) {
        initData = await initResp.json();
      } else {
        const text = await initResp.text();
        if (!initResp.ok) {
          const errMsg = text.includes('<html') ? `Erreur serveur (${initResp.status})` : text;
          throw new Error(`Initialisation échouée: ${errMsg}`);
        }
        try { initData = JSON.parse(text); } catch(e) { initData = { error: text }; }
      }
      
      if (!initResp.ok) {
        throw new Error(initData.error || initData.message || `Erreur d'initialisation (${initResp.status})`);
      }
      
      const currentInvoiceId = initData.invoice_id;
      const currentToken = initData.access_token;
      
      setInvoiceId(currentInvoiceId);
      setAccessToken(currentToken);
      
      // Let's set appropriate helper message for each provider
      if (provider === 'orange') {
        setHelperMessage("Veuillez générer votre code de paiement Orange Money (Code 6 chiffres) en composant le *144*4*6# et saisissez-le ci-dessous.");
      } else if (provider === 'telecel') {
        setHelperMessage("Veuillez générer votre code de paiement Telecel (Code 5 chiffres) et saisissez-le ci-dessous.");
      } else if (provider === 'moov') {
        setHelperMessage("Veuillez saisir votre code de validation Moov Money (Code 6 chiffres) reçu ou généré via le menu USSD de Moov.");
      } else if (provider === 'coris') {
        setHelperMessage("Veuillez saisir votre code de validation ou code OTP lié à votre compte Coris Money (Code 5 chiffres).");
      }
      
      // Request OTP via backend (will mock for pull operators and call Sappay for push operators)
      const otpResp = await apiFetch('/api/payment/sappay/get-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_id: currentInvoiceId,
          payment_processor_id: PROCESSOR_IDS[provider || 'moov'],
          customer_msisdn: cleanPhone,
          access_token: currentToken
        })
      });

      if (otpResp.ok) {
        const otpData = await otpResp.json();
        if (otpData.trans_id) {
          setTransId(otpData.trans_id);
        }
      }

      setStep('otp');
    } catch (e: any) {
      setError(e.message || "Erreur de communication avec la passerelle Sappay.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    setError(null);
    const cleanPhone = getCleanBFNumber(phone);
    try {
      const processorId = PROCESSOR_IDS[provider || 'moov'];
      const resp = await apiFetch('/api/payment/sappay/perform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_id: invoiceId,
          payment_processor_id: processorId,
          customer_msisdn: cleanPhone,
          otp: otp,
          trans_id: transId,
          access_token: accessToken,
          amount: amount,
          email: "client@resifaso.com"
        })
      });
      
      let data: any = {};
      const contentType = resp.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await resp.json();
      } else {
        const text = await resp.text();
        if (!resp.ok) {
          throw new Error(`Erreur serveur (${resp.status}). Veuillez vérifier la configuration de l'API.`);
        }
        try {
          data = JSON.parse(text);
        } catch (e) {
          data = { error: text };
        }
      }

      if (!resp.ok) {
        // Humanize common Sappay errors from details or error fields
        let msg = data.details || data.error || data.message || "Validation OTP échouée.";
        
        // If the message looks like HTML, it's likely a 404/500 from the server (not the API)
        if (typeof msg === 'string' && (msg.includes('<!DOCTYPE') || msg.includes('<html'))) {
          msg = `Erreur de communication avec le serveur (Code: ${resp.status}). Veuillez vérifier que le serveur est bien démarré et à jour.`;
        } else if (resp.status === 404) {
          // If it's a 404 but not HTML, it's likely a JSON error from Sappay (endpoint not found)
          msg = `L'endpoint de paiement est introuvable (Sappay 404). Détails: ${msg}`;
        }
        
        const lowerMsg = msg.toLowerCase();
        if (lowerMsg.includes("invalid otp") || lowerMsg.includes("otp incorrect") || lowerMsg.includes("otp invalide")) {
          msg = "Le code OTP saisi est incorrect. Veuillez vérifier le code reçu par SMS.";
        } else if (lowerMsg.includes("insufficient balance") || lowerMsg.includes("solde insuffisant")) {
          msg = "Solde insuffisant sur votre compte Mobile Money pour effectuer ce paiement.";
        } else if (lowerMsg.includes("expired") || lowerMsg.includes("expiré")) {
          msg = "La session de paiement a expiré. Veuillez recommencer l'opération.";
        } else if (lowerMsg.includes("cancelled") || lowerMsg.includes("annulé")) {
          msg = "La transaction a été annulée par l'utilisateur ou l'opérateur.";
        } else if (lowerMsg.includes("processor error") || lowerMsg.includes("erreur processeur")) {
          msg = "L'opérateur mobile rencontre des difficultés techniques. Veuillez réessayer plus tard.";
        }
        
        throw new Error(msg);
      }
      
      const isSuccess = data.success === true || 
                        data.status === 'SUCCESS' || 
                        data.status === 'success' || 
                        data.status === 200 ||
                        data.response?.status === 'SUCCESS' || 
                        data.response?.status === 'success';

      if (isSuccess) {
        setStep('success');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 3500);
      } else {
        setError(data.message || "La transaction a été rejetée par l'opérateur. Veuillez vérifier votre solde ou le code saisi.");
      }
    } catch (e: any) {
      setError(e.message || "Code OTP incorrect ou expiré. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="flex h-1 bg-slate-100">
          <div className={cn(
            "h-full bg-red-600 transition-all duration-500",
            step === 'provider' ? "w-1/4" : step === 'phone' ? "w-2/4" : step === 'otp' ? "w-3/4" : "w-full"
          )} />
        </div>

        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between relative overflow-hidden">
          {isTestMode && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-red-600 animate-pulse" />
          )}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-black text-slate-900">
                {isFullPayment ? "Paiement du solde" : "Paiement de l'acompte"}
              </h3>
              {isTestMode && (
                <span className="px-2 py-0.5 bg-red-600 text-white text-[8px] font-black uppercase rounded tracking-widest">Sandbox</span>
              )}
            </div>
            <p className="text-sm text-slate-500 font-medium">{residenceTitle}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {step === 'provider' && (
              <motion.div 
                key="provider"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="bg-red-50 p-4 rounded-2xl flex justify-between items-center mb-6 border border-orange-100">
                  <span className="text-xs font-bold text-orange-800 uppercase tracking-tighter">
                    {isFullPayment ? "Solde restant à régler" : isFullPayment ? "Paiement total" : "Acompte de validation"}
                  </span>
                  <span className="text-xl font-black text-orange-900 underline underline-offset-4">{formatCurrency(amount)} FCFA</span>
                </div>
                
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">MOYEN DE PAIEMENT OTP</p>
                
                {utilitiesIncluded && (
                  <div className="p-3 bg-slate-50 rounded-xl mb-4 border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Rappel des charges :</p>
                    <div className="flex gap-4">
                      <span className={`text-[11px] font-black ${utilitiesIncluded.water ? 'text-blue-600' : 'text-red-500'}`}>
                         EAU : {utilitiesIncluded.water ? 'INCLUSE' : 'NON INCLUSE'}
                      </span>
                      <span className={`text-[11px] font-black ${utilitiesIncluded.electricity ? 'text-amber-600' : 'text-red-500'}`}>
                         ÉLEC : {utilitiesIncluded.electricity ? 'INCLUSE' : 'NON INCLUSE'}
                      </span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'orange', name: 'Orange Money', logo: '/orange.png' },
                    { id: 'moov', name: 'Moov Money', logo: '/moov-1.png' },
                    { id: 'telecel', name: 'Telecel Money', logo: '/telecel.png' },
                    { id: 'coris', name: 'Coris Money', logo: '/coris.png' }
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setProvider(p.id as Provider);
                        setStep('phone');
                      }}
                      className="flex flex-col items-center gap-3 p-4 border border-slate-100 rounded-3xl hover:border-red-500 hover:bg-red-50 transition-all group h-32 justify-center cursor-pointer"
                    >
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center p-1.5 shadow-sm border border-slate-100 bg-white group-hover:border-red-200 transition-colors">
                        <img 
                          src={p.logo} 
                          alt={p.name} 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain rounded-lg"
                        />
                      </div>
                      <span className="text-[11px] font-bold text-slate-700 group-hover:text-red-600 uppercase tracking-tight">{p.name}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 'phone' && (
              <motion.div 
                key="phone"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setStep('provider')} className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-lg hover:bg-slate-100 transition-colors">
                      <ArrowRight size={20} className="rotate-180" />
                    </button>
                    <span className="font-bold text-slate-900 text-sm">Numéro Burkina (+226)</span>
                  </div>
                  {provider && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-2xl shadow-xs">
                      <img 
                        src={provider === 'orange' ? '/orange.png' : provider === 'moov' ? '/moov-1.png' : provider === 'telecel' ? '/telecel.png' : '/coris.png'} 
                        alt={provider} 
                        className="w-5 h-5 object-contain rounded-md"
                      />
                      <span className="text-xs font-black text-slate-800 uppercase tracking-tight">
                        {provider === 'orange' ? 'Orange' : provider === 'moov' ? 'Moov' : provider === 'telecel' ? 'Telecel' : 'Coris'}
                      </span>
                    </div>
                  )}
                </div>
                
                {error && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-medium animate-in fade-in slide-in-from-top-1">
                    {error}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Numéro de compte ({provider === 'orange' ? 'Orange Money' : provider === 'moov' ? 'Moov Money' : provider === 'telecel' ? 'Telecel Money' : 'Coris Money'})
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-4 flex items-center text-slate-400">
                      <Phone size={20} />
                    </div>
                    <input 
                      type="tel"
                      placeholder="Numéro de compte"
                      value={getFormattedPhone()}
                      onChange={handlePhoneChange}
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-red-600 outline-none transition-all"
                    />
                  </div>
                </div>

                <button 
                  disabled={getCleanBFNumber(phone).length < 8 || loading}
                  onClick={handleInitiate}
                  className="w-full bg-red-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 cursor-pointer"
                >
                  {loading ? <Loader2 className="animate-spin" /> : (provider === 'orange' || provider === 'telecel' ? 'VALIDER ET SAISIR LE CODE' : 'RECEVOIR LE CODE OTP')}
                </button>
              </motion.div>
            )}

            {step === 'otp' && (
              <motion.div 
                key="otp"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-3 mb-2">
                  <button onClick={() => setStep('phone')} className="text-slate-400 hover:text-slate-600 cursor-pointer"><ArrowRight size={20} className="rotate-180" /></button>
                  <span className="font-bold text-slate-900 uppercase">Code de validation</span>
                </div>

                <div className="text-center">
                  <div className="w-20 h-20 bg-white border border-slate-100 shadow-sm rounded-3xl flex items-center justify-center mx-auto mb-4 p-3">
                    {provider === 'orange' && <img src="/orange.png" alt="Orange Money" className="w-full h-full object-contain rounded-xl" />}
                    {provider === 'moov' && <img src="/moov-1.png" alt="Moov Money" className="w-full h-full object-contain rounded-xl" />}
                    {provider === 'telecel' && <img src="/telecel.png" alt="Telecel Money" className="w-full h-full object-contain rounded-xl" />}
                    {provider === 'coris' && <img src="/coris.png" alt="Coris Money" className="w-full h-full object-contain rounded-xl" />}
                  </div>
                  <h4 className="text-xl font-bold text-slate-900 mb-2">Vérification</h4>
                  <p className="text-sm text-slate-500 mb-4 px-2">
                    {helperMessage || (isTestMode ? `Un code de sécurité a été envoyé au ${getFormattedPhone()}. Entrez le code ${(provider === 'telecel' || provider === 'coris') ? '12345' : '123456'} pour tester.` : `Un code de sécurité a été envoyé au ${getFormattedPhone()}. Veuillez le saisir ci-dessous.`)}
                  </p>

                  {provider === 'orange' && (
                    <a href="tel:*144*4*6%23" className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-orange-50 text-orange-600 rounded-xl text-sm font-bold hover:bg-orange-100 transition-colors border border-orange-100 shadow-sm cursor-pointer mb-2">
                      <Phone size={16} /> Lancer *144*4*6#
                    </a>
                  )}
                  {provider === 'moov' && (
                    <a href="tel:*555%23" className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-50 text-blue-600 rounded-xl text-sm font-bold hover:bg-blue-100 transition-colors border border-blue-100 shadow-sm cursor-pointer mb-2">
                      <Phone size={16} /> Lancer le menu Moov
                    </a>
                  )}
                </div>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-medium animate-in fade-in slide-in-from-top-1 text-center">
                    {error}
                  </div>
                )}

                <input 
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder={(provider === 'telecel' || provider === 'coris') ? '00000' : '000000'}
                  maxLength={(provider === 'telecel' || provider === 'coris') ? 5 : 6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full text-center tracking-[0.75em] py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-3xl text-slate-900 focus:ring-2 focus:ring-red-600 focus:bg-white outline-none transition-all"
                />

                {loading ? (
                  <div className="w-full bg-slate-100 text-slate-400 py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2">
                    <Loader2 className="animate-spin" /> TRAITEMENT EN COURS...
                  </div>
                ) : (
                  <button 
                    disabled={otp.length !== ((provider === 'telecel' || provider === 'coris') ? 5 : 6)}
                    onClick={handleVerify}
                    className="w-full bg-red-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-red-600/20"
                  >
                    CONFIRMER LE PAIEMENT
                  </button>
                )}

                {error && !loading && (
                  <button 
                    onClick={() => { setError(null); handleInitiate(); }}
                    className="w-full text-slate-400 text-sm font-bold hover:text-red-600 transition-colors py-2 cursor-pointer"
                  >
                    RÉESSAYER L'ENVOI DU CODE
                  </button>
                )}
              </motion.div>
            )}

            {step === 'success' && (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle size={48} />
                </div>
                <h4 className="text-2xl font-bold text-gray-900 mb-2">Paiement reçu !</h4>
                <p className="text-gray-500 font-medium">Votre réservation est confirmée. Redirection en cours...</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer info */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 text-center space-y-1">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
            <ShieldCheck size={12} /> Transaction sécurisée par cryptage SSL
          </p>
          <p className="text-[9px] text-slate-400 font-medium leading-tight">
            🛡️ {isFullPayment 
              ? "En réglant ce solde, vous finalisez le paiement de votre séjour. La commission de service de la plateforme est non remboursable." 
              : "En payant cet acompte, vous acceptez les conditions d'annulation. La commission de service de la plateforme est non remboursable."}
          </p>
        </div>
      </motion.div>
    </div>
  );
};
