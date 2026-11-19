import React from 'react';
import {
  Thermometer,
  Wind,
  Droplets,
  Activity,
  Radio,
  X,
  ArrowUpRight,
  Crosshair,
} from 'lucide-react';

export type IotHealthStatus = 'Optimal' | 'Elevated' | 'Alert';

export interface IotSensorNode {
  id: string;
  nodeCode: string;
  zoneName: string;
  shortLabel: string;
  buildingType: 'library' | 'hostel' | 'mess';
  targetSection: 'library' | 'wifi' | 'mess';
  cameraPreset: 'library' | 'hostels' | 'mess';
  baseTempC: number;
  tempC: number;
  co2Ppm: number;
  humidityPct: number;
  extraLabel: string;
  extraValue: string;
  status: IotHealthStatus;
  co2History: number[];
  lastUpdated: string;
}

interface IotHotspotPopupProps {
  sensor: IotSensorNode;
  onClose: () => void;
  onFocusZone: (preset: 'library' | 'hostels' | 'mess') => void;
  onJumpToModule: (section: 'library' | 'wifi' | 'mess') => void;
}

function getStatusClasses(status: IotHealthStatus) {
  if (status === 'Optimal') {
    return {
      border: 'border-emerald-500/60',
      shadow: 'shadow-[0_12px_38px_rgba(16,185,129,0.22)]',
      badge: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
      bar: 'bg-emerald-400',
      stroke: '#34d399',
    };
  }
  if (status === 'Elevated') {
    return {
      border: 'border-[#FF9900]/70',
      shadow: 'shadow-[0_12px_38px_rgba(255,153,0,0.24)]',
      badge: 'border-[#FF9900]/45 bg-[#FF9900]/15 text-[#FF9900]',
      bar: 'bg-[#FF9900]',
      stroke: '#FF9900',
    };
  }
  return {
    border: 'border-rose-500/70',
    shadow: 'shadow-[0_12px_38px_rgba(244,63,94,0.26)]',
    badge: 'border-rose-500/45 bg-rose-500/15 text-rose-300',
    bar: 'bg-rose-400',
    stroke: '#fb7185',
  };
}

export const IotHotspotPopup: React.FC<IotHotspotPopupProps> = ({
  sensor,
  onClose,
  onFocusZone,
  onJumpToModule,
}) => {
  const styles = getStatusClasses(sensor.status);
  const co2Pct = Math.min(100, Math.max(10, ((sensor.co2Ppm - 350) / 850) * 100));

  // Build SVG sparkline path from CO2 history
  const sparkWidth = 180;
  const sparkHeight = 28;
  const minHist = Math.min(...sensor.co2History, 380);
  const maxHist = Math.max(...sensor.co2History, minHist + 40);
  const sparkPoints = sensor.co2History
    .map((val, idx) => {
      const x =
        sensor.co2History.length > 1
          ? (idx / (sensor.co2History.length - 1)) * sparkWidth
          : sparkWidth / 2;
      const normY = (val - minHist) / (maxHist - minHist);
      const y = sparkHeight - 4 - normY * (sparkHeight - 8);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div
      role="dialog"
      aria-label={`${sensor.zoneName} IoT telemetry`}
      onClick={(e) => e.stopPropagation()}
      className={`w-[292px] sm:w-[312px] rounded-xl border ${styles.border} bg-[#0B1120]/96 p-3.5 text-slate-100 ${styles.shadow}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-[#00F0FF]">
            <Radio className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{sensor.nodeCode} · AWS IoT Core</span>
          </div>
          <h3 className="mt-0.5 truncate font-display text-sm font-bold text-white">
            {sensor.zoneName}
          </h3>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={`rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold ${styles.badge}`}
          >
            {sensor.status}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sensor popup"
            className="rounded-md border border-slate-800 bg-slate-900 p-1 text-slate-400 hover:border-slate-700 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 2x2 Real-Time Environmental Metrics */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-slate-800/90 bg-[#0F172A] px-2.5 py-2">
          <div className="flex items-center gap-1 text-[10px] text-slate-400">
            <Thermometer className="h-3 w-3 text-[#FF9900]" aria-hidden="true" />
            <span>Room Temp</span>
          </div>
          <p className="mt-0.5 font-mono text-sm font-bold tabular-nums text-white">
            {sensor.tempC.toFixed(1)} °C
          </p>
        </div>

        <div className="rounded-lg border border-slate-800/90 bg-[#0F172A] px-2.5 py-2">
          <div className="flex items-center gap-1 text-[10px] text-slate-400">
            <Wind className="h-3 w-3 text-[#00F0FF]" aria-hidden="true" />
            <span>CO₂ Level</span>
          </div>
          <p className="mt-0.5 font-mono text-sm font-bold tabular-nums text-white">
            {sensor.co2Ppm} <span className="text-[10px] font-normal text-slate-400">ppm</span>
          </p>
        </div>

        <div className="rounded-lg border border-slate-800/90 bg-[#0F172A] px-2.5 py-2">
          <div className="flex items-center gap-1 text-[10px] text-slate-400">
            <Droplets className="h-3 w-3 text-sky-400" aria-hidden="true" />
            <span>Humidity</span>
          </div>
          <p className="mt-0.5 font-mono text-sm font-bold tabular-nums text-white">
            {sensor.humidityPct}% <span className="text-[10px] font-normal text-slate-400">RH</span>
          </p>
        </div>

        <div className="rounded-lg border border-slate-800/90 bg-[#0F172A] px-2.5 py-2">
          <div className="flex items-center gap-1 text-[10px] text-slate-400">
            <Activity className="h-3 w-3 text-emerald-400" aria-hidden="true" />
            <span>{sensor.extraLabel}</span>
          </div>
          <p className="mt-0.5 font-mono text-sm font-bold tabular-nums text-white">
            {sensor.extraValue}
          </p>
        </div>
      </div>

      {/* CO2 Air Quality Bar + Sparkline */}
      <div className="mt-2.5 rounded-lg border border-slate-800/80 bg-[#0F172A]/80 px-2.5 py-2">
        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span>Air Quality Trend (CO₂)</span>
          <span className="font-mono text-slate-300">{sensor.lastUpdated}</span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className={`h-full rounded-full transition-all duration-500 ${styles.bar}`}
            style={{ width: `${co2Pct}%` }}
          />
        </div>
        <svg
          viewBox={`0 0 ${sparkWidth} ${sparkHeight}`}
          className="mt-1.5 h-6 w-full overflow-visible"
          aria-hidden="true"
        >
          <polyline
            fill="none"
            stroke={styles.stroke}
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={sparkPoints}
          />
        </svg>
      </div>

      {/* Footer Actions */}
      <div className="mt-2.5 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onFocusZone(sensor.cameraPreset)}
          className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 hover:border-[#00F0FF]/60 hover:text-[#00F0FF] transition-colors cursor-pointer whitespace-nowrap"
        >
          <Crosshair className="h-3 w-3" aria-hidden="true" />
          <span>Focus Cam</span>
        </button>
        <button
          type="button"
          onClick={() => onJumpToModule(sensor.targetSection)}
          className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-[#FF9900] px-2.5 py-1.5 text-[11px] font-bold text-[#0B1120] hover:bg-[#ffad33] transition-colors cursor-pointer whitespace-nowrap"
        >
          <span>Open Module</span>
          <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
