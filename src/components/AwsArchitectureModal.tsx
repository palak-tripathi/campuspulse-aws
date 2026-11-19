import React, { useState, useEffect } from 'react';
import {
  X,
  Globe,
  Network,
  Cpu,
  Database,
  HardDrive,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';

interface AwsArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ArchNode {
  id: string;
  name: string;
  layer: string;
  freeTierQuota: string;
  summary: string;
  responsibilities: string[];
  accent: string;
}

const ARCH_NODES: ArchNode[] = [
  {
    id: 'amplify',
    name: 'AWS Amplify',
    layer: 'Frontend CI/CD & Edge Hosting',
    freeTierQuota: '1,000 build mins/mo · 15 GB served',
    summary:
      'Hosts the Vite + React SPA globally over CloudFront edge locations near ap-south-1 (Mumbai) with automated GitHub CI/CD.',
    responsibilities: [
      'Git-triggered atomic deployments with instant preview branches',
      'Global edge caching for sub-30ms campus first-byte latency',
      'Managed HTTPS/TLS certificates with zero server maintenance',
    ],
    accent: '#FF9900',
  },
  {
    id: 'apigateway',
    name: 'Amazon API Gateway',
    layer: 'API Routing & Throttling',
    freeTierQuota: '1M HTTP API calls/mo (12 mos)',
    summary:
      'Provides secure HTTPS REST and WebSocket endpoints for seat reservations, Wi-Fi telemetry ingestion, and mess poll updates.',
    responsibilities: [
      'Request validation, CORS hardening, and burst throttling',
      'Routes POST /seats, POST /wifi/outage, and GET /telemetry',
      'JWT authorizer readiness for IITB SSO student authentication',
    ],
    accent: '#00F0FF',
  },
  {
    id: 'lambda',
    name: 'AWS Lambda',
    layer: 'Serverless Compute Microservices',
    freeTierQuota: '1M requests/mo · 400k GB-sec free',
    summary:
      'Executes stateless Node.js microservices for atomic seat locking, Wi-Fi anomaly classification, and Amazon Bedrock prompt orchestration.',
    responsibilities: [
      'Zero idle billing during off-peak night hours & breaks',
      'Computes food batch reductions dynamically from skip votes',
      'Sub-100ms cold-start optimization for campus traffic spikes',
    ],
    accent: '#FF9900',
  },
  {
    id: 'dynamodb',
    name: 'Amazon DynamoDB',
    layer: 'NoSQL Telemetry & Seat State',
    freeTierQuota: '25 GB storage · 25 WCU / 25 RCU always free',
    summary:
      'Single-table NoSQL store maintaining library seat locks, TTL-backed QR passes, hostel health metrics, and daily mess counts.',
    responsibilities: [
      'Single-digit millisecond conditional writes prevent double booking',
      'Native DynamoDB TTL automatically expires stale seat holds',
      'Streams telemetry events for real-time campus dashboards',
    ],
    accent: '#00F0FF',
  },
  {
    id: 's3',
    name: 'Amazon S3',
    layer: 'Static Assets & Analytics Lake',
    freeTierQuota: '5 GB Standard Storage · 20k GETs',
    summary:
      'Stores downloadable JSON/CSV campus telemetry snapshots, historical food waste reports, and library floor vector maps.',
    responsibilities: [
      'Durable archival of daily dining hall waste reduction metrics',
      'Server-side SSE-S3 encryption with strict private bucket ACLs',
      'Lifecycle policies transition semester logs to Glacier Instant',
    ],
    accent: '#FF9900',
  },
];

export const AwsArchitectureModal: React.FC<AwsArchitectureModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeNodeId, setActiveNodeId] = useState<string>('amplify');

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const activeNode =
    ARCH_NODES.find((n) => n.id === activeNodeId) ?? ARCH_NODES[0];

  const getIcon = (id: string) => {
    if (id === 'amplify') return Globe;
    if (id === 'apigateway') return Network;
    if (id === 'lambda') return Cpu;
    if (id === 'dynamodb') return Database;
    return HardDrive;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="aws-arch-title"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-slate-700/80 bg-[#0B1120] p-5 sm:p-7 shadow-[0_0_60px_rgba(0,240,255,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#FF9900]">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              <span>AWS Free Tier Reference Architecture · ap-south-1 · @palak9900</span>
            </div>
            <h2
              id="aws-arch-title"
              className="mt-1 font-display text-xl sm:text-2xl font-bold text-white"
            >
              CampusPulse AWS End-to-End Flow Diagram
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close AWS architecture modal"
            className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-400 transition-colors hover:border-slate-700 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 5-Node Interactive Visual Flow Diagram */}
        <div className="mt-6">
          <p className="text-xs text-slate-400 mb-3">
            Click any AWS service node in the 5-stage pipeline to inspect its architectural role and Free Tier allocation.
          </p>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-5 items-stretch">
            {ARCH_NODES.map((node, idx) => {
              const Icon = getIcon(node.id);
              const isSelected = node.id === activeNode.id;

              return (
                <div key={node.id} className="relative flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveNodeId(node.id)}
                    className={`flex h-full w-full flex-col justify-between rounded-xl border p-3.5 text-left transition-all duration-150 cursor-pointer ${
                      isSelected
                        ? 'border-[#FF9900] bg-[#0F172A] shadow-[0_0_22px_rgba(255,153,0,0.22)]'
                        : 'border-slate-800 bg-[#0F172A]/60 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-[#0B1120]"
                        style={{ color: node.accent }}
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="font-mono text-[10px] text-slate-500">
                        0{idx + 1}
                      </span>
                    </div>

                    <div className="mt-3">
                      <h3 className="font-display text-xs sm:text-sm font-bold text-white">
                        {node.name}
                      </h3>
                      <p className="mt-0.5 text-[11px] text-slate-400 leading-snug">
                        {node.layer}
                      </p>
                    </div>
                  </button>

                  {idx < ARCH_NODES.length - 1 && (
                    <ArrowRight
                      className="hidden md:block h-4 w-4 shrink-0 text-[#00F0FF]/75"
                      aria-hidden="true"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Node Inspector */}
        <div className="mt-6 rounded-xl border border-slate-800 bg-[#0F172A]/90 p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-4">
            <div>
              <span className="text-xs font-medium text-[#00F0FF]">
                {activeNode.layer}
              </span>
              <h3 className="font-display text-lg font-bold text-white">
                {activeNode.name}
              </h3>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3 py-1.5 font-mono text-xs text-emerald-300">
              <HardDrive className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{activeNode.freeTierQuota}</span>
            </div>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-slate-300">
            {activeNode.summary}
          </p>

          <ul className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {activeNode.responsibilities.map((resp) => (
              <li
                key={resp}
                className="flex items-start gap-2 rounded-lg border border-slate-800/80 bg-[#0B1120] p-3 text-xs text-slate-300"
              >
                <CheckCircle2
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#FF9900]"
                  aria-hidden="true"
                />
                <span>{resp}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Cost Summary Footer */}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-[#00F0FF]/25 bg-[#00F0FF]/5 px-4 py-3 text-xs">
          <span className="text-slate-300">
            Designed for zero-ops IIT Bombay scale: handles <strong className="text-white">3,000+ daily students</strong> within AWS Free Tier limits, plus Amazon Bedrock for AI campus Q&amp;A.
          </span>
          <span className="font-mono font-bold text-[#00F0FF] whitespace-nowrap">
            Est. Monthly Infra: ~$0.00 (Free Tier)
          </span>
        </div>
      </div>
    </div>
  );
};
