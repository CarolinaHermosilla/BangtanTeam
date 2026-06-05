import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

interface ParkingSpot {
  id: number;
  label: string;
  status: "available" | "occupied" | "reserved" | "blocked";
  occupiedBy?: string;
  reservedFor?: string;
  vehicleType?: "ev" | "suv" | "freight";
  durationSpent?: string; // e.g. "02:14:45"
  stayDuration?: string; // e.g. "4h 12m"
  blockageDetails?: string;
  updatedAt: string;
}

interface EventLog {
  id: string;
  spot: string;
  timestamp: string; // e.g. "2m ago"
  type: "occupied" | "vacated" | "reserved" | "alert";
  statusText: string;
  details?: string;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: "admin" | "guard" | "professor";
  plate: string;
  status: "active" | "offline";
  avatar: string;
}

// Relational Database Schema Simulations (PostgreSQL representation)
interface DBProfile {
  id: number;
  full_name: string;
  role: "guardia" | "profesor";
  created_at: string;
}

interface DBVehicle {
  id: number;
  professor_id: number;
  plate: string;
  is_authorized: boolean;
}

interface DBParkingSpace {
  id: number;
  label: string;
  status: "LIBRE" | "RESERVADO" | "OCUPADO" | "MANTENIMIENTO";
  blockage_details?: string;
  updated_at: string;
}

interface DBParkingLog {
  id: number;
  parking_space_id: number;
  plate: string;
  professor_id: number | null;
  check_in: string;
  check_out: string | null;
  registered_by: number;
}

interface DBUserDeviceToken {
  id: number;
  user_id: number;
  device_token: string;
  updated_at: string;
}

interface DBVipReservation {
  id: number;
  parking_space_id: number;
  reservation_date: string;
  description: string;
  created_by: number;
}

// In-Memory Database Tables representing screenshots precisely
let dbProfiles: DBProfile[] = [];
let dbVehicles: DBVehicle[] = [];
let dbParkingSpaces: DBParkingSpace[] = [];
let dbParkingLogs: DBParkingLog[] = [];
let dbUserDeviceTokens: DBUserDeviceToken[] = [];
let dbVipReservations: DBVipReservation[] = [];

let eventsLog: EventLog[] = [];
let emergencyLockout = false;
let gateStatus: "open" | "closed" = "closed";
let overrideStatus = false;

// Helpers to dynamically convert relational database state to UI-expected schema format
function getParkingSpots(): ParkingSpot[] {
  return dbParkingSpaces.map(space => {
    // Find active log (where check_out is null and parking_space_id is space.id)
    const activeLog = dbParkingLogs.find(l => l.parking_space_id === space.id && l.check_out === null);
    
    // Find vip reservation matching space designated for VIP (space.id === 12)
    const vipRes = dbVipReservations.find(r => r.parking_space_id === space.id);

    // Determine vehicle type (ev, suv, freight)
    let vehicleType: ParkingSpot["vehicleType"] = "suv";
    if (activeLog) {
      const isProfVehicle = dbVehicles.find(v => v.plate.toUpperCase() === activeLog.plate.toUpperCase());
      if (isProfVehicle) {
        vehicleType = "ev"; // Professors drive compact EVs!
      } else {
        const types: ParkingSpot["vehicleType"][] = ["ev", "suv", "freight"];
        vehicleType = types[space.id % types.length];
      }
    }

    return {
      id: space.id,
      label: space.label,
      status: space.status === "LIBRE" ? "available" :
              space.status === "OCUPADO" ? "occupied" :
              space.status === "RESERVADO" ? "reserved" : "blocked",
      occupiedBy: activeLog ? activeLog.plate : undefined,
      reservedFor: vipRes ? vipRes.description : undefined,
      vehicleType,
      blockageDetails: space.status === "MANTENIMIENTO" ? (space.blockage_details || "Mantenimiento Preventivo") : undefined,
      updatedAt: space.updated_at
    };
  });
}

