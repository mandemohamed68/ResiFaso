import React, { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export const Footer: React.FC = () => {
  const [footerContent, setFooterContent] = useState<string>("© 2026 ResiFaso. Tous droits réservés.");

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists() && docSnap.data().footerContent) {
        setFooterContent(docSnap.data().footerContent);
      }
    });
    return () => unsub();
  }, []);

  return (
    <footer className="bg-slate-900 text-slate-400 py-[6vh] px-4 text-center text-sm border-t border-slate-800 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center gap-2">
        <p className="font-bold text-slate-300 tracking-wide">{footerContent}</p>
      </div>
    </footer>
  );
};
