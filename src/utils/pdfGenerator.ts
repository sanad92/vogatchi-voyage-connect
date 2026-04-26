import jsPDF from 'jspdf';

export interface DocumentData {
  documentType: 'invoice' | 'voucher' | 'receipt';
  documentNumber: string;
  date: string;
  dueDate?: string;
  
  // Company
  companyName: string;
  companyLogo?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyAddress?: string;
  
  // Customer
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  
  // Items
  items: DocumentItem[];
  
  // Totals
  subtotal: number;
  discount?: number;
  vat?: number;
  vatRate?: number;
  totalAmount: number;
  paidAmount?: number;
  remainingAmount?: number;
  currency: string;
  
  // Template
  headerColor?: string;
  accentColor?: string;
  footerText?: string;
  bankDetails?: string;
  termsText?: string;
  notesText?: string;
  showLogo?: boolean;
  
  // Booking details
  bookingReference?: string;
  travelDate?: string;
  returnDate?: string;
  destination?: string;
  hotelName?: string;
  numberOfNights?: number;
  numberOfGuests?: number;
  paymentMethod?: string;
  paymentStatus?: string;
}

export interface DocumentItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

const TITLE_MAP: Record<string, string> = {
  invoice: 'INVOICE',
  voucher: 'BOOKING VOUCHER',
  receipt: 'PAYMENT RECEIPT',
};

const TITLE_AR_MAP: Record<string, string> = {
  invoice: 'فاتورة',
  voucher: 'إيصال حجز',
  receipt: 'إيصال دفع',
};

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [26, 54, 93];
}

