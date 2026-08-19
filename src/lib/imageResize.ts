export const resizeImage = (source: File | Blob | string, maxWidth = 800, quality = 0.75): Promise<string> => {
  return new Promise((resolve, reject) => {
    const processImage = (src: string) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width || 400;
          let height = img.height || 400;

          if (width > maxWidth || height > maxWidth) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxWidth) / height);
              height = maxWidth;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return resolve(src);
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        } catch (err) {
          console.warn("Canvas resize failed, returning original src:", err);
          resolve(src);
        }
      };
      img.onerror = (error) => {
        console.warn("Image load failed in resizeImage:", error);
        if (typeof source === 'string') {
          resolve(source);
        } else {
          reject(error);
        }
      };
      img.src = src;
    };

    if (typeof source === 'string') {
      processImage(source);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (!result) return reject(new Error('FileReader empty result'));
        processImage(result);
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(source);
    }
  });
};

