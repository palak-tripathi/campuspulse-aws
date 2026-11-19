import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Sparkles, Bot } from 'lucide-react';
import { CampusState, HostelBlock } from '../types/campus';

interface TelemetrySnapshot {
  libraryOccupancyPct: number;
  occupiedSeatsCount: number;
  totalSeatsCount: number;
  floorStats: Array<{
    floorId: string;
    label: string;
    shortLabel: string;
    noiseDb: number;
    availableSeats: number;
    totalSeats: number;
    occupancyPct: number;
  }>;
  quietestFloor: {
    floorId: string;
    label: string;
    shortLabel: string;
    noiseDb: number;
    availableSeats: number;
    totalSeats: number;
    occupancyPct: number;
  };
  avgWifiSpeed: number;
  bestHostel: HostelBlock;
  messSatisfactionScore: number;
  foodWasteSavedKg: number;
}

interface CampusPulseAssistantProps {
  state: CampusState;
  telemetry: TelemetrySnapshot;
}

interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  timestamp: string;
}

const QUICK_PROMPTS = [
  'Which library floor is quietest right now?',
  'Best Wi-Fi hostel block?',
  "What's for dinner?",
  'How much food waste was saved today?',
];

function generateLiveBedrockAnswer(
  query: string,
  state: CampusState,
  telemetry: TelemetrySnapshot
): string {
  const q = query.toLowerCase();

  if (q.includes('quiet') || q.includes('library') || q.includes('floor') || q.includes('seat')) {
    const qf = telemetry.quietestFloor;
    const lowestDb = [...telemetry.floorStats].sort((a, b) => a.noiseDb - b.noiseDb)[0];
    const seatNote = state.reservation
      ? ` You currently hold Seat ${state.reservation.seatCode} (${state.reservation.zone}).`
      : '';
    return `${qf.label} has the lowest occupancy right now at ${qf.occupancyPct}% (${qf.availableSeats}/${qf.totalSeats} seats open, ${qf.noiseDb} dB). For absolute lowest acoustic noise, ${lowestDb.label} measures ${lowestDb.noiseDb} dB with ${lowestDb.availableSeats} open seats.${seatNote}`;
  }

  if (q.includes('wifi') || q.includes('wi-fi') || q.includes('hostel') || q.includes('speed') || q.includes('outage')) {
    const best = telemetry.bestHostel;
    const outages = state.hostels.filter((h) => h.health === 'Outage');
    const outageText =
      outages.length > 0
        ? ` Alert: ${outages.map((o) => o.name).join(', ')} currently reports an Outage.`
        : ' All 6 hostel blocks are currently online without critical outages.';
    return `${best.name} (${best.wingLabel}) leads campus throughput at ${best.downloadMbps} Mbps down / ${best.uploadMbps} Mbps up with ${best.pingMs} ms ping. Campus-wide hostel average is ${telemetry.avgWifiSpeed} Mbps.${outageText}`;
  }

  if (q.includes('dinner') || q.includes('mess') || q.includes('menu') || q.includes('food') || q.includes('eat')) {
    const dinnerItems = state.meals.Dinner;
    const topDish = [...dinnerItems].sort((a, b) => b.avgRating - a.avgRating)[0];
    const dinnerList = dinnerItems.map((d) => d.name).join(', ');
    const poll = state.mealPolls.Dinner;
    return `Tonight's Dinner menu features: ${dinnerList}. Top-rated dish is ${topDish.name} (${topDish.avgRating.toFixed(1)}/5). Currently ${poll.willEatCount} students plan to eat and ${poll.skipCount} have marked Skip Meal.`;
  }

  if (q.includes('waste') || q.includes('save') || q.includes('kg') || q.includes('sustainability')) {
    return `Students have saved an estimated ${telemetry.foodWasteSavedKg} kg of food waste today via early Skip Meal declarations, keeping overall mess satisfaction at ${telemetry.messSatisfactionScore}/5.0.`;
  }

  return `Live CampusPulse summary: Library is at ${telemetry.libraryOccupancyPct}% occupancy (${telemetry.quietestFloor.label} is most open), average hostel Wi-Fi is ${telemetry.avgWifiSpeed} Mbps (led by ${telemetry.bestHostel.name}), and ${telemetry.foodWasteSavedKg} kg of food waste has been prevented today.`;
}

