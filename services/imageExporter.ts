import { toBlob } from 'html-to-image';

/**
 * Generates a high-quality JPEG blob of the given element.
 * Uses a pixelRatio of 2 for better clarity on retina displays.
 */
export const generateRosterBlob = async (element: HTMLElement): Promise<Blob | null> => {
  try {
    // Wait for fonts to load (sometimes helps with glitchy text)
    await document.fonts.ready;
    
    return await toBlob(element, { 
      quality: 0.95, 
      backgroundColor: 'white',
      pixelRatio: 2, // 2x resolution for crisp text
    });
  } catch (error) {
    console.error('Failed to generate roster image', error);
    return null;
  }
};

/**
 * Helper to trigger a browser download for a Blob
 */
export const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = fileName;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
};