import React, { useState, useEffect } from 'react';
import {
  Wifi,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Gauge,
  Send,
  ArrowDown,
  ArrowUp,
} from 'lucide-react';
import { HostelBlock, HostelHealth, WifiIncident } from '../types/campus';

interface HostelWifiMonitorProps {
  hostels: HostelBlock[];
  incidents: WifiIncident[];
  onSpeedTestComplete: (
    hostelId: string,
    downloadMbps: number,
    uploadMbps: number,
    pingMs: number
  ) => void;
  onReportIssue: (
    hostelId: string,
    severity: HostelHealth,
    reportedDownloadMbps: number,
    note: string
  ) => void;
}

export const HostelWifiMonitor: React.FC<HostelWifiMonitorProps> = ({
  hostels,
  incidents,
  onSpeedTestComplete,
  onReportIssue,
}) => {
  const [selectedHostelId, setSelectedHostelId] = useState<string>(
    hostels[0]?.id ?? 'hostel-a'
  );
  const [isTesting, setIsTesting] = useState(false);
  const [gaugeSpeed, setGaugeSpeed] = useState<number>(0);
  const [testPhase, setTestPhase] = useState<string>('Idle');

  // Issue / Speed Report Form
  const [reportSeverity, setReportSeverity] = useState<HostelHealth>('High Load');
  const [reportSpeed, setReportSpeed] = useState<string>('65');
  const [reportNote, setReportNote] = useState<string>('');
  const [reportFeedback, setReportFeedback] = useState<string | null>(null);

  const selectedHostel =
    hostels.find((h) => h.id === selectedHostelId) ?? hostels[0];

  useEffect(() => {
    if (!isTesting && selectedHostel) {
      setGaugeSpeed(selectedHostel.downloadMbps);
    }
  }, [selectedHostel, isTesting]);

  const handleRunSpeedTest = () => {
    if (isTesting || !selectedHostel) return;
    setIsTesting(true);
    setTestPhase('Probing Latency...');

    const targetBase =
      selectedHostel.health === 'Outage'
        ? 22 + Math.floor(Math.random() * 20)
        : selectedHostel.health === 'High Load'
        ? 110 + Math.floor(Math.random() * 85)
        : 270 + Math.floor(Math.random() * 110);

    let tick = 0;
    const timer = window.setInterval(() => {
      tick += 1;
      if (tick <= 6) {
        setTestPhase('Measuring Download...');
        setGaugeSpeed(
          Math.max(8, Math.round(targetBase * (0.4 + tick * 0.1) + (Math.random() * 24 - 12)))
        );
      } else if (tick <= 10) {
        setTestPhase('Measuring Upload...');
        setGaugeSpeed(
          Math.max(8, Math.round(targetBase + (Math.random() * 16 - 8)))
        );
      } else {
        window.clearInterval(timer);
        const finalDown = targetBase;
        const finalUp = Math.max(5, Math.round(finalDown * 0.74));
        const finalPing =
          finalDown > 200 ? 6 + Math.floor(Math.random() * 9) : finalDown > 80 ? 28 + Math.floor(Math.random() * 18) : 112 + Math.floor(Math.random() * 35);

        setGaugeSpeed(finalDown);
        setTestPhase('Telemetry Synced');
        setIsTesting(false);
        onSpeedTestComplete(selectedHostel.id, finalDown, finalUp, finalPing);
      }
    }, 180);
  };

  const handleSubmitReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHostel) return;
    const parsedSpeed = Math.max(1, Math.min(1000, Number(reportSpeed) || 15));
    onReportIssue(selectedHostel.id, reportSeverity, parsedSpeed, reportNote);
    setReportNote('');
    setReportFeedback(`Telemetry incident logged for ${selectedHostel.name}.`);
    window.setTimeout(() => setReportFeedback(null), 3500);
  };

  // Semicircular SVG arc calculation (max 400 Mbps)
  const maxScale = 400;
  const clampedRatio = Math.min(1, Math.max(0, gaugeSpeed / maxScale));
  const arcRadius = 74;
  const arcCircumference = Math.PI * arcRadius;
  const dashOffset = arcCircumference * (1 - clampedRatio);

  const healthMeta = (health: HostelHealth) => {
    if (health === 'Optimal') {
      return {
        text: 'text-emerald-400',
        border: 'border-emerald-500/35',
        bg: 'bg-emerald-500/10',
        icon: CheckCircle2,
      };
    }
    if (health === 'High Load') {
      return {
        text: 'text-[#FF9900]',
        border: 'border-[#FF9900]/45',
        bg: 'bg-[#FF9900]/10',
        icon: Activity,
      };
    }
    return {
      text: 'text-rose-400',
      border: 'border-rose-500/45',
      bg: 'bg-rose-500/10',
      icon: AlertTriangle,
    };
  };

  return (
    <section
      id="wifi"
      className="rounded-2xl border border-slate-800/90 bg-[#0F172A]/80 p-5 sm:p-7 backdrop-blur-md"
    >
      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-slate-800/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-[#FF9900]">
            <Wifi className="h-4 w-4" aria-hidden="true" />
            <span>Campus Backbone · Hostel Mesh Diagnostics</span>
          </div>
          <h2 className="mt-1.5 font-display text-xl sm:text-2xl font-bold text-white">
            Live Hostel Wi-Fi Speed &amp; Outage Reporter
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Select any hostel block from A to F to run a live throughput probe or submit an outage telemetry report.
          </p>
        </div>
        <span className="font-mono text-xs text-slate-400 tabular-nums">
          6 Blocks Monitored · 10Gbps Campus Uplink
        </span>
      </div>

      {/* Main Split: 6 Hostel Cards + Speed Test Simulator & Reporter */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Left: 6 Hostel Cards + Live Incident Feed */}
        <div className="lg:col-span-7 space-y-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {hostels.map((hostel) => {
              const meta = healthMeta(hostel.health);
              const StatusIcon = meta.icon;
              const isSelected = hostel.id === selectedHostel?.id;

              return (
                <button
                  key={hostel.id}
                  type="button"
                  onClick={() => setSelectedHostelId(hostel.id)}
                  className={`flex flex-col justify-between rounded-xl border p-4 text-left transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF] ${
                    isSelected
                      ? 'border-[#00F0FF]/70 bg-[#0B1120] shadow-[0_0_20px_rgba(0,240,255,0.14)]'
                      : 'border-slate-800/90 bg-[#0B1120]/70 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-display text-base font-bold text-white">
                        {hostel.name}
                      </h3>
                      <p className="text-xs text-slate-400">{hostel.wingLabel}</p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${meta.border} ${meta.bg} ${meta.text}`}
                    >
                      <StatusIcon className="h-3 w-3" aria-hidden="true" />
                      {hostel.health}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-800/80 pt-3 font-mono text-xs tabular-nums">
                    <div>
                      <span className="flex items-center gap-1 text-[10px] text-slate-500">
                        <ArrowDown className="h-3 w-3 text-[#00F0FF]" aria-hidden="true" />
                        Down
                      </span>
                      <span className="font-bold text-white">
                        {hostel.downloadMbps} <span className="text-[10px] font-normal text-slate-400">Mbps</span>
                      </span>
                    </div>
                    <div>
                      <span className="flex items-center gap-1 text-[10px] text-slate-500">
                        <ArrowUp className="h-3 w-3 text-[#FF9900]" aria-hidden="true" />
                        Up
                      </span>
                      <span className="font-bold text-slate-200">
                        {hostel.uploadMbps} <span className="text-[10px] font-normal text-slate-400">Mbps</span>
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-500">Ping</span>
                      <span className="font-bold text-slate-200">
                        {hostel.pingMs} <span className="text-[10px] font-normal text-slate-400">ms</span>
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Live Incident Feed */}
          <div className="rounded-xl border border-slate-800/90 bg-[#0B1120]/80 p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-semibold text-white">
                Recent Network Incident Feed
              </h3>
              <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                {incidents.length} logged events
              </span>
            </div>

            <div className="mt-3 divide-y divide-slate-800/80 max-h-56 overflow-y-auto pr-1">
              {incidents.map((inc) => {
                const meta = healthMeta(inc.severity);
                return (
                  <div
                    key={inc.id}
                    className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-semibold text-white">
                          {inc.hostelName}
                        </span>
                        <span className={`font-medium ${meta.text}`}>
                          {inc.severity}
                        </span>
                        <span className="text-slate-500">·</span>
                        <span className="font-mono text-slate-300 tabular-nums">
                          {inc.reportedDownloadMbps} Mbps
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-400 truncate">
                        {inc.note}
                      </p>
                    </div>
                    <span className="font-mono text-[11px] text-slate-500 shrink-0 tabular-nums">
                      {inc.timestamp}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Speed Test Gauge Simulator & Issue Report Form */}
        <div className="lg:col-span-5 space-y-5">
          {/* Speed Test Simulator */}
          <div className="rounded-xl border border-slate-800 bg-[#0B1120] p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="text-xs font-medium text-[#00F0FF]">
                  Active Diagnostic Node
                </span>
                <h3 className="font-display text-lg font-bold text-white">
                  {selectedHostel?.name} Speed Probe
                </h3>
              </div>
              <span className="font-mono text-xs text-slate-400">
                {testPhase}
              </span>
            </div>

            {/* Animated SVG Speedometer Gauge */}
            <div className="mt-4 flex flex-col items-center">
              <svg
                viewBox="0 0 200 118"
                className="w-full max-w-[260px]"
                role="img"
                aria-label={`Speed gauge showing ${gaugeSpeed} Mbps`}
              >
                <defs>
                  <linearGradient id="speedGaugeGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#FF9900" />
                    <stop offset="55%" stopColor="#00F0FF" />
                    <stop offset="100%" stopColor="#34D399" />
                  </linearGradient>
                </defs>
                {/* Track Arc */}
                <path
                  d="M 26 98 A 74 74 0 0 1 174 98"
                  fill="none"
                  stroke="#1E293B"
                  strokeWidth="14"
                  strokeLinecap="round"
                />
                {/* Value Arc */}
                <path
                  d="M 26 98 A 74 74 0 0 1 174 98"
                  fill="none"
                  stroke="url(#speedGaugeGrad)"
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeDasharray={arcCircumference}
                  strokeDashoffset={dashOffset}
                  style={{ transition: 'stroke-dashoffset 180ms ease-out' }}
                />
                <text
                  x="100"
                  y="78"
                  textAnchor="middle"
                  fill="#FFFFFF"
                  className="font-mono text-[28px] font-bold tabular-nums"
                >
                  {gaugeSpeed}
                </text>
                <text
                  x="100"
                  y="98"
                  textAnchor="middle"
                  fill="#94A3B8"
                  className="font-mono text-[11px]"
                >
                  Mbps Download
                </text>
              </svg>

              <div className="mt-2 grid w-full grid-cols-3 gap-2 rounded-lg border border-slate-800/80 bg-slate-900/60 p-3 text-center font-mono text-xs tabular-nums">
                <div>
                  <span className="block text-[10px] text-slate-400">Upload</span>
                  <span className="font-bold text-white">
                    {selectedHostel?.uploadMbps} Mbps
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400">Latency</span>
                  <span className="font-bold text-[#00F0FF]">
                    {selectedHostel?.pingMs} ms
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400">Devices</span>
                  <span className="font-bold text-[#FF9900]">
                    {selectedHostel?.connectedDevices}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRunSpeedTest}
                disabled={isTesting}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#00F0FF] px-4 py-2.5 text-xs font-bold text-[#0B1120] shadow-[0_0_18px_rgba(0,240,255,0.28)] transition-all duration-150 hover:bg-[#5ef6ff] hover:shadow-[0_0_26px_rgba(0,240,255,0.5)] active:scale-[0.98] disabled:opacity-60 cursor-pointer"
              >
                <Gauge className="h-4 w-4" aria-hidden="true" />
                <span>{isTesting ? 'Running Speed Test...' : 'Run Speed Test'}</span>
              </button>
            </div>
          </div>

          {/* Report Outage / Speed Form */}
          <form
            onSubmit={handleSubmitReport}
            className="rounded-xl border border-slate-800 bg-[#0B1120] p-5 space-y-3.5"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-bold text-white">
                Report Outage / Speed
              </h3>
              <span className="font-mono text-xs text-[#FF9900]">
                {selectedHostel?.name}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="wifi-severity"
                  className="block text-xs font-medium text-slate-400"
                >
                  Observed Status
                </label>
                <select
                  id="wifi-severity"
                  value={reportSeverity}
                  onChange={(e) => setReportSeverity(e.target.value as HostelHealth)}
                  className="mt-1.5 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-[#FF9900] focus:outline-none"
                >
                  <option value="Outage">Outage</option>
                  <option value="High Load">High Load</option>
                  <option value="Optimal">Optimal</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="wifi-speed"
                  className="block text-xs font-medium text-slate-400"
                >
                  Speed (Mbps)
                </label>
                <input
                  id="wifi-speed"
                  type="number"
                  min={1}
                  max={1000}
                  value={reportSpeed}
                  onChange={(e) => setReportSpeed(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-mono text-xs text-slate-100 focus:border-[#FF9900] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="wifi-note"
                className="block text-xs font-medium text-slate-400"
              >
                Diagnostic Note
              </label>
              <input
                id="wifi-note"
                type="text"
                maxLength={180}
                value={reportNote}
                onChange={(e) => setReportNote(e.target.value)}
                placeholder="e.g., Packet drops on Wing 2 5GHz AP..."
                className="mt-1.5 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-[#FF9900] focus:outline-none"
              />
            </div>

            {reportFeedback && (
              <p className="text-xs font-medium text-emerald-400">
                {reportFeedback}
              </p>
            )}

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#FF9900]/70 bg-[#FF9900]/15 px-4 py-2.5 text-xs font-semibold text-[#FF9900] transition-all duration-150 hover:bg-[#FF9900] hover:text-[#0B1120] hover:shadow-[0_0_22px_rgba(255,153,0,0.45)] active:scale-[0.98] cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Report Outage</span>
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};