export const CampusPulseAssistant: React.FC<CampusPulseAssistantProps> = ({
  state,
  telemetry,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Hello! I am CampusPulse AI (Amazon Bedrock simulation). Ask me about live library seat availability, hostel Wi-Fi speeds, or today’s mess menu.',
      timestamp: 'Now',
    },
  ]);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const sendQuery = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const timeStr = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
      timestamp: timeStr,
    };

    const replyText = generateLiveBedrockAnswer(trimmed, state, telemetry);
    const botMsg: ChatMessage = {
      id: `a-${Date.now() + 1}`,
      role: 'assistant',
      text: replyText,
      timestamp: timeStr,
    };

    setMessages((prev) => [...prev, userMsg, botMsg]);
    setInput('');
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {isOpen && (
        <div
          role="dialog"
          aria-label="Ask CampusPulse AI assistant"
          className="flex w-[calc(100vw-2.5rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-slate-700/90 bg-[#0B1120]/95 shadow-[0_12px_50px_rgba(0,0,0,0.65)] backdrop-blur-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 bg-[#0F172A] px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#FF9900]/40 bg-[#FF9900]/15 text-[#FF9900]">
                <Bot className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-display text-sm font-bold text-white">
                  Ask Bedrock AI
                </h3>
                <p className="text-[11px] text-[#00F0FF]">
                  Amazon Bedrock · Live Campus Status
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close Ask Bedrock AI chat"
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="max-h-72 space-y-3 overflow-y-auto p-4 text-xs"
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[88%] rounded-xl px-3.5 py-2.5 leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#FF9900] text-[#0B1120] font-medium'
                      : 'border border-slate-800 bg-[#0F172A] text-slate-200'
                  }`}
                >
                  {msg.text}
                </div>
                <span className="mt-1 font-mono text-[10px] text-slate-500">
                  {msg.timestamp}
                </span>
              </div>
            ))}
          </div>

          {/* Quick Prompt Chips */}
          <div className="border-t border-slate-800/80 bg-[#0F172A]/60 px-3 py-2.5">
            <p className="mb-2 flex items-center gap-1 text-[10px] font-medium text-slate-400">
              <Sparkles className="h-3 w-3 text-[#FF9900]" aria-hidden="true" />
              Quick Telemetry Prompts
            </p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => sendQuery(prompt)}
                  className="rounded-md border border-slate-700/90 bg-[#0B1120] px-2.5 py-1 text-[11px] text-slate-300 transition-colors hover:border-[#00F0FF]/60 hover:text-[#00F0FF] cursor-pointer text-left"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendQuery(input);
            }}
            className="flex items-center gap-2 border-t border-slate-800 bg-[#0B1120] p-3"
          >
            <input
              type="text"
              value={input}
              maxLength={240}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about seats, Wi-Fi, or mess..."
              aria-label="Ask Bedrock AI a question"
              className="flex-1 rounded-lg border border-slate-800 bg-[#0F172A] px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-[#00F0FF] focus:outline-none"
            />
            <button
              type="submit"
              aria-label="Send prompt"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#00F0FF] text-[#0B1120] transition-colors hover:bg-[#5ef6ff] cursor-pointer shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* Floating Launcher Button */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="inline-flex items-center gap-2.5 rounded-full border border-[#00F0FF]/50 bg-[#0F172A] px-4 py-3 text-xs sm:text-sm font-semibold text-white shadow-[0_0_28px_rgba(0,240,255,0.28)] transition-all duration-150 hover:border-[#FF9900] hover:shadow-[0_0_32px_rgba(255,153,0,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF] cursor-pointer"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FF9900] text-[#0B1120]">
          <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <span className="whitespace-nowrap">Ask Bedrock AI</span>
      </button>
    </div>
  );
};
