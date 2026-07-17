// Convert hex to RGB
export const hexToRgb = (hex: string): [number, number, number] | null => {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  const fullHex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : null;
};

// Calculate Euclidean distance between two colors in RGB space
export const colorDistance = (hex1: string, hex2: string): number => {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  
  if (!rgb1 || !rgb2) return Infinity;

  const rDiff = rgb1[0] - rgb2[0];
  const gDiff = rgb1[1] - rgb2[1];
  const bDiff = rgb1[2] - rgb2[2];

  return Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff);
};

// Determine if text should be black or white based on background hex color
export const getTextColorForBackground = (hex: string): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#000000';
  // YIQ equation from http://24ways.org/2010/calculating-color-contrast
  const yiq = ((rgb[0] * 299) + (rgb[1] * 587) + (rgb[2] * 114)) / 1000;
  return (yiq >= 128) ? '#000000' : '#FFFFFF';
};

// Convert File to Base64 with optional resizing for mobile
export const fileToBase64 = (file: File, maxWidth = 1024, maxHeight = 1024): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Resize if necessary to prevent payload too large errors on mobile
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = width * ratio;
          height = height * ratio;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
           reject(new Error('Failed to get canvas context'));
           return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        
        // Use jpeg for smaller payload size, adjust quality as needed
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        const base64 = dataUrl.split(',')[1];
        resolve(base64);
      };
      img.onerror = () => reject(new Error('Failed to load image for resizing'));
      if (typeof event.target?.result === 'string') {
          img.src = event.target.result;
      } else {
          reject(new Error('Failed to read file'));
      }
    };
    reader.onerror = error => reject(error);
  });
};

// Crop the bottom portion of a base64 image (useful for isolating summary tables)
export const cropBottomPortion = (base64: string, bottomRatio: number = 0.35): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('No canvas context'));
      
      const cropHeight = img.height * bottomRatio;
      const startY = img.height - cropHeight;
      
      canvas.width = img.width;
      canvas.height = cropHeight;
      
      // Draw only the bottom portion
      ctx.drawImage(img, 0, startY, img.width, cropHeight, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = () => reject(new Error('Failed to load image for cropping'));
    img.src = base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`;
  });
};

// Generate a unique ID
export const generateId = () => Math.random().toString(36).substring(2, 9);
