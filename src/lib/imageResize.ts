export const resizeImage = (file: File, maxWidth = 800): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const defaultHeight = (img.height / img.width) * maxWidth;
        
        canvas.width = maxWidth;
        canvas.height = defaultHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('No canvas context');
        ctx.drawImage(img, 0, 0, maxWidth, defaultHeight);

        // Compress quality at 0.6 to keep size tiny for Firestore
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        resolve(dataUrl);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};
