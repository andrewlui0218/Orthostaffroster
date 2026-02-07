import { toJpeg } from 'html-to-image';

export const exportRosterAsImage = async (element: HTMLElement, fileName: string = 'roster.jpg') => {
  try {
    const dataUrl = await toJpeg(element, { quality: 0.95, backgroundColor: 'white' });
    const link = document.createElement('a');
    link.download = fileName;
    link.href = dataUrl;
    link.click();
  } catch (error) {
    console.error('Failed to export roster', error);
    alert('Could not export image. Please try again.');
  }
};
