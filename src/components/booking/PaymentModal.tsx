import { formatCurrency } from '../../utils/currency';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Phone, ShieldCheck, ArrowRight, Loader2, CheckCircle, RefreshCw, Droplets, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';
import { apiFetch } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

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

const translateSappayErrorToFrench = (rawError: string, status?: number): string => {
  if (!rawError) return "Une erreur inconnue est survenue lors du paiement.";
  
  const lower = rawError.toLowerCase().trim();

  // HTML or Server issues
  if (lower.includes('<!doctype') || lower.includes('<html') || lower.includes('server error') || status === 500) {
    return "Le serveur de paiement rencontre un problème technique temporaire. Veuillez réessayer dans quelques instants.";
  }
  
  if (status === 404) {
    return "Le service de paiement est actuellement injoignable. Veuillez contacter le support technique.";
  }

  // Generic Parameters Error
  if (lower.includes("paramètres erronés") || lower.includes("wrong parameters") || lower.includes("invalid parameters")) {
    return "Les informations de paiement transmises sont incorrectes. Veuillez vérifier le numéro de téléphone ou le montant et réessayer.";
  }

  // OTP Validation Errors
  if (
    lower.includes("invalid otp") || 
    lower.includes("wrong otp") || 
    lower.includes("otp incorrect") || 
    lower.includes("incorrect otp") ||
    lower.includes("otp invalide") || 
    lower.includes("code otp invalide") || 
    lower.includes("code de validation incorrect") ||
    lower.includes("otp_incorrect") ||
    lower.includes("bad otp") ||
    lower.includes("otp failed")
  ) {
    return "Le code OTP saisi est incorrect ou a expiré. Veuillez vérifier le code reçu et réessayer.";
  }

  // Insufficient Balance & Duplicate Transaction (Operator Error 12)
  if (
    lower.includes("insufficient balance") || 
    lower.includes("not enough money") ||
    lower.includes("solde insuffisant") || 
    lower.includes("not enough funds") || 
    lower.includes("insufficient funds") ||
    lower.includes("fonds insuffisants") ||
    lower.includes("solde_insuffisant") ||
    lower.includes("balance low") ||
    lower.includes("transaction en double") ||
    lower.includes("id de transaction en double") ||
    lower.includes("double transaction") ||
    lower.includes("double") ||
    lower.includes("code 12") ||
    lower.includes("status 12")
  ) {
    return "Solde client insuffisant. Veuillez recharger votre compte Mobile Money et réessayer.";
  }

  // Expiration
  if (
    lower.includes("expired") || 
    lower.includes("expiration") ||
    lower.includes("expiré") 
  ) {
    return "La session ou le code OTP de paiement a expiré. Veuillez relancer la transaction.";
  }

  // Timeout
  if (
    lower.includes("timeout") || 
    lower.includes("temps d'attente dépassé") ||
    lower.includes("délai dépassé")
  ) {
    return "Le délai d'attente de validation de l'opérateur a expiré. Veuillez réessayer.";
  }

  // Declined / Refused / Cancelled
  if (
    lower.includes("declined") || 
    lower.includes("refused") ||
    lower.includes("refusé") ||
    lower.includes("annulé") ||
    lower.includes("cancelled") ||
    lower.includes("canceled")
  ) {
    return "La transaction a été déclinée ou annulée par l'opérateur mobile money.";
  }

  // Not Registered
  if (
    lower.includes("not registered") || 
    lower.includes("unregistered") || 
    lower.includes("numéro non enregistré") ||
    lower.includes("invalid msisdn") ||
    lower.includes("invalid phone")
  ) {
    return "Ce numéro de téléphone n'est pas enregistré pour ce service de paiement mobile money chez cet opérateur.";
  }

  // Transaction Failed / Generic Failed
  if (
    lower === "transaction failed" || 
    lower === "failed" || 
    lower.includes("transaction_failed") ||
    lower.includes("transaction failed") ||
    lower.includes("payment failed") ||
    lower.includes("échec de la transaction")
  ) {
    return "Échec de la transaction. Le code OTP saisi est incorrect ou la transaction a été rejetée par l'opérateur.";
  }

  // If the message is "Success" but we're in an error state, provide a better message
  if (lower === 'success' || lower === 'transaction successfull' || lower === 'opération effectuée avec succès !') {
    return "La transaction n'a pas pu être validée par l'opérateur. Veuillez vérifier vos informations.";
  }

  // If there's an existing clean French text without English technical keywords, return it
  if (/^[a-zA-ZÀ-ÿ0-9\s'’.,!?-]+$/.test(rawError) && 
      rawError.length < 150 && 
      !lower.includes('failed') &&
      !lower.includes('error') && 
      !lower.includes('exception') && 
      !lower.includes('bad request') && 
      !lower.includes('invalid') &&
      !lower.includes('success')) {
    return rawError;
  }

  return `Échec du paiement : ${rawError}`;
};

const getBestErrorMessage = (data: any): string => {
  if (!data) return "Erreur de paiement inconnue.";
  const response = data.response || {};
  
  // Define keywords that represent a real error
  const errorKeywords = ["erronés", "incorrect", "failed", "error", "invalide", "invalid", "échec", "refusé", "declined", "wrong", "insuffisant", "cancel", "annul", "double", "dupliq"];
  
  const candidates = [
    data.error?.message,
    data.details,
    response.gateway_message,
    data.gateway_message,
    response.message,
    response.errMessage,
    data.message
  ];

  for (const cand of candidates) {
    if (typeof cand === 'string' && cand.trim().length > 0) {
      const lower = cand.toLowerCase();
      if (lower.includes("success") || lower.includes("succès") || lower.includes("réussi") || lower.includes("effectu")) continue;
      if (errorKeywords.some(kw => lower.includes(kw))) return cand;
    }
  }

  for (const cand of candidates) {
    if (typeof cand === 'string' && cand.trim().length > 0) {
      const lower = cand.toLowerCase();
      if (!lower.includes("success") && !lower.includes("succès") && !lower.includes("réussi") && !lower.includes("effectu")) return cand;
    }
  }

  return "Échec de la transaction. Le code OTP saisi est incorrect ou la transaction a été rejetée par l'opérateur.";
};

const isActuallySuccess = (data: any): boolean => {
  if (!data) return false;
  
  const response = data.response || {};
  
  // 1. Explicit top-level or response success indicators
  const isTopSuccess = data.success === true || data.status === 1 || data.status === 200 || data.status === 'SUCCESS' || data.status === 'success';
  const isRespSuccess = response.status === 'SUCCESS' || response.status === 'success' || response.status === 200;

  // 2. Check for explicit non-zero error code (like codeErr: 1 or errCode: -1)
  const codeErr = response.codeErr !== undefined && response.codeErr !== null ? response.codeErr.toString().trim() : null;
  const errCode = response.errCode !== undefined && response.errCode !== null ? response.errCode.toString().trim() : null;
  if ((codeErr !== null && codeErr !== "0") || (errCode !== null && errCode !== "0")) {
    return false;
  }

  // 3. Check gateway_status_code (0 and 200 are valid success codes in Sappay)
  if (response.gateway_status_code !== undefined && response.gateway_status_code !== null) {
    const gwStr = response.gateway_status_code.toString().trim();
    if (gwStr !== "0" && gwStr !== "200") {
      // If gateway status code is something like -1 or 400 or 500, check if top level claims success
      if (!isTopSuccess && !isRespSuccess) return false;
    }
  }

  // 4. Check for blocking error keywords in text messages
  const allMessages = [
    data.message,
    response.message,
    response.gateway_message,
    data.error?.message,
    data.details
  ].filter(m => typeof m === 'string' && m.trim().length > 0).join(' ').toLowerCase();

  const hasSuccessText = allMessages.includes("success") || allMessages.includes("succès") || allMessages.includes("effectu") || allMessages.includes("réussi") || allMessages.includes("completed");
  const errorKeywords = ["incorrect", "invalid", "invalide", "failed", "refusé", "declined", "insuffisant", "expiré", "expired"];
  const hasErrorText = errorKeywords.some(kw => allMessages.includes(kw));

  if (hasErrorText && !hasSuccessText) {
    return false;
  }

  // 5. Final decision: If we have success status or success text or success flags
  return isTopSuccess || isRespSuccess || hasSuccessText || data.success === true;
};

const checkSappayOtpResponse = (data: any): { isError: boolean; errorMessage?: string } => {
  if (!data) return { isError: false };

  const resp = data.response || {};

  // 1. Check explicit error object
  if (data.error && typeof data.error === 'object' && Object.keys(data.error).length > 0) {
    if (data.error.message && typeof data.error.message === 'string' && data.error.message.trim().length > 0) {
      return { isError: true, errorMessage: data.error.message };
    }
  }

  // 2. Check top-level success field if explicitly false
  if (data.success === false) {
    const msg = data.message || resp.message || "Erreur lors de la demande du code OTP.";
    return { isError: true, errorMessage: msg };
  }

  // 3. Inspect operator nested response object
  const respMessage = resp.message || resp.gateway_message || data.message || "";
  const respStatus = resp.status !== undefined && resp.status !== null ? String(resp.status).trim() : null;

  // List of keywords that explicitly indicate an operator rejection/error
  const errorKeywords = [
    "solde client insuffisant",
    "solde insuffisant",
    "insufficient balance",
    "not enough money",
    "fonds insuffisants",
    "compte inactif",
    "numéro invalide",
    "invalid msisdn",
    "refusé",
    "declined",
    "échec",
    "erreur",
    "failed",
    "impossible",
    "non autorisé",
    "transaction non autorisée"
  ];

  const lowerRespMsg = respMessage.toLowerCase();
  const hasErrorKeyword = errorKeywords.some(kw => lowerRespMsg.includes(kw));

  if (hasErrorKeyword) {
    return { isError: true, errorMessage: respMessage };
  }

  // In Sappay, if response status is present and is not "0", "00", "1", "200", "SUCCESS", "success"
  if (respStatus && !["0", "00", "1", "200", "success", "SUCCESS"].includes(respStatus)) {
    return { isError: true, errorMessage: respMessage || `Erreur de l'opérateur mobile (code ${respStatus})` };
  }

  return { isError: false };
};

export const PaymentModal: React.FC<Props> = ({ isOpen, onClose, amount, residenceTitle, onSuccess, isTestMode, utilitiesIncluded, bookingId, isFinalPayment, paymentType }) => {
  const { user } = useAuth();
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
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);

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
    if (amount <= 0) {
      setError("Le montant du paiement doit être supérieur à 0 FCFA. Veuillez contacter le support si cette erreur persiste.");
      return;
    }
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
          email: user?.email || "client@resifaso.com",
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
          const errMsg = text.includes('<html') ? `Erreur technique (${initResp.status})` : text;
          throw new Error(translateSappayErrorToFrench(errMsg, initResp.status));
        }
        try { initData = JSON.parse(text); } catch(e) { initData = { error: text }; }
      }
      
      if (!initResp.ok) {
        const errMsg = initData.error || initData.message || initData.details || `Erreur d'initialisation (${initResp.status})`;
        throw new Error(translateSappayErrorToFrench(errMsg, initResp.status));
      }
      
      const currentInvoiceId = initData.invoice_id;
      const currentToken = initData.access_token;
      
      setInvoiceId(currentInvoiceId);
      setAccessToken(currentToken);
      
      // Instructions et messages par opérateur
      if (provider === 'orange') {
        setHelperMessage("Composez le *144*4*6# sur votre téléphone pour générer votre code OTP à 6 chiffres, puis saisissez-le ci-dessous.");
      } else if (provider === 'telecel') {
        setHelperMessage("Vous recevrez votre code par SMS. Vous pouvez également composer le *808*4*4# sur votre téléphone, puis saisir votre code à 5 chiffres ci-dessous.");
      } else if (provider === 'moov') {
        setHelperMessage("Saisissez le code OTP à 6 chiffres que vous avez reçu par SMS ou via le menu Moov Money (*555#).");
      } else if (provider === 'coris') {
        setHelperMessage("Générez votre code OTP depuis votre application Coris Money (ou vérifiez vos SMS) puis saisissez votre code à 5 chiffres ci-dessous.");
      }
      
      // Appel à get-otp pour Telecel Money, Moov Money et Coris Money (déclenchement de l'envoi de l'OTP)
      if (provider === 'telecel' || provider === 'moov' || provider === 'coris') {
        try {
          // Courte attente de 400ms pour s'assurer que Sappay a enregistré la facture
          await new Promise(res => setTimeout(res, 400));

          const otpResp = await apiFetch('/api/payment/sappay/get-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              invoice_id: currentInvoiceId,
              payment_processor_id: PROCESSOR_IDS[provider],
              customer_msisdn: cleanPhone,
              access_token: currentToken
            })
          });

          let otpData: any = {};
          try {
            otpData = await otpResp.json();
          } catch (e) {
            otpData = {};
          }

          console.log(`[Get-OTP ${provider}] Réponse Sappay:`, otpData);

          if (!otpResp.ok) {
            const checkRes = checkSappayOtpResponse(otpData);
            const rawErr = checkRes.errorMessage || otpData.error?.message || otpData.message || `Erreur d'envoi du code OTP (${otpResp.status})`;
            throw new Error(translateSappayErrorToFrench(rawErr, otpResp.status));
          }

          // Validation stricte de la réponse de l'opérateur (ex: Solde client insuffisant, code status 12, etc.)
          const checkRes = checkSappayOtpResponse(otpData);
          if (checkRes.isError && checkRes.errorMessage) {
            console.warn(`[Get-OTP ${provider}] Réponse négative de l'opérateur:`, checkRes.errorMessage);
            throw new Error(translateSappayErrorToFrench(checkRes.errorMessage));
          }

          const tid = otpData.trans_id || otpData.response?.trans_id || otpData.response?.transactionId;
          if (tid) setTransId(tid);

          const msg = otpData.message || otpData.response?.message;
          if (typeof msg === 'string' && msg.trim().length > 0 && !msg.toLowerCase().includes('success') && !msg.toLowerCase().includes('double')) {
            setHelperMessage(msg);
          }
        } catch (otpErr: any) {
          console.error(`[Get-OTP ${provider}] Interception erreur:`, otpErr.message);
          setError(otpErr.message || "Erreur de communication lors de la demande du code OTP.");
          setLoading(false);
          return; // BLOQUER la transition vers l'écran OTP !
        }
      }

      // Passer à l'écran de saisie OTP uniquement si aucune erreur opérateur n'est survenue
      setStep('otp');
    } catch (e: any) {
      setError(e.message || "Erreur de communication avec la passerelle de paiement Sappay.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!invoiceId || !provider) return;
    setResendLoading(true);
    setResendSuccess(null);
    setError(null);
    const cleanPhone = getCleanBFNumber(phone);
    try {
      const otpResp = await apiFetch('/api/payment/sappay/get-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_id: invoiceId,
          payment_processor_id: PROCESSOR_IDS[provider],
          customer_msisdn: cleanPhone,
          access_token: accessToken
        })
      });

      const otpData = await otpResp.json().catch(() => ({}));

      if (otpResp.ok) {
        const checkRes = checkSappayOtpResponse(otpData);
        if (checkRes.isError && checkRes.errorMessage) {
          setError(translateSappayErrorToFrench(checkRes.errorMessage));
          return;
        }

        if (otpData.trans_id || otpData.response?.trans_id || otpData.response?.transactionId) {
          setTransId(otpData.trans_id || otpData.response?.trans_id || otpData.response?.transactionId);
        }
        setResendSuccess("Une nouvelle demande de code OTP a été envoyée. Veuillez vérifier vos SMS.");
        setTimeout(() => setResendSuccess(null), 6000);
      } else {
        const checkRes = checkSappayOtpResponse(otpData);
        setError(translateSappayErrorToFrench(checkRes.errorMessage || otpData.error?.message || otpData.message || "Impossible de renvoyer le code OTP."));
      }
    } catch (err: any) {
      setError(err.message || "Erreur lors du renvoi du code OTP.");
    } finally {
      setResendLoading(false);
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
          booking_id: bookingId,
          is_final_payment: isFinalPayment,
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
          throw new Error(translateSappayErrorToFrench(`Erreur serveur (${resp.status}).`, resp.status));
        }
        try {
          data = JSON.parse(text);
        } catch (e) {
          data = { error: text };
        }
      }

      if (!resp.ok) {
        // Humanize common Sappay errors from details or error fields
        const rawMsg = getBestErrorMessage(data) || data.details || data.error || data.message || "Validation OTP échouée.";
        const msg = translateSappayErrorToFrench(rawMsg, resp.status);
        throw new Error(msg);
      }
      
      if (isActuallySuccess(data)) {
        setStep('success');
        try {
          await onSuccess();
        } catch (err) {
          console.error("Erreur mise à jour statut réservation:", err);
        }
        setTimeout(() => {
          onClose();
        }, 3000);
      } else {
        const rawMsg = getBestErrorMessage(data);
        setError(translateSappayErrorToFrench(rawMsg, resp.status));
      }
    } catch (e: any) {
      setError(e.message || "Code OTP incorrect ou expiré. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center p-3 sm:p-6 pt-4 sm:pt-8 pb-10 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-md my-auto sm:my-0 bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh]"
      >
        <div className="flex h-1 bg-slate-100 shrink-0">
          <div className={cn(
            "h-full bg-slate-900 transition-all duration-500",
            step === 'provider' ? "w-1/4" : step === 'phone' ? "w-2/4" : step === 'otp' ? "w-3/4" : "w-full"
          )} />
        </div>

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between relative overflow-hidden shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                {isFullPayment ? "Paiement du solde" : "Paiement de l'acompte"}
              </h3>
            </div>
            <p className="text-xs text-slate-500 font-medium truncate max-w-[220px] sm:max-w-xs">{residenceTitle}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600 shrink-0 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0">
          <AnimatePresence mode="wait">
            {step === 'provider' && (
              <motion.div 
                key="provider"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="bg-slate-50 p-4 rounded-xl flex justify-between items-center mb-5 border border-slate-200/80">
                  <span className="text-xs font-medium text-slate-600">
                    {isFullPayment ? "Solde restant à régler" : isFullPayment ? "Paiement total" : "Acompte de validation"}
                  </span>
                  <span className="text-lg font-extrabold text-slate-900">{formatCurrency(amount)} FCFA</span>
                </div>
                
                <p className="text-xs font-semibold text-slate-700 tracking-wide mb-3">Moyen de paiement mobile</p>
                
                {utilitiesIncluded && (
                  <div className="p-3 bg-slate-50 rounded-xl mb-4 border border-slate-200/80">
                    <p className="text-[11px] font-semibold text-slate-500 mb-2">Rappel des charges :</p>
                    <div className="flex flex-wrap gap-2.5">
                      <span className={cn("text-xs font-medium flex items-center gap-1.5 px-2.5 py-1 rounded-lg border", utilitiesIncluded.water ? "text-blue-700 bg-blue-50 border-blue-100" : "text-slate-600 bg-white border-slate-200")}>
                        <Droplets size={12} className={utilitiesIncluded.water ? "text-blue-500" : "text-slate-400"} />
                        Eau : {utilitiesIncluded.water ? 'Incluse' : 'Non incluse'}
                      </span>
                      <span className={cn("text-xs font-medium flex items-center gap-1.5 px-2.5 py-1 rounded-lg border", utilitiesIncluded.electricity ? "text-amber-700 bg-amber-50 border-amber-100" : "text-slate-600 bg-white border-slate-200")}>
                        <Zap size={12} className={utilitiesIncluded.electricity ? "text-amber-500" : "text-slate-400"} />
                        Électricité : {utilitiesIncluded.electricity ? 'Incluse' : 'Non incluse'}
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
                      className="flex flex-col items-center gap-2.5 p-4 border border-slate-200/80 rounded-2xl hover:border-slate-400 hover:bg-slate-50 transition-all group h-28 justify-center cursor-pointer shadow-xs"
                    >
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center p-1.5 shadow-xs border border-slate-200/80 bg-white group-hover:border-slate-300 transition-colors">
                        <img 
                          src={p.logo} 
                          alt={p.name} 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain rounded-md"
                        />
                      </div>
                      <span className="text-xs font-semibold text-slate-800 group-hover:text-slate-900">{p.name}</span>
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
                className="space-y-4"
              >
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setStep('provider')} className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-lg hover:bg-slate-100 transition-colors">
                      <ArrowRight size={18} className="rotate-180" />
                    </button>
                    <span className="font-bold text-slate-900 text-sm">Numéro Burkina (+226)</span>
                  </div>
                  {provider && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 border border-slate-200/80 rounded-lg">
                      <img 
                        src={provider === 'orange' ? '/orange.png' : provider === 'moov' ? '/moov-1.png' : provider === 'telecel' ? '/telecel.png' : '/coris.png'} 
                        alt={provider} 
                        className="w-4 h-4 object-contain rounded-sm"
                      />
                      <span className="text-xs font-semibold text-slate-800">
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
                  <label className="block text-xs font-medium text-slate-600">
                    Numéro de compte ({provider === 'orange' ? 'Orange Money' : provider === 'moov' ? 'Moov Money' : provider === 'telecel' ? 'Telecel Money' : 'Coris Money'})
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-3.5 flex items-center text-slate-400">
                      <Phone size={18} />
                    </div>
                    <input 
                      type="tel"
                      placeholder="Numéro de compte (ex: 70 00 00 00)"
                      value={getFormattedPhone()}
                      onChange={handlePhoneChange}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200/80 rounded-xl font-semibold text-slate-900 text-sm focus:ring-2 focus:ring-slate-400 focus:bg-white outline-none transition-all"
                    />
                  </div>
                </div>

                <button 
                  disabled={getCleanBFNumber(phone).length < 8 || loading}
                  onClick={handleInitiate}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : 'Valider et recevoir le code'}
                </button>
              </motion.div>
            )}

            {step === 'otp' && (
              <motion.div 
                key="otp"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2">
                  <button onClick={() => setStep('phone')} className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-lg hover:bg-slate-100"><ArrowRight size={18} className="rotate-180" /></button>
                  <span className="font-bold text-slate-900 text-sm">Code de validation</span>
                </div>

                <div className="text-center">
                  <div className="w-12 h-12 bg-white border border-slate-200/80 shadow-xs rounded-xl flex items-center justify-center mx-auto mb-2 p-2">
                    {provider === 'orange' && <img src="/orange.png" alt="Orange Money" className="w-full h-full object-contain rounded-md" />}
                    {provider === 'moov' && <img src="/moov-1.png" alt="Moov Money" className="w-full h-full object-contain rounded-md" />}
                    {provider === 'telecel' && <img src="/telecel.png" alt="Telecel Money" className="w-full h-full object-contain rounded-md" />}
                    {provider === 'coris' && <img src="/coris.png" alt="Coris Money" className="w-full h-full object-contain rounded-md" />}
                  </div>
                  <h4 className="text-base font-bold text-slate-900 mb-1">Validation {provider === 'orange' ? 'Orange' : provider === 'moov' ? 'Moov' : provider === 'telecel' ? 'Telecel' : 'Coris'}</h4>
                  <p className="text-xs text-slate-500 mb-3 px-1 leading-relaxed">
                    {helperMessage || `Un code de sécurité est nécessaire pour valider le paiement sur le numéro ${getFormattedPhone()}.`}
                  </p>

                  {provider === 'orange' && (
                    <div className="space-y-1.5 mb-2">
                      <a href="tel:*144*4*6%23" className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm cursor-pointer">
                        <Phone size={16} /> Générer le code (*144*4*6#)
                      </a>
                      <p className="text-[11px] text-slate-400 font-medium">Code valable pendant 15 minutes</p>
                    </div>
                  )}
                  {provider === 'moov' && (
                    <div className="space-y-1 mb-2">
                      <a href="tel:*555%23" className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm cursor-pointer">
                        <Phone size={16} /> Menu Moov (*555#)
                      </a>
                    </div>
                  )}
                  {provider === 'telecel' && (
                    <div className="space-y-1 mb-2">
                      <a href="tel:*808*4*4%23" className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm cursor-pointer">
                        <Phone size={16} /> Code Telecel (*808*4*4#)
                      </a>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-medium text-center leading-relaxed">
                    {error}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-center text-xs font-medium text-slate-500">
                    Saisissez votre code OTP ci-dessous
                  </label>
                  <input 
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder={(provider === 'telecel' || provider === 'coris') ? '00000' : '000000'}
                    maxLength={(provider === 'telecel' || provider === 'coris') ? 5 : 6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full text-center tracking-[0.5em] py-3 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-2xl text-slate-900 focus:ring-2 focus:ring-slate-400 focus:border-slate-400 focus:bg-white outline-none transition-all"
                  />
                </div>

                {loading ? (
                  <div className="w-full bg-slate-100 text-slate-500 py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2">
                    <Loader2 className="animate-spin" size={18} /> Traitement en cours...
                  </div>
                ) : (
                  <button 
                    disabled={otp.length !== ((provider === 'telecel' || provider === 'coris') ? 5 : 6)}
                    onClick={handleVerify}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    Confirmer le paiement
                  </button>
                )}

                {(provider === 'telecel' || provider === 'moov' || provider === 'coris') && !loading && (
                  <div className="text-center pt-2 space-y-1.5">
                    <button 
                      type="button"
                      disabled={resendLoading}
                      onClick={handleResendOtp}
                      className="w-full inline-flex items-center justify-center gap-2 text-xs font-medium text-slate-700 hover:text-slate-900 transition-colors py-2 px-3 bg-slate-100 hover:bg-slate-200/80 rounded-xl cursor-pointer disabled:opacity-50 border border-slate-200/80"
                    >
                      {resendLoading ? (
                        <><Loader2 className="animate-spin" size={14} /> Envoi du code en cours...</>
                      ) : (
                        <><RefreshCw size={14} className="text-slate-500" /> Renvoyer le code OTP par SMS</>
                      )}
                    </button>
                    {resendSuccess && (
                      <p className="text-xs font-semibold text-emerald-600 text-center animate-in fade-in">
                        {resendSuccess}
                      </p>
                    )}
                  </div>
                )}

                {error && !loading && (
                  <button 
                    onClick={() => { setError(null); handleInitiate(); }}
                    className="w-full text-slate-500 text-xs font-medium hover:text-slate-800 transition-colors py-1 cursor-pointer text-center"
                  >
                    Réessayer l'envoi du code
                  </button>
                )}
              </motion.div>
            )}

            {step === 'success' && (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6"
              >
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                  <CheckCircle size={36} />
                </div>
                <h4 className="text-xl font-bold text-slate-900 mb-1">Paiement reçu</h4>
                <p className="text-slate-600 font-normal text-sm mb-2">Votre réservation est confirmée.</p>
                <p className="text-slate-400 text-xs font-medium animate-pulse">Redirection vers resifaso.net...</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer info */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center space-y-1 shrink-0">
          <p className="text-xs text-slate-500 font-medium flex items-center justify-center gap-1.5">
            <ShieldCheck size={14} className="text-slate-400" /> Transaction sécurisée par cryptage SSL
          </p>
          <p className="text-[11px] text-slate-500 font-normal leading-relaxed">
            {isFullPayment 
              ? "En réglant ce solde, vous finalisez le paiement de votre séjour. La commission de service est non remboursable." 
              : "En payant cet acompte, vous acceptez les conditions d'annulation. La commission de service est non remboursable."}
          </p>
        </div>
      </motion.div>
    </div>
  );
};
