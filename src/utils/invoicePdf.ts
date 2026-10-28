import jsPDF from 'jspdf';
import { OrderItem, AppConfig } from '../types.ts';
import { formatINR, formatDate, getPaymentStatus, formatWhatsAppNumber } from './format.ts';

// Helper to convert image URL to base64 for embedding in jsPDF
async function getBase64ImageFromUrl(
  url: string
): Promise<{ dataUrl: string; width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 800;
        canvas.height = img.naturalHeight || 600;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);

        // Max dimensions on A4: 164mm wide x 175mm high
        const maxW = 164;
        const maxH = 175;
        let w = maxW;
        let h = (canvas.height / canvas.width) * w;
        if (h > maxH) {
          h = maxH;
          w = (canvas.width / canvas.height) * h;
        }
        resolve({ dataUrl, width: w, height: h });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * Creates a two-page vector PDF invoice with payment proof screenshot (if present)
 */
export async function createInvoicePdf(order: OrderItem, config: AppConfig | null): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const invoiceNumber = `INV-${order.code}`;
  const invoiceDate = formatDate(order.billed_at || order.created_at);
  const price = Number(order.price) || 0;
  const paid = Number(order.paid) || 0;
  const balance = Math.max(0, price - paid);
  const paymentStatus = getPaymentStatus(price, paid);
  const hasProof = Boolean(order.payment_proof);

  // ==========================================
  // PAGE 1: OFFICIAL TAX INVOICE
  // ==========================================
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(12, 12, 186, 273, 4, 4, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.roundedRect(12, 12, 186, 273, 4, 4, 'S');

  // Header branding
  doc.setTextColor(67, 56, 202);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(config?.businessName || 'Cutline Studio', 22, 28);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(config?.tagline || 'Video Editing & Social Media Management', 22, 34);
  doc.text(
    `Email: ${config?.email || 'admin@cutlinestudio.in'} | WhatsApp: +${config?.whatsappNumber || '919876543210'}`,
    22,
    39
  );

  // Invoice Number & Date
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(30, 41, 59);
  doc.text(invoiceNumber, 186, 28, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Date: ${invoiceDate}`, 186, 34, { align: 'right' });

  // Status Stamp Badge
  if (paymentStatus.label === 'Paid') {
    doc.setFillColor(236, 253, 245);
    doc.setDrawColor(5, 150, 105);
    doc.setTextColor(5, 150, 105);
  } else if (paymentStatus.label === 'Partial') {
    doc.setFillColor(255, 251, 235);
    doc.setDrawColor(217, 119, 6);
    doc.setTextColor(217, 119, 6);
  } else {
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(220, 38, 38);
    doc.setTextColor(220, 38, 38);
  }
  doc.roundedRect(156, 39, 30, 8, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(paymentStatus.label.toUpperCase(), 171, 44.5, { align: 'center' });

  // Divider line
  doc.setDrawColor(226, 232, 240);
  doc.line(22, 50, 186, 50);

  // Bill To
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('BILLED TO (CLIENT):', 22, 58);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(order.customer_name || 'Valued Client', 22, 65);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Phone: +91 ${order.phone || '-'}`, 22, 70);
  if (order.email) {
    doc.text(`Email: ${order.email}`, 22, 75);
  }

  // Project Reference
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('PROJECT REFERENCE:', 115, 58);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`Service: ${order.service}`, 115, 65);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Target Deadline: ${formatDate(order.deadline)}`, 115, 70);
  doc.text(`Status: ${order.status}`, 115, 75);

  // Table Header
  doc.setFillColor(248, 250, 252);
  doc.rect(22, 85, 164, 9, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(22, 85, 164, 9, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('ITEM & DELIVERABLE DESCRIPTION', 26, 91);
  doc.text('AMOUNT (INR)', 182, 91, { align: 'right' });

  // Table Line Item
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`${order.service} Creative Scope`, 26, 101);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  const splitBrief = doc.splitTextToSize(order.brief || 'Custom video editing and social media delivery.', 115);
  doc.text(splitBrief, 26, 107);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(formatINR(price).replace('₹', 'Rs. '), 182, 102, { align: 'right' });

  // Financial Totals Box
  const summaryY = 145;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Total Invoiced:', 125, summaryY);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(formatINR(price).replace('₹', 'Rs. '), 182, summaryY, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Paid so far:', 125, summaryY + 7);
  doc.setTextColor(5, 150, 105);
  doc.setFont('helvetica', 'bold');
  doc.text(formatINR(paid).replace('₹', 'Rs. '), 182, summaryY + 7, { align: 'right' });

  doc.setDrawColor(226, 232, 240);
  doc.line(125, summaryY + 11, 185, summaryY + 11);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Balance Due:', 125, summaryY + 18);
  if (balance > 0) {
    doc.setTextColor(220, 38, 38);
  } else {
    doc.setTextColor(5, 150, 105);
  }
  doc.text(formatINR(balance).replace('₹', 'Rs. '), 182, summaryY + 18, { align: 'right' });

  // Page 1 Footer notes
  doc.setDrawColor(241, 245, 249);
  doc.line(22, 255, 186, 255);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);

  if (hasProof) {
    doc.setTextColor(5, 150, 105);
    doc.setFont('helvetica', 'bold');
    doc.text('[PAGE 1 OF 2]  * Verified transaction screenshot proof is attached on Page 2.', 104, 261, { align: 'center' });
  }

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Payment terms: Digital transfers accepted via UPI or direct bank transfer. WhatsApp +${config?.whatsappNumber || '919876543210'}.`,
    104,
    267,
    { align: 'center' }
  );

  // ==========================================
  // PAGE 2: OFFICIAL TRANSACTION & PAYMENT PROOF
  // ==========================================
  if (hasProof) {
    doc.addPage();

    // Card border
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(12, 12, 186, 273, 4, 4, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.roundedRect(12, 12, 186, 273, 4, 4, 'S');

    // Page 2 Header
    doc.setTextColor(67, 56, 202);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Payment Verification & Transaction Proof', 22, 26);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Official Accounts & Financial Audit Archive  *  Page 2 of 2  *  Order Reference: ${order.code}`,
      22,
      32
    );

    // Summary metadata box
    doc.setFillColor(248, 250, 252);
    doc.rect(22, 36, 164, 16, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(22, 36, 164, 16, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text('CLIENT NAME:', 26, 42);
    doc.text('TOTAL INVOICED:', 78, 42);
    doc.text('TOTAL PAID:', 122, 42);
    doc.text('STATUS:', 160, 42);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(order.customer_name || 'Client', 26, 48);
    doc.text(formatINR(price).replace('₹', 'Rs. '), 78, 48);
    doc.setTextColor(5, 150, 105);
    doc.text(formatINR(paid).replace('₹', 'Rs. '), 122, 48);
    doc.text(paymentStatus.label.toUpperCase(), 160, 48);

    // Verification banner
    doc.setFillColor(236, 253, 245);
    doc.setDrawColor(5, 150, 105);
    doc.roundedRect(22, 56, 164, 8, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(5, 150, 105);
    doc.text(
      'OFFICIALLY VERIFIED BY CUTLINE STUDIO ADMINISTRATION - STORED IN TRANSACTION PROOFS',
      104,
      61.5,
      { align: 'center' }
    );

    // Embed the screenshot image onto Page 2
    try {
      const imgObj = await getBase64ImageFromUrl(order.payment_proof!);
      if (imgObj) {
        const xPos = 22 + (164 - imgObj.width) / 2;
        doc.addImage(
          imgObj.dataUrl,
          'JPEG',
          xPos,
          68,
          imgObj.width,
          imgObj.height,
          undefined,
          'FAST'
        );
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(`Payment Screenshot: ${order.payment_proof}`, 22, 80);
      }
    } catch (err) {
      console.warn('Could not embed image into jsPDF directly:', err);
    }

    // Page 2 Footer
    doc.setDrawColor(241, 245, 249);
    doc.line(22, 264, 186, 264);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Certified payment screenshot archived in server repository: 'transaction proofs' under reference ${order.code}.`,
      104,
      270,
      { align: 'center' }
    );
  }

  return doc;
}


/**
 * Returns the exact custom WhatsApp message required:
 * "Hi <customer name> your order <order id> is <partially or fully depending on payment done> complete. Kindly find the order bill"
 */
export function getCustomInvoiceMessage(order: OrderItem): string {
  const price = Number(order.price) || 0;
  const paid = Number(order.paid) || 0;
  const isFullyPaid = price > 0 && paid >= price;
  const completionStatus = isFullyPaid ? 'fully' : 'partially';
  const customerName = (order.customer_name || 'Client').trim();
  return `Hi ${customerName} your order ${order.code} is ${completionStatus} complete. Kindly find the order bill`;
}

/**
 * Directly shares the official bill PDF file along with the customized text message.
 * - On Mobile (Android/iOS): Uses Web Share API to attach the PDF file directly to WhatsApp without downloading to the device.
 * - Does NOT send any links (only the PDF file and the exact custom message).
 * - Copies the custom message to clipboard as a fallback.
 * - Strictly blocked if the order is unpaid (paid <= 0).
 */
export async function sendBillPdfViaWhatsApp(
  order: OrderItem,
  config?: AppConfig | null
): Promise<{ success: boolean; sharedWithFile: boolean; phone: string; customMessage: string }> {
  const paid = Number(order.paid) || 0;
  if (paid <= 0) {
    throw new Error('Bill sharing is disabled until partial or full payment is received.');
  }

  const customMessage = getCustomInvoiceMessage(order);
  const cleanPhone = formatWhatsAppNumber(order.phone);
  const invoiceNumber = `INV-${order.code}`;
  const filename = `Invoice_${invoiceNumber}.pdf`;

  // 1. Auto-copy exact custom message to clipboard
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(customMessage);
    } catch {
      // Ignore clipboard permission restrictions
    }
  }

  // 2. Generate full vector PDF in memory (WITHOUT triggering doc.save() download popup)
  const doc = await createInvoicePdf(order, config || null);
  const pdfBlob = doc.output('blob');
  const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });

  // 3. Mobile Web Share (Android / iOS): Directly share the PDF file + custom message to WhatsApp
  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    navigator.canShare &&
    navigator.canShare({ files: [pdfFile] })
  ) {
    try {
      await navigator.share({
        title: `Invoice ${order.code}`,
        text: customMessage,
        files: [pdfFile],
      });
      return { success: true, sharedWithFile: true, phone: cleanPhone, customMessage };
    } catch (shareErr: any) {
      if (shareErr.name === 'AbortError') {
        // User closed or dismissed the share sheet
        return { success: true, sharedWithFile: true, phone: cleanPhone, customMessage };
      }
      console.warn('Web Share failed, falling back:', shareErr);
    }
  }

  // 4. Desktop Fallback (where Web Share with files is unsupported):
  // Download the PDF file to disk and open WhatsApp with the custom message pre-filled
  doc.save(filename);

  const whatsappUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(customMessage)}`
    : `https://wa.me/?text=${encodeURIComponent(customMessage)}`;

  const link = document.createElement('a');
  link.href = whatsappUrl;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  return { success: true, sharedWithFile: false, phone: cleanPhone, customMessage };
}
