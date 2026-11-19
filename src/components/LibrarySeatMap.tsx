import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Zap,
  Snowflake,
  QrCode,
  Clock,
  CheckCircle2,
  X,
  Volume2,
  Armchair,
  Sparkles,
  Download,
  Printer,
  ScanLine,
} from 'lucide-react';
import {
  ActiveReservation,
  FLOOR_META,
  FloorId,
  LibrarySeat,
} from '../types/campus';
import { QrScannerOverlay } from './QrScannerOverlay';

interface LibrarySeatMapProps {
  seats: LibrarySeat[];
  reservation: ActiveReservation | null;
  onBookSeat: (seatId: string, durationMinutes: number) => void;
  onCheckInSeat: (scannedInput: string) => { success: boolean; message: string };
  onReleaseSeat: () => void;
}

function buildQrMatrix(seedStr: string): boolean[][] {
  const size = 15;
  const grid: boolean[][] = Array.from({ length: size }, () =>
    Array(size).fill(false)
  );

  const drawFinder = (r0: number, c0: number) => {
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const isEdge = r === 0 || r === 4 || c === 0 || c === 4;
        const isCenter = r === 2 && c === 2;
        grid[r0 + r][c0 + c] = isEdge || isCenter;
      }
    }
  };
  drawFinder(0, 0);
  drawFinder(0, size - 5);
  drawFinder(size - 5, 0);

  let hash = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    hash ^= seedStr.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const inFinder =
        (r < 6 && c < 6) ||
        (r < 6 && c >= size - 6) ||
        (r >= size - 6 && c < 6);
      if (inFinder) continue;
      hash ^= (r * 31 + c * 17) & 0xff;
      hash = Math.imul(hash, 16777619);
      grid[r][c] = (hash >>> 0) % 2 === 0;
    }
  }
  return grid;
}

function formatRemainingTime(expiresAt: number, now: number): string {
  const diff = Math.max(0, Math.floor((expiresAt - now) / 1000));
  const hrs = Math.floor(diff / 3600);
  const mins = Math.floor((diff % 3600) / 60);
  const secs = diff % 60;
  return [hrs, mins, secs].map((n) => String(n).padStart(2, '0')).join(':');
}

