import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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

    const defaultHeroImage = branding?.heroBackgroundImage || '/rondpm.png';

    const list: HeroSlide[] = [
      {
        isDefault: true,
        imageUrl: defaultHeroImage,
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

  // Preload all slide images for smooth transitions
  useEffect(() => {
    slides.forEach(slide => {
      if (slide.imageUrl) {
        const img = new Image();
        img.src = slide.imageUrl;
      }
    });
  }, [slides]);

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
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 overflow-hidden bg-slate-950"
        >
          {currentSlide.isDefault ? (
            <img 
              src={currentSlide.imageUrl}
              alt="Résidences de standing au Burkina Faso"
              className="w-full h-full object-cover object-center"
              loading="eager"
              // @ts-ignore
              fetchPriority="high"
              decoding="async"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=1920';
              }}
            />
          ) : (
            <>
              <img 
                src={currentSlide.imageUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover blur-md opacity-40 scale-105"
                loading="eager"
                decoding="async"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=1920';
                }}
              />
              <img 
                src={currentSlide.imageUrl}
                alt={currentSlide.title}
                className="absolute inset-0 w-full h-full object-contain object-center"
                loading="eager"
                decoding="async"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=1920';
                }}
              />
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Refined Balanced Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/45 to-slate-900/30 z-[2]" />

      {/* Slogan & Message Text Content */}
      <div className="relative z-10 text-center px-4 max-w-3xl mt-[-10px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={`hero-text-${currentIndex}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-3"
          >
            {/* Clean Editorial Title */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-tight tracking-tight drop-shadow-md">
              {currentSlide.isDefault ? (
                <>
                  L'art du séjour meublé avec <span className="text-[#EF2B2D]">{bName1}</span><span className="text-[#009E49]">{bName2}</span>
                </>
              ) : (
                currentSlide.title
              )}
            </h1>

            {/* Refined Subtitle */}
            <p className="text-sm md:text-base text-slate-200 font-medium max-w-2xl mx-auto leading-relaxed px-4 drop-shadow-sm">
              {currentSlide.isDefault ? bSlogan : currentSlide.description}
            </p>
          </motion.div>
        </AnimatePresence>
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
