import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import heroBg from '../../assets/images/rond_point_martyrs_bg_1780477317904.png';
import { Advertisement } from '../../types';
import { apiFetch } from '../../lib/api';

interface HeroSlide {
  isDefault: boolean;
  imageUrl: string;
  title: string;
  description: string;
  linkUrl?: string;
  frequency: number;
}

export const Hero: React.FC = () => {
  const [activeAds, setActiveAds] = useState<Advertisement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Fetch advertisements
  useEffect(() => {
    const fetchAds = async () => {
      try {
        const response = await apiFetch('/api/ads');
        if (!response.ok) throw new Error('Failed to fetch ads');
        const list: Advertisement[] = await response.json();
        const activeOnly = list.filter(item => item.isActive);
        activeOnly.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setActiveAds(activeOnly);
      } catch (error) {
        console.error("Hero ads fetch error (silently falling back to premium default):", error);
      }
    };
    
    fetchAds();
    const intervalId = setInterval(fetchAds, 60000); // refresh every minute
    return () => clearInterval(intervalId);
  }, []);

  // Filter advertisements dynamically based on active dates schedules
  const now = new Date().getTime();
  const scheduledAds = activeAds.filter(ad => {
    const start = ad.startAt ? new Date(ad.startAt).getTime() : null;
    const end = ad.endAt ? new Date(ad.endAt).getTime() : null;
    if (start && now < start) return false;
    if (end && now > end) return false;
    return true;
  });

  // Set up carousel slides (default monument bg + active promotional posters)
  const slides: HeroSlide[] = [
    {
      isDefault: true,
      imageUrl: heroBg,
      title: "Trouvez votre chez-soi au Burkina Faso",
      description: "Découvrez les plus belles résidences meublées, villas et appartements pour vos séjours à Ouagadougou, Bobo et partout ailleurs.",
      frequency: 12
    },
    ...scheduledAds.map(ad => ({
      isDefault: false,
      imageUrl: ad.imageUrl,
      title: ad.title,
      description: ad.description || "",
      linkUrl: ad.linkUrl,
      frequency: ad.frequencySeconds || 10
    }))
  ];

  // Dynamic slides rotation timer based on current slide's duration
  useEffect(() => {
    if (slides.length <= 1) return;

    const currentSlide = slides[currentIndex];
    const durationMs = (currentSlide.frequency || 10) * 1000;

    const timer = setTimeout(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % slides.length);
    }, durationMs);

    return () => clearTimeout(timer);
  }, [currentIndex, slides]);

  const currentSlide = slides[currentIndex] || slides[0];

  const handleSlideClick = () => {
    if (currentSlide.linkUrl) {
      window.open(currentSlide.linkUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div 
      className={`relative h-[420px] md:h-[520px] flex items-center justify-center overflow-hidden ${currentSlide.linkUrl ? 'cursor-pointer' : ''}`}
      onClick={handleSlideClick}
      id="homepage-main-hero-carousel"
    >
      {/* Background Image Slide Transition */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`hero-bg-${currentIndex}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: `url(${currentSlide.imageUrl})`,
            backgroundColor: '#121212'
          }}
        />
      </AnimatePresence>

      {/* Hero dark glass overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-transparent z-[2]" />

      {/* Slogan & Message Text Content */}
      <div className="relative z-10 text-center px-4 max-w-4xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={`hero-text-${currentIndex}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            {/* Advertisement Badge if it is a promoter slide */}
            {!currentSlide.isDefault && (
              <span className="inline-flex items-center gap-1.5 bg-[#EF2B2D] text-white text-[9px] font-black uppercase tracking-[0.2em] px-3.5 py-1.5 rounded-full select-none border border-red-400/30 shadow-lg">
                📢 Publicité
              </span>
            )}

            <h1 className="text-2xl md:text-6xl font-black text-white leading-[1.15] md:leading-tight tracking-tight drop-shadow-2xl">
              {currentSlide.isDefault ? (
                <>
                  Trouvez votre <span className="text-yellow-400">chez-soi</span> au <span className="relative inline-block text-white">Burkina Faso<span className="absolute -bottom-1 left-0 w-full h-1.5 flex rounded-full overflow-hidden"><span className="flex-1 bg-red-600"></span><span className="flex-1 bg-green-600"></span></span></span>
                </>
              ) : (
                currentSlide.title
              )}
            </h1>

            <p className="text-sm md:text-lg text-slate-200 font-bold max-w-2xl mx-auto drop-shadow-lg leading-relaxed px-4">
              {currentSlide.description}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Feature badges (Hospitality, Safety, Comfort) on active landing */}
        {currentSlide.isDefault && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap justify-center gap-4 text-xs font-bold uppercase tracking-widest text-white/85 mt-8"
          >
            <span className="flex items-center gap-2 bg-black/25 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-sm animate-pulse-slow">
              <span className="w-2.5 h-2.5 bg-red-600 rounded-full"></span>
              Hospitalité
            </span>
            <span className="flex items-center gap-2 bg-black/25 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-sm animate-pulse-slow">
              <span className="w-2.5 h-2.5 bg-[#009E49] rounded-full"></span>
              Sûreté
            </span>
            <span className="flex items-center gap-2 bg-black/25 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-sm animate-pulse-slow">
              <span className="w-2.5 h-2.5 bg-[#FCD116] rounded-full shadow-[0_0_8px_rgba(252,209,22,0.4)]"></span>
              Confort
            </span>
          </motion.div>
        )}

        {/* Dynamic CTA click prompt for advertiser redirection */}
        {!currentSlide.isDefault && currentSlide.linkUrl && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="inline-block mt-8 bg-white/15 hover:bg-white/20 backdrop-blur-md text-white border border-white/15 px-6 py-3 rounded-2xl text-[10px] uppercase font-black tracking-widest transition-all shadow-md active:scale-95 select-none"
          >
            En savoir plus ➔
          </motion.div>
        )}
      </div>

      {/* Slide Index Progress Dots Indicators */}
      {slides.length > 1 && (
        <div className="absolute bottom-6 left-0 right-0 z-10 flex justify-center gap-2.5 select-none">
          {slides.map((_, idx) => {
            const isActive = idx === currentIndex;
            // Burkinabè Flag Color scheme indicator styling
            const colorClass = idx === 0 ? "bg-red-500" : idx % 2 === 1 ? "bg-green-500" : "bg-yellow-500";
            return (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent trigger link redirect on bullet click
                  setCurrentIndex(idx);
                }}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${isActive ? `w-8 ${colorClass}` : 'w-2 bg-white/45 hover:bg-white/70'}`}
                title={`Aller à la diapositive ${idx + 1}`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
