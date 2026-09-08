import React, { useEffect, useState } from 'react';
import { Star, User, MessageCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { apiFetch } from '../../lib/api';
import { formatDateFr } from '../../lib/utils';

interface Review {
  id: string;
  clientId: string;
  clientName: string;
  clientPhoto?: string;
  rating: number;
  comment: string;
  createdAt: string;
}

interface Props {
  residenceId: string;
}

export const ReviewsSection: React.FC<Props> = ({ residenceId }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchReviews = async () => {
      setLoading(true);
      try {
        const response = await apiFetch(`/api/residences/${residenceId}/reviews`);
        if (mounted && response.ok) {
          const data = await response.json();
          setReviews(data);
        }
      } catch (err) {
        console.error("Failed to fetch reviews", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchReviews();
    return () => { mounted = false; };
  }, [residenceId]);

  if (loading) {
    return (
      <div className="py-8 text-center text-slate-400 animate-pulse text-sm font-medium">
        Chargement des avis...
      </div>
    );
  }

  const validReviews = reviews.filter(r => r.comment && r.comment.trim().length > 1 && r.comment.trim() !== '-' && r.comment.trim() !== '--');
  
  const averageRating = validReviews.length > 0 
    ? (validReviews.reduce((acc, r) => acc + r.rating, 0) / validReviews.length).toFixed(1)
    : 0;

  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <MessageCircle className="text-brand-primary" size={20} />
            <span>Avis des Voyageurs</span>
          </h3>
          <p className="text-xs text-slate-500 font-normal mt-0.5">Retours d'expérience vérifiés des locataires</p>
        </div>
        {validReviews.length > 0 && (
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-lg">
            <Star className="text-amber-400 fill-amber-400" size={18} />
            <span className="text-sm font-black text-slate-900">{averageRating}</span>
            <span className="text-xs text-slate-400 font-medium">({validReviews.length} avis)</span>
          </div>
        )}
      </div>

      {validReviews.length === 0 ? (
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-6 text-center">
          <p className="text-xs font-semibold text-slate-700">Aucun avis publié pour le moment</p>
          <p className="text-[11px] text-slate-500 mt-1">Les avis certifiés apparaîtront automatiquement à la fin de chaque séjour.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {validReviews.map((review, idx) => (
            <motion.div 
              key={review.id || idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  {review.clientPhoto ? (
                    <img src={review.clientPhoto} alt={review.clientName} className="w-8 h-8 rounded-full object-cover border border-slate-200" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-bold">
                      {(review.clientName || 'V').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-xs text-slate-900">{review.clientName || 'Voyageur vérifié'}</div>
                    <div className="text-[10px] text-slate-400 font-medium">
                      {formatDateFr(review.createdAt)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star 
                      key={i} 
                      size={11} 
                      className={i < review.rating ? "text-amber-400 fill-amber-400" : "text-slate-200"} 
                    />
                  ))}
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed italic">"{review.comment}"</p>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};