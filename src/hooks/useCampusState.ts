import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CampusState,
  FLOOR_META,
  FloorId,
  HostelBlock,
  HostelHealth,
  LibrarySeat,
  MealType,
  WifiIncident,
} from '../types/campus';

const STORAGE_KEY = 'campuspulse_aws_state_v1';

function buildInitialSeats(): LibrarySeat[] {
  const seats: LibrarySeat[] = [];

  const floorConfigs: Array<{
    floorId: FloorId;
    prefix: string;
    zones: string[];
    occupiedIndices: Set<number>;
  }> = [
    {
      floorId: 'floor-1',
      prefix: 'S1',
      zones: ['North Wing AC', 'Atrium Quiet Bay', 'Window Carrels'],
      occupiedIndices: new Set([0, 2, 3, 5, 8, 11, 14, 17, 19, 22]),
    },
    {
      floorId: 'floor-2',
      prefix: 'C2',
      zones: ['Pod Alpha AC', 'Whiteboard Bay', 'Mezzanine Desk'],
      occupiedIndices: new Set([0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 15, 16, 18, 20, 21, 23]),
    },
    {
      floorId: 'floor-3',
      prefix: 'R3',
      zones: ['Compute Cluster AC', 'CAD Terminal Row', 'Archive Alcove'],
      occupiedIndices: new Set([1, 4, 7, 10, 12, 15, 18, 21]),
    },
  ];

  floorConfigs.forEach(({ floorId, prefix, zones, occupiedIndices }) => {
    for (let i = 0; i < 24; i++) {
      const row = String.fromCharCode(65 + Math.floor(i / 6));
      const col = (i % 6) + 1;
      const zone = zones[Math.floor(i / 8)];
      seats.push({
        id: `${floorId}-${row}${col}`,
        code: `${prefix}-${row}${col}`,
        floorId,
        zone,
        hasPower: i % 3 !== 2,
        hasAc: zone.includes('AC') || i < 16,
        status: occupiedIndices.has(i) ? 'occupied' : 'available',
      });
    }
  });

  return seats;
}

