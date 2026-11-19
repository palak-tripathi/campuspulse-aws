export type FloorId = 'floor-1' | 'floor-2' | 'floor-3';

export type SeatStatus = 'available' | 'occupied' | 'reserved';

export interface LibrarySeat {
  id: string;
  code: string;
  floorId: FloorId;
  zone: string;
  hasPower: boolean;
  hasAc: boolean;
  status: SeatStatus;
}

export interface ActiveReservation {
  seatId: string;
  seatCode: string;
  floorId: FloorId;
  floorName: string;
  zone: string;
  reservedAt: number;
  expiresAt: number;
  passToken: string;
  checkedInAt?: number | null;
}

export type HostelHealth = 'Optimal' | 'High Load' | 'Outage';

export interface HostelBlock {
  id: string;
  name: string;
  wingLabel: string;
  downloadMbps: number;
  uploadMbps: number;
  pingMs: number;
  packetLossPct: number;
  connectedDevices: number;
  health: HostelHealth;
  lastTestedAt: string;
}

export interface WifiIncident {
  id: string;
  hostelId: string;
  hostelName: string;
  severity: HostelHealth;
  reportedDownloadMbps: number;
  note: string;
  timestamp: string;
}

export type MealType = 'Breakfast' | 'Lunch' | 'Snacks' | 'Dinner';

export interface MenuItem {
  id: string;
  name: string;
  category: 'Main' | 'Side' | 'Beverage' | 'Dessert';
  calories: number;
  avgRating: number;
  ratingCount: number;
  userRating: number | null;
}

export interface MealPoll {
  willEatCount: number;
  skipCount: number;
  userVote: 'eat' | 'skip' | null;
  estimatedKgPerStudent: number;
}

export interface WeeklyWasteDay {
  day: string;
  preparedKg: number;
  consumedKg: number;
}

export interface CampusState {
  seats: LibrarySeat[];
  reservation: ActiveReservation | null;
  hostels: HostelBlock[];
  wifiIncidents: WifiIncident[];
  meals: Record<MealType, MenuItem[]>;
  mealPolls: Record<MealType, MealPoll>;
  weeklyWaste: WeeklyWasteDay[];
  baseActiveStudents: number;
}

export const FLOOR_META: Record<
  FloorId,
  {
    id: FloorId;
    label: string;
    shortLabel: string;
    noiseDb: number;
    description: string;
  }
> = {
  'floor-1': {
    id: 'floor-1',
    label: 'Floor 1: Silent Zone',
    shortLabel: 'Silent Zone',
    noiseDb: 28,
    description: 'Deep individual focus carrels with acoustic dampening.',
  },
  'floor-2': {
    id: 'floor-2',
    label: 'Floor 2: Collaborative Pod',
    shortLabel: 'Collaborative Pod',
    noiseDb: 46,
    description: 'Group study tables, dual-monitor hubs, and whiteboard bays.',
  },
  'floor-3': {
    id: 'floor-3',
    label: 'Floor 3: Digital Research Lab',
    shortLabel: 'Digital Research Lab',
    noiseDb: 34,
    description: 'High-speed workstation desks with 10GbE and regulated cooling.',
  },
};
