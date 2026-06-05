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

// In-Memory Global State
let parkingSpots: ParkingSpot[] = [];
let eventsLog: EventLog[] = [];
let users: UserProfile[] = [];
let emergencyLockout = false;
let gateStatus: "open" | "closed" = "closed";
let overrideStatus = false;

// Seed initial state helper
function seedInitialData() {
  // Creating 110 parking spots
  // Let's seed specific spots for the screenshots
  // Spot 22: Spot B-12 - Available (High profile recommendation!)
  // Spot 102: Spot A-102 - Occupied by Professor (TX-492-L)
  // Spot 45: Spot B-045 - Available (stayDuration: 4h 12m)
  // Spot 12: Spot C-012 - Reserved for Julian Vance
  // Spot 1: Spot A-001 - Blocked obstruction details
  // Spot 89: Spot D-089 - Occupied by CA-991-X
  const spotLabels = [
    "A-001", "A-102", "B-045", "C-012", "D-089", "B-12", "A-04", "C-22", "A-01", "A-02", "A-03", "A-04", "A-05", "A-06", "A-07", "A-08",
    "B-01", "B-02", "B-09", "B-10", "B-11", "B-13", "B-14", "B-15", "B-16", "B-17", "B-18"
  ];

  const totalSpots = 110;
  for (let i = 1; i <= totalSpots; i++) {
    let label = `S-${i}`;
    if (i === 1) label = "A-001";
    else if (i === 22) label = "B-12";
    else if (i === 102) label = "A-102";
    else if (i === 45) label = "B-045";
    else if (i === 12) label = "C-012";
    else if (i === 89) label = "D-089";
    else if (i === 4) label = "A-04";
    else if (i === 7) label = "C-22";
    else {
      // Generate standard names
      const rows = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
      const rowIndex = Math.floor(i / 11) % rows.length;
      const spotNum = (i % 11) + 1;
      label = `${rows[rowIndex]}-${spotNum < 10 ? '0' + spotNum : spotNum}`;
    }

    let status: ParkingSpot["status"] = "available";
    let occupiedBy: string | undefined;
    let reservedFor: string | undefined;
    let vehicleType: ParkingSpot["vehicleType"];
    let stayDuration: string | undefined;
    let blockageDetails: string | undefined;

    // Distribute statuses to hit exactly ~82% occupancy rate (90 occupied out of 110)
    if (label === "A-001") {
      status = "blocked";
      blockageDetails = "Camera Feed A-01 Syncing...";
    } else if (label === "B-12") {
      status = "available";
    } else if (label === "A-102") {
      status = "occupied";
      occupiedBy = "TX-492-L";
      vehicleType = "ev";
      stayDuration = "02:14:45";
    } else if (label === "B-045") {
      status = "available";
    } else if (label === "C-012") {
      status = "reserved";
      reservedFor = "Julian Vance";
    } else if (label === "D-089") {
      status = "occupied";
      occupiedBy = "CA-991-X";
      vehicleType = "suv";
    } else if (label === "A-04") {
      status = "available"; // handicap accessible potential
    } else if (label === "C-22") {
      status = "available"; // EV potential
    } else {
      // Seed remaining mathematically to match 82% occupied
      const randomWeight = Math.random();
      if (randomWeight < 0.78) {
        status = "occupied";
        const plates = ["TX-123-K", "CA-221-M", "NY-848-P", "FL-009-Q", "IL-142-S", "TX-891-B", "NV-445-F", "AZ-502-T"];
        occupiedBy = plates[Math.floor(Math.random() * plates.length)];
        const types: ParkingSpot["vehicleType"][] = ["ev", "suv", "freight"];
        vehicleType = types[Math.floor(Math.random() * types.length)];
      } else if (randomWeight < 0.88) {
        status = "reserved";
        const guests = ["Corporate Guest", "Morgan Stanley", "Dean Office", "Chevron VIP"];
        reservedFor = guests[Math.floor(Math.random() * guests.length)];
      } else if (randomWeight < 0.91) {
        status = "blocked";
        blockageDetails = "Maintenance Overhaul";
      } else {
        status = "available";
      }
    }

    parkingSpots.push({
      id: i,
      label,
      status,
      occupiedBy,
      reservedFor,
      vehicleType,
      stayDuration,
      blockageDetails,
      updatedAt: new Date().toISOString()
    });
  }

  // Populate events log
  eventsLog = [
    { id: "evt-1", spot: "A-102", timestamp: "2m ago", type: "occupied", statusText: "Occupied", details: "Plate: TX-492-L" },
    { id: "evt-2", spot: "B-045", timestamp: "5m ago", type: "vacated", statusText: "Vacated", details: "Stay Duration: 4h 12m" },
    { id: "evt-3", spot: "C-012", timestamp: "12m ago", type: "reserved", statusText: "VIP Reservation Active", details: "Guest: Morgan Stanley" },
    { id: "evt-4", spot: "A-001", timestamp: "18m ago", type: "alert", statusText: "Obstruction Detected", details: "Camera Feed A-01 Syncing..." },
    { id: "evt-5", spot: "D-089", timestamp: "24m ago", type: "occupied", statusText: "Occupied", details: "Plate: CA-991-X" },
  ];

  // Populate profiles
  users = [
    {
      id: "usr-1",
      name: "Marcus Chen",
      email: "m.chen@fleet-ops.io",
      role: "guard",
      plate: "ABC-1234",
      status: "active",
      avatar: "https://lh3.googleusercontent.com/aida/AP1WRLuYkGmivS2W07X4cUVMLosE8N1HpkDAYzb5K5OHeWEya5Ubd-QaQW3RGNDN7hmVZuL_MysnP-eovontWG38tMOhrLpZp5Dx5a-Db7UgoVvX55bXaKOEuS2hjTivNQP2KrNq4i9MaQisCKBXolf8JL3qgRiV0X3YCVWluOHiTMZL-eosDjeGP23u8eKzEzbBI_kwuuhJwVilG8CRfGD69OFQlnovEBtVCGiWMYVtxUj7jLYpFaUT9DP4HzzV"
    },
    {
      id: "usr-2",
      name: "Elena Rodriguez",
      email: "e.rodriguez@fleet-ops.io",
      role: "admin",
      plate: "XKY-9980",
      status: "active",
      avatar: "https://lh3.googleusercontent.com/aida/AP1WRLtvBRANbM_t_2mViuPyq69oKeGY_J7zdR7Q90OVJwVEf-2H14fEK210T-Hl97Zj9Rba5hRset4yVeTpso1SkwzCWdKM43TGYi26tUQ4Zh6RrW1st_yroLi_05_679sEAphve5Yonwh-sJ6m8HERdhoFUy2u2BsisTzht2EonAFKM8BkGewHhvU-KEFqQ_LsIiiA495A3RtD4U0mXRQX53tYh83qwcUE9cNR_4KLRXcn8tnNeqmegTWpT3EU"
    },
    {
      id: "usr-3",
      name: "Julian Vance",
      email: "j.vance@university.edu",
      role: "professor",
      plate: "N/A",
      status: "active",
      avatar: "https://lh3.googleusercontent.com/aida/AP1WRLu_b4hQcjAyfCNdzYmM7buxbmZN__MAk8oDlGJMfY2JT00KGJHBrmcxWmMmdopNk4SCOZOnvT1Rqcql0ISPKlXZ2-iv7Y18TzAgaEweFODTg8xwaJ3PY20EVnaoh1fnGh-Mgg9b_MfEOkZRXJ0qfgBP6OhpUxQS6Dl6K4HlIZnsnyiNVXhEHWJsJdkp2qqTv2qPojaBM2uxF9a_volx9WwFx9igEOf8y_6HUnpgEbTDv7f5L5PItCg7PVjk"
    },
    {
      id: "usr-4",
      name: "Sarah Miller",
      email: "s.miller@fleet-ops.io",
      role: "guard",
      plate: "ZPT-5541",
      status: "offline",
      avatar: "https://lh3.googleusercontent.com/aida/AP1WRLvtSOB19uSwIxRL-gv32ZSeXPN6L82g96sHXCqaGxrQ_0oPMqrPx52lSIz4HYqLXek8kOHptj6dJ9OjHwXPcXzz6L30ZALdYiEmhfh64o8mxM4tx_bl3gX1DhJuBsD9gvtycuHy3oJ1je1o2ywWInUnOeLjeQVdQfMo2FTKcP9hB-J93Doe8r2BW3ozX2wOHWPjHwjQ5BMd_f7QkfW1LV0PP1Z38f35cj_6LVSFJHjqZ4fvjQq4KRuvLIEy"
    },
  ];
}