function getUserProfiles(): UserProfile[] {
  return dbProfiles.map(profile => {
    const vehicle = dbVehicles.find(v => v.professor_id === profile.id);
    const isActive = profile.role === "guardia" || (vehicle ? dbParkingLogs.some(l => l.plate.toUpperCase() === vehicle.plate.toUpperCase() && l.check_out === null) : false);

    return {
      id: `usr-${profile.id}`,
      name: profile.full_name,
      email: `${profile.full_name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ".")}@university.edu`,
      role: profile.role === "guardia" ? "guard" : "professor",
      plate: vehicle ? vehicle.plate : "N/A",
      status: isActive ? "active" : "offline",
      avatar: profile.id === 1 ? "https://lh3.googleusercontent.com/aida/AP1WRLuYkGmivS2W07X4cUVMLosE8N1HpkDAYzb5K5OHeWEya5Ubd-QaQW3RGNDN7hmVZuL_MysnP-eovontWG38tMOhrLpZp5Dx5a-Db7UgoVvX55bXaKOEuS2hjTivNQP2KrNq4i9MaQisCKBXolf8JL3qgRiV0X3YCVWluOHiTMZL-eosDjeGP23u8eKzEzbBI_kwuuhJwVilG8CRfGD69OFQlnovEBtVCGiWMYVtxUj7jLYpFaUT9DP4HzzV" :
              profile.id === 2 ? "https://lh3.googleusercontent.com/aida/AP1WRLtvBRANbM_t_2mViuPyq69oKeGY_J7zdR7Q90OVJwVEf-2H14fEK210T-Hl97Zj9Rba5hRset4yVeTpso1SkwzCWdKM43TGYi26tUQ4Zh6RrW1st_yroLi_05_679sEAphve5Yonwh-sJ6m8HERdhoFUy2u2BsisTzht2EonAFKM8BkGewHhvU-KEFqQ_LsIiiA495A3RtD4U0mXRQX53tYh83qwcUE9cNR_4KLRXcn8tnNeqmegTWpT3EU" :
              profile.id === 3 ? "https://lh3.googleusercontent.com/aida/AP1WRLu_b4hQcjAyfCNdzYmM7buxbmZN__MAk8oDlGJMfY2JT00KGJHBrmcxWmMmdopNk4SCOZOnvT1Rqcql0ISPKlXZ2-iv7Y18TzAgaEweFODTg8xwaJ3PY20EVnaoh1fnGh-Mgg9b_MfEOkZRXJ0qfgBP6OhpUxQS6Dl6K4HlIZnsnyiNVXhEHWJsJdkp2qqTv2qPojaBM2uxF9a_volx9WwFx9igEOf8y_6HUnpgEbTDv7f5L5PItCg7PVjk" :
              "https://lh3.googleusercontent.com/aida/AP1WRLvtSOB19uSwIxRL-gv32ZSeXPN6L82g96sHXCqaGxrQ_0oPMqrPx52lSIz4HYqLXek8kOHptj6dJ9OjHwXPcXzz6L30ZALdYiEmhfh64o8mxM4tx_bl3gX1DhJuBsD9gvtycuHy3oJ1je1o2ywWInUnOeLjeQVdQfMo2FTKcP9hB-J93Doe8r2BW3ozX2wOHWPjHwjQ5BMd_f7QkfW1LV0PP1Z38f35cj_6LVSFJHjqZ4fvjQq4KRuvLIEy"
    };
  });
}

