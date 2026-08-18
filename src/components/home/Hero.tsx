import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import heroBg from '../../assets/images/rond_point_martyrs_bg_1780477317904.png';
import { Advertisement } from '../../types';
import { apiFetch } from '../../lib/api';
import { useBrandingSettings } from '../../hooks/useQueries';
import { Sparkles, ShieldCheck, HeartHandshake } from 'lucide-react';

interface HeroSlide {
  isDefault: boolean;
  imageUrl: string;
  title: string;
  description: string;
  linkUrl?: string;
  frequency: number;
}

export const Hero: React.FC = () => {
  const { data: branding } = useBrandingSettings();
  const bName1 = branding?.brandNamePart1 || 'Resi';
  const bName2 = branding?.brandNamePart2 || 'Faso';
  const bSlogan = branding?.brandSlogan || "Villas de prestige, résidences privées et appartements sélectionnés pour vos séjours à Ouagadougou, Bobo-Dioulasso et partout au Burkina Faso.";

  const [activeAds, setActiveAds] = useState<Advertisement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Fetch advertisements
  useEffect(() => {
    const fetchAds = async () => {
      try {
        const response = await apiFetch('/api/promotions');
        if (!response.ok) throw new Error('Failed to fetch ads');
        const list: Advertisement[] = await response.json();
        const activeOnly = list.filter(item => item.isActive);
        activeOnly.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setActiveAds(activeOnly);
      } catch (error) {
        console.error("Hero ads fetch error:", error);
      }
    };
    
    fetchAds();
    const intervalId = setInterval(fetchAds, 60000);
    return () => clearInterval(intervalId);
  }, []);

  // Filter advertisements dynamically
  const slides = useMemo(() => {
    const nowTime = Date.now();
    const scheduledAds = activeAds.filter(ad => {
      const start = ad.startAt ? new Date(ad.startAt).getTime() : null;
      const end = ad.endAt ? new Date(ad.endAt).getTime() : null;
      if (start && nowTime < start) return false;
      if (end && nowTime > end) return false;
      return true;
    });

    const list: HeroSlide[] = [
      {
        isDefault: true,
        imageUrl: heroBg,
        title: "L'art du séjour meublé au Burkina Faso",
        description: bSlogan,
        frequency: 12
      }
    ];

    scheduledAds.forEach(ad => {
      list.push({
        isDefault: false,
        imageUrl: ad.imageUrl,
        title: ad.title,
        description: ad.description || "",
        linkUrl: ad.linkUrl,
        frequency: ad.frequencySeconds || 10
      });
    });

    return list;
  }, [activeAds, bSlogan]);

  // Slides rotation timer
  useEffect(() => {
    if (slides.length <= 1) return;

    const currentSlide = slides[currentIndex];
    const durationMs = (currentSlide.frequency || 10) * 1000;

    const timer = setTimeout(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % slides.length);
    }, durationMs);

    return () => clearTimeout(timer);
  }, [currentIndex, slides.length, slides]);

  const currentSlide = slides[currentIndex] || slides[0];

  const handleSlideClick = () => {
    if (currentSlide.linkUrl) {
      window.open(currentSlide.linkUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div 
      className={`relative h-[440px] md:h-[500px] flex items-center justify-center overflow-hidden ${currentSlide.linkUrl ? 'cursor-pointer' : ''}`}
      onClick={handleSlideClick}
      id="homepage-main-hero-carousel"
    >
      {/* Background Image Slide Transition */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`hero-bg-${currentIndex}`}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 overflow-hidden bg-slate-950"
        >
          {currentSlide.isDefault ? (
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${currentSlide.imageUrl})` }}
            />
          ) : (
            <>
              <div 
                className="absolute inset-0 bg-cover bg-center blur-lg opacity-40 scale-105"
                style={{ backgroundImage: `url(${currentSlide.imageUrl})` }}
              />
              <div 
                className="absolute inset-0 bg-contain bg-no-repeat bg-center"
                style={{ backgroundImage: `url(${currentSlide.imageUrl})` }}
              />
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Refined Dark Vignette & Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/50 to-black/30 z-[2]" />

      {/* Slogan & Message Text Content */}
      <div className="relative z-10 text-center px-4 max-w-3xl mt-[-20px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={`hero-text-${currentIndex}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-4"
          >
            {/* Top Quality Badge */}
            <div className="flex justify-center">
              <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md text-white/95 text-[11px] font-semibold tracking-wider px-3.5 py-1.5 rounded-full border border-white/15 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Hospitalité d'Excellence • Burkina Faso</span>
              </span>
            </div>

            {/* Clean Editorial Title */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-tight tracking-tight drop-shadow-md">
              {currentSlide.isDefault ? (
                <>
                  L'art du séjour meublé avec <span className="text-red-500">{bName1}</span><span className="text-emerald-400">{bName2}</span>
                </>
              ) : (
                currentSlide.title
              )}
            </h1>

            {/* Refined Subtitle */}
            <p className="text-sm md:text-base text-slate-200/90 font-medium max-w-2xl mx-auto leading-relaxed px-4 drop-shadow-sm">
              {currentSlide.isDefault ? bSlogan : currentSlide.description}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Feature Badges */}
        {currentSlide.isDefault && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="flex flex-wrap justify-center gap-2.5 text-xs font-semibold text-white/90 mt-6"
          >
            <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/15">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Logements vérifiés
            </span>
            <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/15">
              <HeartHandshake className="w-3.5 h-3.5 text-amber-400" />
              Accueil garanti
            </span>
          </motion.div>
        )}
      </div>

      {/* Slide Index Dots */}
      {slides.length > 1 && (
        <div className="absolute bottom-16 left-0 right-0 z-10 flex justify-center gap-2 select-none">
          {slides.map((_, idx) => {
            const isActive = idx === currentIndex;
            return (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
                }}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${isActive ? 'w-6 bg-red-500' : 'w-1.5 bg-white/40 hover:bg-white/70'}`}
                title={`Diapositive ${idx + 1}`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