seedInitialData();

// Client broadcasting mechanism
const clients = new Set<express.Response>();

function getSystemState() {
  const occupiedCount = parkingSpots.filter(s => s.status === "occupied").length;
  const reservedCount = parkingSpots.filter(s => s.status === "reserved").length;
  const blockedCount = parkingSpots.filter(s => s.status === "blocked").length;
  const availableCount = parkingSpots.filter(s => s.status === "available").length;

  const total = parkingSpots.length;
  const occupancyPercentage = Math.round((occupiedCount / total) * 100);

  return {
    parkingSpots,
    eventsLog,
    users,
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

// Keep simulation running to simulate ambient events
setInterval(() => {
  if (emergencyLockout) return;

  // Let's sometimes occupy or vacate a random non-pinned space to show active visual sync!
  const targetSpots = parkingSpots.filter(
    s => s.label !== "B-12" && s.label !== "A-102" && s.label !== "C-012" && s.label !== "A-001"
  );
  
  if (targetSpots.length > 0 && Math.random() < 0.25) {
    const randomSpot = targetSpots[Math.floor(Math.random() * targetSpots.length)];
    const nowStr = "Just now";

    if (randomSpot.status === "available") {
      // Occupy
      randomSpot.status = "occupied";
      const randomPlates = ["CA-102-M", "TX-224-R", "FL-993-Z", "NY-492-W", "OH-802-X"];
      const plate = randomPlates[Math.floor(Math.random() * randomPlates.length)];
      randomSpot.occupiedBy = plate;
      const vehicleTypes: ParkingSpot["vehicleType"][] = ["ev", "suv", "freight"];
      randomSpot.vehicleType = vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)];
      randomSpot.updatedAt = new Date().toISOString();

      // Add event log
      eventsLog.unshift({
        id: `evt-${Date.now()}`,
        spot: randomSpot.label,
        timestamp: nowStr,
        type: "occupied",
        statusText: "Occupied",
        details: `Plate: ${plate}`
      });
    } else if (randomSpot.status === "occupied") {
      // Vacate
      const plate = randomSpot.occupiedBy || "Unknown";
      randomSpot.status = "available";
      randomSpot.occupiedBy = undefined;
      randomSpot.vehicleType = undefined;
      randomSpot.updatedAt = new Date().toISOString();

      // Add event log
      eventsLog.unshift({
        id: `evt-${Date.now()}`,
        spot: randomSpot.label,
        timestamp: nowStr,
        type: "vacated",
        statusText: "Vacated",
        details: `Stay Duration: 3h ${Math.floor(Math.random() * 50) + 1}m`
      });
    }

    // Clip events log
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

  // Spot status toggle custom override API (e.g. click directly on active UI dots / spaces)
  app.post("/api/spots/:id/status", (req, res) => {
    const { id } = req.params;
    const { status, plate, reservedFor, vehicleType } = req.body;

    const spot = parkingSpots.find(s => s.id === parseInt(id) || s.label === id);
    if (!spot) {
      res.status(404).json({ error: "Parking spot not found" });
      return;
    }

    const previousStatus = spot.status;
    spot.status = status;
    spot.updatedAt = new Date().toISOString();

    if (status === "occupied") {
      spot.occupiedBy = plate || "TX-CUSTOM-1";
      spot.vehicleType = vehicleType || "ev";
      spot.reservedFor = undefined;
      eventsLog.unshift({
        id: `evt-${Date.now()}`,
        spot: spot.label,
        timestamp: "Just now",
        type: "occupied",
        statusText: "Occupied Override",
        details: `Plate: ${spot.occupiedBy}`
      });
    } else if (status === "reserved") {
      spot.reservedFor = reservedFor || "Corporate Office";
      spot.occupiedBy = undefined;
      eventsLog.unshift({
        id: `evt-${Date.now()}`,
        spot: spot.label,
        timestamp: "Just now",
        type: "reserved",
        statusText: "Reserved",
        details: `Guest: ${spot.reservedFor}`
      });
    } else if (status === "blocked") {
      spot.blockageDetails = "Manual Operator Hazard Lockout";
      spot.occupiedBy = undefined;
      spot.reservedFor = undefined;
      eventsLog.unshift({
        id: `evt-${Date.now()}`,
        spot: spot.label,
        timestamp: "Just now",
        type: "alert",
        statusText: "Spot Blocked",
        details: "Operator lock initiated"
      });
    } else {
      // available
      spot.occupiedBy = undefined;
      spot.reservedFor = undefined;
      spot.blockageDetails = undefined;
      eventsLog.unshift({
        id: `evt-${Date.now()}`,
        spot: spot.label,
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
    let spot = parkingSpots.find(s => s.label === label);
    if (!spot || spot.status !== "available") {
      // fallback to any available
      spot = parkingSpots.find(s => s.status === "available");
    }

    if (!spot) {
      res.status(400).json({ error: "No available parking spaces!" });
      return;
    }

    spot.status = "occupied";
    spot.occupiedBy = plate.toUpperCase();
    spot.vehicleType = (vehicleType || "ev") as ParkingSpot["vehicleType"];
    spot.updatedAt = new Date().toISOString();

    const durationMapping: Record<string, string> = {
      "Short Term (<2h)": "Short Term",
      "Medium Term (2-6h)": "Medium Term",
      "Daily (24h)": "Daily Access"
    };

    eventsLog.unshift({
      id: `evt-${Date.now()}`,
      spot: spot.label,
      timestamp: "Just now",
      type: "occupied",
      statusText: `${plate.toUpperCase()} entered`,
      details: `Space: ${spot.label} • ${durationMapping[expectedDuration] || "Short Term"}`
    });

    if (eventsLog.length > 30) {
      eventsLog = eventsLog.slice(0, 30);
    }

    broadcastStateUpdate();
    res.json({ success: true, spaceAllocated: spot.label });
  });

  // Guard view: Register Exit
  app.post("/api/exit", (req, res) => {
    const { label } = req.body;

    const spot = parkingSpots.find(s => s.label === label || s.id === parseInt(label));
    if (!spot || spot.status !== "occupied") {
      res.status(404).json({ error: "No occupied spot matching search parameters found." });
      return;
    }

    const plate = spot.occupiedBy || "Unknown";
    spot.status = "available";
    spot.occupiedBy = undefined;
    spot.vehicleType = undefined;
    spot.updatedAt = new Date().toISOString();

    eventsLog.unshift({
      id: `evt-${Date.now()}`,
      spot: spot.label,
      timestamp: "Just now",
      type: "vacated",
      statusText: `${plate} exited`,
      details: "Cleared and vacated successfully"
    });

    if (eventsLog.length > 30) {
      eventsLog = eventsLog.slice(0, 30);
    }

    broadcastStateUpdate();
    res.json({ success: true, spaceCleared: spot.label });
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

    const newUser: UserProfile = {
      id: `usr-${Date.now()}`,
      name,
      email,
      role: (role || "guard").toLowerCase() as UserProfile["role"],
      plate: plate || "N/A",
      status: status || "active",
      avatar: "https://lh3.googleusercontent.com/aida/AP1WRLuYkGmivS2W07X4cUVMLosE8N1HpkDAYzb5K5OHeWEya5Ubd-QaQW3RGNDN7hmVZuL_MysnP-eovontWG38tMOhrLpZp5Dx5a-Db7UgoVvX55bXaKOEuS2hjTivNQP2KrNq4i9MaQisCKBXolf8JL3qgRiV0X3YCVWluOHiTMZL-eosDjeGP23u8eKzEzbBI_kwuuhJwVilG8CRfGD69OFQlnovEBtVCGiWMYVtxUj7jLYpFaUT9DP4HzzV"
    };

    users.push(newUser);

    eventsLog.unshift({
      id: `evt-${Date.now()}`,
      spot: "SYSTEM",
      timestamp: "Just now",
      type: "reserved",
      statusText: "New Profile Created",
      details: `${name} added as ${role.toUpperCase()}`
    });

    broadcastStateUpdate();
    res.json({ success: true, user: newUser });
  });

  // Users: Toggle User Status
  app.post("/api/users/:id/toggle", (req, res) => {
    const { id } = req.params;
    const user = users.find(u => u.id === id);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    user.status = user.status === "active" ? "offline" : "active";
    broadcastStateUpdate();
    res.json({ success: true, user });
  });

  // Users: Delete User
  app.delete("/api/users/:id", (req, res) => {
    const { id } = req.params;
    const index = users.findIndex(u => u.id === id);
    if (index !== -1) {
      const deletedUser = users.splice(index, 1)[0];
      eventsLog.unshift({
        id: `evt-${Date.now()}`,
        spot: "SYSTEM",
        timestamp: "Just now",
        type: "alert",
        statusText: "Profile Removed",
        details: `${deletedUser.name} deleted from database`
      });

      broadcastStateUpdate();
      res.json({ success: true, deletedUser });
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
