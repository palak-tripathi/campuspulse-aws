import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Armchair,
  Wifi,
  Star,
  Leaf,
  Download,
  Check,
} from 'lucide-react';

interface KpiTelemetryBarProps {
  availableSeatsCount: number;
  totalSeatsCount: number;
  avgWifiSpeed: number;
  bestHostelName: string;
  messSatisfactionScore: number;
  foodWasteSavedKg: number;
  onDownloadReport: () => void;
}

export const KpiTelemetryBar: React.FC<KpiTelemetryBarProps> = ({
  availableSeatsCount,
  totalSeatsCount,
  avgWifiSpeed,
  bestHostelName,
  messSatisfactionScore,
  foodWasteSavedKg,
  onDownloadReport,
}) => {
  const [downloaded, setDownloaded] = useState(false);

  const handleDownloadClick = () => {
    onDownloadReport();
    setDownloaded(true);
    window.setTimeout(() => setDownloaded(false), 2200);
  };

  const seatPct = Math.round((availableSeatsCount / totalSeatsCount) * 100);

  const kpis = [
    {
      id: 'seats',
      label: 'Available Seats',
      value: `${availableSeatsCount} / ${totalSeatsCount}`,
      detail: `${seatPct}% library capacity free right now`,
      progressPct: seatPct,
      accent: 'cyan',
      icon: Armchair,
    },
    {
      id: 'wifi',
      label: 'Avg Wi-Fi Speed (Mbps)',
      value: `${avgWifiSpeed} Mbps`,
      detail: `Peak throughput at ${bestHostelName}`,
      progressPct: Math.min(100, Math.round((avgWifiSpeed / 350) * 100)),
      accent: 'orange',
      icon: Wifi,
    },
    {
      id: 'mess',
      label: 'Mess Rating',
      value: `${messSatisfactionScore} / 5.0`,
      detail: 'Live student ratings across 4 meal slots',
      progressPct: Math.round((messSatisfactionScore / 5) * 100),
      accent: 'cyan',
      icon: Star,
    },
    {
      id: 'waste',
      label: 'Food Saved (kg)',
      value: `${foodWasteSavedKg} kg`,
      detail: 'Saved via early Skip Meal declarations',
      progressPct: Math.min(100, Math.round((foodWasteSavedKg / 350) * 100)),
      accent: 'emerald',
      icon: Leaf,
    },
  ] as const;

  return (
    <section
      aria-label="Campus live telemetry overview"
      className="space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-medium text-slate-400">
          Live Campus Telemetry · Techfest IIT Bombay AWS ShipIt
        </span>
        <button
          type="button"
          onClick={handleDownloadClick}
          className="inline-flex items-center gap-2 rounded-lg border border-[#00F0FF]/50 bg-[#00F0FF]/12 px-3.5 py-1.5 text-xs font-semibold text-[#00F0FF] transition-all duration-150 hover:bg-[#00F0FF] hover:text-[#0B1120] hover:shadow-[0_0_18px_rgba(0,240,255,0.4)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF] whitespace-nowrap shrink-0 cursor-pointer"
        >
          {downloaded ? (
            <>
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Snapshot Saved</span>
            </>
          ) : (
            <>
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Download Report</span>
            </>
          )}
        </button>
      </div>

      <div
        className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4"
        style={{ perspective: '1000px' }}
      >
        {kpis.map((item, idx) => {
          const Icon = item.icon;
          const barColor =
            item.accent === 'orange'
              ? 'bg-[#FF9900]'
              : item.accent === 'emerald'
              ? 'bg-emerald-400'
              : 'bg-[#00F0FF]';
          const iconColor =
            item.accent === 'orange'
              ? 'text-[#FF9900]'
              : item.accent === 'emerald'
              ? 'text-emerald-400'
              : 'text-[#00F0FF]';
          const glowBorder =
            item.accent === 'orange'
              ? 'hover:border-[#FF9900]/55 hover:shadow-[0_0_24px_rgba(255,153,0,0.12)]'
              : item.accent === 'emerald'
              ? 'hover:border-emerald-400/55 hover:shadow-[0_0_24px_rgba(52,211,153,0.12)]'
              : 'hover:border-[#00F0FF]/55 hover:shadow-[0_0_24px_rgba(0,240,255,0.12)]';

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 12, rotateX: 8 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{
                duration: 0.3,
                delay: idx * 0.05,
                ease: [0.16, 1, 0.3, 1],
              }}
              whileHover={{ y: -3, scale: 1.01 }}
              className={`group rounded-xl border border-slate-800/90 bg-[#0F172A]/85 p-4 sm:p-5 backdrop-blur-md transition-all duration-150 ${glowBorder}`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-xs font-medium text-slate-400">
                  {item.label}
                </span>
                <Icon className={`h-4 w-4 shrink-0 ${iconColor}`} aria-hidden="true" />
              </div>

              <div className="mt-2.5 font-mono text-2xl sm:text-3xl font-bold tracking-tight text-white tabular-nums transition-transform duration-150 group-hover:translate-x-0.5">
                {item.value}
              </div>

              <p className="mt-1 text-xs text-slate-400 truncate">
                {item.detail}
              </p>

              <div className="mt-3.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800/90">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                  style={{ width: `${item.progressPct}%` }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};
