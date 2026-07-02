import React, { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { FAQItem } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, MessageSquare } from 'lucide-react';
import { cn } from '../../lib/utils';

export const FAQPage: React.FC = () => {
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'faqs'), (snapshot) => {
      const list: FAQItem[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as FAQItem);
      });
      list.sort((a, b) => a.order - b.order);
      setFaqs(list.filter(f => f.isActive));
    });
    return () => unsub();
  }, []);

  const categories = [
    { id: 'general', label: 'Général' },
    { id: 'booking', label: 'Réservations' },
    { id: 'payment', label: 'Paiements' },
    { id: 'host', label: 'Hôtes' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <header className="mb-12 text-center">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <MessageSquare size={32} className="stroke-[2.5]" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tighter">Foire Aux Questions</h1>
          <p className="text-slate-500 font-medium max-w-xl mx-auto">
            Trouvez rapidement des réponses à vos questions sur l'utilisation de ResiFaso, les réservations et plus encore.
          </p>
        </header>

        {faqs.length === 0 ? (
          <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-[32px] border border-slate-100">
            Aucune question n'est disponible pour le moment.
          </div>
        ) : (
          <div className="space-y-12">
            {categories.map(cat => {
              const catFaqs = faqs.filter(f => f.category === cat.id);
              if (catFaqs.length === 0) return null;

              return (
                <div key={cat.id}>
                  <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
                    <span className="w-8 h-px bg-slate-200"></span>
                    {cat.label}
                  </h2>
                  <div className="space-y-3">
                    {catFaqs.map(faq => (
                      <div 
                        key={faq.id} 
                        className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:border-slate-200 transition-colors"
                      >
                        <button
                          onClick={() => setOpenId(openId === faq.id ? null : faq.id)}
                          className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none"
                        >
                          <span className="font-bold text-slate-900 pr-4">{faq.question}</span>
                          <ChevronDown 
                            size={20} 
                            className={cn(
                              "text-slate-400 transition-transform duration-300 flex-shrink-0",
                              openId === faq.id ? "rotate-180 text-red-500" : ""
                            )} 
                          />
                        </button>
                        <AnimatePresence>
                          {openId === faq.id && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="px-6 pb-5 pt-2 text-slate-600 text-sm leading-relaxed whitespace-pre-wrap border-t border-slate-50">
                                {faq.answer}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
};
