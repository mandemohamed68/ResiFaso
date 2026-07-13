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

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : 0;

  return (
    <div className="mb-12">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <MessageCircle className="text-red-600" size={24} />
            Avis des Voyageurs
          </h2>
        </div>
        {reviews.length > 0 && (
          <div className="text-right">
            <div className="text-3xl font-black text-slate-900 flex items-center justify-end gap-1">
              <Star className="text-yellow-400 fill-yellow-400" size={28} />
              {averageRating}
            </div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
              {reviews.length} avis vérifié{reviews.length > 1 ? 's' : ''}
            </div>
          </div>
        )}
      </div>

      {reviews.length === 0 ? (
        <div className="bg-slate-50 border border-slate-100 rounded-3xl p-8 text-center">
          <Star className="text-slate-300 mx-auto mb-3" size={32} />
          <p className="text-sm font-bold text-slate-500">Aucun avis pour l'instant.</p>
          <p className="text-xs text-slate-400 mt-1">Les avis apparaîtront ici une fois les séjours terminés.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reviews.map((review, idx) => (
            <motion.div 
              key={review.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {review.clientPhoto ? (
                    <img src={review.clientPhoto} alt={review.clientName} className="w-10 h-10 rounded-full object-cover border-2 border-slate-100" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                      <User size={18} />
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-sm text-slate-900">{review.clientName || 'Voyageur'}</div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                      {formatDateFr(review.createdAt)}
                    </div>
                  </div>
                </div>
                <div className="flex bg-yellow-50 px-2 py-1 rounded-lg">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star 
                      key={i} 
                      size={12} 
                      className={i < review.rating ? "text-yellow-400 fill-yellow-400" : "text-yellow-200"} 
                    />
                  ))}
                </div>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed italic flex-1">"{review.comment}"</p>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};