export function createInitialCampusState(): CampusState {
  return {
    seats: buildInitialSeats(),
    reservation: null,
    hostels: [
      {
        id: 'hostel-a',
        name: 'Hostel A',
        wingLabel: 'Aravalli Block · North',
        downloadMbps: 312,
        uploadMbps: 245,
        pingMs: 9,
        packetLossPct: 0.1,
        connectedDevices: 428,
        health: 'Optimal',
        lastTestedAt: '2 mins ago',
      },
      {
        id: 'hostel-b',
        name: 'Hostel B',
        wingLabel: 'Nilgiri Block · Central',
        downloadMbps: 268,
        uploadMbps: 194,
        pingMs: 14,
        packetLossPct: 0.2,
        connectedDevices: 512,
        health: 'Optimal',
        lastTestedAt: '5 mins ago',
      },
      {
        id: 'hostel-c',
        name: 'Hostel C',
        wingLabel: 'Sahyadri Block · East',
        downloadMbps: 94,
        uploadMbps: 52,
        pingMs: 42,
        packetLossPct: 1.8,
        connectedDevices: 689,
        health: 'High Load',
        lastTestedAt: '1 min ago',
      },
      {
        id: 'hostel-d',
        name: 'Hostel D',
        wingLabel: 'Vindhya Block · West',
        downloadMbps: 348,
        uploadMbps: 290,
        pingMs: 7,
        packetLossPct: 0.0,
        connectedDevices: 374,
        health: 'Optimal',
        lastTestedAt: '4 mins ago',
      },
      {
        id: 'hostel-e',
        name: 'Hostel E',
        wingLabel: 'Satpura Block · South',
        downloadMbps: 18,
        uploadMbps: 6,
        pingMs: 138,
        packetLossPct: 8.4,
        connectedDevices: 196,
        health: 'Outage',
        lastTestedAt: 'Just now',
      },
      {
        id: 'hostel-f',
        name: 'Hostel F',
        wingLabel: 'Himgiri Block · Lakeview',
        downloadMbps: 142,
        uploadMbps: 96,
        pingMs: 28,
        packetLossPct: 0.9,
        connectedDevices: 584,
        health: 'High Load',
        lastTestedAt: '3 mins ago',
      },
    ],
    wifiIncidents: [
      {
        id: 'inc-1',
        hostelId: 'hostel-e',
        hostelName: 'Hostel E',
        severity: 'Outage',
        reportedDownloadMbps: 18,
        note: 'Core switch uplink flap on Wing 3 corridor APs.',
        timestamp: '10:02 AM',
      },
      {
        id: 'inc-2',
        hostelId: 'hostel-c',
        hostelName: 'Hostel C',
        severity: 'High Load',
        reportedDownloadMbps: 94,
        note: 'Peak concurrent lecture streaming congestion on 5GHz band.',
        timestamp: '09:44 AM',
      },
      {
        id: 'inc-3',
        hostelId: 'hostel-f',
        hostelName: 'Hostel F',
        severity: 'High Load',
        reportedDownloadMbps: 142,
        note: 'High packet contention near Mess Annex access point.',
        timestamp: '09:15 AM',
      },
    ],
    meals: {
      Breakfast: [
        {
          id: 'bf-1',
          name: 'Masala Poha & Sev',
          category: 'Main',
          calories: 310,
          avgRating: 4.4,
          ratingCount: 186,
          userRating: null,
        },
        {
          id: 'bf-2',
          name: 'Aloo Paratha with Curd',
          category: 'Main',
          calories: 420,
          avgRating: 4.6,
          ratingCount: 242,
          userRating: null,
        },
        {
          id: 'bf-3',
          name: 'Sprouts Chaat & Boiled Eggs',
          category: 'Side',
          calories: 195,
          avgRating: 4.1,
          ratingCount: 118,
          userRating: null,
        },
        {
          id: 'bf-4',
          name: 'Filter Coffee & Masala Chai',
          category: 'Beverage',
          calories: 90,
          avgRating: 4.7,
          ratingCount: 310,
          userRating: null,
        },
      ],
      Lunch: [
        {
          id: 'ln-1',
          name: 'Paneer Butter Masala',
          category: 'Main',
          calories: 460,
          avgRating: 4.5,
          ratingCount: 294,
          userRating: null,
        },
        {
          id: 'ln-2',
          name: 'Dal Tadka & Jeera Rice',
          category: 'Main',
          calories: 390,
          avgRating: 4.2,
          ratingCount: 265,
          userRating: null,
        },
        {
          id: 'ln-3',
          name: 'Phulka Roti & Boondi Raita',
          category: 'Side',
          calories: 240,
          avgRating: 4.0,
          ratingCount: 204,
          userRating: null,
        },
        {
          id: 'ln-4',
          name: 'Kesar Rasmalai',
          category: 'Dessert',
          calories: 215,
          avgRating: 4.8,
          ratingCount: 318,
          userRating: null,
        },
      ],
      Snacks: [
        {
          id: 'sn-1',
          name: 'Bombay Vada Pav & Chutney',
          category: 'Main',
          calories: 320,
          avgRating: 4.7,
          ratingCount: 278,
          userRating: null,
        },
        {
          id: 'sn-2',
          name: 'Corn & Spinach Sandwich',
          category: 'Side',
          calories: 230,
          avgRating: 3.9,
          ratingCount: 142,
          userRating: null,
        },
        {
          id: 'sn-3',
          name: 'Ginger Lemon Iced Tea',
          category: 'Beverage',
          calories: 85,
          avgRating: 4.3,
          ratingCount: 169,
          userRating: null,
        },
      ],
      Dinner: [
        {
          id: 'dn-1',
          name: 'Hyderabadi Veg Dum Biryani',
          category: 'Main',
          calories: 510,
          avgRating: 4.6,
          ratingCount: 332,
          userRating: null,
        },
        {
          id: 'dn-2',
          name: 'Chana Masala & Tandoori Roti',
          category: 'Main',
          calories: 410,
          avgRating: 4.1,
          ratingCount: 215,
          userRating: null,
        },
        {
          id: 'dn-3',
          name: 'Mirchi Ka Salan & Salad',
          category: 'Side',
          calories: 145,
          avgRating: 3.8,
          ratingCount: 129,
          userRating: null,
        },
        {
          id: 'dn-4',
          name: 'Warm Gulab Jamun',
          category: 'Dessert',
          calories: 240,
          avgRating: 4.9,
          ratingCount: 384,
          userRating: null,
        },
      ],
    },
    mealPolls: {
      Breakfast: { willEatCount: 742, skipCount: 188, userVote: null, estimatedKgPerStudent: 0.32 },
      Lunch: { willEatCount: 865, skipCount: 112, userVote: null, estimatedKgPerStudent: 0.45 },
      Snacks: { willEatCount: 620, skipCount: 234, userVote: null, estimatedKgPerStudent: 0.22 },
      Dinner: { willEatCount: 814, skipCount: 146, userVote: null, estimatedKgPerStudent: 0.44 },
    },
    weeklyWaste: [
      { day: 'Mon', preparedKg: 940, consumedKg: 862 },
      { day: 'Tue', preparedKg: 910, consumedKg: 848 },
      { day: 'Wed', preparedKg: 960, consumedKg: 895 },
      { day: 'Thu', preparedKg: 890, consumedKg: 842 },
      { day: 'Fri', preparedKg: 925, consumedKg: 874 },
      { day: 'Sat', preparedKg: 820, consumedKg: 778 },
      { day: 'Sun', preparedKg: 860, consumedKg: 822 },
    ],
    baseActiveStudents: 2846,
  };
}

