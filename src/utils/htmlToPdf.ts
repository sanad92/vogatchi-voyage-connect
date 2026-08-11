import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Rasterise an on-screen A4 document element into a paginated PDF.
 * Rendering from the live DOM keeps the PDF pixel-identical to the preview
 * and makes Arabic/RTL text safe (no PDF font-shaping involved).
 */
export async function elementToPdfBlob(el: HTMLElement): Promise<Blob> {
  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    windowWidth: el.scrollWidth,
  });

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const pageHeight = 297;
  const imgHeight = (canvas.height * pageWidth) / canvas.width;

  let remaining = imgHeight;
  let position = 0;
  const imgData = canvas.toDataURL('image/jpeg', 0.94);

  pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, imgHeight, undefined, 'FAST');
  remaining -= pageHeight;

  while (remaining > 1) {
    position -= pageHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'JPEG', 0, position, pageWidth, imgHeight, undefined, 'FAST');
    remaining -= pageHeight;
  }

  return pdf.output('blob');
}

export const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
};