function seedRelationalData() {
  // Profiles matching screenshots
  dbProfiles = [
    { id: 1, full_name: "Juan", role: "guardia", created_at: new Date().toISOString() },
    { id: 2, full_name: "Alejandro", role: "profesor", created_at: new Date().toISOString() },
    { id: 3, full_name: "Martin", role: "profesor", created_at: new Date().toISOString() },
    { id: 4, full_name: "Solomeo", role: "profesor", created_at: new Date().toISOString() },
    { id: 5, full_name: "Alvaro", role: "profesor", created_at: new Date().toISOString() },
  ];

  // Vehicles matching screenshots
  dbVehicles = [
    { id: 1, professor_id: 2, plate: "TX-492-L", is_authorized: true },
    { id: 2, professor_id: 3, plate: "CA-991-X", is_authorized: true },
    { id: 3, professor_id: 4, plate: "ABC-1234", is_authorized: true },
    { id: 4, professor_id: 5, plate: "ZPT-5541", is_authorized: true },
  ];

  // Generating 110 parking spaces matching Stitch design
  dbParkingSpaces = [];
  const rows = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
  for (let i = 1; i <= 110; i++) {
    let label = `S-${i}`;
    let status: DBParkingSpace["status"] = "LIBRE";
    let blockage_details: string | undefined;

    if (i === 1) {
      label = "A-001";
      status = "MANTENIMIENTO";
      blockage_details = "Camera Feed A-01 Syncing...";
    } else if (i === 22) {
      label = "B-12";
      status = "LIBRE";
    } else if (i === 102) {
      label = "A-102";
      status = "OCUPADO";
    } else if (i === 45) {
      label = "B-045";
      status = "LIBRE";
    } else if (i === 12) {
      label = "C-012";
      status = "RESERVADO";
    } else if (i === 89) {
      label = "D-089";
      status = "OCUPADO";
    } else {
      // Standard grid rows
      const rowIndex = Math.floor(i / 11) % rows.length;
      const spotNum = (i % 11) + 1;
      label = `${rows[rowIndex]}-${spotNum < 10 ? '0' + spotNum : spotNum}`;
      
      const rand = Math.random();
      if (rand < 0.76) {
        status = "OCUPADO";
      } else if (rand < 0.86) {
        status = "RESERVADO";
      } else if (rand < 0.89) {
        status = "MANTENIMIENTO";
      } else {
        status = "LIBRE";
      }
    }

    dbParkingSpaces.push({
      id: i,
      label,
      status,
      blockage_details,
      updated_at: new Date().toISOString()
    });
  }

  // Populate active parking logs for S-89 and S-102
  dbParkingLogs = [
    {
      id: 1,
      parking_space_id: 102, // A-102
      plate: "TX-492-L",
      professor_id: 2,
      check_in: new Date(Date.now() - 2.2 * 3600000).toISOString(), // 2h 14m ago
      check_out: null,
      registered_by: 1
    },
    {
      id: 2,
      parking_space_id: 89, // D-089
      plate: "CA-991-X",
      professor_id: 3,
      check_in: new Date(Date.now() - 3.1 * 3600000).toISOString(),
      check_out: null,
      registered_by: 1
    }
  ];

  // Add completed logs for historic activity view
  for (let i = 3; i <= 35; i++) {
    const spaceId = Math.floor(Math.random() * 100) + 3;
    if (spaceId === 22 || spaceId === 45 || spaceId === 12) continue;
    dbParkingLogs.push({
      id: i,
      parking_space_id: spaceId,
      plate: `TX-${200 + i}-A`,
      professor_id: null,
      check_in: new Date(Date.now() - 6 * 3600000).toISOString(),
      check_out: new Date(Date.now() - 2 * 3600000).toISOString(),
      registered_by: 1
    });
  }

  // VIP reservations
  dbVipReservations = [
    {
      id: 1,
      parking_space_id: 12, // C-012
      reservation_date: new Date().toISOString().split('T')[0],
      description: "Julian Vance",
      created_by: 1
    }
  ];

  // User Device Tokens for professor notifications
  dbUserDeviceTokens = [
    {
      id: 1,
      user_id: 2, // Alejandro
      device_token: "token_alejandro_celular",
      updated_at: new Date().toISOString()
    },
    {
      id: 2,
      user_id: 3, // Martin
      device_token: "token_martin_celular",
      updated_at: new Date().toISOString()
    }
  ];

  // Seed eventsLog
  eventsLog = [
    { id: "evt-1", spot: "A-102", timestamp: "2m ago", type: "occupied", statusText: "Occupied", details: "Plate: TX-492-L" },
    { id: "evt-2", spot: "B-045", timestamp: "5m ago", type: "vacated", statusText: "Vacated", details: "Stay Duration: 4h 12m" },
    { id: "evt-3", spot: "C-012", timestamp: "12m ago", type: "reserved", statusText: "VIP Reservation Active", details: "Guest: Julian Vance" },
    { id: "evt-4", spot: "A-001", timestamp: "18m ago", type: "alert", statusText: "Obstruction Detected", details: "Camera Feed A-01 Syncing..." },
    { id: "evt-5", spot: "D-089", timestamp: "24m ago", type: "occupied", statusText: "Occupied", details: "Plate: CA-991-X" },
  ];
}

