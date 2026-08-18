import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, X, RefreshCw, Trash2, Eye, FlipHorizontal, AlertTriangle, Image as ImageIcon, Check } from 'lucide-react';
import { resizeImage } from '../../lib/imageResize';

interface DocumentPhotoUploaderProps {
  label?: string;
  sublabel?: string;
  value?: string | string[];
  onChange?: (dataUrl: string) => void;
  onMultipleChange?: (dataUrls: string[]) => void;
  multiple?: boolean;
  compact?: boolean;
  accept?: string;
  aspectRatio?: 'auto' | 'square' | 'video' | 'card';
  placeholderText?: string;
  className?: string;
  required?: boolean;
}

export const DocumentPhotoUploader: React.FC<DocumentPhotoUploaderProps> = ({
  label,
  sublabel,
  value,
  onChange,
  onMultipleChange,
  multiple = false,
  compact = false,
  accept = "image/jpeg, image/png, image/webp",
  aspectRatio = 'card',
  placeholderText = "Téléverser ou prendre une photo",
  className = "",
  required = false
}) => {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera stream on unmount or when modal closes
  const stopCameraStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  // Handle opening live camera
  const startCamera = async (mode: 'user' | 'environment' = facingMode) => {
    setCameraError(null);
    setIsCameraOpen(true);
    
    // Stop any existing stream first
    stopCameraStream();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("L'appareil photo n'est pas supporté par ce navigateur.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn("Camera access failed, falling back to camera file input:", err);
      stopCameraStream();
      setIsCameraOpen(false);
      // Fallback: trigger native file camera capture input
      if (cameraInputRef.current) {
        cameraInputRef.current.click();
      } else if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }
  };

  const closeCamera = () => {
    stopCameraStream();
    setIsCameraOpen(false);
    setCameraError(null);
  };

  const toggleCameraFacing = () => {
    const newMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newMode);
    startCamera(newMode);
  };

  // Capture frame from live video
  const captureFromVideo = () => {
    if (!videoRef.current) return;
    setIsCapturing(true);

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 800;
      canvas.height = video.videoHeight || 600;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        // If user mode (front camera), flip horizontally for mirror effect
        if (facingMode === 'user') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

        handleImageResult(dataUrl);
        closeCamera();
      }
    } catch (e) {
      console.error("Failed to capture photo from camera:", e);
      setCameraError("Échec de la capture. Réessayez ou importez un fichier.");
    } finally {
      setIsCapturing(false);
    }
  };

  // Process selected file or dataUrl
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (multiple && onMultipleChange) {
      const newImages: string[] = [];
      for (let i = 0; i < files.length; i++) {
        try {
          const resized = await resizeImage(files[i], 1200);
          newImages.push(resized);
        } catch (err) {
          console.error("Error resizing image", err);
        }
      }
      const existing = Array.isArray(value) ? value : [];
      onMultipleChange([...existing, ...newImages]);
    } else {
      try {
        const resized = await resizeImage(files[0], 1000);
        handleImageResult(resized);
      } catch (err) {
        // Fallback to FileReader
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            handleImageResult(reader.result);
          }
        };
        reader.readAsDataURL(files[0]);
      }
    }

    // reset input
    e.target.value = '';
  };

  const handleImageResult = (dataUrl: string) => {
    if (multiple && onMultipleChange) {
      const existing = Array.isArray(value) ? value : [];
      onMultipleChange([...existing, dataUrl]);
    } else if (onChange) {
      onChange(dataUrl);
    }
  };

  const handleRemoveImage = (indexToRemove?: number) => {
    if (multiple && onMultipleChange && Array.isArray(value)) {
      if (typeof indexToRemove === 'number') {
        const updated = value.filter((_, idx) => idx !== indexToRemove);
        onMultipleChange(updated);
      } else {
        onMultipleChange([]);
      }
    } else if (onChange) {
      onChange('');
    }
  };

  const singleValue = typeof value === 'string' ? value : (Array.isArray(value) && value.length > 0 ? value[0] : '');
  const imageList = Array.isArray(value) ? value : (typeof value === 'string' && value ? [value] : []);

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Hidden Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Header Label */}
      {(label || sublabel) && (
        <div className="flex items-center justify-between">
          {label && (
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {label} {required && <span className="text-red-500">*</span>}
            </label>
          )}
          {sublabel && (
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">{sublabel}</span>
          )}
        </div>
      )}

      {/* COMPACT MODE (Ideal for forms like CNIB Recto/Verso inside modals) */}
      {compact ? (
        <div>
          {singleValue ? (
            <div className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900 h-24 flex items-center justify-center">
              <img src={singleValue} alt={label || "Document"} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                <button
                  type="button"
                  onClick={() => setPreviewModalUrl(singleValue)}
                  className="p-1.5 bg-white/20 hover:bg-white/40 text-white rounded-lg backdrop-blur-xs transition cursor-pointer"
                  title="Voir l'image"
                >
                  <Eye size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => startCamera()}
                  className="p-1.5 bg-brand-primary/80 hover:bg-brand-primary text-white rounded-lg backdrop-blur-xs transition cursor-pointer"
                  title="Reprendre en photo"
                >
                  <Camera size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveImage()}
                  className="p-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-lg backdrop-blur-xs transition cursor-pointer"
                  title="Supprimer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-800/80 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-2 flex flex-col gap-1.5">
              <p className="text-[10px] font-medium text-slate-400 dark:text-slate-400 text-center truncate">
                {placeholderText}
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition shadow-xs cursor-pointer active:scale-95"
                >
                  <Upload size={12} className="text-slate-500" />
                  <span>Galerie</span>
                </button>
                <button
                  type="button"
                  onClick={() => startCamera()}
                  className="px-2 py-1.5 bg-brand-primary text-white hover:bg-brand-primary-dark rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition shadow-xs cursor-pointer active:scale-95"
                >
                  <Camera size={12} className="text-yellow-300" />
                  <span>Photo</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* STANDARD / LARGE MODE */
        <div className="space-y-3">
          {/* Multiple images display list if applicable */}
          {multiple && imageList.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
              {imageList.map((imgUrl, idx) => (
                <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900 aspect-square">
                  <img src={imgUrl} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1">
                    <button
                      type="button"
                      onClick={() => setPreviewModalUrl(imgUrl)}
                      className="p-1 bg-white/20 hover:bg-white/40 text-white rounded-md transition cursor-pointer"
                    >
                      <Eye size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="p-1 bg-red-600 hover:bg-red-700 text-white rounded-md transition cursor-pointer"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Single preview or main dropzone */}
          {!multiple && singleValue ? (
            <div className="relative group rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-950 max-w-md mx-auto shadow-md">
              <img src={singleValue} alt="Document" className="w-full h-48 object-cover" />
              <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 p-3">
                <button
                  type="button"
                  onClick={() => setPreviewModalUrl(singleValue)}
                  className="px-3 py-2 bg-white/20 hover:bg-white/40 text-white rounded-xl text-xs font-bold backdrop-blur-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Eye size={14} />
                  <span>Agrandir</span>
                </button>
                <button
                  type="button"
                  onClick={() => startCamera()}
                  className="px-3 py-2 bg-brand-primary text-white hover:bg-brand-primary-dark rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Camera size={14} />
                  <span>Reprendre photo</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-2 bg-slate-800 text-white hover:bg-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Upload size={14} />
                  <span>Changer</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveImage()}
                  className="p-2 bg-red-600 text-white hover:bg-red-700 rounded-xl transition cursor-pointer"
                  title="Supprimer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ) : (
            /* Main Upload & Photo Box */
            <div className="p-5 sm:p-6 border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/50 rounded-2xl text-center space-y-3 hover:border-brand-primary/50 transition">
              <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 shadow-sm mx-auto flex items-center justify-center text-brand-primary">
                <ImageIcon size={22} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {placeholderText}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                  Formats acceptés : JPG, PNG, WEBP (Max 5 Mo)
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition shadow-xs cursor-pointer active:scale-98"
                >
                  <Upload size={14} className="text-slate-500" />
                  <span>Choisir un fichier</span>
                </button>

                <button
                  type="button"
                  onClick={() => startCamera()}
                  className="px-4 py-2 bg-brand-primary hover:bg-brand-primary-dark text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition shadow-md shadow-red-600/10 cursor-pointer active:scale-98"
                >
                  <Camera size={14} className="text-yellow-400" />
                  <span>Prendre en photo</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* LIVE CAMERA OVERLAY MODAL */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-[2000] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs font-black text-white uppercase tracking-wider">
                  Appareil Photo {facingMode === 'user' ? '(Caméra Avant)' : '(Caméra Arrière)'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleCameraFacing}
                  className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-xl transition cursor-pointer"
                  title="Changer de caméra"
                >
                  <FlipHorizontal size={16} />
                </button>
                <button
                  type="button"
                  onClick={closeCamera}
                  className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Video Viewport */}
            <div className="relative bg-black flex-1 flex items-center justify-center overflow-hidden min-h-[280px]">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className={`w-full h-full max-h-[380px] object-contain ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />

              {/* Document framing overlay */}
              <div className="absolute inset-6 border-2 border-dashed border-white/40 rounded-xl pointer-events-none flex items-center justify-center">
                <div className="text-[10px] font-black uppercase tracking-widest text-white/70 bg-black/50 px-3 py-1 rounded-full backdrop-blur-xs">
                  Cadrez le document / la photo ici
                </div>
              </div>

              {cameraError && (
                <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center text-red-400 z-30">
                  <AlertTriangle size={32} className="mb-2" />
                  <p className="text-xs font-bold leading-normal mb-4">{cameraError}</p>
                  <button
                    type="button"
                    onClick={() => {
                      closeCamera();
                      fileInputRef.current?.click();
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider"
                  >
                    Utiliser les fichiers
                  </button>
                </div>
              )}
            </div>

            {/* Controls Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={closeCamera}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={captureFromVideo}
                disabled={isCapturing}
                className="px-6 py-2.5 bg-brand-primary hover:bg-brand-primary-dark text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition shadow-lg shadow-red-600/30 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isCapturing ? (
                  <RefreshCw size={16} className="animate-spin text-white" />
                ) : (
                  <Camera size={16} className="text-yellow-300" />
                )}
                <span>Capturer la photo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX PREVIEW MODAL */}
      {previewModalUrl && (
        <div 
          className="fixed inset-0 z-[2100] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewModalUrl(null)}
        >
          <div className="relative max-w-3xl max-h-[85vh] overflow-hidden rounded-2xl bg-black border border-slate-800 shadow-2xl" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setPreviewModalUrl(null)}
              className="absolute top-3 right-3 p-2 bg-slate-900/80 hover:bg-slate-900 text-white rounded-full transition z-10 cursor-pointer"
            >
              <X size={18} />
            </button>
            <img src={previewModalUrl} alt="Aperçu grand format" className="max-w-full max-h-[80vh] object-contain" />
          </div>
        </div>
      )}
    </div>
  );
};