function deriveHealth(downloadMbps: number, pingMs: number): HostelHealth {
  if (downloadMbps < 40 || pingMs > 95) return 'Outage';
  if (downloadMbps < 160 || pingMs > 25) return 'High Load';
  return 'Optimal';
}

export function useCampusState() {
  const [state, setState] = useState<CampusState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<CampusState>;
        const isValid =
          parsed &&
          Array.isArray(parsed.seats) &&
          parsed.seats.length === 72 &&
          Array.isArray(parsed.hostels) &&
          parsed.hostels.length === 6 &&
          parsed.meals &&
          parsed.mealPolls &&
          Array.isArray(parsed.weeklyWaste);

        if (isValid) {
          const validState = parsed as CampusState;
          if (validState.reservation && validState.reservation.expiresAt <= Date.now()) {
            validState.seats = validState.seats.map((s) =>
              s.id === validState.reservation?.seatId ? { ...s, status: 'available' } : s
            );
            validState.reservation = null;
          }
          return validState;
        }
      }
    } catch {
      // Fallback to initial state if localStorage is unavailable or corrupted
    }
    return createInitialCampusState();
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota issues
    }
  }, [state]);

  // Periodically check reservation expiry
  useEffect(() => {
    if (!state.reservation) return;
    const interval = window.setInterval(() => {
      setState((prev) => {
        if (prev.reservation && prev.reservation.expiresAt <= Date.now()) {
          return {
            ...prev,
            seats: prev.seats.map((s) =>
              s.id === prev.reservation?.seatId ? { ...s, status: 'available' } : s
            ),
            reservation: null,
          };
        }
        return prev;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [state.reservation]);

  const bookSeat = useCallback((seatId: string, durationMinutes = 120) => {
    setState((prev) => {
      const target = prev.seats.find((s) => s.id === seatId);
      if (!target || target.status !== 'available') return prev;

      const updatedSeats = prev.seats.map((s) => {
        if (prev.reservation && s.id === prev.reservation.seatId) {
          return { ...s, status: 'available' as const };
        }
        if (s.id === seatId) {
          return { ...s, status: 'reserved' as const };
        }
        return s;
      });

      const now = Date.now();
      const tokenSeed = `${target.code}-${now.toString(36).toUpperCase().slice(-5)}`;

      return {
        ...prev,
        seats: updatedSeats,
        reservation: {
          seatId: target.id,
          seatCode: target.code,
          floorId: target.floorId,
          floorName: FLOOR_META[target.floorId].label,
          zone: target.zone,
          reservedAt: now,
          expiresAt: now + durationMinutes * 60 * 1000,
          passToken: `AWS-IITB-${tokenSeed}`,
          checkedInAt: null,
        },
      };
    });
  }, []);

  const checkInSeat = useCallback(
    (scannedInput: string): { success: boolean; message: string } => {
      const normalized = scannedInput.trim().toUpperCase();
      if (!state.reservation) {
        return {
          success: false,
          message: 'No active booking found. Reserve a cyan seat first.',
        };
      }
      if (!normalized) {
        return {
          success: false,
          message: 'Scan or enter a valid Seat ID (e.g., S1-A1).',
        };
      }

      const matchesSeat =
        normalized === state.reservation.seatCode.toUpperCase() ||
        normalized === state.reservation.passToken.toUpperCase() ||
        normalized === state.reservation.seatId.toUpperCase();

      if (!matchesSeat) {
        return {
          success: false,
          message: `Mismatch: Scanned "${normalized}", expected "${state.reservation.seatCode}".`,
        };
      }

      setState((prev) => {
        if (!prev.reservation) return prev;
        return {
          ...prev,
          reservation: {
            ...prev.reservation,
            checkedInAt: prev.reservation.checkedInAt ?? Date.now(),
          },
        };
      });

      return {
        success: true,
        message: `Checked in to Seat ${state.reservation.seatCode}.`,
      };
    },
    [state.reservation]
  );

  const releaseSeat = useCallback(() => {
    setState((prev) => {
      if (!prev.reservation) return prev;
      const releasedId = prev.reservation.seatId;
      return {
        ...prev,
        seats: prev.seats.map((s) => (s.id === releasedId ? { ...s, status: 'available' } : s)),
        reservation: null,
      };
    });
  }, []);

  const updateHostelFromSpeedTest = useCallback(
    (hostelId: string, downloadMbps: number, uploadMbps: number, pingMs: number) => {
      setState((prev) => ({
        ...prev,
        hostels: prev.hostels.map((h) => {
          if (h.id !== hostelId) return h;
          return {
            ...h,
            downloadMbps,
            uploadMbps,
            pingMs,
            health: deriveHealth(downloadMbps, pingMs),
            lastTestedAt: 'Just now',
          };
        }),
      }));
    },
    []
  );

  const reportHostelIssue = useCallback(
    (hostelId: string, severity: HostelHealth, reportedDownloadMbps: number, note: string) => {
      setState((prev) => {
        const hostel = prev.hostels.find((h) => h.id === hostelId);
        if (!hostel) return prev;

        const pingBySeverity =
          severity === 'Outage' ? 145 : severity === 'High Load' ? 48 : 11;
        const packetLossBySeverity =
          severity === 'Outage' ? 9.2 : severity === 'High Load' ? 2.1 : 0.1;

        const nowLabel = new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });

        const newIncident: WifiIncident = {
          id: `inc-${Date.now()}`,
          hostelId,
          hostelName: hostel.name,
          severity,
          reportedDownloadMbps,
          note: note.trim() || `${severity} telemetry report submitted from ${hostel.name}.`,
          timestamp: nowLabel,
        };

        return {
          ...prev,
          hostels: prev.hostels.map((h) =>
            h.id === hostelId
              ? {
                  ...h,
                  downloadMbps: reportedDownloadMbps,
                  uploadMbps: Math.max(4, Math.round(reportedDownloadMbps * 0.68)),
                  pingMs: pingBySeverity,
                  packetLossPct: packetLossBySeverity,
                  health: severity,
                  lastTestedAt: 'Just now',
                }
              : h
          ),
          wifiIncidents: [newIncident, ...prev.wifiIncidents].slice(0, 8),
        };
      });
    },
    []
  );

  const rateMenuItem = useCallback((meal: MealType, itemId: string, stars: number) => {
    setState((prev) => ({
      ...prev,
      meals: {
        ...prev.meals,
        [meal]: prev.meals[meal].map((item) => {
          if (item.id !== itemId) return item;
          const prevUser = item.userRating;
          const totalScore = item.avgRating * item.ratingCount;
          let nextCount = item.ratingCount;
          let nextTotal = totalScore;

          if (prevUser === null) {
            nextCount += 1;
            nextTotal += stars;
          } else {
            nextTotal = nextTotal - prevUser + stars;
          }

          return {
            ...item,
            avgRating: Number((nextTotal / nextCount).toFixed(2)),
            ratingCount: nextCount,
            userRating: stars,
          };
        }),
      },
    }));
  }, []);

  const voteMealAttendance = useCallback((meal: MealType, vote: 'eat' | 'skip') => {
    setState((prev) => {
      const currentPoll = prev.mealPolls[meal];
      if (currentPoll.userVote === vote) return prev;

      let willEatCount = currentPoll.willEatCount;
      let skipCount = currentPoll.skipCount;

      if (currentPoll.userVote === 'eat') willEatCount -= 1;
      if (currentPoll.userVote === 'skip') skipCount -= 1;

      if (vote === 'eat') willEatCount += 1;
      if (vote === 'skip') skipCount += 1;

      // Dynamically adjust today's (Sun / latest) weekly bar so charts visibly respond to user votes
      const updatedWeekly = prev.weeklyWaste.map((dayItem, idx) => {
        if (idx !== prev.weeklyWaste.length - 1) return dayItem;
        const deltaPrepared = vote === 'skip' ? -4 : 4;
        const deltaConsumed = vote === 'eat' ? 3 : -1;
        return {
          ...dayItem,
          preparedKg: Math.max(700, dayItem.preparedKg + deltaPrepared),
          consumedKg: Math.min(
            Math.max(680, dayItem.consumedKg + deltaConsumed),
            Math.max(700, dayItem.preparedKg + deltaPrepared)
          ),
        };
      });

      return {
        ...prev,
        mealPolls: {
          ...prev.mealPolls,
          [meal]: {
            ...currentPoll,
            willEatCount,
            skipCount,
            userVote: vote,
          },
        },
        weeklyWaste: updatedWeekly,
      };
    });
  }, []);

  const resetCampusState = useCallback(() => {
    const fresh = createInitialCampusState();
    setState(fresh);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    } catch {
      // Ignore
    }
  }, []);

  const telemetry = useMemo(() => {
    const totalSeats = state.seats.length;
    const occupiedOrReserved = state.seats.filter((s) => s.status !== 'available').length;
    const libraryOccupancyPct = Math.round((occupiedOrReserved / totalSeats) * 100);

    const floorStats = (['floor-1', 'floor-2', 'floor-3'] as FloorId[]).map((fid) => {
      const floorSeats = state.seats.filter((s) => s.floorId === fid);
      const avail = floorSeats.filter((s) => s.status === 'available').length;
      const occPct = Math.round(((floorSeats.length - avail) / floorSeats.length) * 100);
      return {
        floorId: fid,
        label: FLOOR_META[fid].label,
        shortLabel: FLOOR_META[fid].shortLabel,
        noiseDb: FLOOR_META[fid].noiseDb,
        availableSeats: avail,
        totalSeats: floorSeats.length,
        occupancyPct: occPct,
      };
    });

    const quietestFloor = [...floorStats].sort((a, b) => a.occupancyPct - b.occupancyPct)[0];

    const avgWifiSpeed = Math.round(
      state.hostels.reduce((acc, h) => acc + h.downloadMbps, 0) / state.hostels.length
    );
    const bestHostel: HostelBlock = [...state.hostels].sort(
      (a, b) => b.downloadMbps - a.downloadMbps
    )[0];

    const allMenuItems = Object.values(state.meals).flat();
    const messSatisfactionScore = Number(
      (
        allMenuItems.reduce((acc, item) => acc + item.avgRating, 0) / allMenuItems.length
      ).toFixed(2)
    );

    const foodWasteSavedKg = Math.round(
      Object.values(state.mealPolls).reduce(
        (acc, poll) => acc + poll.skipCount * poll.estimatedKgPerStudent,
        0
      )
    );

    const activeStudentsCount =
      state.baseActiveStudents +
      (state.reservation ? 1 : 0) +
      state.hostels.reduce((acc, h) => acc + (h.health === 'Optimal' ? 2 : 0), 0);

    return {
      libraryOccupancyPct,
      occupiedSeatsCount: occupiedOrReserved,
      totalSeatsCount: totalSeats,
      floorStats,
      quietestFloor,
      avgWifiSpeed,
      bestHostel,
      messSatisfactionScore,
      foodWasteSavedKg,
      activeStudentsCount,
    };
  }, [state]);

  return {
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
  };
}
