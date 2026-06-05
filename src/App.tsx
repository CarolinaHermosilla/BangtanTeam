import { useEffect, useState } from "react";
import { FullSystemState } from "./types";
import AdminDashboard from "./components/AdminDashboard";
import GuardPanel from "./components/GuardPanel";
import ProfessorView from "./components/ProfessorView";
import UserManagement from "./components/UserManagement";
import DatabaseInspector from "./components/DatabaseInspector";

export default function App() {
  const [activeView, setActiveView] = useState<"dashboard" | "operations" | "security" | "users" | "simulator">("simulator");
  const [systemState, setSystemState] = useState<FullSystemState | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [notification, setNotification] = useState<string | null>(null);

  // Fetch initial system state
  const fetchState = async () => {
    try {
      const res = await fetch("/api/state");
      if (res.ok) {
        const data = await res.json();
        setSystemState(data);
      }
    } catch (e) {
      console.error("Error fetching state: ", e);
    }
  };

  // Connect to SSE real-time sync stream and fallback on high-frequency API polling
  useEffect(() => {
    fetchState();

    // SSE Stream
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource("/api/sse");
      eventSource.onopen = () => {
        console.log("Real-time SSE sync stream established safely.");
      };
      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.type === "INIT" || parsed.type === "STATE_UPDATE") {
            setSystemState(parsed.state);
            showNotification("System updated in real-time");
          }
        } catch (err) {
          console.error("Error parsing real-time frame: ", err);
        }
      };
      eventSource.onerror = (e) => {
        console.warn("SSE connection closed or limited in iframe. Relying on high-fidelity polling fallback.");
      };
    } catch (err) {
      console.warn("Failed standard EventSource registration, falling back to polling: ", err);
    }

    // High-frequency polling (1.5s interval) fallback guaranteeing perfect device sync
    const interval = setInterval(() => {
      fetchState();
    }, 1500);

    return () => {
      if (eventSource) eventSource.close();
      clearInterval(interval);
    };
  }, []);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 2000);
  };

  // API Call helper variables
  const handleModifySpot = async (spotId: string | number, status: string, payload?: any) => {
    try {
      const res = await fetch(`/api/spots/${spotId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...payload })
      });
      if (res.ok) {
        const data = await res.json();
        showNotification(`Spot ${spotId} status overwritten manually!`);
        fetchState(); // Quick manual update
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRegisterEntry = async (payload: {
    plate: string;
    vehicleType: string;
    expectedDuration: string;
    recommendedSpotLabel?: string;
  }) => {
    try {
      const res = await fetch("/api/entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showNotification(`Arrival entry ticket issued for ${payload.plate}`);
        fetchState();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRegisterExit = async (payload: { label: string }) => {
    try {
      const res = await fetch("/api/exit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showNotification(`Vehicle exiting cleared: ${payload.label}`);
        fetchState();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleLockout = async (active: boolean) => {
    try {
      const res = await fetch("/api/lockout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active })
      });
      if (res.ok) {
        showNotification(active ? "⚠️ Emergency Lockout deployed" : "🔓 Lockout released");
        fetchState();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateGate = async (status: "open" | "closed", override: boolean) => {
    try {
      const res = await fetch("/api/gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, override })
      });
      if (res.ok) {
        showNotification("Gate telemetry command dispatched");
        fetchState();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddUser = async (userPayload: {
    name: string;
    email: string;
    role: string;
    plate: string;
    status: "active" | "offline";
  }) => {
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userPayload)
      });
      if (res.ok) {
        showNotification(`Personnel registration added: ${userPayload.name}`);
        fetchState();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleUserStatus = async (userId: string) => {
    try {
      const res = await fetch(`/api/users/${userId}/toggle`, {
        method: "POST"
      });
      if (res.ok) {
        showNotification("User occupancy flag toggled");
        fetchState();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        showNotification("Operator profile removed successfully");
        fetchState();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!systemState) {
    return (
      <div className="min-h-screen bg-[#091422] flex flex-col items-center justify-center p-8 text-center font-sans">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <h2 className="text-[#b4c5ff] font-bold text-lg">Initializing PARK-OS Enterprise Gantry System...</h2>
        <p className="text-[#c3c6d7] text-xs mt-2 font-mono">Bypassing local memory relays & establishing device sync loops...</p>
      </div>
    );
  }

  const { stats, emergencyLockout, gateStatus } = systemState;

  return (
    <div className={`min-h-screen bg-[#091422] text-[#d9e3f7] font-sans flex flex-col overflow-hidden relative transition-colors duration-300 ${emergencyLockout ? 'border-4 border-red-500/80 animate-shaking' : ''}`}>
      
      {/* Real-time Toast Sync Notification Overlay */}
      {notification && (
        <div className="fixed top-20 right-8 bg-[#2563eb] border border-blue-400/20 text-[#eeefff] px-4 py-2.5 rounded-xl text-xs font-mono shadow-2xl flex items-center gap-2 z-[999] animate-in fade-in slide-in-from-top duration-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span>{notification}</span>
        </div>
      )}

      {/* EMERGENCY Lockout Visual Banner */}
      {emergencyLockout && (
        <div className="bg-red-600 text-white font-bold text-center py-2 text-xs uppercase tracking-widest flex items-center justify-center gap-3 animate-pulse z-[101]">
          <span className="material-symbols-outlined font-bold text-base animate-bounce">campaign</span>
          GLOBAL LOCKOUT TRIGGERED - ALL GATE SYSTEMS ENGAGED IN NOMINAL SECURE HOLD
          <span className="material-symbols-outlined font-bold text-base animate-bounce">campaign</span>
        </div>
      )}

      {/* Top Application Bar */}
      <header className="fixed top-0 w-full z-50 flex items-center justify-between px-8 h-16 bg-surface-glass backdrop-blur-md border-b border-white/10 shrink-0">
        <div className="flex items-center gap-6">
          <span className="font-sans text-xl font-black tracking-tighter text-primary">PARK-OS</span>
          <nav className="hidden xl:flex items-center gap-6 ml-8 text-xs font-label-mono">
            <button
              onClick={() => setActiveView("dashboard")}
              className={`font-semibold px-4 py-2 rounded transition-colors ${activeView === "dashboard" ? "text-primary border-b-2 border-primary py-4 rounded-none font-bold" : "text-on-surface-variant hover:bg-white/5"}`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveView("operations")}
              className={`font-semibold px-4 py-2 rounded transition-colors ${activeView === "operations" ? "text-primary border-b-2 border-[#b4c5ff] py-4 rounded-none font-bold" : "text-on-surface-variant hover:bg-white/5"}`}
            >
              Operations
            </button>
            <button
              onClick={() => setActiveView("users")}
              className={`font-semibold px-4 py-2 rounded transition-colors ${activeView === "users" ? "text-primary border-b-2 border-primary py-4 rounded-none font-bold" : "text-on-surface-variant hover:bg-white/5"}`}
            >
              Personnel Directory
            </button>
            <button
              onClick={() => setActiveView("simulator")}
              className={`font-semibold px-4 py-2 rounded transition-all flex items-center gap-1 text-[#cbbeff] border border-secondary/20 bg-secondary-container/10 ${activeView === "simulator" ? "bg-secondary-container/40 text-white font-bold" : "hover:bg-white/5"}`}
            >
              <span className="material-symbols-outlined text-[11px] animate-pulse">refresh</span>
              Device Simulator Mode
            </button>
          </nav>
        </div>

        {/* Global Toolbar items (Real-time dynamic sensors overview) */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-5 font-mono text-[10px] text-on-surface-variant bg-surface-container/60 px-4 py-1.5 rounded-full border border-white/5 scale-95">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-status-available"></span>
              {stats.availableCount} Libres
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-status-occupied"></span>
              {stats.occupiedCount} Ocupados
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-status-reserved"></span>
              {stats.reservedCount} VIP
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              title="Toggle emergency lockout alarm State"
              onClick={() => handleToggleLockout(!emergencyLockout)}
              className={`p-2 rounded-full relative transition-all active:scale-95 cursor-pointer ${emergencyLockout ? "bg-red-500/20 text-[#ffb4ab] animate-ping" : "bg-white/5 hover:bg-white/10 text-on-surface-variant"}`}
            >
              <span className="material-symbols-outlined text-sm">campaign</span>
            </button>

            <img
              alt="System Admin Profile picture"
              className="w-8 h-8 rounded-full border border-primary/20 shrink-0"
              src="https://lh3.googleusercontent.com/aida/AP1WRLtiW5TeB__1iuFF9K0lRNfCTerDoU4Nh3hSI0hlBAjtDtkgH9t_jKV_DoXT3VfDrX-GjvIQJcf6GF4bzK1SQ0jyD1zy0TGN3Mz-GUwX2Imm2vpA6DO6t_1rpEYHMYohi_1DMxCTSn5mL0EQ4LSvUrF4IyFBz-XavEog2LxY1j2XUG3Fj97DBWUtfY198KHJDfObWtSQ51yLVmcvaSphuAC2ZiaS40FdgJMLgxgXVnPUepfI-5GuqGeBGS5h"
            />
          </div>
        </div>
      </header>

      {/* Main Structural Layout Side Sidebar + Dynamic viewport */}
      <div className="flex-1 flex pt-16 h-screen overflow-hidden">
        
        {/* Left Side Navigation sidebar represents Stitch parameters */}
        <aside className="w-[260px] h-full flex flex-col pt-8 pb-10 bg-[#091422] border-r border-white/5 shrink-0 select-none hidden md:flex">
          {/* Active Admin Zone Card */}
          <div className="px-6 mb-6">
            <div className="flex items-center gap-3 p-3.5 bg-surface-container rounded-xl border border-white/5">
              <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-base">admin_panel_settings</span>
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-xs text-on-surface tracking-tight truncate">System Admin</div>
                <div className="font-mono text-[9px] text-[#8d90a0] uppercase tracking-wider truncate">Zone Alpha-1</div>
              </div>
            </div>
          </div>

          {/* Nav Links mapping directly to roles */}
          <nav className="flex-1 space-y-1.5 px-3 select-none text-xs font-label-mono">
            <button
              onClick={() => setActiveView("dashboard")}
              className={`w-full text-left px-5 py-3 rounded-lg flex items-center gap-3.5 transition-all cursor-pointer ${activeView === "dashboard" ? "bg-secondary-container/20 text-[#cbbeff] border-l-4 border-[#b4c5ff] font-bold" : "text-on-surface-variant hover:text-on-surface hover:bg-white/5"}`}
            >
              <span className="material-symbols-outlined text-base">dashboard</span>
              <span>Dashboard (Admin)</span>
            </button>

            <button
              onClick={() => setActiveView("operations")}
              className={`w-full text-left px-5 py-3 rounded-lg flex items-center gap-3.5 transition-all cursor-pointer ${activeView === "operations" ? "bg-secondary-container/20 text-[#cbbeff] border-l-4 border-primary font-bold" : "text-on-surface-variant hover:text-on-surface hover:bg-white/5"}`}
            >
              <span className="material-symbols-outlined text-base">gboard</span>
              <span>Operations (Guard)</span>
            </button>

            <button
              onClick={() => setActiveView("security")}
              className={`w-full text-left px-5 py-3 rounded-lg flex items-center gap-3.5 transition-all cursor-pointer ${activeView === "security" ? "bg-secondary-container/20 text-[#cbbeff] border-l-4 border-primary font-bold" : "text-on-surface-variant hover:text-on-surface hover:bg-white/5"}`}
            >
              <span className="material-symbols-outlined text-base">phone_iphone</span>
              <span>Professor App (Mobile)</span>
            </button>

            <button
              onClick={() => setActiveView("users")}
              className={`w-full text-left px-5 py-3 rounded-lg flex items-center gap-3.5 transition-all cursor-pointer ${activeView === "users" ? "bg-secondary-container/20 text-[#cbbeff] border-l-4 border-primary font-bold" : "text-on-surface-variant hover:text-on-surface hover:bg-white/5"}`}
            >
              <span className="material-symbols-outlined text-base">group</span>
              <span>User Directories</span>
            </button>

            <div className="py-2.5 px-5">
              <div className="w-full h-px bg-white/5"></div>
            </div>

            <button
              onClick={() => setActiveView("simulator")}
              className={`w-full text-left px-5 py-3 rounded-lg flex items-center gap-3.5 transition-all cursor-pointer text-[#cbbeff] border border-[#cbbeff]/15 bg-secondary-container/5 hover:bg-secondary-container/10 ${activeView === "simulator" ? "bg-secondary-container/45 text-white border-[#cbbeff]/40 font-bold" : ""}`}
            >
              <span className="material-symbols-outlined text-base animate-pulse">sync</span>
              <span>⚡ Live Sync Simulator</span>
            </button>
          </nav>

          {/* Sidebar Emergency lockout + support footprint */}
          <div className="px-5 mt-auto space-y-4">
            <button
              onClick={() => handleToggleLockout(!emergencyLockout)}
              className="w-full bg-[#93000a] text-[#ffdad6] hover:bg-red-500 font-bold hover:text-white py-3 rounded-xl text-[10px] font-mono tracking-wider transition-colors flex items-center justify-center gap-1.5 border border-red-500/20 cursor-pointer uppercase select-none"
            >
              <span className="material-symbols-outlined text-sm font-bold">lock</span>
              EMERGENCY LOCKOUT
            </button>
            <div className="pt-3 border-t border-white/5 text-[10px] font-label-mono text-[#8d90a0] flex flex-col gap-1.5 px-1.5">
              <span className="flex items-center gap-2 hover:text-[#dbe1ff] cursor-pointer" onClick={() => alert("Enterprise technical assistance relays online.")}>
                <span className="material-symbols-outlined text-xs">help</span> Help & Support
              </span>
              <span className="flex items-center gap-2 hover:text-red-300 cursor-pointer" onClick={() => { if(window.confirm("Verify session disconnect?")) window.close(); }}>
                <span className="material-symbols-outlined text-xs">logout</span> Terminate Session
              </span>
            </div>
          </div>
        </aside>

        {/* Dynamic Inner Workspace Panel Router */}
        <main className="flex-1 p-6 flex flex-col overflow-hidden">
          
          {/* SWITCH CONTROLLER ROUTER */}
          {activeView === "dashboard" && (
            <AdminDashboard
              systemState={systemState}
              onModifySpot={handleModifySpot}
              onToggleLockout={handleToggleLockout}
              onUpdateGate={handleUpdateGate}
            />
          )}

          {activeView === "operations" && (
            <GuardPanel
              systemState={systemState}
              onRegisterEntry={handleRegisterEntry}
              onRegisterExit={handleRegisterExit}
              onSelectAlternativeSpot={(label) => showNotification(`Alternative spot verified: ${label}`)}
            />
          )}

          {activeView === "security" && (
            <ProfessorView
              systemState={systemState}
              onContactSecurity={() => alert("Security emergency response unit alerted & dispatched to A-102")}
              onRaiseAlert={() => alert("Signal beacon broadcast initiated. Facility gates on caution mode.")}
            />
          )}

          {activeView === "users" && (
            <UserManagement
              systemState={systemState}
              onAddUser={handleAddUser}
              onToggleUserStatus={handleToggleUserStatus}
              onDeleteUser={handleDeleteUser}
            />
          )}

          {activeView === "simulator" && (
            <div className="flex-1 flex flex-col overflow-hidden gap-4">
              {/* Simulator info banner */}
              <div className="bg-[#121c2a] border border-[#baa9ff]/20 p-4 rounded-xl text-xs flex justify-between items-center shrink-0">
                <div className="max-w-2xl leading-relaxed">
                  <h4 className="font-bold text-[#cbbeff] flex items-center gap-1.5 text-sm">
                    <span className="material-symbols-outlined text-sm animate-spin">refresh</span>
                    ⚡ MULTI-DEVICE LIVE SYNCHRONIZER DISCOVERY SIMULATOR
                  </h4>
                  <p className="text-on-surface-variant text-[11px] mt-0.5">
                    This workspace simulates multiple connected, live-syncing devices in a shared facility. 
                    Input any vehicle arrival in the **Guard Operational Panel (left)** and instantly feel the **Live Admin Grid Map (right)** and **Professor Mobile Phone (lower middle)** synchronize and flash their statuses with zero delays!
                  </p>
                </div>
                <button
                  onClick={fetchState}
                  className="bg-primary/10 border border-primary/20 hover:bg-primary/25 text-primary text-[10px] font-bold py-2 px-3.5 rounded-lg shrink-0 font-label-mono cursor-pointer"
                >
                  Force Poll Sync
                </button>
              </div>

              {/* Grid split pane workspace simulation */}
              <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-5 overflow-hidden">
                {/* Simulated Guard Panel Screen - Left */}
                <div className="xl:col-span-6 flex flex-col p-4 bg-surface-container/35 rounded-2xl border border-white/5 overflow-hidden">
                  <div className="text-[10px] font-label-mono text-[#cbbeff] uppercase tracking-wider mb-2 flex items-center justify-between border-b border-white/5 pb-2 shrink-0">
                    <span>📱 Terminal screen: Transit Entry Gantry</span>
                    <span className="text-emerald-400">● Live Connection</span>
                  </div>
                  <div className="flex-1 overflow-auto custom-scrollbar">
                    <GuardPanel
                      systemState={systemState}
                      onRegisterEntry={handleRegisterEntry}
                      onRegisterExit={handleRegisterExit}
                      onSelectAlternativeSpot={(label) => showNotification(`Alternative spot verified: ${label}`)}
                    />
                  </div>
                </div>

                {/* Simulated Administration screen - Right/Upper half */}
                <div className="xl:col-span-6 flex flex-col p-4 bg-surface-container/35 rounded-2xl border border-white/5 overflow-hidden">
                  <div className="text-[10px] font-label-mono text-[#cbbeff] uppercase tracking-wider mb-2 flex items-center justify-between border-b border-white/5 pb-2 shrink-0">
                    <span>🖥️ Terminal screen: Enterprise Control Dashboard</span>
                    <span className="text-emerald-400">● Live Synchronization Active</span>
                  </div>
                  <div className="flex-1 overflow-auto custom-scrollbar">
                    <AdminDashboard
                      systemState={systemState}
                      onModifySpot={handleModifySpot}
                      onToggleLockout={handleToggleLockout}
                      onUpdateGate={handleUpdateGate}
                    />
                  </div>
                </div>

                {/* Simulated Professor App Phone - Centered Bottom floating in multi-view */}
                <div className="xl:col-span-12 flex justify-center bg-surface-container/10 rounded-2xl border border-white/5 p-4 shrink-0 overflow-hidden">
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-label-mono text-[#cbbeff] uppercase tracking-wider mb-2 block border-b border-white/5 pb-1 text-center w-full">
                      📱 Active mobile phone loop synchronization
                    </span>
                    <div className="scale-95 transform origin-top -my-4">
                      <ProfessorView
                        systemState={systemState}
                        onContactSecurity={() => alert("Security alert loop response triggered.")}
                        onRaiseAlert={() => alert("Mobile trigger broadcast completed.")}
                      />
                    </div>
                  </div>
                </div>

                {/* Live PostgreSQL Simulated Schema Inspector */}
                <div className="xl:col-span-12">
                  <DatabaseInspector />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