export async function generateDocumentPDF(data: DocumentData): Promise<Blob> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 0;

  const headerColor = hexToRgb(data.headerColor || '#1a365d');
  const accentColor = hexToRgb(data.accentColor || '#2b6cb0');

  // === HEADER BAND ===
  pdf.setFillColor(...headerColor);
  pdf.rect(0, 0, pageWidth, 40, 'F');

  // Company name
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text(data.companyName, margin, 18);

  if (data.companyLogo && data.showLogo !== false) {
    try {
      pdf.addImage(data.companyLogo, 'PNG', pageWidth / 2 - 12, 6, 24, 24);
    } catch (error) {
      console.warn('Unable to render company logo in PDF', error);
    }
  }

  // Company contact info
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  const contactParts: string[] = [];
  if (data.companyPhone) contactParts.push(`Tel: ${data.companyPhone}`);
  if (data.companyEmail) contactParts.push(`Email: ${data.companyEmail}`);
  if (contactParts.length) {
    pdf.text(contactParts.join('  |  '), margin, 26);
  }
  if (data.companyAddress) {
    pdf.text(data.companyAddress, margin, 32);
  }

  // Document type badge
  const docTitle = TITLE_MAP[data.documentType] || 'DOCUMENT';
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  const titleWidth = pdf.getTextWidth(docTitle);
  pdf.text(docTitle, pageWidth - margin - titleWidth, 18);

  // Arabic subtitle
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  const arTitle = TITLE_AR_MAP[data.documentType] || '';
  const arWidth = pdf.getTextWidth(arTitle);
  pdf.text(arTitle, pageWidth - margin - arWidth, 26);

  y = 50;

  // === DOCUMENT INFO BAR ===
  pdf.setFillColor(245, 247, 250);
  pdf.rect(margin, y, contentWidth, 20, 'F');
  pdf.setDrawColor(220, 220, 220);
  pdf.rect(margin, y, contentWidth, 20, 'S');

  pdf.setTextColor(60, 60, 60);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Document #:', margin + 4, y + 8);
  pdf.setFont('helvetica', 'normal');
  pdf.text(data.documentNumber, margin + 30, y + 8);

  pdf.setFont('helvetica', 'bold');
  pdf.text('Date:', margin + 80, y + 8);
  pdf.setFont('helvetica', 'normal');
  pdf.text(data.date, margin + 95, y + 8);

  if (data.dueDate) {
    pdf.setFont('helvetica', 'bold');
    pdf.text('Due Date:', margin + 130, y + 8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(data.dueDate, margin + 152, y + 8);
  }

  if (data.paymentStatus) {
    pdf.setFont('helvetica', 'bold');
    pdf.text('Status:', margin + 4, y + 15);
    pdf.setFont('helvetica', 'normal');
    pdf.text(data.paymentStatus, margin + 22, y + 15);
  }

  if (data.bookingReference) {
    pdf.setFont('helvetica', 'bold');
    pdf.text('Booking Ref:', margin + 80, y + 15);
    pdf.setFont('helvetica', 'normal');
    pdf.text(data.bookingReference, margin + 108, y + 15);
  }

  y += 28;

  // === CUSTOMER INFO ===
  pdf.setFillColor(...accentColor);
  pdf.rect(margin, y, contentWidth, 7, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Bill To / Customer Information', margin + 4, y + 5);
  y += 10;

  pdf.setTextColor(30, 30, 30);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text(data.customerName, margin + 4, y + 6);
  y += 8;

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(80, 80, 80);
  if (data.customerPhone) { pdf.text(`Phone: ${data.customerPhone}`, margin + 4, y + 4); y += 5; }
  if (data.customerEmail) { pdf.text(`Email: ${data.customerEmail}`, margin + 4, y + 4); y += 5; }
  if (data.customerAddress) { pdf.text(`Address: ${data.customerAddress}`, margin + 4, y + 4); y += 5; }

  y += 6;

  // === BOOKING DETAILS (for voucher) ===
  if (data.documentType === 'voucher' && (data.destination || data.hotelName || data.travelDate)) {
    pdf.setFillColor(...accentColor);
    pdf.rect(margin, y, contentWidth, 7, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Booking Details', margin + 4, y + 5);
    y += 10;

    pdf.setTextColor(30, 30, 30);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');

    const details: string[] = [];
    if (data.destination) details.push(`Destination: ${data.destination}`);
    if (data.hotelName) details.push(`Hotel: ${data.hotelName}`);
    if (data.travelDate) details.push(`Travel Date: ${data.travelDate}`);
    if (data.returnDate) details.push(`Return Date: ${data.returnDate}`);
    if (data.numberOfNights) details.push(`Nights: ${data.numberOfNights}`);
    if (data.numberOfGuests) details.push(`Guests: ${data.numberOfGuests}`);

    details.forEach(d => {
      pdf.text(d, margin + 4, y + 4);
      y += 5;
    });
    y += 4;
  }

  // === ITEMS TABLE ===
  if (data.items.length > 0) {
    // Table header
    pdf.setFillColor(...headerColor);
    pdf.rect(margin, y, contentWidth, 8, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');

    const col1 = margin + 4;
    const col2 = margin + 100;
    const col3 = margin + 120;
    const col4 = margin + 150;

    pdf.text('Description', col1, y + 5.5);
    pdf.text('Qty', col2, y + 5.5);
    pdf.text('Unit Price', col3, y + 5.5);
    pdf.text('Total', col4, y + 5.5);
    y += 10;

    // Table rows
    pdf.setTextColor(30, 30, 30);
    pdf.setFont('helvetica', 'normal');

    data.items.forEach((item, index) => {
      if (y > 250) {
        pdf.addPage();
        y = 20;
      }

      const bgColor = index % 2 === 0 ? 255 : 248;
      pdf.setFillColor(bgColor, bgColor, bgColor);
      pdf.rect(margin, y - 2, contentWidth, 8, 'F');

      pdf.setFontSize(9);
      // Truncate long descriptions
      const desc = item.description.length > 50 ? item.description.substring(0, 47) + '...' : item.description;
      pdf.text(desc, col1, y + 4);
      pdf.text(String(item.quantity), col2, y + 4);
      pdf.text(formatNumber(item.unitPrice), col3, y + 4);
      pdf.text(formatNumber(item.total), col4, y + 4);
      y += 8;
    });

    // Line under table
    pdf.setDrawColor(200, 200, 200);
    pdf.line(margin, y, margin + contentWidth, y);
    y += 4;
  }

  // === TOTALS ===
  const totalsX = margin + 110;
  const totalsValX = margin + 160;

  pdf.setFontSize(9);
  pdf.setTextColor(60, 60, 60);

  pdf.setFont('helvetica', 'normal');
  pdf.text('Subtotal:', totalsX, y + 4);
  pdf.text(`${formatNumber(data.subtotal)} ${data.currency}`, totalsValX, y + 4);
  y += 6;

  if (data.discount && data.discount > 0) {
    pdf.text('Discount:', totalsX, y + 4);
    pdf.text(`-${formatNumber(data.discount)} ${data.currency}`, totalsValX, y + 4);
    y += 6;
  }

  if (data.vat && data.vat > 0) {
    pdf.text(`VAT (${data.vatRate || 0}%):`, totalsX, y + 4);
    pdf.text(`${formatNumber(data.vat)} ${data.currency}`, totalsValX, y + 4);
    y += 6;
  }

  // Total
  pdf.setFillColor(...headerColor);
  pdf.rect(totalsX - 5, y, contentWidth - totalsX + margin + 5, 9, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text('TOTAL:', totalsX, y + 6.5);
  pdf.text(`${formatNumber(data.totalAmount)} ${data.currency}`, totalsValX, y + 6.5);
  y += 14;

  // Paid / Remaining for receipt
  if (data.documentType === 'receipt' || data.paidAmount !== undefined) {
    pdf.setTextColor(60, 60, 60);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    if (data.paidAmount !== undefined) {
      pdf.text('Paid Amount:', totalsX, y + 4);
      pdf.text(`${formatNumber(data.paidAmount)} ${data.currency}`, totalsValX, y + 4);
      y += 6;
    }
    if (data.remainingAmount !== undefined && data.remainingAmount > 0) {
      pdf.setTextColor(200, 0, 0);
      pdf.text('Remaining:', totalsX, y + 4);
      pdf.text(`${formatNumber(data.remainingAmount)} ${data.currency}`, totalsValX, y + 4);
      y += 6;
    }
    if (data.paymentMethod) {
      pdf.setTextColor(60, 60, 60);
      pdf.text('Payment Method:', totalsX, y + 4);
      pdf.text(data.paymentMethod, totalsValX, y + 4);
      y += 6;
    }
  }

  y += 6;

  // === BANK DETAILS ===
  if (data.bankDetails) {
    if (y > 240) { pdf.addPage(); y = 20; }
    pdf.setFillColor(245, 247, 250);
    pdf.rect(margin, y, contentWidth, 20, 'F');
    pdf.setTextColor(60, 60, 60);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Bank Details:', margin + 4, y + 6);
    pdf.setFont('helvetica', 'normal');
    const bankLines = data.bankDetails.split('\n');
    bankLines.forEach((line, i) => {
      pdf.text(line, margin + 4, y + 12 + i * 4);
    });
    y += 24;
  }

  // === TERMS ===
  if (data.termsText) {
    if (y > 250) { pdf.addPage(); y = 20; }
    pdf.setTextColor(100, 100, 100);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'italic');
    pdf.text('Terms & Conditions:', margin, y + 4);
    const termLines = pdf.splitTextToSize(data.termsText, contentWidth);
    pdf.setFont('helvetica', 'normal');
    pdf.text(termLines, margin, y + 9);
    y += 10 + termLines.length * 3;
  }

  // === NOTES ===
  if (data.notesText) {
    if (y > 255) { pdf.addPage(); y = 20; }
    pdf.setTextColor(100, 100, 100);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Notes:', margin, y + 4);
    pdf.setFont('helvetica', 'normal');
    const noteLines = pdf.splitTextToSize(data.notesText, contentWidth);
    pdf.text(noteLines, margin, y + 9);
  }

  // === FOOTER ===
  const footerY = 285;
  pdf.setDrawColor(...accentColor);
  pdf.line(margin, footerY - 5, margin + contentWidth, footerY - 5);
  pdf.setTextColor(150, 150, 150);
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  const footerText = data.footerText || `${data.companyName} - Thank you for your business`;
  pdf.text(footerText, pageWidth / 2, footerY, { align: 'center' });
  pdf.text(`Generated on ${new Date().toLocaleDateString('en-GB')}`, pageWidth / 2, footerY + 4, { align: 'center' });

  return pdf.output('blob');
}

function formatNumber(num: number): string {
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
