import React, { useState } from 'react';
import {
  UtensilsCrossed,
  Star,
  ThumbsUp,
  SkipForward,
  TrendingDown,
} from 'lucide-react';
import {
  MealPoll,
  MealType,
  MenuItem,
  WeeklyWasteDay,
} from '../types/campus';

interface MessAnalyticsProps {
  meals: Record<MealType, MenuItem[]>;
  mealPolls: Record<MealType, MealPoll>;
  weeklyWaste: WeeklyWasteDay[];
  onRateItem: (meal: MealType, itemId: string, stars: number) => void;
  onVoteAttendance: (meal: MealType, vote: 'eat' | 'skip') => void;
}

const MEAL_TABS: MealType[] = ['Breakfast', 'Lunch', 'Snacks', 'Dinner'];

export const MessAnalytics: React.FC<MessAnalyticsProps> = ({
  meals,
  mealPolls,
  weeklyWaste,
  onRateItem,
  onVoteAttendance,
}) => {
  const [selectedMeal, setSelectedMeal] = useState<MealType>('Dinner');

  const currentItems = meals[selectedMeal];
  const currentPoll = mealPolls[selectedMeal];
  const totalVotes = currentPoll.willEatCount + currentPoll.skipCount;
  const eatPct = totalVotes > 0 ? Math.round((currentPoll.willEatCount / totalVotes) * 100) : 0;
  const skipPct = 100 - eatPct;
  const savedKgThisMeal = Math.round(
    currentPoll.skipCount * currentPoll.estimatedKgPerStudent
  );

  // Custom SVG dual-bar + efficiency trendline geometry
  const chartW = 560;
  const chartH = 230;
  const padLeft = 42;
  const padRight = 18;
  const padTop = 20;
  const padBottom = 34;
  const plotW = chartW - padLeft - padRight;
  const plotH = chartH - padTop - padBottom;

  const maxKg = Math.max(
    1000,
    ...weeklyWaste.map((d) => Math.max(d.preparedKg, d.consumedKg))
  );
  const yTicks = [0, 250, 500, 750, 1000];
  const groupW = plotW / weeklyWaste.length;
  const barW = Math.min(18, groupW * 0.28);

  const trendPoints = weeklyWaste
    .map((d, idx) => {
      const cx = padLeft + groupW * idx + groupW / 2;
      const cy = padTop + plotH - (d.consumedKg / maxKg) * plotH;
      return `${cx},${cy}`;
    })
    .join(' ');

  const totalWeeklyWasteKg = weeklyWaste.reduce(
    (sum, d) => sum + Math.max(0, d.preparedKg - d.consumedKg),
    0
  );

  return (
    <section
      id="mess"
      className="rounded-2xl border border-slate-800/90 bg-[#0F172A]/80 p-5 sm:p-7 backdrop-blur-md"
    >
      {/* Header + Meal Tabs */}
      <div className="flex flex-col gap-4 border-b border-slate-800/80 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-400">
            <UtensilsCrossed className="h-4 w-4" aria-hidden="true" />
            <span>Dining Hall Telemetry · Sustainability Loop</span>
          </div>
          <h2 className="mt-1.5 font-display text-xl sm:text-2xl font-bold text-white">
            Daily Mess Menu Rating &amp; Food Wastage Analytics
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Rate today&apos;s dishes and declare meal attendance early so kitchen batch prep adapts in real time.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Daily meal slots"
          className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-800 bg-[#0B1120] p-1"
        >
          {MEAL_TABS.map((meal) => {
            const isActive = selectedMeal === meal;
            return (
              <button
                key={meal}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setSelectedMeal(meal)}
                className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[#FF9900]/20 text-[#FF9900] border border-[#FF9900]/50 shadow-[0_0_14px_rgba(255,153,0,0.16)]'
                    : 'text-slate-400 border border-transparent hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {meal}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Split: Menu Ratings + Headcount Poll & Weekly Wastage Chart */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Left: Menu Items with 5-Star Interactive Ratings */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-white">
              {selectedMeal} Menu Feedback
            </h3>
            <span className="font-mono text-xs text-slate-400 tabular-nums">
              {currentItems.length} dishes active
            </span>
          </div>

          <div className="space-y-3">
            {currentItems.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-800/90 bg-[#0B1120]/85 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>{item.category}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {item.calories} kcal
                    </span>
                  </div>
                  <h4 className="mt-0.5 font-display text-sm sm:text-base font-semibold text-white">
                    {item.name}
                  </h4>
                </div>

                <div className="flex flex-col sm:items-end gap-1.5">
                  <div
                    className="flex items-center gap-1"
                    role="group"
                    aria-label={`Rate ${item.name}`}
                  >
                    {[1, 2, 3, 4, 5].map((star) => {
                      const activeStars =
                        item.userRating ?? Math.round(item.avgRating);
                      const isFilled = star <= activeStars;
                      return (
                        <button
                          key={star}
                          type="button"
                          onClick={() => onRateItem(selectedMeal, item.id, star)}
                          aria-label={`Give ${item.name} ${star} out of 5 stars`}
                          className="rounded p-1 transition-transform duration-100 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9900] cursor-pointer"
                        >
                          <Star
                            className={`h-4 w-4 ${
                              isFilled
                                ? 'fill-[#FF9900] text-[#FF9900]'
                                : 'text-slate-600 hover:text-slate-400'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                  <div className="font-mono text-[11px] text-slate-400 tabular-nums">
                    <span className="font-bold text-slate-200">
                      {item.avgRating.toFixed(2)}
                    </span>{' '}
                    ({item.ratingCount} votes)
                    {item.userRating !== null && (
                      <span className="ml-1.5 text-[#00F0FF]">
                        · Rated {item.userRating}/5
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Headcount Poll + Custom SVG Weekly Wastage Chart */}
        <div className="lg:col-span-6 space-y-5">
          {/* Will Eat / Skip Meal Poll */}
          <div className="rounded-xl border border-slate-800/90 bg-[#0B1120] p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-xs font-medium text-[#00F0FF]">
                  {selectedMeal} Headcount Forecast
                </span>
                <h3 className="font-display text-base font-bold text-white">
                  Will Eat / Skip Meal Poll
                </h3>
              </div>
              <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-emerald-400 tabular-nums">
                <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />
                {savedKgThisMeal} kg batch saved
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onVoteAttendance(selectedMeal, 'eat')}
                className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-xs font-bold transition-all duration-150 active:scale-[0.98] cursor-pointer ${
                  currentPoll.userVote === 'eat'
                    ? 'border-[#00F0FF] bg-[#00F0FF]/20 text-[#00F0FF] shadow-[0_0_18px_rgba(0,240,255,0.28)]'
                    : 'border-slate-800 bg-slate-900 text-slate-200 hover:border-[#00F0FF]/70 hover:shadow-[0_0_16px_rgba(0,240,255,0.2)]'
                }`}
              >
                <ThumbsUp className="h-4 w-4" aria-hidden="true" />
                <span>Will Eat ({currentPoll.willEatCount})</span>
              </button>

              <button
                type="button"
                onClick={() => onVoteAttendance(selectedMeal, 'skip')}
                className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-xs font-bold transition-all duration-150 active:scale-[0.98] cursor-pointer ${
                  currentPoll.userVote === 'skip'
                    ? 'border-emerald-400 bg-emerald-400/20 text-emerald-300 shadow-[0_0_18px_rgba(52,211,153,0.28)]'
                    : 'border-slate-800 bg-slate-900 text-slate-200 hover:border-emerald-400/70 hover:shadow-[0_0_16px_rgba(52,211,153,0.2)]'
                }`}
              >
                <SkipForward className="h-4 w-4" aria-hidden="true" />
                <span>Skip Meal ({currentPoll.skipCount})</span>
              </button>
            </div>

            {/* Split Bar */}
            <div className="mt-4">
              <div className="flex justify-between font-mono text-[11px] text-slate-400 tabular-nums mb-1.5">
                <span>Attending: {eatPct}%</span>
                <span>Skipping: {skipPct}%</span>
              </div>
              <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="bg-[#00F0FF] transition-all duration-300"
                  style={{ width: `${eatPct}%` }}
                />
                <div
                  className="bg-emerald-400 transition-all duration-300"
                  style={{ width: `${skipPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Custom SVG Weekly Food Prepared vs Consumed Chart */}
          <div className="rounded-xl border border-slate-800/90 bg-[#0B1120] p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-display text-sm font-bold text-white">
                  Weekly Food Prepared vs. Consumed (kg)
                </h3>
                <p className="text-xs text-slate-400">
                  Reactively recalculates when students declare meal skips.
                </p>
              </div>
              <span className="font-mono text-xs text-[#FF9900] tabular-nums">
                Net Surplus: {totalWeeklyWasteKg} kg/wk
              </span>
            </div>

            <div className="mt-4 w-full overflow-x-auto">
              <svg
                viewBox={`0 0 ${chartW} ${chartH}`}
                className="w-full h-auto min-w-[420px]"
                role="img"
                aria-label="Bar and trend chart comparing weekly food prepared versus consumed in kilograms"
              >
                {/* Horizontal Gridlines */}
                {yTicks.map((tick) => {
                  const y = padTop + plotH - (tick / maxKg) * plotH;
                  return (
                    <g key={tick}>
                      <line
                        x1={padLeft}
                        y1={y}
                        x2={chartW - padRight}
                        y2={y}
                        stroke="#1E293B"
                        strokeDasharray="3 3"
                      />
                      <text
                        x={padLeft - 8}
                        y={y + 4}
                        textAnchor="end"
                        fill="#64748B"
                        className="font-mono text-[10px] tabular-nums"
                      >
                        {tick}
                      </text>
                    </g>
                  );
                })}

                {/* Grouped Bars */}
                {weeklyWaste.map((d, idx) => {
                  const centerX = padLeft + groupW * idx + groupW / 2;
                  const prepH = (d.preparedKg / maxKg) * plotH;
                  const consH = (d.consumedKg / maxKg) * plotH;
                  const prepY = padTop + plotH - prepH;
                  const consY = padTop + plotH - consH;

                  return (
                    <g key={d.day}>
                      <rect
                        x={centerX - barW - 2}
                        y={prepY}
                        width={barW}
                        height={prepH}
                        rx="3"
                        fill="#334155"
                      />
                      <rect
                        x={centerX + 2}
                        y={consY}
                        width={barW}
                        height={consH}
                        rx="3"
                        fill="#00F0FF"
                        fillOpacity="0.85"
                      />
                      <text
                        x={centerX}
                        y={chartH - 10}
                        textAnchor="middle"
                        fill="#94A3B8"
                        className="font-mono text-[11px]"
                      >
                        {d.day}
                      </text>
                    </g>
                  );
                })}

                {/* Consumption Trend Polyline */}
                <polyline
                  fill="none"
                  stroke="#FF9900"
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  points={trendPoints}
                />
                {weeklyWaste.map((d, idx) => {
                  const cx = padLeft + groupW * idx + groupW / 2;
                  const cy = padTop + plotH - (d.consumedKg / maxKg) * plotH;
                  return (
                    <circle
                      key={`pt-${d.day}`}
                      cx={cx}
                      cy={cy}
                      r="3.2"
                      fill="#0B1120"
                      stroke="#FF9900"
                      strokeWidth="2"
                    />
                  );
                })}
              </svg>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-5 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-slate-600" />
                Prepared (kg)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#00F0FF]" />
                Consumed (kg)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-0.5 w-4 bg-[#FF9900]" />
                Consumption Trend
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