export const LibrarySeatMap: React.FC<LibrarySeatMapProps> = ({
  seats,
  reservation,
  onBookSeat,
  onCheckInSeat,
  onReleaseSeat,
}) => {
  const [selectedFloor, setSelectedFloor] = useState<FloorId>('floor-1');
  const [searchQuery, setSearchQuery] = useState('');
  const [requirePower, setRequirePower] = useState(false);
  const [requireAc, setRequireAc] = useState(false);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [pendingSeat, setPendingSeat] = useState<LibrarySeat | null>(null);
  const [durationMinutes, setDurationMinutes] = useState<number>(120);
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!reservation) {
      setIsQrModalOpen(false);
      return;
    }
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [reservation]);

  const floorSeats = useMemo(
    () => seats.filter((s) => s.floorId === selectedFloor),
    [seats, selectedFloor]
  );

  const filteredSeatIds = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return new Set(
      floorSeats
        .filter((seat) => {
          if (requirePower && !seat.hasPower) return false;
          if (requireAc && !seat.hasAc) return false;
          if (onlyAvailable && seat.status !== 'available') return false;
          if (
            q &&
            !seat.code.toLowerCase().includes(q) &&
            !seat.zone.toLowerCase().includes(q)
          ) {
            return false;
          }
          return true;
        })
        .map((s) => s.id)
    );
  }, [floorSeats, searchQuery, requirePower, requireAc, onlyAvailable]);

  const floorCounts = useMemo(() => {
    const free = floorSeats.filter((s) => s.status === 'available').length;
    const busy = floorSeats.filter((s) => s.status === 'occupied').length;
    const yours = floorSeats.filter((s) => s.status === 'reserved').length;
    return { free, busy, yours, total: floorSeats.length };
  }, [floorSeats]);

  const seatRows = useMemo(() => {
    const rows: Array<{
      rowLabel: string;
      leftWing: LibrarySeat[];
      rightWing: LibrarySeat[];
    }> = [];
    const labels = ['A', 'B', 'C', 'D'];
    for (let r = 0; r < 4; r++) {
      const slice = floorSeats.slice(r * 6, r * 6 + 6);
      rows.push({
        rowLabel: labels[r],
        leftWing: slice.slice(0, 3),
        rightWing: slice.slice(3, 6),
      });
    }
    return rows;
  }, [floorSeats]);

  const qrMatrix = useMemo(
    () => (reservation ? buildQrMatrix(reservation.passToken) : []),
    [reservation]
  );

  const floorMeta = FLOOR_META[selectedFloor];

  const handleConfirmBooking = () => {
    if (!pendingSeat) return;
    onBookSeat(pendingSeat.id, durationMinutes);
    setPendingSeat(null);
    setIsQrModalOpen(true);
  };

  const handleDownloadQrPass = () => {
    if (!reservation || qrMatrix.length === 0) return;
    const canvas = document.createElement('canvas');
    canvas.width = 460;
    canvas.height = 560;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dark AWS card background
    ctx.fillStyle = '#0B1120';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#FF9900';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    ctx.fillStyle = '#FF9900';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('CampusPulse AWS · Seat Pass', 32, 52);

    ctx.fillStyle = '#00F0FF';
    ctx.font = '14px monospace';
    ctx.fillText(`Seat ${reservation.seatCode} · ${reservation.zone}`, 32, 80);

    // White QR square
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(80, 105, 300, 300);

    const cell = 16;
    const offset = 80 + (300 - qrMatrix.length * cell) / 2;
    ctx.fillStyle = '#0B1120';
    qrMatrix.forEach((row, rIdx) => {
      row.forEach((filled, cIdx) => {
        if (filled) {
          ctx.fillRect(offset + cIdx * cell, offset + rIdx * cell, cell, cell);
        }
      });
    });

    ctx.fillStyle = '#E2E8F0';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(reservation.passToken, 115, 445);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '13px sans-serif';
    ctx.fillText(reservation.floorName, 32, 488);
    ctx.fillText(
      `Expires: ${new Date(reservation.expiresAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })}`,
      32,
      512
    );

    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = `campuspulse-pass-${reservation.seatCode}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPass = () => {
    window.print();
  };

  const openScannerModal = () => {
    setIsScannerOpen(true);
  };

  const renderCinemaSeat = (seat: LibrarySeat) => {
    const matchesFilter = filteredSeatIds.has(seat.id);
    const isSelected = pendingSeat?.id === seat.id;
    const isFree = seat.status === 'available';
    const isYours = seat.status === 'reserved';

    // Slate = Busy, Cyan = Free, Orange = Your Seat
    let seatClasses =
      'border-slate-700/80 bg-slate-800/80 text-slate-400 cursor-not-allowed';
    let headRestColor = 'bg-slate-600';

    if (isYours) {
      seatClasses =
        'border-[#FF9900] bg-[#FF9900]/22 text-[#FF9900] shadow-[0_0_20px_rgba(255,153,0,0.3)] hover:shadow-[0_0_26px_rgba(255,153,0,0.5)] cursor-pointer';
      headRestColor = 'bg-[#FF9900]';
    } else if (isFree) {
      seatClasses = isSelected
        ? 'border-[#FF9900] bg-[#00F0FF]/25 text-white ring-2 ring-[#FF9900]/75 shadow-[0_0_22px_rgba(0,240,255,0.35)] cursor-pointer'
        : 'border-[#00F0FF]/55 bg-[#00F0FF]/12 text-cyan-100 hover:border-[#00F0FF] hover:bg-[#00F0FF]/24 hover:shadow-[0_0_18px_rgba(0,240,255,0.32)] active:scale-[0.96] cursor-pointer';
      headRestColor = isSelected ? 'bg-[#FF9900]' : 'bg-[#00F0FF]';
    }

    return (
      <button
        key={seat.id}
        type="button"
        disabled={!isFree && !isYours}
        onClick={() => {
          if (isFree) {
            setPendingSeat(seat);
          } else if (isYours) {
            setIsQrModalOpen(true);
          }
        }}
        title={`${seat.code} · ${seat.zone} · ${
          isYours ? 'Your Seat' : isFree ? 'Free' : 'Busy'
        }`}
        aria-label={`Seat ${seat.code}, ${seat.zone}, status ${
          isYours ? 'Your Seat' : isFree ? 'Free' : 'Busy'
        }${seat.hasPower ? ', power outlet' : ''}${seat.hasAc ? ', AC zone' : ''}`}
        className={`group relative flex flex-col items-center justify-between rounded-t-xl rounded-b-md border px-2 pt-2 pb-2 transition-all duration-150 min-h-[64px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF] ${seatClasses} ${
          matchesFilter ? 'opacity-100' : 'opacity-20'
        }`}
      >
        <span
          className={`h-1.5 w-8 rounded-full transition-transform duration-150 group-hover:scale-x-110 ${headRestColor}`}
          aria-hidden="true"
        />

        <span className="mt-1.5 font-mono text-[11px] font-bold tabular-nums tracking-tight">
          {seat.code}
        </span>

        <div className="mt-1 flex items-center gap-1">
          {seat.hasPower && (
            <Zap className="h-2.5 w-2.5 text-[#FF9900]" aria-hidden="true" />
          )}
          {seat.hasAc && (
            <Snowflake className="h-2.5 w-2.5 text-[#00F0FF]" aria-hidden="true" />
          )}
          {!seat.hasPower && !seat.hasAc && (
            <span className="text-[9px] opacity-60">Std</span>
          )}
        </div>
      </button>
    );
  };

  return (
    <section
      id="library"
      className="rounded-xl border border-slate-800 bg-[#0F172A]/90 p-5 sm:p-6 shadow-xl backdrop-blur-md"
    >
      {/* Header + Floor Tabs */}
      <div className="flex flex-col gap-4 border-b border-slate-800 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-[#00F0FF]">
            <Armchair className="h-4 w-4" aria-hidden="true" />
            <span>Central Library · Cinema-Style Chair Grid</span>
          </div>
          <h2 className="mt-1 font-display text-lg sm:text-xl font-bold text-white">
            Smart Library Seat Map
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            role="tablist"
            aria-label="Library floors"
            className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-800 bg-[#0B1120] p-1"
          >
            {(['floor-1', 'floor-2', 'floor-3'] as FloorId[]).map((fid) => {
              const meta = FLOOR_META[fid];
              const isActive = selectedFloor === fid;
              const freeCount = seats.filter(
                (s) => s.floorId === fid && s.status === 'available'
              ).length;
              return (
                <button
                  key={fid}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => {
                    setSelectedFloor(fid);
                    setPendingSeat(null);
                  }}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-[#00F0FF]/18 text-[#00F0FF] border border-[#00F0FF]/50 shadow-[0_0_14px_rgba(0,240,255,0.22)]'
                      : 'text-slate-400 border border-transparent hover:text-white hover:bg-slate-800/70'
                  }`}
                >
                  {meta.label}{' '}
                  <span className="ml-1 font-mono text-[11px] opacity-85 tabular-nums">
                    ({freeCount})
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={openScannerModal}
            className="inline-flex items-center gap-2 rounded-lg border border-[#00F0FF]/65 bg-[#00F0FF]/14 px-3.5 py-2 text-xs font-bold text-[#00F0FF] shadow-[0_0_16px_rgba(0,240,255,0.2)] transition-all duration-150 hover:bg-[#00F0FF] hover:text-[#0B1120] hover:shadow-[0_0_24px_rgba(0,240,255,0.5)] active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ScanLine className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              {reservation?.checkedInAt ? 'Checked In' : 'Check In'}
            </span>
          </button>

          {reservation && (
            <button
              type="button"
              onClick={() => setIsQrModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-[#FF9900] bg-[#FF9900]/18 px-3.5 py-2 text-xs font-bold text-[#FF9900] shadow-[0_0_18px_rgba(255,153,0,0.28)] transition-all duration-150 hover:bg-[#FF9900] hover:text-[#0B1120] hover:shadow-[0_0_24px_rgba(255,153,0,0.5)] active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <QrCode className="h-3.5 w-3.5" aria-hidden="true" />
              <span>View QR Pass ({reservation.seatCode})</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Toolbar + Cyan=Free, Slate=Busy, Orange=Your Seat Badges */}
      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:flex-initial sm:w-56">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value.slice(0, 60))}
              placeholder="Search seat ID or zone..."
              aria-label="Search library seats by code or zone"
              className="w-full rounded-lg border border-slate-800 bg-[#0B1120] py-1.5 pl-8 pr-3 text-xs text-slate-100 placeholder:text-slate-500 focus:border-[#00F0FF]/70 focus:outline-none focus:ring-1 focus:ring-[#00F0FF]/50"
            />
          </div>

          <button
            type="button"
            onClick={() => setRequirePower((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
              requirePower
                ? 'border-[#FF9900]/70 bg-[#FF9900]/18 text-[#FF9900] shadow-[0_0_12px_rgba(255,153,0,0.2)]'
                : 'border-slate-800 bg-[#0B1120] text-slate-300 hover:border-slate-600 hover:text-white'
            }`}
          >
            <Zap className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Power</span>
          </button>

          <button
            type="button"
            onClick={() => setRequireAc((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
              requireAc
                ? 'border-[#00F0FF]/70 bg-[#00F0FF]/18 text-[#00F0FF] shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                : 'border-slate-800 bg-[#0B1120] text-slate-300 hover:border-slate-600 hover:text-white'
            }`}
          >
            <Snowflake className="h-3.5 w-3.5" aria-hidden="true" />
            <span>AC Zone</span>
          </button>

          <button
            type="button"
            onClick={() => setOnlyAvailable((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
              onlyAvailable
                ? 'border-[#00F0FF]/70 bg-[#00F0FF]/18 text-[#00F0FF] shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                : 'border-slate-800 bg-[#0B1120] text-slate-300 hover:border-slate-600 hover:text-white'
            }`}
          >
            <span>Free Only</span>
          </button>
        </div>

        {/* Status Legend: Cyan = Free, Slate = Busy, Orange = Your Seat */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-[#00F0FF]/50 bg-[#00F0FF]/12 px-2.5 py-1 text-[#00F0FF] tabular-nums">
            <span className="h-2 w-2 rounded-full bg-[#00F0FF] shadow-[0_0_6px_#00F0FF]" />
            Free ({floorCounts.free})
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800/90 px-2.5 py-1 text-slate-300 tabular-nums">
            <span className="h-2 w-2 rounded-full bg-slate-500" />
            Busy ({floorCounts.busy})
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-[#FF9900]/60 bg-[#FF9900]/15 px-2.5 py-1 text-[#FF9900] tabular-nums">
            <span className="h-2 w-2 rounded-full bg-[#FF9900] shadow-[0_0_6px_#FF9900]" />
            Your Seat ({floorCounts.yours})
          </span>
        </div>
      </div>

      {/* Cinema-Style Floor Plan + Quick Confirm Side Panel */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-12 items-start">
        <div className="lg:col-span-8 rounded-xl border border-slate-800 bg-[#0B1120] p-4 sm:p-5">
          <div className="mb-5 flex flex-col items-center">
            <div className="h-1.5 w-3/4 max-w-md rounded-full bg-gradient-to-r from-transparent via-[#00F0FF]/80 to-transparent shadow-[0_4px_18px_rgba(0,240,255,0.45)]" />
            <div className="mt-2 flex flex-wrap items-center justify-center gap-3 text-[11px] font-mono text-slate-400">
              <span className="uppercase tracking-widest text-[#00F0FF]">
                {floorMeta.shortLabel} · Quiet Front Atrium
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 tabular-nums text-slate-300">
                <Volume2 className="h-3 w-3 text-[#00F0FF]" aria-hidden="true" />
                {floorMeta.noiseDb} dB
              </span>
            </div>
          </div>

          <div className="space-y-2.5">
            {seatRows.map(({ rowLabel, leftWing, rightWing }) => (
              <div key={rowLabel} className="flex items-center gap-2 sm:gap-3">
                <span className="w-5 shrink-0 text-center font-mono text-xs font-bold text-slate-500">
                  {rowLabel}
                </span>

                <div className="grid flex-1 grid-cols-3 gap-2">
                  {leftWing.map(renderCinemaSeat)}
                </div>

                <div
                  className="hidden sm:flex w-7 shrink-0 flex-col items-center justify-center"
                  aria-hidden="true"
                >
                  <span className="h-8 w-px bg-slate-800" />
                </div>

                <div className="grid flex-1 grid-cols-3 gap-2">
                  {rightWing.map(renderCinemaSeat)}
                </div>

                <span className="hidden sm:inline-block w-5 shrink-0 text-center font-mono text-xs font-bold text-slate-500">
                  {rowLabel}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Quick Booking Inspector */}
        <div className="lg:col-span-4">
          {pendingSeat ? (
            <motion.div
              key={pendingSeat.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-[#00F0FF]/60 bg-[#0B1120] p-5 shadow-[0_0_26px_rgba(0,240,255,0.14)]"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#00F0FF]">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    Seat Selected
                  </span>
                  <h3 className="mt-1 font-display text-lg font-bold text-white">
                    Seat {pendingSeat.code}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {FLOOR_META[pendingSeat.floorId].label} · {pendingSeat.zone}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPendingSeat(null)}
                  aria-label="Cancel seat selection"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span
                  className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 ${
                    pendingSeat.hasPower
                      ? 'border-[#FF9900]/40 bg-[#FF9900]/10 text-[#FF9900]'
                      : 'border-slate-800 bg-slate-900 text-slate-500'
                  }`}
                >
                  <Zap className="h-3 w-3" aria-hidden="true" />
                  {pendingSeat.hasPower ? 'Power Outlet' : 'No Outlet'}
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 ${
                    pendingSeat.hasAc
                      ? 'border-[#00F0FF]/40 bg-[#00F0FF]/10 text-[#00F0FF]'
                      : 'border-slate-800 bg-slate-900 text-slate-500'
                  }`}
                >
                  <Snowflake className="h-3 w-3" aria-hidden="true" />
                  {pendingSeat.hasAc ? 'AC Zone' : 'Standard'}
                </span>
              </div>

              <div className="mt-4">
                <span className="block text-xs font-medium text-slate-400">
                  Hold Duration
                </span>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {[60, 120, 180].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDurationMinutes(mins)}
                      className={`rounded-lg border py-2 text-xs font-mono font-semibold transition-all duration-150 cursor-pointer ${
                        durationMinutes === mins
                          ? 'border-[#FF9900] bg-[#FF9900]/20 text-[#FF9900] shadow-[0_0_12px_rgba(255,153,0,0.25)]'
                          : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      {mins / 60}h
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleConfirmBooking}
                className="mt-5 w-full rounded-lg bg-[#FF9900] px-4 py-2.5 text-xs font-bold text-[#0B1120] shadow-[0_0_20px_rgba(255,153,0,0.3)] transition-all duration-150 hover:bg-[#ffad33] hover:shadow-[0_0_28px_rgba(255,153,0,0.55)] active:scale-[0.98] cursor-pointer"
              >
                {reservation
                  ? `Switch to ${pendingSeat.code} & Open QR`
                  : 'Book Seat & Generate QR Pass'}
              </button>
            </motion.div>
          ) : (
            <div className="rounded-xl border border-slate-800 bg-[#0B1120] p-5">
              <div className="flex items-center gap-2 text-[#00F0FF]">
                <QrCode className="h-5 w-5" aria-hidden="true" />
                <h3 className="font-display text-sm font-bold text-white">
                  Instant Seat Booking
                </h3>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                Click any <strong className="text-[#00F0FF]">Cyan (Free)</strong> seat on the cinema-style chair grid to reserve it and pop up your downloadable Digital QR Seat Pass.
              </p>

              {reservation ? (
                <div className="mt-4 rounded-lg border border-[#FF9900]/45 bg-[#FF9900]/10 p-3.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#FF9900]">
                      Your Booked Seat
                    </span>
                    <span className="font-mono font-bold text-white">
                      {reservation.seatCode}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between font-mono text-[11px] text-slate-300 tabular-nums">
                    <span>
                      {reservation.checkedInAt ? 'Check-In Status' : 'Expires in'}
                    </span>
                    {reservation.checkedInAt ? (
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Checked In
                      </span>
                    ) : (
                      <span className="text-[#00F0FF] font-bold">
                        {formatRemainingTime(reservation.expiresAt, nowMs)}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsQrModalOpen(true)}
                      className="flex-1 rounded-md bg-[#FF9900] py-2 text-xs font-bold text-[#0B1120] transition-all hover:bg-[#ffad33] hover:shadow-[0_0_16px_rgba(255,153,0,0.45)] cursor-pointer"
                    >
                      Open QR Pass
                    </button>
                    <button
                      type="button"
                      onClick={onReleaseSeat}
                      className="rounded-md border border-rose-500/50 bg-rose-500/15 px-3 py-2 text-xs font-semibold text-rose-300 transition-colors hover:bg-rose-500/25 cursor-pointer"
                    >
                      Release
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-lg border border-slate-800/80 bg-slate-900/50 p-3 text-[11px] text-slate-400">
                  Your active seat booking persists across page reloads in <code className="text-[#00F0FF]">localStorage</code>.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Pop-up Downloadable & Printable Digital QR Seat Pass Modal */}
      <AnimatePresence>
        {isQrModalOpen && reservation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="qr-pass-modal-title"
            onClick={() => setIsQrModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border border-[#FF9900]/60 bg-[#0B1120] p-6 shadow-[0_0_50px_rgba(255,153,0,0.28)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FF9900]">
                    <QrCode className="h-4 w-4" aria-hidden="true" />
                    Digital QR Seat Pass
                  </span>
                  <h3
                    id="qr-pass-modal-title"
                    className="mt-1 font-display text-xl font-bold text-white"
                  >
                    Seat {reservation.seatCode} Confirmed
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setIsQrModalOpen(false)}
                  aria-label="Close QR pass pop-up"
                  className="rounded-lg border border-slate-800 bg-slate-900 p-1.5 text-slate-400 hover:border-slate-700 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 flex flex-col items-center rounded-xl border border-slate-800 bg-white p-4">
                <svg
                  viewBox="0 0 15 15"
                  className="h-40 w-40"
                  role="img"
                  aria-label={`QR code for seat ${reservation.seatCode}`}
                >
                  <rect width="15" height="15" fill="#FFFFFF" />
                  {qrMatrix.map((row, rIdx) =>
                    row.map((filled, cIdx) =>
                      filled ? (
                        <rect
                          key={`${rIdx}-${cIdx}`}
                          x={cIdx}
                          y={rIdx}
                          width="1"
                          height="1"
                          fill="#0B1120"
                        />
                      ) : null
                    )
                  )}
                </svg>
                <span className="mt-2.5 font-mono text-xs font-bold text-slate-900">
                  {reservation.passToken}
                </span>
              </div>

              <div className="mt-4 space-y-2 rounded-xl border border-slate-800 bg-[#0F172A] p-3.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Status</span>
                  {reservation.checkedInAt ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Checked In
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-semibold text-[#FF9900]">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Booked (Pending Check-In)
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Location</span>
                  <span className="font-medium text-slate-200 text-right">
                    {reservation.floorName} · {reservation.zone}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-800 pt-2">
                  <span className="inline-flex items-center gap-1.5 text-slate-400">
                    <Clock className="h-3.5 w-3.5 text-[#00F0FF]" aria-hidden="true" />
                    Hold Timer
                  </span>
                  <span className="font-mono text-sm font-bold text-[#00F0FF] tabular-nums">
                    {formatRemainingTime(reservation.expiresAt, nowMs)}
                  </span>
                </div>
              </div>

              {/* Download & Print Pass Actions */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleDownloadQrPass}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#00F0FF]/55 bg-[#00F0FF]/12 px-3 py-2 text-xs font-semibold text-[#00F0FF] transition-all hover:bg-[#00F0FF] hover:text-[#0B1120] hover:shadow-[0_0_16px_rgba(0,240,255,0.4)] cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Download PNG</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrintPass}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-200 transition-all hover:border-slate-500 hover:text-white cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Print Pass</span>
                </button>
              </div>

              <div className="mt-2.5 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onReleaseSeat();
                    setIsQrModalOpen(false);
                  }}
                  className="flex-1 rounded-lg border border-rose-500/50 bg-rose-500/15 px-3 py-2 text-xs font-semibold text-rose-300 transition-all hover:bg-rose-500/25 cursor-pointer"
                >
                  Release Seat
                </button>
                <button
                  type="button"
                  onClick={() => setIsQrModalOpen(false)}
                  className="flex-1 rounded-lg bg-[#FF9900] px-3 py-2 text-xs font-bold text-[#0B1120] transition-all hover:bg-[#ffad33] cursor-pointer"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Simulated Camera QR Scanner Overlay */}
      <QrScannerOverlay
        isOpen={isScannerOpen}
        reservation={reservation}
        onClose={() => setIsScannerOpen(false)}
        onValidateSeat={onCheckInSeat}
      />
    </section>
  );
};