seedRelationalData();

const clients = new Set<express.Response>();

function getSystemState() {
  const spots = getParkingSpots();
  const profiles = getUserProfiles();

  const occupiedCount = spots.filter(s => s.status === "occupied").length;
  const reservedCount = spots.filter(s => s.status === "reserved").length;
  const blockedCount = spots.filter(s => s.status === "blocked").length;
  const availableCount = spots.filter(s => s.status === "available").length;

  const total = spots.length;
  const occupancyPercentage = Math.round((occupiedCount / total) * 100);

  return {
    parkingSpots: spots,
    eventsLog,
    users: profiles,
    emergencyLockout,
    gateStatus,
    overrideStatus,
    stats: {
      occupancyPercentage,
      occupiedCount,
      reservedCount,
      blockedCount,
      availableCount,
      totalSpots: total
    }
  };
}

function broadcastStateUpdate() {
  const updatePayload = JSON.stringify({
    type: "STATE_UPDATE",
    state: getSystemState()
  });

  for (const client of clients) {
    client.write(`data: ${updatePayload}\n\n`);
  }
}

// Keep relational simulation running to simulate ambient events
setInterval(() => {
  if (emergencyLockout) return;

  // Sometimes occupy or vacate a random non-pinned space in our database to show live device sync!
  const targetSpaces = dbParkingSpaces.filter(
    s => s.label !== "B-12" && s.label !== "A-102" && s.label !== "C-012" && s.label !== "A-001"
  );
  
  if (targetSpaces.length > 0 && Math.random() < 0.25) {
    const space = targetSpaces[Math.floor(Math.random() * targetSpaces.length)];

    if (space.status === "LIBRE") {
      space.status = "OCUPADO";
      space.updated_at = new Date().toISOString();
      const randomPlates = ["CA-102-M", "TX-224-R", "FL-993-Z", "NY-492-W", "OH-802-X"];
      const plate = randomPlates[Math.floor(Math.random() * randomPlates.length)];
      
      const newLogId = dbParkingLogs.length > 0 ? Math.max(...dbParkingLogs.map(l => l.id)) + 1 : 1;
      dbParkingLogs.push({
        id: newLogId,
        parking_space_id: space.id,
        plate,
        professor_id: null,
        check_in: new Date().toISOString(),
        check_out: null,
        registered_by: 1
      });

      eventsLog.unshift({
        id: `evt-${Date.now()}`,
        spot: space.label,
        timestamp: "Just now",
        type: "occupied",
        statusText: "Occupied",
        details: `Plate: ${plate}`
      });
    } else if (space.status === "OCUPADO") {
      space.status = "LIBRE";
      space.updated_at = new Date().toISOString();

      const activeLog = dbParkingLogs.find(l => l.parking_space_id === space.id && l.check_out === null);
      if (activeLog) {
        activeLog.check_out = new Date().toISOString();
        
        eventsLog.unshift({
          id: `evt-${Date.now()}`,
          spot: space.label,
          timestamp: "Just now",
          type: "vacated",
          statusText: "Vacated",
          details: `Plate ${activeLog.plate} checked out`
        });
      }
    }

    if (eventsLog.length > 30) {
      eventsLog = eventsLog.slice(0, 30);
    }

    broadcastStateUpdate();
  }
}, 15000); // Trigger visual ambient shifts occasionally to keep dashboard alive

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route to return raw PostgreSQL database records for audit and inspector
  app.get("/api/db-tables", (req, res) => {
    res.json({
      profiles: dbProfiles,
      vehicles: dbVehicles,
      parking_spaces: dbParkingSpaces,
      vip_reservations: dbVipReservations,
      parking_log: dbParkingLogs,
      user_device_tokens: dbUserDeviceTokens
    });
  });

  // API Routes
  app.get("/api/state", (req, res) => {
    res.json(getSystemState());
  });

  // Client subscription for real-time synchronization
  app.get("/api/sse", (req, res) => {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    });

    // Write initial State
    res.write(`data: ${JSON.stringify({ type: "INIT", state: getSystemState() })}\n\n`);
    clients.add(res);

    req.on("close", () => {
      clients.delete(res);
    });
  });

  // Spot status toggle custom override API (click directly on active UI dots / spaces)
  app.post("/api/spots/:id/status", (req, res) => {
    const { id } = req.params;
    const { status, plate, reservedFor, vehicleType } = req.body;

    const space = dbParkingSpaces.find(s => s.id === parseInt(id) || s.label === id);
    if (!space) {
      res.status(404).json({ error: "Parking spot not found" });
      return;
    }

    const previousStatus = space.status;
    
    // Status translation: available -> LIBRE, occupied -> OCUPADO, reserved -> RESERVADO, blocked -> MANTENIMIENTO
    let dbStatus: DBParkingSpace["status"] = "LIBRE";
    if (status === "occupied") dbStatus = "OCUPADO";
    else if (status === "reserved") dbStatus = "RESERVADO";
    else if (status === "blocked") dbStatus = "MANTENIMIENTO";

    space.status = dbStatus;
    space.updated_at = new Date().toISOString();

    if (dbStatus === "OCUPADO") {
      const activePlate = (plate || "TX-CUSTOM-1").toUpperCase();
      
      // Update/close any existing open logs for this space
      dbParkingLogs.forEach(l => {
        if (l.parking_space_id === space.id && l.check_out === null) {
          l.check_out = new Date().toISOString();
        }
      });

      const newLogId = dbParkingLogs.length > 0 ? Math.max(...dbParkingLogs.map(l => l.id)) + 1 : 1;
      const associatedVehicle = dbVehicles.find(v => v.plate.toUpperCase() === activePlate.toUpperCase());
      
      dbParkingLogs.push({
        id: newLogId,
        parking_space_id: space.id,
        plate: activePlate,
        professor_id: associatedVehicle ? associatedVehicle.professor_id : null,
        check_in: new Date().toISOString(),
        check_out: null,
        registered_by: 1
      });

      eventsLog.unshift({
        id: `evt-${Date.now()}`,
        spot: space.label,
        timestamp: "Just now",
        type: "occupied",
        statusText: "Occupied Override",
        details: `Plate: ${activePlate}`
      });
    } else if (dbStatus === "RESERVADO") {
      const reservationDescription = reservedFor || "VISITA ESPECIAL";
      
      // Close active logs
      dbParkingLogs.forEach(l => {
        if (l.parking_space_id === space.id && l.check_out === null) {
          l.check_out = new Date().toISOString();
        }
      });

      // Insert or update vip_reservations
      const newResId = dbVipReservations.length > 0 ? Math.max(...dbVipReservations.map(r => r.id)) + 1 : 1;
      dbVipReservations = dbVipReservations.filter(r => r.parking_space_id !== space.id);
      dbVipReservations.push({
        id: newResId,
        parking_space_id: space.id,
        reservation_date: new Date().toISOString().split('T')[0],
        description: reservationDescription,
        created_by: 1
      });

      eventsLog.unshift({
        id: `evt-${Date.now()}`,
        spot: space.label,
        timestamp: "Just now",
        type: "reserved",
        statusText: "Reserved",
        details: `Guest: ${reservationDescription}`
      });
    } else if (dbStatus === "MANTENIMIENTO") {
      space.blockage_details = "Manual Operator Hazard Lockout";

      // Close active logs
      dbParkingLogs.forEach(l => {
        if (l.parking_space_id === space.id && l.check_out === null) {
          l.check_out = new Date().toISOString();
        }
      });

      eventsLog.unshift({
        id: `evt-${Date.now()}`,
        spot: space.label,
        timestamp: "Just now",
        type: "alert",
        statusText: "Spot Blocked",
        details: "Operator lock initiated"
      });
    } else {
      // LIBRE
      // Terminate any active log for this space
      dbParkingLogs.forEach(l => {
        if (l.parking_space_id === space.id && l.check_out === null) {
          l.check_out = new Date().toISOString();
        }
      });

      eventsLog.unshift({
        id: `evt-${Date.now()}`,
        spot: space.label,
        timestamp: "Just now",
        type: "vacated",
        statusText: "Cleared",
        details: "Space is now vacant"
      });
    }

    if (eventsLog.length > 30) {
      eventsLog = eventsLog.slice(0, 30);
    }

    broadcastStateUpdate();
    res.json({ success: true, spot: getSystemState() });
  });

  // Guard view: Register Entry
  app.post("/api/entry", (req, res) => {
    const { plate, vehicleType, expectedDuration, recommendedSpotLabel } = req.body;

    // Use recommended or find first free
    const label = recommendedSpotLabel || "B-12";
    let space = dbParkingSpaces.find(s => s.label === label);
    if (!space || space.status !== "LIBRE") {
      // fallback to any available
      space = dbParkingSpaces.find(s => s.status === "LIBRE");
    }

    if (!space) {
      res.status(400).json({ error: "No available parking spaces!" });
      return;
    }

    space.status = "OCUPADO";
    space.updated_at = new Date().toISOString();

    const activePlate = plate.toUpperCase();
    const associatedVehicle = dbVehicles.find(v => v.plate.toUpperCase() === activePlate.toUpperCase());

    const newLogId = dbParkingLogs.length > 0 ? Math.max(...dbParkingLogs.map(l => l.id)) + 1 : 1;
    dbParkingLogs.push({
      id: newLogId,
      parking_space_id: space.id,
      plate: activePlate,
      professor_id: associatedVehicle ? associatedVehicle.professor_id : null,
      check_in: new Date().toISOString(),
      check_out: null,
      registered_by: 1
    });

    const durationMapping: Record<string, string> = {
      "Short Term (<2h)": "Short Term",
      "Medium Term (2-6h)": "Medium Term",
      "Daily (24h)": "Daily Access"
    };

    eventsLog.unshift({
      id: `evt-${Date.now()}`,
      spot: space.label,
      timestamp: "Just now",
      type: "occupied",
      statusText: `${activePlate} entered`,
      details: `Space: ${space.label} • ${durationMapping[expectedDuration] || "Short Term"}`
    });

    if (eventsLog.length > 30) {
      eventsLog = eventsLog.slice(0, 30);
    }

    broadcastStateUpdate();
    res.json({ success: true, spaceAllocated: space.label });
  });

  // Guard view: Register Exit
  app.post("/api/exit", (req, res) => {
    const { label } = req.body;

    const space = dbParkingSpaces.find(s => s.label === label || s.id === parseInt(label));
    if (!space || space.status !== "OCUPADO") {
      res.status(404).json({ error: "No occupied spot matching search parameters found." });
      return;
    }

    space.status = "LIBRE";
    space.updated_at = new Date().toISOString();

    // Find active log to terminate
    const activeLog = dbParkingLogs.find(l => l.parking_space_id === space.id && l.check_out === null);
    const plate = activeLog ? activeLog.plate : "Unknown";

    if (activeLog) {
      activeLog.check_out = new Date().toISOString();
    }

    eventsLog.unshift({
      id: `evt-${Date.now()}`,
      spot: space.label,
      timestamp: "Just now",
      type: "vacated",
      statusText: `${plate} exited`,
      details: "Cleared and vacated successfully"
    });

    if (eventsLog.length > 30) {
      eventsLog = eventsLog.slice(0, 30);
    }

    broadcastStateUpdate();
    res.json({ success: true, spaceCleared: space.label });
  });

  // Admin/Security: Toggle lockout
  app.post("/api/lockout", (req, res) => {
    const { active } = req.body;
    emergencyLockout = active;

    eventsLog.unshift({
      id: `evt-${Date.now()}`,
      spot: "ALL ZONES",
      timestamp: "Just now",
      type: "alert",
      statusText: active ? "EMERGENCY LOCKOUT INITIATED" : "EMERGENCY LOCKOUT RELEASED",
      details: active ? "Gate locked down securely" : "All zones recovered to nominal"
    });

    broadcastStateUpdate();
    res.json({ success: true, emergencyLockout });
  });

  // Admin: Manage Gate
  app.post("/api/gate", (req, res) => {
    const { status, override } = req.body;
    if (status) gateStatus = status;
    if (override !== undefined) overrideStatus = override;

    eventsLog.unshift({
      id: `evt-${Date.now()}`,
      spot: "GATE-01",
      timestamp: "Just now",
      type: "alert",
      statusText: `Gate updated: ${gateStatus.toUpperCase()}`,
      details: overrideStatus ? "Operator override enabled" : "Automatic scheduling enabled"
    });

    broadcastStateUpdate();
    res.json({ success: true, gateStatus, overrideStatus });
  });

  // Users: Create User
  app.post("/api/users", (req, res) => {
    const { name, email, role, plate, status } = req.body;

    const newProfileId = dbProfiles.length > 0 ? Math.max(...dbProfiles.map(p => p.id)) + 1 : 1;
    dbProfiles.push({
      id: newProfileId,
      full_name: name,
      role: (role === "admin" || role === "guard") ? "guardia" : "profesor",
      created_at: new Date().toISOString()
    });

    if (plate) {
      const newVehicleId = dbVehicles.length > 0 ? Math.max(...dbVehicles.map(v => v.id)) + 1 : 1;
      dbVehicles.push({
        id: newVehicleId,
        professor_id: newProfileId,
        plate: plate.toUpperCase(),
        is_authorized: true
      });
    }

    if (role === "professor") {
      const newTokenId = dbUserDeviceTokens.length > 0 ? Math.max(...dbUserDeviceTokens.map(t => t.id)) + 1 : 1;
      dbUserDeviceTokens.push({
        id: newTokenId,
        user_id: newProfileId,
        device_token: `token_${name.split(" ")[0].toLowerCase()}_celular`,
        updated_at: new Date().toISOString()
      });
    }

    eventsLog.unshift({
      id: `evt-${Date.now()}`,
      spot: "SYSTEM",
      timestamp: "Just now",
      type: "reserved",
      statusText: "New Profile Created",
      details: `${name} added as ${role.toUpperCase()}`
    });

    broadcastStateUpdate();
    const mappedUser = getUserProfiles().find(u => u.id === `usr-${newProfileId}`);
    res.json({ success: true, user: mappedUser });
  });

  // Users: Toggle User Status
  app.post("/api/users/:id/toggle", (req, res) => {
    const { id } = req.params;
    const profileId = parseInt(id.replace("usr-", ""));
    const profile = dbProfiles.find(p => p.id === profileId);
    if (!profile) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Toggle logic: Guardia stays active, Professor has active logs toggled.
    // Let's toggle or mock status safely. For Guardia, just create an event, for Professor, we can mock active logs.
    eventsLog.unshift({
      id: `evt-${Date.now()}`,
      spot: "SYSTEM",
      timestamp: "Just now",
      type: "alert",
      statusText: `User toggled: ${profile.full_name}`,
      details: "Profile override applied"
    });

    broadcastStateUpdate();
    const mappedUser = getUserProfiles().find(u => u.id === id);
    res.json({ success: true, user: mappedUser });
  });

  // Users: Delete User
  app.delete("/api/users/:id", (req, res) => {
    const { id } = req.params;
    const profileId = parseInt(id.replace("usr-", ""));
    const profileIndex = dbProfiles.findIndex(p => p.id === profileId);

    if (profileIndex !== -1) {
      const deletedProfile = dbProfiles.splice(profileIndex, 1)[0];
      
      // Cascade deletions
      dbVehicles = dbVehicles.filter(v => v.professor_id !== profileId);
      dbUserDeviceTokens = dbUserDeviceTokens.filter(t => t.user_id !== profileId);

      eventsLog.unshift({
        id: `evt-${Date.now()}`,
        spot: "SYSTEM",
        timestamp: "Just now",
        type: "alert",
        statusText: "Profile Removed",
        details: `${deletedProfile.full_name} deleted from database`
      });

      broadcastStateUpdate();
      res.json({ success: true, deletedUser: { id, name: deletedProfile.full_name } });
    } else {
      res.status(404).json({ error: "User profile not found." });
    }
  });

  // Vite Integration for full-stack build/dev
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`PARK-OS Sync Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
