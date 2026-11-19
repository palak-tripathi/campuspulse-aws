import React from 'react';
import { Cloud, Users, Layers } from 'lucide-react';

export type ConsoleTabId = 'library' | 'wifi' | 'mess';

interface NavbarProps {
  activeStudentsCount: number;
  activeTab: ConsoleTabId;
  show3DTwin: boolean;
  onSelectTab: (tab: ConsoleTabId) => void;
  onOpenArchitecture: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeStudentsCount,
  activeTab,
  show3DTwin,
  onSelectTab,
  onOpenArchitecture,
}) => {
  const navItems: Array<{ id: ConsoleTabId; label: string }> = [
    { id: 'library', label: '1. Smart Library Map' },
    { id: 'wifi', label: '2. Hostel Wi-Fi Monitor' },
    { id: 'mess', label: '3. Mess & Waste Tracker' },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-[#0B1120]/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2.5 sm:px-6 lg:px-8">
        {/* Custom SVG Brand Logo + Builder Tag */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onSelectTab('library')}
            className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9900] rounded-lg cursor-pointer text-left"
          >
            <svg
              width="34"
              height="34"
              viewBox="0 0 36 36"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="shrink-0"
              aria-hidden="true"
            >
              <rect
                x="1"
                y="1"
                width="34"
                height="34"
                rx="8"
                fill="#0F172A"
                stroke="url(#cpLogoGrad)"
                strokeWidth="1.5"
              />
              <path
                d="M8 21H12.5L15 13L18.5 24L21.5 16L23.8 21H28"
                stroke="#00F0FF"
                strokeWidth="2.1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M11.5 26.5C15.5 29.2 21.2 29.2 25.5 26.2"
                stroke="#FF9900"
                strokeWidth="2.1"
                strokeLinecap="round"
              />
              <circle cx="25.5" cy="26.2" r="1.4" fill="#FF9900" />
              <defs>
                <linearGradient
                  id="cpLogoGrad"
                  x1="2"
                  y1="2"
                  x2="34"
                  y2="34"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#FF9900" />
                  <stop offset="1" stopColor="#00F0FF" />
                </linearGradient>
              </defs>
            </svg>
            <div className="flex flex-col leading-tight">
              <span className="font-display text-sm sm:text-base font-bold tracking-tight text-white whitespace-nowrap">
                CampusPulse <span className="text-[#FF9900]">AWS</span>
              </span>
              <span className="text-[11px] font-mono text-slate-400 whitespace-nowrap">
                Builder: <span className="text-[#00F0FF]">@palak9900</span>
              </span>
            </div>
          </button>
        </div>

        {/* Clean 3-Tab Console Quick Nav */}
        <nav
          aria-label="Primary console sections"
          className="hidden lg:flex items-center gap-5 text-xs font-semibold"
        >
          {navItems.map((item) => {
            const isActive = !show3DTwin && activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`relative py-1.5 whitespace-nowrap shrink-0 transition-colors duration-150 cursor-pointer ${
                  isActive
                    ? 'text-[#FF9900]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {item.label}
                {isActive && (
                  <span className="absolute inset-x-0 -bottom-0.5 h-0.5 rounded-full bg-[#FF9900] shadow-[0_0_8px_#FF9900]" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Live Region Green Badge, Online Count & Glowing AWS Architecture Button */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <div className="hidden md:flex items-center gap-3 text-xs font-mono">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/40 bg-emerald-500/12 px-2.5 py-1 text-emerald-300 whitespace-nowrap">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
              <Cloud className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
              <span>ap-south-1 (Mumbai) • Active</span>
            </span>
            <span className="hidden xl:inline-flex items-center gap-1.5 whitespace-nowrap tabular-nums text-slate-300">
              <Users className="h-3.5 w-3.5 text-[#FF9900]" aria-hidden="true" />
              <strong className="font-semibold text-white">
                {activeStudentsCount.toLocaleString()}
              </strong>
            </span>
          </div>

          <button
            type="button"
            onClick={onOpenArchitecture}
            className="inline-flex items-center gap-2 rounded-lg border border-[#FF9900]/75 bg-[#FF9900]/15 px-3.5 py-2 text-xs font-semibold text-[#FF9900] shadow-[0_0_18px_rgba(255,153,0,0.25)] transition-all duration-150 hover:bg-[#FF9900] hover:text-[#0B1120] hover:shadow-[0_0_26px_rgba(255,153,0,0.55)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9900] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Layers className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>AWS Architecture</span>
          </button>
        </div>
      </div>
    </header>
  );
};
