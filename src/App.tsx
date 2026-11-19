import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  RotateCcw,
  Armchair,
  Wifi,
  UtensilsCrossed,
  ChevronRight,
  Box,
} from 'lucide-react';
import { useCampusState } from './hooks/useCampusState';
import { Navbar, ConsoleTabId } from './components/Navbar';
import { KpiTelemetryBar } from './components/KpiTelemetryBar';
import { Campus3DTwin } from './components/Campus3DTwin';
import { LibrarySeatMap } from './components/LibrarySeatMap';
import { HostelWifiMonitor } from './components/HostelWifiMonitor';
import { MessAnalytics } from './components/MessAnalytics';
import { AwsArchitectureModal } from './components/AwsArchitectureModal';
import { CampusPulseAssistant } from './components/CampusPulseAssistant';

export default function App() {
  const {
    state,
    telemetry,
    bookSeat,
    checkInSeat,
    releaseSeat,
    updateHostelFromSpeedTest,
    reportHostelIssue,
    rateMenuItem,
    voteMealAttendance,
    resetCampusState,
  } = useCampusState();

  const [activeTab, setActiveTab] = useState<ConsoleTabId>('library');
  const [show3DTwin, setShow3DTwin] = useState<boolean>(false);
  const [isArchModalOpen, setIsArchModalOpen] = useState(false);

  const availableSeatsCount =
    telemetry.totalSeatsCount - telemetry.occupiedSeatsCount;

  const handleSelectTab = useCallback((tab: ConsoleTabId) => {
    setShow3DTwin(false);
    setActiveTab(tab);
  }, []);

  const handleJumpFrom3D = useCallback((sectionId: 'library' | 'wifi' | 'mess') => {
    setShow3DTwin(false);
    setActiveTab(sectionId);
  }, []);

  const handleDownloadReport = useCallback(() => {
    const snapshot = {
      application: 'CampusPulse AWS: Smart Campus Infrastructure & Telemetry Hub',
      builder: '@palak9900',
      region: 'ap-south-1 (Mumbai)',
      generatedAt: new Date().toISOString(),
      telemetrySummary: {
        activeStudentsOnline: telemetry.activeStudentsCount,
        availableSeatsCount,
        totalSeatsCount: telemetry.totalSeatsCount,
        libraryOccupancyPct: telemetry.libraryOccupancyPct,
        quietestLibraryFloor: telemetry.quietestFloor,
        avgWifiSpeedMbps: telemetry.avgWifiSpeed,
        bestPerformingHostel: {
          name: telemetry.bestHostel.name,
          downloadMbps: telemetry.bestHostel.downloadMbps,
          pingMs: telemetry.bestHostel.pingMs,
        },
        messSatisfactionScore: telemetry.messSatisfactionScore,
        estimatedFoodWasteSavedKg: telemetry.foodWasteSavedKg,
      },
      activeSeatReservation: state.reservation,
      libraryFloorBreakdown: telemetry.floorStats,
      hostelWifiBlocks: state.hostels,
      recentWifiIncidents: state.wifiIncidents,
      messMenuRatings: state.meals,
      mealAttendancePolls: state.mealPolls,
      weeklyFoodWasteAnalytics: state.weeklyWaste,
    };

    const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateSlug = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `campuspulse-telemetry-${dateSlug}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [availableSeatsCount, state, telemetry]);

  const consoleTabs: Array<{
    id: ConsoleTabId;
    label: string;
    badge: string;
    icon: typeof Armchair;
  }> = [
    {
      id: 'library',
      label: '1. Smart Library Map',
      badge: `${availableSeatsCount} free`,
      icon: Armchair,
    },
    {
      id: 'wifi',
      label: '2. Hostel Wi-Fi Monitor',
      badge: `${telemetry.avgWifiSpeed} Mbps`,
      icon: Wifi,
    },
    {
      id: 'mess',
      label: '3. Mess & Waste Tracker',
      badge: `${telemetry.foodWasteSavedKg} kg saved`,
      icon: UtensilsCrossed,
    },
  ];

  return (
    <div id="top" className="min-h-screen bg-[#0B1120] text-slate-100">
      {/* Subtle AWS Console Ambient Backdrop */}
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-[#00F0FF]/6 blur-[130px]" />
        <div className="absolute top-1/3 right-1/6 h-96 w-96 rounded-full bg-[#FF9900]/6 blur-[140px]" />
      </div>

      <Navbar
        activeStudentsCount={telemetry.activeStudentsCount}
        activeTab={activeTab}
        show3DTwin={show3DTwin}
        onSelectTab={handleSelectTab}
        onOpenArchitecture={() => setIsArchModalOpen(true)}
      />

      <main className="relative z-10 mx-auto max-w-7xl space-y-5 px-4 py-5 sm:px-6 lg:px-8">
        {/* AWS Cloud Console Breadcrumb & Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono text-slate-400">
              <span className="text-[#FF9900]">AWS Console</span>
              <ChevronRight className="h-3 w-3 text-slate-600" aria-hidden="true" />
              <span>ap-south-1</span>
              <ChevronRight className="h-3 w-3 text-slate-600" aria-hidden="true" />
              <span className="text-slate-200">CampusPulse Hub</span>
            </div>
            <h1 className="mt-1 font-display text-xl sm:text-2xl font-bold tracking-tight text-white">
              CampusPulse AWS · Smart Campus Dashboard
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setShow3DTwin((v) => !v)}
              className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-all duration-150 active:scale-[0.98] cursor-pointer whitespace-nowrap ${
                show3DTwin
                  ? 'border-[#00F0FF] bg-[#00F0FF]/20 text-[#00F0FF] shadow-[0_0_20px_rgba(0,240,255,0.3)]'
                  : 'border-slate-700 bg-[#0F172A] text-slate-200 hover:border-[#00F0FF]/60 hover:text-[#00F0FF] hover:shadow-[0_0_16px_rgba(0,240,255,0.2)]'
              }`}
            >
              <Box className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{show3DTwin ? 'Exit 3D Campus Twin' : '3D Campus Twin'}</span>
            </button>

            <button
              type="button"
              onClick={resetCampusState}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-[#0F172A] px-3.5 py-2 text-xs font-semibold text-slate-300 transition-all duration-150 hover:border-[#FF9900]/50 hover:text-white hover:shadow-[0_0_16px_rgba(255,153,0,0.18)] active:scale-[0.98] cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Reset Demo State</span>
            </button>
          </div>
        </div>

        {/* Top KPI Bar with 4 Live Cards */}
        <KpiTelemetryBar
          availableSeatsCount={availableSeatsCount}
          totalSeatsCount={telemetry.totalSeatsCount}
          avgWifiSpeed={telemetry.avgWifiSpeed}
          bestHostelName={telemetry.bestHostel.name}
          messSatisfactionScore={telemetry.messSatisfactionScore}
          foodWasteSavedKg={telemetry.foodWasteSavedKg}
          onDownloadReport={handleDownloadReport}
        />

        {/* Clean 3-Tab Navigation (No long scrolling) */}
        <div
          role="tablist"
          aria-label="CampusPulse 3-tab modules"
          className="grid grid-cols-1 gap-2 sm:grid-cols-3 rounded-xl border border-slate-800 bg-[#0F172A]/90 p-1.5"
        >
          {consoleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = !show3DTwin && activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => handleSelectTab(tab.id)}
                className={`flex items-center justify-between gap-2 rounded-lg border px-4 py-2.5 text-xs font-semibold transition-all duration-150 active:scale-[0.99] cursor-pointer ${
                  isActive
                    ? 'border-[#FF9900]/75 bg-[#FF9900]/16 text-white shadow-[0_0_20px_rgba(255,153,0,0.22)]'
                    : 'border-transparent text-slate-400 hover:border-slate-700 hover:bg-slate-800/60 hover:text-slate-100'
                }`}
              >
                <span className="inline-flex items-center gap-2 whitespace-nowrap">
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive ? 'text-[#FF9900]' : 'text-slate-400'
                    }`}
                    aria-hidden="true"
                  />
                  <span>{tab.label}</span>
                </span>
                <span
                  className={`rounded px-2 py-0.5 font-mono text-[10px] tabular-nums whitespace-nowrap ${
                    isActive
                      ? 'bg-[#FF9900]/20 text-[#FF9900]'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Module or 3D Campus Twin Viewport */}
        <AnimatePresence mode="wait">
          <motion.div
            key={show3DTwin ? 'twin' : activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            {show3DTwin ? (
              <Campus3DTwin
                libraryOccupancyPct={telemetry.libraryOccupancyPct}
                avgWifiSpeed={telemetry.avgWifiSpeed}
                foodWasteSavedKg={telemetry.foodWasteSavedKg}
                hostels={state.hostels}
                hasActiveReservation={Boolean(state.reservation)}
                onSelectSection={handleJumpFrom3D}
                onOpenArchitecture={() => setIsArchModalOpen(true)}
              />
            ) : (
              <>
                {activeTab === 'library' && (
                  <LibrarySeatMap
                    seats={state.seats}
                    reservation={state.reservation}
                    onBookSeat={bookSeat}
                    onCheckInSeat={checkInSeat}
                    onReleaseSeat={releaseSeat}
                  />
                )}

                {activeTab === 'wifi' && (
                  <HostelWifiMonitor
                    hostels={state.hostels}
                    incidents={state.wifiIncidents}
                    onSpeedTestComplete={updateHostelFromSpeedTest}
                    onReportIssue={reportHostelIssue}
                  />
                )}

                {activeTab === 'mess' && (
                  <MessAnalytics
                    meals={state.meals}
                    mealPolls={state.mealPolls}
                    weeklyWaste={state.weeklyWaste}
                    onRateItem={rateMenuItem}
                    onVoteAttendance={voteMealAttendance}
                  />
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Clean Console Footer */}
        <footer className="flex flex-col gap-2 border-t border-slate-800/80 pt-4 pb-8 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>
            CampusPulse AWS · Techfest IIT Bombay AWS ShipIt Challenge · Builder: @palak9900
          </span>
          <div className="flex items-center gap-4">
            <span>State persisted safely in localStorage</span>
            <button
              type="button"
              onClick={() => setIsArchModalOpen(true)}
              className="font-semibold text-[#FF9900] hover:underline cursor-pointer"
            >
              AWS Architecture
            </button>
          </div>
        </footer>
      </main>

      {/* AWS Architecture Modal */}
      <AwsArchitectureModal
        isOpen={isArchModalOpen}
        onClose={() => setIsArchModalOpen(false)}
      />

      {/* Floating Ask Bedrock AI Mini Assistant */}
      <CampusPulseAssistant state={state} telemetry={telemetry} />
    </div>
  );
}
