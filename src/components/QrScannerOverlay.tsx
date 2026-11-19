import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Camera,
  QrCode,
  ScanLine,
  ShieldAlert,
  CheckCircle2,
  X,
} from 'lucide-react';
import { ActiveReservation } from '../types/campus';

interface QrScannerOverlayProps {
  isOpen: boolean;
  reservation: ActiveReservation | null;
  onClose: () => void;
  onValidateSeat: (scannedInput: string) => { success: boolean; message: string };
}

export const QrScannerOverlay: React.FC<QrScannerOverlayProps> = ({
  isOpen,
  reservation,
  onClose,
  onValidateSeat,
}) => {
  const [inputCode, setInputCode] = useState('');
  const [scanState, setScanState] = useState<
    'idle' | 'scanning' | 'success' | 'error'
  >('idle');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setInputCode(reservation?.seatCode ?? '');
    setScanState('idle');
    setFeedbackMsg('');
    setShowToast(false);

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, reservation, onClose]);

  const triggerScan = (code: string) => {
    if (scanState === 'scanning') return;
    setScanState('scanning');
    setFeedbackMsg('Scanning desk QR target & validating seat ID...');
    setShowToast(false);

    window.setTimeout(() => {
      const result = onValidateSeat(code);
      if (result.success) {
        setScanState('success');
        setFeedbackMsg(result.message);
        setShowToast(true);
      } else {
        setScanState('error');
        setFeedbackMsg(result.message);
      }
    }, 900);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="qr-overlay-title"
          onClick={onClose}
        >
          {/* Floating Success Notification Banner */}
          <AnimatePresence>
            {showToast && (
              <motion.div
                initial={{ opacity: 0, y: -24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -24 }}
                className="fixed top-5 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2.5 rounded-xl border border-emerald-400/70 bg-[#0B1120] px-4 py-3 text-xs font-semibold text-emerald-300 shadow-[0_0_30px_rgba(52,211,153,0.4)]"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden="true" />
                <span>Check-In Confirmed · {feedbackMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-[#00F0FF]/55 bg-[#0B1120] p-6 shadow-[0_0_55px_rgba(0,240,255,0.22)]"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#00F0FF]">
                  <Camera className="h-4 w-4" aria-hidden="true" />
                  Live Camera QR Check-In
                </span>
                <h3
                  id="qr-overlay-title"
                  className="mt-1 font-display text-xl font-bold text-white"
                >
                  Validate Library Seat ID
                </h3>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close camera scanner overlay"
                className="rounded-lg border border-slate-800 bg-slate-900 p-1.5 text-slate-400 hover:border-slate-700 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Simulated Camera Viewfinder */}
            <div className="relative mt-4 flex h-56 flex-col items-center justify-center overflow-hidden rounded-xl border border-slate-800 bg-[#040812]">
              {/* Subtle camera telemetry HUD */}
              <div className="pointer-events-none absolute top-2.5 inset-x-3 flex items-center justify-between font-mono text-[10px] text-slate-500">
                <span>CAM-01 · OPTIC SIM</span>
                <span>{scanState === 'scanning' ? 'DECODING...' : 'READY'}</span>
              </div>

              {/* Viewfinder Corner Reticle Brackets */}
              <span className="pointer-events-none absolute top-6 left-6 h-6 w-6 rounded-tl-md border-t-2 border-l-2 border-[#00F0FF]" />
              <span className="pointer-events-none absolute top-6 right-6 h-6 w-6 rounded-tr-md border-t-2 border-r-2 border-[#00F0FF]" />
              <span className="pointer-events-none absolute bottom-6 left-6 h-6 w-6 rounded-bl-md border-b-2 border-l-2 border-[#00F0FF]" />
              <span className="pointer-events-none absolute bottom-6 right-6 h-6 w-6 rounded-br-md border-b-2 border-r-2 border-[#00F0FF]" />

              {scanState === 'success' ? (
                <motion.div
                  initial={{ scale: 0.65, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 280, damping: 20 }}
                  className="flex flex-col items-center text-center px-4"
                >
                  <div className="relative flex h-20 w-20 items-center justify-center">
                    <motion.span
                      initial={{ scale: 0.75, opacity: 0.85 }}
                      animate={{ scale: 1.45, opacity: 0 }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="absolute inset-0 rounded-full border-2 border-emerald-400"
                    />
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-emerald-400 bg-emerald-400/20 shadow-[0_0_28px_rgba(52,211,153,0.5)]">
                      <svg
                        viewBox="0 0 24 24"
                        className="h-9 w-9 text-emerald-300"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <motion.path
                          d="M5 13l4 4L19 7"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.4, ease: 'easeOut' }}
                        />
                      </svg>
                    </div>
                  </div>
                  <p className="mt-2.5 font-display text-base font-bold text-emerald-300">
                    Seat ID Verified
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-slate-300">
                    {feedbackMsg}
                  </p>
                </motion.div>
              ) : (
                <>
                  <div className="relative flex flex-col items-center justify-center rounded-lg border border-slate-700/80 bg-slate-900/90 p-4">
                    <QrCode
                      className={`h-16 w-16 transition-colors ${
                        scanState === 'error'
                          ? 'text-rose-400'
                          : 'text-[#00F0FF]/85'
                      }`}
                      aria-hidden="true"
                    />
                    <span className="mt-1.5 font-mono text-[11px] text-slate-300">
                      {inputCode.trim()
                        ? inputCode.trim().toUpperCase()
                        : reservation?.seatCode ?? 'NO SEAT BOOKED'}
                    </span>
                  </div>

                  {/* Animated Laser Scanline */}
                  <motion.div
                    animate={{ y: [-72, 72, -72] }}
                    transition={{
                      duration: scanState === 'scanning' ? 0.8 : 2.2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                    className="pointer-events-none absolute inset-x-10 h-0.5 bg-gradient-to-r from-transparent via-[#00F0FF] to-transparent shadow-[0_0_14px_#00F0FF]"
                  />
                </>
              )}
            </div>

            {/* Inline Status Notification */}
            {scanState === 'error' && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-rose-500/50 bg-rose-500/12 px-3 py-2 text-xs text-rose-300">
                <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{feedbackMsg}</span>
              </div>
            )}
            {scanState === 'scanning' && (
              <p className="mt-3 text-center font-mono text-xs text-[#00F0FF]">
                {feedbackMsg}
              </p>
            )}

            {/* Seat ID Input & Scan Controls */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                triggerScan(inputCode);
              }}
              className="mt-4 space-y-3"
            >
              <div>
                <label
                  htmlFor="qr-overlay-seat-input"
                  className="block text-xs font-medium text-slate-400"
                >
                  Seat ID / QR Pass Payload
                </label>
                <input
                  id="qr-overlay-seat-input"
                  type="text"
                  maxLength={40}
                  value={inputCode}
                  onChange={(e) => {
                    setInputCode(e.target.value);
                    if (scanState !== 'idle') setScanState('idle');
                  }}
                  placeholder={
                    reservation
                      ? `Enter ${reservation.seatCode} to verify...`
                      : 'Book a seat first (e.g., S1-A1)'
                  }
                  className="mt-1.5 w-full rounded-lg border border-slate-800 bg-[#0F172A] px-3 py-2 font-mono text-xs text-slate-100 placeholder:text-slate-500 focus:border-[#00F0FF] focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {reservation && (
                  <button
                    type="button"
                    disabled={scanState === 'scanning'}
                    onClick={() => {
                      setInputCode(reservation.seatCode);
                      triggerScan(reservation.seatCode);
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#00F0FF] px-3.5 py-2.5 text-xs font-bold text-[#0B1120] shadow-[0_0_18px_rgba(0,240,255,0.3)] transition-all hover:bg-[#5ef6ff] hover:shadow-[0_0_24px_rgba(0,240,255,0.5)] active:scale-[0.98] disabled:opacity-60 cursor-pointer whitespace-nowrap"
                  >
                    <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Scan {reservation.seatCode}</span>
                  </button>
                )}

                <button
                  type="submit"
                  disabled={scanState === 'scanning'}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#FF9900]/75 bg-[#FF9900]/15 px-3.5 py-2.5 text-xs font-bold text-[#FF9900] transition-all hover:bg-[#FF9900] hover:text-[#0B1120] hover:shadow-[0_0_20px_rgba(255,153,0,0.45)] active:scale-[0.98] disabled:opacity-60 cursor-pointer whitespace-nowrap"
                >
                  <ScanLine className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Validate &amp; Check In</span>
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
