import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Phone, MapPin, Clock, Send, CheckCircle2, ArrowLeft, MessageSquare, Facebook, HelpCircle } from 'lucide-react';
import { ContactSettings } from '../../types';

interface ContactPageProps {
  onBack?: () => void;
  onNavigateToFaq?: () => void;
}

const DEFAULT_SETTINGS: ContactSettings = {
  title: "Contactez-nous",
  description: "Notre équipe est disponible 24h/7 pour vous accompagner dans vos réservations, vos questions de paiement ou la mise en ligne de vos résidences au Burkina Faso.",
  email: "support@resifaso.com",
  phone: "+226 25 30 12 34",
  address: "Avenue Kwame Nkrumah, Ouagadougou, Burkina Faso",
  hours: "Lundi - Vendredi : 08h00 - 18h00 | Samedi : 09h00 - 15h00",
  facebookUrl: "https://facebook.com/resifaso",
  whatsappNumber: "+226 70 12 34 56"
};

export const ContactPage: React.FC<ContactPageProps> = ({ onBack, onNavigateToFaq }) => {
  const [settings, setSettings] = useState<ContactSettings>(DEFAULT_SETTINGS);
  
  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings/contactSettings');
        if (response.ok) {
          const data = await response.json();
          if (data && Object.keys(data).length > 0) {
            setSettings({
              title: data.title || DEFAULT_SETTINGS.title,
              description: data.description || DEFAULT_SETTINGS.description,
              email: data.email || DEFAULT_SETTINGS.email,
              phone: data.phone || DEFAULT_SETTINGS.phone,
              address: data.address || DEFAULT_SETTINGS.address,
              hours: data.hours || DEFAULT_SETTINGS.hours,
              facebookUrl: data.facebookUrl || DEFAULT_SETTINGS.facebookUrl,
              whatsappNumber: data.whatsappNumber || DEFAULT_SETTINGS.whatsappNumber,
              isEmailEnabled: data.isEmailEnabled !== false,
              isPhoneEnabled: data.isPhoneEnabled !== false,
              isWhatsappEnabled: data.isWhatsappEnabled !== false,
              isFacebookEnabled: data.isFacebookEnabled !== false,
              isAddressEnabled: data.isAddressEnabled !== false,
            });
          }
        }
      } catch (err) {
        console.error("Error fetching settings:", err);
      }
    };
    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !subject || !message) {
      setSubmitError("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch('/api/contact-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          subject,
          message,
        })
      });
      
      if (!response.ok) throw new Error("Failed to send message");

      setSubmitSuccess(true);
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch (err: any) {
      console.error("Error submitting contact message:", err);
      setSubmitError("Une erreur est survenue lors de l'envoi de votre message. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12" id="contact-page-container">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 pb-6">
          <div className="space-y-2">
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-1 text-xs font-black uppercase text-slate-500 hover:text-red-500 transition-colors cursor-pointer mb-2"
                id="btn-contact-back"
              >
                <ArrowLeft size={14} /> Retour à l'accueil
              </button>
            )}
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <span className="p-2 bg-red-50 text-[#EF2B2D] rounded-2xl shrink-0">
                <Mail size={28} />
              </span>
              {settings.title}
            </h1>
            <p className="text-slate-500 font-medium text-sm max-w-2xl">
              {settings.description}
            </p>
          </div>
          
          {onNavigateToFaq && (
            <button
              onClick={onNavigateToFaq}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider px-5 py-3 rounded-2xl transition-all active:scale-[0.98] shrink-0 cursor-pointer self-start md:self-center"
              id="btn-contact-faq"
            >
              <HelpCircle size={15} />
              Voir notre FAQ
            </button>
          )}
        </div>

        {/* Form and Info Section Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Info Side (4 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white border border-slate-100 rounded-[32px] p-6 sm:p-8 shadow-sm space-y-6">
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Coordonnées</h2>
              
              <div className="space-y-4">
                {settings.isPhoneEnabled !== false && (
                  <div className="flex items-start gap-4">
                    <span className="p-3 bg-red-50 text-[#EF2B2D] rounded-2xl shrink-0">
                      <Phone size={18} />
                    </span>
                    <div>
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Téléphone</h4>
                      <p className="text-slate-900 font-bold mt-0.5">{settings.phone}</p>
                    </div>
                  </div>
                )}

                {settings.isEmailEnabled !== false && (
                  <div className="flex items-start gap-4">
                    <span className="p-3 bg-red-50 text-[#EF2B2D] rounded-2xl shrink-0">
                      <Mail size={18} />
                    </span>
                    <div>
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Email</h4>
                      <a href={`mailto:${settings.email}`} className="text-slate-900 hover:text-red-500 font-bold mt-0.5 block transition-colors">
                        {settings.email}
                      </a>
                    </div>
                  </div>
                )}

                {settings.isAddressEnabled !== false && (
                  <div className="flex items-start gap-4">
                    <span className="p-3 bg-red-50 text-[#EF2B2D] rounded-2xl shrink-0">
                      <MapPin size={18} />
                    </span>
                    <div>
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Adresse</h4>
                      <p className="text-slate-900 font-bold mt-0.5">{settings.address}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-4">
                  <span className="p-3 bg-red-50 text-[#EF2B2D] rounded-2xl shrink-0">
                    <Clock size={18} />
                  </span>
                  <div>
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Horaires de Bureau</h4>
                    <p className="text-slate-900 font-bold mt-0.5 leading-relaxed text-sm">{settings.hours}</p>
                  </div>
                </div>
              </div>

              {/* Social Channels / Actionable shortcuts */}
              <div className="pt-6 border-t border-slate-100 flex flex-wrap gap-3">
                {settings.facebookUrl && settings.isFacebookEnabled !== false && (
                  <a
                    href={settings.facebookUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold text-xs py-2.5 px-4 rounded-xl transition"
                  >
                    <Facebook size={14} />
                    Facebook
                  </a>
                )}
                {settings.whatsappNumber && settings.isWhatsappEnabled !== false && (
                  <a
                    href={`https://wa.me/${settings.whatsappNumber.replace(/[\s+]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 font-bold text-xs py-2.5 px-4 rounded-xl transition"
                  >
                    <MessageSquare size={14} />
                    WhatsApp
                  </a>
                )}
              </div>
            </div>

            {/* Quick response commitment banner */}
            <div className="bg-gradient-to-br from-[#EF2B2D]/90 to-[#9E1416]/95 text-white p-6 rounded-[32px] shadow-md space-y-2">
              <h4 className="font-black text-sm uppercase tracking-wider">Engagement Réponse</h4>
              <p className="text-xs text-red-100 font-medium leading-relaxed">
                Notre service client s'engage à traiter votre demande en moins de 2 heures ouvrables.
              </p>
            </div>
          </div>

          {/* Form Side (7 cols) */}
          <div className="lg:col-span-7">
            <div className="bg-white border border-slate-100 rounded-[32px] p-6 sm:p-8 shadow-sm">
              <h2 className="text-lg font-black text-slate-900 tracking-tight mb-6">Envoyez-nous un message</h2>

              <AnimatePresence mode="wait">
                {submitSuccess ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }} 
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="text-center py-10 space-y-4"
                  >
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-sm">
                      <CheckCircle2 size={36} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">Message Envoyé !</h3>
                      <p className="text-sm text-slate-500 font-medium mt-1 max-w-md mx-auto">
                        Merci pour votre message. Notre équipe d'assistance ResiFaso prendra contact avec vous dans les plus brefs délais.
                      </p>
                    </div>
                    <button
                      onClick={() => setSubmitSuccess(false)}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest px-6 py-3.5 rounded-2xl transition cursor-pointer"
                    >
                      Envoyer un autre message
                    </button>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {submitError && (
                      <div className="bg-red-50 border border-red-100 text-red-600 rounded-2xl p-4 text-xs font-bold leading-relaxed">
                        {submitError}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Votre nom complet</label>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={e => setName(e.target.value)}
                          placeholder="Ex: Mohamed Ouedraogo"
                          className="w-full bg-slate-50 border border-slate-100 hover:border-slate-200 focus:border-red-500 focus:bg-white rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-900 transition-all outline-none"
                        />
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Adresse email</label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          placeholder="Ex: mohamed@domain.com"
                          className="w-full bg-slate-50 border border-slate-100 hover:border-slate-200 focus:border-red-500 focus:bg-white rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-900 transition-all outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Sujet du message</label>
                      <input
                        type="text"
                        required
                        value={subject}
                        onChange={e => setSubject(e.target.value)}
                        placeholder="Ex: Problème de paiement, question partenariat..."
                        className="w-full bg-slate-50 border border-slate-100 hover:border-slate-200 focus:border-red-500 focus:bg-white rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-900 transition-all outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Votre message</label>
                      <textarea
                        required
                        rows={5}
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        placeholder="Rédigez ici votre message de manière détaillée..."
                        className="w-full bg-slate-50 border border-slate-100 hover:border-slate-200 focus:border-red-500 focus:bg-white rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-900 transition-all outline-none resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-red-600 hover:bg-[#EF2B2D] disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest py-4 px-6 rounded-2xl shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isSubmitting ? "Envoi en cours..." : "Envoyer le message"}
                      <Send size={14} />
                    </button>
                  </form>
                )}
              </AnimatePresence>
            </div>
          </div>

        </div>
      </motion.div>
    </div>
  );
};
