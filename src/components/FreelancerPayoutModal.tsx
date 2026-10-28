import React, { useRef, useState } from 'react';
import {
  X,
  Receipt,
  CheckCircle2,
  CheckCircle,
  Clock,
  Image as ImageIcon,
  ShieldCheck,
  Building2,
  User,
  Download,
  FileDown,
  Loader2,
  ZoomIn,
  Share2,
} from 'lucide-react';
import { PayoutBillData } from '../types.ts';
import { formatINR, formatDate } from '../utils/format.ts';
import { createPayoutBillPdf, sendPayoutBillViaWhatsApp } from '../utils/payoutPdf.ts';

export type { PayoutBillData };

interface FreelancerPayoutModalProps {
  bill: PayoutBillData;
  onClose: () => void;
}

export const FreelancerPayoutModal: React.FC<FreelancerPayoutModalProps> = ({
  bill,
  onClose,
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [zoomProof, setZoomProof] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSharingWhatsApp, setIsSharingWhatsApp] = useState(false);
  const [pdfSuccess, setPdfSuccess] = useState(false);
  const [printStatus, setPrintStatus] = useState<string | null>(null);

  const referenceCode = bill.code || bill.orderCode || 'PAY-REF';
  const isSettled = bill.payoutStatus === 'settled';
  const formattedDate = bill.payoutAt ? formatDate(bill.payoutAt) : 'Pending Settlement';
  const amountStr = formatINR(bill.freelancerShare);

  // Primary action: direct PDF generation and file download
  const handleSavePDF = async () => {
    try {
      setIsGeneratingPdf(true);
      setPdfSuccess(false);
      setPrintStatus('Generating PDF document...');

      const doc = await createPayoutBillPdf(bill);
      const fileName = `CutlineStudio_PayoutBill_${referenceCode}.pdf`;
      doc.save(fileName);

      setPdfSuccess(true);
      setPrintStatus('PDF downloaded successfully!');
      setTimeout(() => {
        setPdfSuccess(false);
        setPrintStatus(null);
      }, 4500);
    } catch (err) {
      console.error('Error generating PDF via jsPDF:', err);
      setPrintStatus('Failed to generate PDF. Please try again.');
      setTimeout(() => setPrintStatus(null), 4000);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Primary action: share PDF bill + custom message via WhatsApp
  const handleShareWhatsApp = async () => {
    try {
      setIsSharingWhatsApp(true);
      setPrintStatus('Preparing PDF settlement bill for WhatsApp...');
      await sendPayoutBillViaWhatsApp(bill);
      setPrintStatus('Bill PDF attached! Tap "Add a message..." and Paste in WhatsApp.');
      setTimeout(() => {
        setPrintStatus(null);
      }, 7000);
    } catch (err: any) {
      console.error('Error sharing payout bill via WhatsApp:', err);
      setPrintStatus('Failed to share payout bill.');
      setTimeout(() => setPrintStatus(null), 4000);
    } finally {
      setIsSharingWhatsApp(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-5 bg-slate-950/85 backdrop-blur-md overflow-y-auto no-scrollbar">
      {/* Zoom Proof Modal */}
      {zoomProof && bill.payoutProof && (
        <div
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-lg flex flex-col items-center justify-center p-4"
          onClick={() => setZoomProof(false)}
        >
          <div className="max-w-4xl max-h-[85vh] relative flex flex-col items-center">
            <div className="w-full flex items-center justify-between pb-3 text-white">
              <span className="text-xs font-semibold flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-emerald-400" />
                <span>Verified Transfer Screenshot Proof &bull; {referenceCode}</span>
              </span>
              <button
                onClick={() => setZoomProof(false)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-lg cursor-pointer"
              >
                Close (Esc)
              </button>
            </div>
            <img
              src={bill.payoutProof}
              alt="Payment Screenshot Proof"
              className="max-h-[75vh] w-auto max-w-full rounded-2xl border border-slate-700 shadow-2xl object-contain bg-black"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Main Modal Card */}
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-1 sm:my-auto max-h-[92vh] overflow-y-auto no-scrollbar scrollbar-none animate-in zoom-in-95 duration-150">
        {/* Top Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Freelancer Payout Settlement Bill</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-slate-800 text-indigo-300 font-semibold border border-slate-700">
                  {referenceCode}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Official project settlement voucher &amp; payment confirmation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {pdfSuccess && (
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1.5 animate-in fade-in">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>PDF Saved!</span>
              </span>
            )}
            {printStatus && !pdfSuccess && (
              <span className="text-[11px] font-semibold text-emerald-400 animate-pulse hidden md:inline-block">
                {printStatus}
              </span>
            )}

            {/* WhatsApp Share Action: Sends PDF file & custom message */}
            <button
              onClick={handleShareWhatsApp}
              disabled={isSharingWhatsApp || isGeneratingPdf}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/25 active:scale-98 transition-all cursor-pointer disabled:opacity-60"
              title="Share official PDF settlement bill and message via WhatsApp"
            >
              {isSharingWhatsApp ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Sharing...</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </>
              )}
            </button>

            {/* Primary Action: Direct Save PDF Download */}
            <button
              onClick={handleSavePDF}
              disabled={isGeneratingPdf || isSharingWhatsApp}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-1.5 active:scale-98 transition-all cursor-pointer disabled:opacity-60"
              title="Download official PDF settlement bill"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Save PDF</span>
                </>
              )}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer ml-1"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Voucher Body */}
        <div
          ref={printAreaRef}
          id="printable-payout-bill"
          className="p-6 sm:p-8 space-y-6 bg-slate-900 text-slate-100 max-h-[78vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-black text-base">
                  C
                </div>
                <div>
                  <h1 className="text-xl font-black tracking-tight text-white">CUTLINE STUDIO</h1>
                  <p className="text-[11px] font-semibold text-indigo-400">
                    Premium Video Production &amp; Post-Production Agency
                  </p>
                </div>
              </div>
              <div className="mt-3 text-xs text-slate-400 space-y-0.5">
                <p>Freelancer Project Settlement Bill</p>
                <p className="font-mono text-[11px]">Voucher No: PAY-{referenceCode}</p>
              </div>
            </div>

            <div className="text-left sm:text-right space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border">
                {isSettled ? (
                  <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>SETTLED &amp; PAID</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30">
                    <Clock className="w-3.5 h-3.5" />
                    <span>PAYOUT DUE / PENDING</span>
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400 pt-1">
                Settlement Date:{' '}
                <span className="font-semibold text-white">{formattedDate}</span>
              </div>
            </div>
          </div>

          {/* Parties Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-400" />
                <span>Freelancer / Editor Details</span>
              </span>
              <div className="text-sm font-bold text-white">{bill.freelancerName}</div>
              <div className="text-slate-400 text-xs">
                Assigned Team Member &bull; Video Production
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-purple-400" />
                <span>Project &amp; Deliverables</span>
              </span>
              <div className="text-sm font-bold text-white flex items-center justify-between">
                <span>{bill.service}</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {referenceCode}
                </span>
              </div>
              <div className="text-slate-400 text-xs">
                Client / Project: {bill.customerName || bill.title || 'Studio Project'}
              </div>
            </div>
          </div>

          {/* Order Compensation Breakdown (Pure Freelancer Payout - No Commission Cuts) */}
          <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-950/40">
            <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-300 tracking-wider">
                Order Deliverables &amp; Compensation
              </span>
              <span className="text-[11px] font-mono font-bold text-emerald-400">
                {isSettled ? 'Paid in Full' : 'Authorized Compensation'}
              </span>
            </div>

            <div className="p-4 sm:p-5 space-y-4 text-xs sm:text-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/60 text-slate-300">
                <div>
                  <span className="font-bold block text-white text-sm">{bill.service}</span>
                  <span className="text-[11px] text-slate-400">
                    Order Ref: {referenceCode} &bull;{' '}
                    {bill.customerName || bill.title || 'Studio Project'}
                  </span>
                </div>
                <span className="font-mono font-bold text-white text-base sm:text-lg">
                  {amountStr}
                </span>
              </div>

              {/* Highlighted Order Payout Price */}
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between">
                <div>
                  <span className="font-bold block text-emerald-300 text-sm sm:text-base">
                    Order Payout Price
                  </span>
                  <span className="text-[11px] text-emerald-400/90 font-medium">
                    Total compensation earned by freelancer for this order
                  </span>
                </div>
                <span className="font-mono font-black text-emerald-400 text-xl sm:text-2xl">
                  {amountStr}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Notes & Reference */}
          {bill.payoutNote && (
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-xs space-y-1">
              <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider block">
                Payment Reference / Transaction Note
              </span>
              <p className="text-white font-mono text-xs">{bill.payoutNote}</p>
            </div>
          )}

          {/* Transfer Screenshot Proof */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-white uppercase text-[10px] tracking-wider">
                  Payment Transfer Screenshot Proof
                </span>
              </div>
              {bill.payoutProof && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setZoomProof(true)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white font-medium text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <ZoomIn className="w-3 h-3" />
                    <span>Zoom Proof</span>
                  </button>
                  <a
                    href={bill.payoutProof}
                    download={`payout-proof-${referenceCode}.jpg`}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-medium text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download</span>
                  </a>
                </div>
              )}
            </div>

            {bill.payoutProof ? (
              <div className="rounded-xl border border-slate-800 overflow-hidden bg-black/40 flex items-center justify-center p-2">
                <img
                  src={bill.payoutProof}
                  alt={`Payout Proof for ${referenceCode}`}
                  className="max-h-64 sm:max-h-80 w-auto object-contain rounded-lg cursor-pointer hover:opacity-95 transition-opacity"
                  onClick={() => setZoomProof(true)}
                />
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-slate-800 text-center text-slate-500 text-xs">
                No transfer screenshot has been uploaded for this settlement voucher yet.
              </div>
            )}
          </div>

          {/* Footer Voucher Stamp */}
          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Certified Order Payout &bull; Cutline Studio Official Accounting</span>
            </div>
            <div className="font-mono text-[10px]">
              Generated{' '}
              {new Date().toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </div>
          </div>
        </div>

        {/* Modal Bottom Footer with Quick Save Button */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">
              {isSettled
                ? 'Settlement completed and verified with agency proof'
                : 'Payout pending administrative authorization'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSavePDF}
              disabled={isGeneratingPdf}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-60"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Save as PDF</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              Close Bill
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
