import jsPDF from 'jspdf';
import { PayoutBillData } from '../types.ts';
import { formatINR, formatDate, formatWhatsAppNumber } from './format.ts';

// Helper to convert proof image to canvas data URL for embedding in jsPDF
async function getImageDataForPdf(
  url: string
): Promise<{ dataUrl: string; width: number; height: number; format: string } | null> {
  return new Promise((resolve) => {
    try {
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
          const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

          // Max dimensions on A4: 164mm wide x 165mm high
          const maxW = 164;
          const maxH = 165;
          let w = maxW;
          let h = (canvas.height / canvas.width) * w;
          if (h > maxH) {
            h = maxH;
            w = (canvas.width / canvas.height) * h;
          }
          resolve({ dataUrl, width: w, height: h, format: 'JPEG' });
        } catch (e) {
          console.warn('Canvas export error:', e);
          if (url.startsWith('data:image/')) {
            const maxW = 164;
            const maxH = 165;
            let w = maxW;
            let h = (img.naturalHeight / (img.naturalWidth || 1)) * w;
            if (h > maxH) {
              h = maxH;
              w = (img.naturalWidth / (img.naturalHeight || 1)) * h;
            }
            return resolve({ dataUrl: url, width: w, height: h, format: 'JPEG' });
          }
          resolve(null);
        }
      };
      img.onerror = () => {
        if (url.startsWith('data:image/')) {
          resolve({ dataUrl: url, width: 140, height: 100, format: 'JPEG' });
        } else {
          resolve(null);
        }
      };
      img.src = url;
    } catch {
      resolve(null);
    }
  });
}

/**
 * Creates high-fidelity 2-page vector PDF settlement voucher for a freelancer payout
 */
