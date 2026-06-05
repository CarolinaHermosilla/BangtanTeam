export interface ParkingSpot {
  id: number;
  label: string;
  status: "available" | "occupied" | "reserved" | "blocked";
  occupiedBy?: string;
  reservedFor?: string;
  vehicleType?: "ev" | "suv" | "freight";
  durationSpent?: string;
  stayDuration?: string;
  blockageDetails?: string;
  updatedAt: string;
}

export interface EventLog {
  id: string;
  spot: string;
  timestamp: string;
  type: "occupied" | "vacated" | "reserved" | "alert";
  statusText: string;
  details?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: "admin" | "guard" | "professor";
  plate: string;
  status: "active" | "offline";
  avatar: string;
}

export interface SystemStats {
  occupancyPercentage: number;
  occupiedCount: number;
  reservedCount: number;
  blockedCount: number;
  availableCount: number;
  totalSpots: number;
}

export interface FullSystemState {
  parkingSpots: ParkingSpot[];
  eventsLog: EventLog[];
  users: UserProfile[];
  emergencyLockout: boolean;
  gateStatus: "open" | "closed";
  overrideStatus: boolean;
  stats: SystemStats;
}
