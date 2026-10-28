import React, { useRef, useState } from 'react';
import {
  X,
  Printer,
  Download,
  Video,
  CheckCircle,
  FileDown,
  Loader2,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Send,
} from 'lucide-react';
import jsPDF from 'jspdf';
import { OrderItem, AppConfig } from '../types.ts';
import { formatINR, formatDate, getPaymentStatus } from '../utils/format.ts';
import { sendBillPdfViaWhatsApp } from '../utils/invoicePdf.ts';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: OrderItem | null;
  config: AppConfig | null;
}

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

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  isOpen,
  onClose,
  order,
  config,
}) => {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [sendingBill, setSendingBill] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [pageView, setPageView] = useState<'both' | 'page1' | 'page2'>('both');

  if (!isOpen || !order) return null;

  const invoiceNumber = `INV-${order.code}`;
  const invoiceDate = formatDate(order.billed_at || order.created_at);
  const price = Number(order.price) || 0;
  const paid = Number(order.paid) || 0;
  const balance = Math.max(0, price - paid);
  const paymentStatus = getPaymentStatus(price, paid);
  const hasProof = Boolean(order.payment_proof);

  // User requirement: Default message format:
  // "Hi <customer name > your order <order id > is <partially or fully depending on payment done > complete. Kindly find the order bill"
  const isFullyPaid = price > 0 && paid >= price;
  const completionStatus = isFullyPaid ? 'fully' : 'partially';
  const customerName = (order.customer_name || 'Client').trim();
  const defaultMessage = `Hi ${customerName} your order ${order.code} is ${completionStatus} complete. Kindly find the order bill`;

  // High-fidelity vector PDF generator with Page 2 Proof embedding
  const createVectorPdf = async (): Promise<jsPDF> => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

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
    doc.text(`Email: ${config?.email} | WhatsApp: +${config?.whatsappNumber}`, 22, 39);

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
      `Payment terms: Digital transfers accepted via UPI or direct bank transfer. WhatsApp +${config?.whatsappNumber}.`,
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
      doc.setFontSize(16);
      doc.text('Payment Verification & Transaction Proof', 22, 25);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Official Cutline Studio Accounts Record  |  Page 2 of 2  |  Invoice Ref: ${invoiceNumber}`,
        22,
        31
      );

      // Metadata summary box
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
  };

  const handleSavePdf = async () => {
    try {
      setGeneratingPdf(true);
      setDownloadSuccess(false);

      const vectorPdf = await createVectorPdf();
      vectorPdf.save(`Invoice_${invoiceNumber}.pdf`);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      console.error('Error generating PDF:', err);
      handleDownloadHtml();
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Opens WhatsApp directly into client's DM with custom message and official bill link
  const handleSendBill = async () => {
    if (paid <= 0) {
      return;
    }

    try {
      setSendingBill(true);
      setDownloadSuccess(false);
      await sendBillPdfViaWhatsApp(order, config);
      setSendSuccess(true);
      setTimeout(() => setSendSuccess(false), 4000);
    } catch (err) {
      console.error('Error sending bill via WhatsApp:', err);
    } finally {
      setSendingBill(false);
    }
  };

  const handlePrint = () => {
    try {
      window.print();
    } catch (e) {
      console.warn('Browser print failed, downloading PDF directly:', e);
      handleSavePdf();
    }
  };

  const handleDownloadHtml = () => {
    const proofHtml = hasProof
      ? `
    <div style="page-break-before: always; break-before: page; margin-top: 50px; padding-top: 30px; border-top: 2px dashed #cbd5e1;">
      <div class="header">
        <div>
          <div class="title" style="font-size: 22px;">Payment Verification & Transaction Proof</div>
          <div style="font-size: 13px; color: #64748b; margin-top: 4px;">Official Cutline Studio Accounts &bull; Page 2 of 2 &bull; Stored in 'transaction proofs'</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 16px; font-weight: 800;">${invoiceNumber}</div>
          <div style="font-size: 12px; color: #64748b;">Billed: ${invoiceDate}</div>
        </div>
      </div>
      <div style="background: #ecfdf5; border: 1px solid #10b981; color: #047857; padding: 12px 16px; border-radius: 12px; font-size: 13px; font-weight: 600; margin-bottom: 24px;">
        &#10003; Payment Verified &bull; Total Paid: ${formatINR(paid)} of ${formatINR(price)} (${paymentStatus.label})
      </div>
      <div style="text-align: center; margin: 20px 0;">
        <img src="${order.payment_proof}" style="max-width: 100%; max-height: 700px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);" alt="Payment Screenshot Proof" />
      </div>
      ${order.payment_note ? `<div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 14px; border-radius: 8px; font-size: 13px; color: #475569;"><strong>Transaction Notes:</strong> ${order.payment_note}</div>` : ''}
      <div class="footer">
        Certified payment proof screenshot permanently stored in 'transaction proofs' directory. Verified by Cutline Studio Administration.
      </div>
    </div>`
      : '';

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoiceNumber} - ${config?.businessName || 'Cutline Studio'}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 40px; }
    .invoice-box { max-width: 800px; margin: auto; padding: 35px; border: 1px solid #e2e8f0; background: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #f1f5f9; padding-bottom: 25px; margin-bottom: 30px; }
    .title { font-size: 26px; font-weight: 800; color: #4338ca; }
    .stamp { display: inline-block; padding: 6px 14px; border-radius: 8px; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; border: 2px solid; }
    .stamp-paid { color: #059669; border-color: #059669; background: #ecfdf5; }
    .stamp-partial { color: #d97706; border-color: #d97706; background: #fffbeb; }
    .stamp-unpaid { color: #dc2626; border-color: #dc2626; background: #fef2f2; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
    .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 8px; }
    .table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    .table th { background: #f8fafc; text-align: left; padding: 12px; font-size: 13px; color: #475569; border-bottom: 2px solid #e2e8f0; }
    .table td { padding: 14px 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
    .total-box { margin-left: auto; width: 320px; border-top: 2px solid #e2e8f0; padding-top: 15px; }
    .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
    .total-due { font-size: 18px; font-weight: 800; color: #0f172a; border-top: 1px solid #e2e8f0; padding-top: 10px; margin-top: 6px; }
    .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 20px; }
    @media print {
      body { background: #fff; padding: 0; }
      .invoice-box { border: none; box-shadow: none; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="invoice-box">
    <!-- PAGE 1: INVOICE -->
    <div class="header">
      <div>
        <div class="title">${config?.businessName || 'Cutline Studio'}</div>
        <div style="font-size: 13px; color: #64748b; margin-top: 4px;">${config?.tagline || 'Video Editing & Social Media Management'}</div>
        <div style="font-size: 13px; color: #64748b; margin-top: 2px;">Email: ${config?.email} | WhatsApp: +${config?.whatsappNumber}</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 20px; font-weight: 800;">${invoiceNumber}</div>
        <div style="font-size: 13px; color: #64748b; margin: 4px 0 10px 0;">Date: ${invoiceDate}</div>
        <div class="stamp stamp-${paymentStatus.label.toLowerCase()}">${paymentStatus.label}</div>
      </div>
    </div>

    <div class="grid">
      <div>
        <div class="section-title">Bill To:</div>
        <div style="font-size: 16px; font-weight: 700;">${order.customer_name || 'Client'}</div>
        <div style="font-size: 14px; color: #475569; margin-top: 4px;">Phone: +91 ${order.phone || '-'}</div>
        ${order.email ? `<div style="font-size: 14px; color: #475569;">Email: ${order.email}</div>` : ''}
      </div>
      <div>
        <div class="section-title">Project Reference:</div>
        <div style="font-size: 14px; color: #334155;"><strong>Service:</strong> ${order.service}</div>
        <div style="font-size: 14px; color: #334155; margin-top: 4px;"><strong>Target Deadline:</strong> ${formatDate(order.deadline)}</div>
      </div>
    </div>

    <table class="table">
      <thead>
        <tr>
          <th>Description & Deliverables</th>
          <th style="text-align: right; width: 140px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <div style="font-weight: 600;">${order.service} Production</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 4px;">${order.brief}</div>
          </td>
          <td style="text-align: right; font-weight: 700; font-size: 15px;">${formatINR(price)}</td>
        </tr>
      </tbody>
    </table>

    <div class="total-box">
      <div class="total-row"><span>Total Invoiced:</span><span style="font-weight: 600;">${formatINR(price)}</span></div>
      <div class="total-row"><span>Amount Paid:</span><span style="font-weight: 600; color: #059669;">${formatINR(paid)}</span></div>
      <div class="total-row total-due"><span>Balance Due:</span><span style="color: ${balance > 0 ? '#dc2626' : '#059669'};">${formatINR(balance)}</span></div>
    </div>

    <div class="footer">
      Thank you for your business! Direct all payment slips and inquiries to WhatsApp +${config?.whatsappNumber}.
      ${hasProof ? '<div style="color: #059669; font-weight: 600; margin-top: 6px;">&#10003; Official transaction proof screenshot attached on Page 2</div>' : ''}
    </div>

    <!-- PAGE 2: TRANSACTION PROOF -->
    ${proofHtml}
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Invoice_${invoiceNumber}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto no-scrollbar modal-scroll-lock">
      <div className="relative w-full max-w-3xl bg-white text-slate-900 rounded-3xl shadow-2xl p-4 sm:p-8 my-1 sm:my-8 overflow-hidden print-invoice-card max-h-[92vh] overflow-y-auto no-scrollbar scrollbar-none">
        {/* Modal Controls (Hidden in print) */}
        <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-4 mb-6 gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              Official Tax Invoice & Bill
            </span>
            {hasProof && (
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Page 2 Proof Attached
              </span>
            )}
            {downloadSuccess && (
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> PDF Saved!
              </span>
            )}
            {sendSuccess && (
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-emerald-300">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> PDF Attached! Message copied to clipboard (Paste in WhatsApp)
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Page View Switcher for Screen */}
            <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs">
              <button
                type="button"
                onClick={() => setPageView('both')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  pageView === 'both' ? 'bg-white shadow text-slate-900 font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="View full 2-page document"
              >
                Full Bill (Both Pages)
              </button>
              <button
                type="button"
                onClick={() => setPageView('page1')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  pageView === 'page1' ? 'bg-white shadow text-slate-900 font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="View Page 1 only"
              >
                Page 1
              </button>
              <button
                type="button"
                onClick={() => setPageView('page2')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  pageView === 'page2' ? 'bg-white shadow text-slate-900 font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="View Page 2 only"
              >
                Page 2 (Proof)
              </button>
            </div>

            {/* Send Bill Button with PDF & Custom Status Message */}
            <button
              onClick={handleSendBill}
              disabled={sendingBill || generatingPdf || paid <= 0}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                paid <= 0
                  ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/25 active:scale-98 cursor-pointer disabled:opacity-60'
              }`}
              title={
                paid <= 0
                  ? 'Disabled: Bill sharing is only active when partial or full payment is received'
                  : 'Send bill in PDF format with custom status message'
              }
            >
              {sendingBill ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Sending Bill...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Bill</span>
                </>
              )}
            </button>

            {/* Primary Direct Save as PDF button */}
            <button
              onClick={handleSavePdf}
              disabled={generatingPdf || sendingBill}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 active:scale-98 transition-all disabled:opacity-60"
              title="Save multi-page PDF with proof included"
            >
              {generatingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Save as PDF</span>
                </>
              )}
            </button>

            {/* Print button */}
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              title="Print via browser dialog (Page 1 + Page 2)"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Bill</span>
            </button>

            {/* HTML download */}
            <button
              onClick={handleDownloadHtml}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              title="Download standalone HTML file with proof"
            >
              <Download className="w-3.5 h-3.5" />
              <span>HTML</span>
            </button>

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable & Canvas Container */}
        <div ref={invoiceRef} className="bg-white p-2 sm:p-4 rounded-xl">
          {/* ============================================================== */}
          {/* PAGE 1: OFFICIAL TAX INVOICE */}
          {/* ============================================================== */}
          {(pageView === 'both' || pageView === 'page1') && (
            <div className="page-1-wrapper">
              {/* Invoice Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start border-b border-slate-200 pb-6 mb-6 gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                      <Video className="w-4 h-4" />
                    </div>
                    <span className="text-2xl font-black tracking-tight text-slate-900">
                      {config?.businessName || 'Cutline Studio'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    {config?.tagline || 'Video Editing & Social Media Management'}
                  </p>
                  <p className="text-xs text-slate-500">
                    Email: {config?.email} | WhatsApp: +{config?.whatsappNumber}
                  </p>
                </div>

                <div className="sm:text-right">
                  <div className="text-xl sm:text-2xl font-black text-indigo-700 font-mono tracking-tight">
                    {invoiceNumber}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Date: <strong className="text-slate-700">{invoiceDate}</strong>
                  </div>

                  {/* Official Status Stamp */}
                  <div className="mt-3">
                    <span
                      className={`inline-block px-3 py-1 rounded-md text-xs font-black uppercase tracking-widest border-2 shadow-sm ${
                        paymentStatus.label === 'Paid'
                          ? 'border-emerald-600 text-emerald-700 bg-emerald-50 rotate-[-2deg]'
                          : paymentStatus.label === 'Partial'
                          ? 'border-amber-500 text-amber-700 bg-amber-50 rotate-[1deg]'
                          : 'border-rose-600 text-rose-700 bg-rose-50 rotate-[-1deg]'
                      }`}
                    >
                      ● {paymentStatus.label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bill To & Project Meta */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8 text-xs sm:text-sm">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Billed To (Client):
                  </span>
                  <div className="font-bold text-base text-slate-900">
                    {order.customer_name || 'Valued Client'}
                  </div>
                  <div className="text-slate-600 mt-0.5">
                    Phone: +91 {order.phone || '-'}
                  </div>
                  {order.email && (
                    <div className="text-slate-600">Email: {order.email}</div>
                  )}
                </div>

                <div className="sm:text-right">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Project Details:
                  </span>
                  <div className="font-semibold text-slate-900">
                    {order.service}
                  </div>
                  <div className="text-slate-600 mt-0.5">
                    Target Deadline: {formatDate(order.deadline)}
                  </div>
                  <div className="text-slate-600">
                    Status: <span className="font-medium text-indigo-600">{order.status}</span>
                  </div>
                </div>
              </div>

              {/* Line Item Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden mb-6">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase tracking-wider font-semibold">
                      <th className="py-3 px-4">Item & Description</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                    <tr>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{order.service} Creative Scope</div>
                        <div className="text-xs text-slate-500 mt-1 max-w-md line-clamp-3">
                          {order.brief}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                        {formatINR(price)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Financial Summary */}
              <div className="w-full sm:w-72 ml-auto space-y-2 text-xs sm:text-sm mb-8">
                <div className="flex justify-between text-slate-600">
                  <span>Total Invoiced:</span>
                  <span className="font-semibold text-slate-900">{formatINR(price)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Paid so far:</span>
                  <span className="font-semibold text-emerald-600">{formatINR(paid)}</span>
                </div>
                <div className="flex justify-between text-base font-extrabold text-slate-900 border-t-2 border-slate-200 pt-2">
                  <span>Balance Due:</span>
                  <span className={balance > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                    {formatINR(balance)}
                  </span>
                </div>
              </div>

              {/* Invoice Footer */}
              <div className="border-t border-slate-200 pt-4 text-center text-[11px] text-slate-400">
                Payment terms: Digital transfers accepted via UPI or direct bank transfer.
                Please share transaction reference to WhatsApp +{config?.whatsappNumber}.
                {hasProof && (
                  <div className="text-emerald-600 font-semibold mt-1 flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Official transaction screenshot proof attached on Page 2</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* PAGE 2: OFFICIAL TRANSACTION & PAYMENT PROOF SCREENSHOT */}
          {/* ============================================================== */}
          {(pageView === 'both' || pageView === 'page2') && (
            <div className="invoice-page-break mt-12 pt-10 border-t-2 border-dashed border-slate-300 print:mt-0 print:pt-0 print:border-none">
              {/* Visual Divider on Screen */}
              <div className="no-print -mt-6 mb-6 flex items-center justify-center">
                <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-indigo-50 border border-indigo-200 text-indigo-700">
                  Page 2: Official Payment Verification Proof
                </span>
              </div>

              {/* Page 2 Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start border-b border-slate-200 pb-5 mb-6 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <span className="text-xl font-black text-slate-900 tracking-tight">
                      Payment Verification & Transaction Proof
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    Certified Cutline Studio Document &bull; Page 2 of 2 &bull; Archived in <span className="font-mono text-slate-800 font-semibold">transaction proofs</span> repository
                  </p>
                </div>
                <div className="sm:text-right">
                  <div className="font-mono text-sm font-bold text-indigo-700">{invoiceNumber}</div>
                  <div className="text-xs text-slate-500">Documented: {invoiceDate}</div>
                </div>
              </div>

              {/* Verification Metadata Box */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 mb-6 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Client</span>
                  <div className="font-bold text-slate-900 mt-0.5 truncate">{order.customer_name || 'Client'}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Invoiced</span>
                  <div className="font-bold text-slate-900 mt-0.5">{formatINR(price)}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Verified Paid</span>
                  <div className="font-bold text-emerald-600 mt-0.5">{formatINR(paid)}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Payment Status</span>
                  <div className="font-bold text-indigo-600 mt-0.5">{paymentStatus.label.toUpperCase()}</div>
                </div>
              </div>

              {/* Official Verification Stamp */}
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>Officially Certified by Cutline Studio Administration</strong> &bull; Screenshot verified for order {order.code}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-600 text-white">
                  Verified Proof
                </span>
              </div>

              {/* Screenshot Image Container */}
              {hasProof ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Archived Screenshot Image:</span>
                    </span>
                    <a
                      href={order.payment_proof!}
                      target="_blank"
                      rel="noreferrer"
                      className="no-print inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold"
                    >
                      <span>Open full image</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="rounded-2xl border-2 border-slate-200 p-3 sm:p-5 bg-slate-50 flex items-center justify-center shadow-sm">
                    <img
                      src={order.payment_proof!}
                      alt={`Transaction Screenshot Proof for ${order.code}`}
                      className="max-h-[620px] w-auto max-w-full rounded-xl object-contain shadow-sm border border-slate-200 bg-white"
                    />
                  </div>

                  {order.payment_note && (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                      <strong>Payment / Transaction Details:</strong>
                      <div className="text-slate-600 whitespace-pre-line mt-0.5 font-mono text-[11px]">
                        {order.payment_note}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-10 rounded-2xl border-2 border-dashed border-slate-300 text-center space-y-2 text-slate-500 bg-slate-50">
                  <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center mx-auto">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-bold text-slate-700">No Transaction Screenshot Uploaded Yet</div>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Studio administrators can attach a screenshot image in the Admin Dashboard under Billing &gt; Add Payment. It will automatically appear here as Page 2 of the printable bill.
                  </p>
                </div>
              )}

              {/* Page 2 Footer */}
              <div className="border-t border-slate-200 pt-4 mt-8 text-center text-[10px] text-slate-400">
                This transaction proof is officially archived in the 'transaction proofs' repository. Stamped by Cutline Studio Administration.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