export async function createPayoutBillPdf(bill: PayoutBillData): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const referenceCode = bill.code || bill.orderCode || 'PAY-REF';
  const isSettled = bill.payoutStatus === 'settled';
  const formattedDate = bill.payoutAt ? formatDate(bill.payoutAt) : 'Pending Settlement';
  const amountStr = formatINR(bill.freelancerShare);
  const amountClean = amountStr.replace('₹', 'Rs. ');
  const hasProof = Boolean(bill.payoutProof);

  // ==========================================
  // PAGE 1: OFFICIAL SETTLEMENT VOUCHER
  // ==========================================
  // Outer Border Box
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(12, 12, 186, 273, 4, 4, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.roundedRect(12, 12, 186, 273, 4, 4, 'S');

  // Header Branding
  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('CUTLINE STUDIO', 22, 28);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(79, 70, 229); // indigo-600
  doc.text('Premium Video Production & Post-Production Agency', 22, 34);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('Freelancer Project Settlement Bill', 22, 40);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(`Voucher No: PAY-${referenceCode}`, 22, 45);

  // Right-side Status Stamp Badge & Settlement Info
  const statusLabel = isSettled ? 'SETTLED & PAID' : 'PAYOUT DUE / PENDING';
  if (isSettled) {
    doc.setFillColor(236, 253, 245);
    doc.setDrawColor(5, 150, 105);
    doc.setTextColor(4, 120, 87);
  } else {
    doc.setFillColor(255, 251, 235);
    doc.setDrawColor(217, 119, 6);
    doc.setTextColor(180, 83, 9);
  }
  doc.roundedRect(138, 22, 48, 8, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(statusLabel, 162, 27.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Settlement Date: ${formattedDate}`, 186, 36, { align: 'right' });
  doc.text(`Order Code: ${referenceCode}`, 186, 42, { align: 'right' });

  // Header Divider
  doc.setDrawColor(226, 232, 240);
  doc.line(22, 50, 186, 50);

  // Details Grid
  // Left: Freelancer Details
  doc.setFillColor(248, 250, 252);
  doc.rect(22, 56, 79, 24, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(22, 56, 79, 24, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('FREELANCER / EDITOR DETAILS', 26, 62);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(bill.freelancerName || 'Assigned Freelancer', 26, 69);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Assigned Team Member • Video Production', 26, 75);

  // Right: Project Deliverables
  doc.setFillColor(248, 250, 252);
  doc.rect(107, 56, 79, 24, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(107, 56, 79, 24, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('PROJECT DELIVERABLE REFERENCE', 111, 62);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(bill.service || 'Creative Project Scope', 111, 69);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Client: ${bill.customerName || 'Direct Studio Client'}`, 111, 75);

  // Financial Breakdown Line Item Table
  doc.setFillColor(241, 245, 249);
  doc.rect(22, 86, 164, 8, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(22, 86, 164, 8, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('COMPENSATION BREAKDOWN & SPLIT', 26, 91.5);
  doc.text('NET AMOUNT (INR)', 182, 91.5, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Freelancer Share (${100 - (bill.commissionRate || 35)}% of client payment)`, 26, 104);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(amountClean, 182, 104, { align: 'right' });

  // Highlighted Order Payout Price Box
  doc.setFillColor(240, 253, 244); // emerald-50
  doc.roundedRect(22, 119, 164, 22, 2, 2, 'F');
  doc.setDrawColor(187, 247, 208); // emerald-200
  doc.roundedRect(22, 119, 164, 22, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(22, 101, 52); // emerald-800
  doc.text('ORDER PAYOUT PRICE', 27, 128);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(21, 128, 61); // emerald-700
  doc.text('Total compensation earned by freelancer for this order', 27, 135);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(21, 128, 61);
  doc.text(amountClean, 181, 133, { align: 'right' });

  // Payment Reference Note (if present)
  let nextY = 147;
  if (bill.payoutNote) {
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(22, nextY, 164, 16, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(22, nextY, 164, 16, 2, 2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('PAYMENT REFERENCE / TRANSACTION NOTE', 26, nextY + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    const splitNote = doc.splitTextToSize(bill.payoutNote, 156);
    doc.text(splitNote[0] || bill.payoutNote, 26, nextY + 12);
    nextY += 21;
  }

  // Page 1 Proof Banner
  if (hasProof) {
    doc.setFillColor(236, 253, 245);
    doc.roundedRect(22, nextY, 164, 12, 2, 2, 'F');
    doc.setDrawColor(167, 243, 208);
    doc.roundedRect(22, nextY, 164, 12, 2, 2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(5, 150, 105);
    doc.text('✓ Verified Payment Transfer Screenshot Attached (See Page 2)', 104, nextY + 7.5, {
      align: 'center',
    });
  }

  // Page 1 Footer
  doc.setDrawColor(226, 232, 240);
  doc.line(22, 262, 186, 262);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('✓ Certified Order Settlement • Cutline Studio Official Accounting Records', 22, 269);
  doc.text(
    `Generated on ${new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })}`,
    186,
    269,
    { align: 'right' }
  );

  // ==========================================
  // PAGE 2: VERIFIED PAYMENT SCREENSHOT PROOF
  // ==========================================
  if (hasProof) {
    doc.addPage();

    // Outer Frame
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(12, 12, 186, 273, 4, 4, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.roundedRect(12, 12, 186, 273, 4, 4, 'S');

    // Page 2 Header
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Verified Payment Transfer Screenshot Proof', 22, 25);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Official Cutline Studio Accounts • Page 2 of 2 • Voucher PAY-${referenceCode}`,
      22,
      31
    );

    // Summary Box
    doc.setFillColor(248, 250, 252);
    doc.rect(22, 36, 164, 13, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(22, 36, 164, 13, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('FREELANCER:', 26, 42);
    doc.text('VOUCHER NO:', 75, 42);
    doc.text('NET PAYOUT:', 125, 42);
    doc.text('STATUS:', 160, 42);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(bill.freelancerName || 'Freelancer', 26, 47);
    doc.text(`PAY-${referenceCode}`, 75, 47);
    doc.setTextColor(5, 150, 105);
    doc.text(amountClean, 125, 47);
    doc.text(statusLabel, 160, 47);

    // Certification Banner
    doc.setFillColor(236, 253, 245);
    doc.setDrawColor(5, 150, 105);
    doc.roundedRect(22, 54, 164, 8, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(5, 150, 105);
    doc.text('OFFICIALLY VERIFIED TRANSFER PROOF STORED IN STUDIO ACCOUNTS', 104, 59.5, {
      align: 'center',
    });

    // Embed Screenshot Image
    try {
      const imgObj = await getImageDataForPdf(bill.payoutProof!);
      if (imgObj) {
        const xPos = 22 + (164 - imgObj.width) / 2;
        doc.addImage(imgObj.dataUrl, imgObj.format, xPos, 66, imgObj.width, imgObj.height, undefined, 'FAST');
      }
    } catch (err) {
      console.warn('Could not embed proof image in PDF:', err);
    }

    // Page 2 Footer
    doc.setDrawColor(226, 232, 240);
    doc.line(22, 262, 186, 262);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Certified transfer screenshot record for settlement voucher PAY-${referenceCode}.`, 104, 268, {
      align: 'center',
    });
  }

  return doc;
}

/**
 * Returns formatted WhatsApp payout settlement message
 */
export function getPayoutShareMessage(bill: PayoutBillData): string {
  const referenceCode = bill.code || bill.orderCode || 'PAY-REF';
  const name = bill.freelancerName || 'Editor';
  const netAmount = formatINR(bill.freelancerShare);
  const status = bill.payoutStatus === 'settled' ? 'Settled & Paid' : 'Pending Due';

  return `Hi ${name}, here is your payout settlement bill for Project ${referenceCode} (${bill.service}):\n\n• Net Payout: ${netAmount}\n• Status: ${status}\n\nKindly find your official settlement bill attached.\n\nCutline Studio Administration`;
}

/**
 * Shares the official Freelancer Payout Bill PDF file directly via WhatsApp along with the message
 */
export async function sendPayoutBillViaWhatsApp(
  bill: PayoutBillData,
  phone?: string
): Promise<{ success: boolean; sharedWithFile: boolean; customMessage: string }> {
  const referenceCode = bill.code || bill.orderCode || 'PAY-REF';
  const customMessage = getPayoutShareMessage(bill);
  const filename = `CutlineStudio_PayoutBill_${referenceCode}.pdf`;

  // 1. Auto-copy exact custom message to clipboard so user can simply tap 'Add a message...' and paste
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(customMessage);
    } catch {
      // Ignore clipboard permission issues
    }
  }

  // 2. Generate full vector PDF in memory (WITHOUT triggering doc.save() download popup)
  const doc = await createPayoutBillPdf(bill);
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
        title: `Payout Bill ${referenceCode}`,
        text: customMessage,
        files: [pdfFile],
      });
      return { success: true, sharedWithFile: true, customMessage };
    } catch (shareErr: any) {
      if (shareErr.name === 'AbortError') {
        return { success: true, sharedWithFile: true, customMessage };
      }
      console.warn('Web Share failed, fallback to desktop:', shareErr);
    }
  }

  // 4. Desktop Fallback:
  // Download the PDF file to disk and open WhatsApp with the custom message pre-filled
  doc.save(filename);

  const cleanPhone = formatWhatsAppNumber(phone || bill.freelancerPhone || '');
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

  return { success: true, sharedWithFile: false, customMessage };
}
