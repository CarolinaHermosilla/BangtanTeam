import React, { useState } from "react";
import { FullSystemState, ParkingSpot, EventLog } from "../types";

interface AdminDashboardProps {
  systemState: FullSystemState;
  onModifySpot: (spotId: string | number, status: string, payload?: any) => void;
  onToggleLockout: (active: boolean) => void;
  onUpdateGate: (status: "open" | "closed", override: boolean) => void;
}

export default function AdminDashboard({
  systemState,
  onModifySpot,
  onToggleLockout,
  onUpdateGate
}: AdminDashboardProps) {
  const { parkingSpots, eventsLog, stats, emergencyLockout, gateStatus, overrideStatus } = systemState;
  const [selectedSpot, setSelectedSpot] = useState<ParkingSpot | null>(null);
  const [overridePlate, setOverridePlate] = useState("");
  const [overrideGuest, setOverrideGuest] = useState("");
  const [overrideStatusVal, setOverrideStatusVal] = useState<"available" | "occupied" | "reserved" | "blocked">("available");
  const [showGateModal, setShowGateModal] = useState(false);

  const handleSpotClick = (spot: ParkingSpot) => {
    setSelectedSpot(spot);
    setOverrideStatusVal(spot.status);
    setOverridePlate(spot.occupiedBy || "");
    setOverrideGuest(spot.reservedFor || "");
  };

  const submitOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSpot) return;
    onModifySpot(selectedSpot.id, overrideStatusVal, {
      plate: overridePlate,
      reservedFor: overrideGuest,
      vehicleType: selectedSpot.vehicleType || "ev"
    });
    setSelectedSpot(null);
  };

  // Compute stats for charts
  const evCount = parkingSpots.filter(s => s.status === "occupied" && s.vehicleType === "ev").length;
  const suvCount = parkingSpots.filter(s => s.status === "occupied" && s.vehicleType === "suv").length;
  const freightCount = parkingSpots.filter(s => s.status === "occupied" && s.vehicleType === "freight").length;
  const totalOccupied = evCount + suvCount + freightCount;

  const evPercentage = totalOccupied > 0 ? Math.round((evCount / totalOccupied) * 100) : 72;
  const suvPercentage = totalOccupied > 0 ? Math.round((suvCount / totalOccupied) * 100) : 20;
  const freightPercentage = totalOccupied > 0 ? Math.round((freightCount / totalOccupied) * 100) : 8;

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-hidden">
      {/* Top Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[110px]">
        {/* Total Occupancy Stat */}
        <div className="glass-panel rounded-xl p-5 relative overflow-hidden group">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-status-available"></div>
          <div className="flex justify-between items-start">
            <span className="font-label-mono text-label-mono text-on-surface-variant uppercase tracking-widest text-[11px]">Total Occupancy</span>
            <span className="material-symbols-outlined text-status-available animate-pulse">sensors</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-headline-lg text-headline-lg text-on-surface text-3xl font-bold">{stats.occupancyPercentage}%</span>
            <span className="font-label-mono text-label-mono text-status-available text-xs">
              {stats.occupiedCount} / {stats.totalSpots} Slots
            </span>
          </div>
        </div>

        {/* VIP Reservations Stat */}
        <div className="glass-panel rounded-xl p-5 relative overflow-hidden group">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-status-reserved"></div>
          <div className="flex justify-between items-start">
            <span className="font-label-mono text-label-mono text-on-surface-variant uppercase tracking-widest text-[11px]">VIP Reservations Today</span>
            <span className="material-symbols-outlined text-status-reserved">star</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-headline-lg text-headline-lg text-on-surface text-3xl font-bold">{stats.reservedCount}</span>
            <span className="font-label-mono text-label-mono text-on-surface-variant text-xs">Active priority hosts</span>
          </div>
        </div>

        {/* Security Alerts Stat */}
        <div className="glass-panel rounded-xl p-5 relative overflow-hidden group bg-surface-container-high/30">
          <div className={`absolute left-0 top-0 bottom-0 w-1 ${emergencyLockout || stats.blockedCount > 0 ? 'bg-status-occupied animate-pulse' : 'bg-outline-variant'}`}></div>
          <div className="flex justify-between items-start">
            <span className="font-label-mono text-label-mono text-on-surface-variant uppercase tracking-widest text-[11px]">Security Alerts</span>
            <span className={`material-symbols-outlined ${emergencyLockout ? 'text-status-occupied animate-bounce' : 'text-on-surface-variant'}`}>warning</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`font-headline-lg text-headline-lg text-3xl font-bold ${emergencyLockout || stats.blockedCount > 0 ? "text-error" : "text-on-surface"}`}>
              {emergencyLockout ? "SYS LOCKED" : stats.blockedCount}
            </span>
            <span className="font-label-mono text-label-mono text-on-surface-variant text-xs">
              {emergencyLockout ? "Emergency LOCKON" : `${stats.blockedCount} zones isolated`}
            </span>
          </div>
        </div>
      </div>

      {/* Main Core View Area Map Grid + Events panel */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden min-h-[400px]">
        {/* Left Side: Live Grid Map */}
        <div className="lg:col-span-8 glass-panel rounded-xl p-6 flex flex-col overflow-hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
            <div>
              <h2 className="font-headline-lg text-title-md text-lg font-bold flex items-center gap-2 text-[#dbe1ff]">
                <span className={`w-2.5 h-2.5 rounded-full ${emergencyLockout ? 'bg-error animate-ping' : 'bg-status-available animate-pulse'}`}></span>
                Live Grid Map — Zone Alpha-1
              </h2>
              <p className="text-xs text-on-surface-variant mt-0.5">Click any slot identifier item to manually override space status</p>
            </div>
            <div className="flex flex-wrap gap-3 font-label-mono text-label-mono text-[11px]">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-status-available/10 border border-status-available rounded-sm"></div> Available</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-status-occupied/30 border border-status-occupied rounded-sm"></div> Occupied</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-status-reserved/20 border border-status-reserved rounded-sm"></div> VIP</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-surface-variant border border-outline rounded-sm"></div> Blocked</div>
            </div>
          </div>

          {/* Grid display scrollable */}
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <div className="map-grid">
              {parkingSpots.map((spot) => {
                let stateClass = "";
                let textClass = "";

                if (spot.status === "available") {
                  stateClass = "bg-status-available/10 border-status-available/50 border-dashed hover:bg-status-available/20";
                  textClass = "text-status-available";
                } else if (spot.status === "occupied") {
                  stateClass = "bg-status-occupied/20 border-status-occupied hover:bg-status-occupied/30";
                  textClass = "text-status-occupied";
                } else if (spot.status === "reserved") {
                  stateClass = "bg-status-reserved/15 border-status-reserved hover:bg-status-reserved/25";
                  textClass = "text-status-reserved font-bold";
                } else {
                  stateClass = "bg-surface-variant border-outline-variant hover:opacity-80";
                  textClass = "text-on-surface-variant";
                }

                return (
                  <div
                    key={spot.id}
                    id={`spot-admin-${spot.id}`}
                    onClick={() => handleSpotClick(spot)}
                    className={`parking-spot ${stateClass} border rounded-sm flex flex-col items-center justify-center cursor-pointer p-0.5 relative group`}
                    title={`Spot ${spot.label} (${spot.status})`}
                  >
                    <span className={`text-[10px] font-label-mono ${textClass} uppercase tracking-tighter`}>
                      {spot.label}
                    </span>
                    {spot.status === "occupied" && (
                      <span className="text-[7px] text-white opacity-90 truncate max-w-full font-mono scale-90">
                        {spot.occupiedBy}
                      </span>
                    )}
                    {spot.status === "reserved" && (
                      <span className="text-[7px] text-amber-300 opacity-90 truncate max-w-full font-mono scale-90">
                        VIP
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side Event Log */}
        <div className="lg:col-span-4 glass-panel rounded-xl p-5 flex flex-col overflow-hidden">
          <h3 className="font-title-md text-title-md font-bold text-sm text-[#dbe1ff] border-b border-white/5 pb-3 mb-4 flex items-center justify-between">
            Real-time Events
            <span className="material-symbols-outlined text-primary scale-75">list_alt</span>
          </h3>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {eventsLog.map((evt) => {
              let borderCol = "border-status-available";
              let bgCol = "bg-surface-container-high/40";
              if (evt.type === "occupied") {
                borderCol = "border-status-occupied";
              } else if (evt.type === "reserved") {
                borderCol = "border-status-reserved";
              } else if (evt.type === "alert") {
                borderCol = "border-error";
                bgCol = "bg-error-container/10";
              }

              return (
                <div
                  key={evt.id}
                  className={`p-3 ${bgCol} rounded-lg border-l-4 ${borderCol} hover:bg-surface-bright/20 transition-colors cursor-pointer text-xs`}
                >
                  <div className="flex justify-between font-label-mono text-[9px] text-[#8d90a0] mb-0.5">
                    <span className="font-bold">{evt.spot}</span>
                    <span>{evt.timestamp}</span>
                  </div>
                  <div className="font-semibold text-on-surface text-[12px]">{evt.statusText}</div>
                  {evt.details && (
                    <div className="text-[10px] text-on-surface-variant font-label-mono mt-0.5">
                      {evt.details}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Visualization & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[160px]">
        {/* Trend Area Chart (SVG Placeholder) */}
        <div className="lg:col-span-4 glass-panel rounded-xl p-4 flex flex-col">
          <span className="font-label-mono text-label-mono text-on-surface-variant uppercase tracking-widest text-[10px] mb-2">Occupancy Trend (24h)</span>
          <div className="flex-1 flex items-end gap-1.5 h-24 overflow-hidden pt-2">
            <div className="flex-1 bg-primary/10 h-[30%] border-t border-primary rounded-t-sm hover:bg-primary/20 transition-all" title="00:00 - 30%"></div>
            <div className="flex-1 bg-primary/10 h-[45%] border-t border-primary rounded-t-sm hover:bg-primary/20 transition-all" title="03:00 - 45%"></div>
            <div className="flex-1 bg-primary/10 h-[60%] border-t border-primary rounded-t-sm hover:bg-primary/20 transition-all" title="06:00 - 60%"></div>
            <div className="flex-1 bg-primary/10 h-[80%] border-t border-primary rounded-t-sm hover:bg-primary/20 transition-all" title="09:00 - 80%"></div>
            <div className="flex-1 bg-primary/10 h-[75%] border-t border-primary rounded-t-sm hover:bg-primary/20 transition-all" title="12:00 - 75%"></div>
            <div className="flex-1 bg-primary/10 h-[50%] border-t border-primary rounded-t-sm hover:bg-primary/20 transition-all" title="15:00 - 50%"></div>
            <div className="flex-1 bg-primary/10 h-[40%] border-t border-primary rounded-t-sm hover:bg-primary/20 transition-all" title="18:00 - 40%"></div>
            <div className="flex-1 bg-primary/10 h-[55%] border-t border-primary rounded-t-sm hover:bg-primary/20 transition-all" title="21:00 - 55%"></div>
            <div className="flex-1 bg-primary/20 h-[85%] border-t border-primary rounded-t-sm hover:bg-primary/30 transition-all" title="Peak - 85%"></div>
            <div className="flex-1 bg-primary/30 h-[92%] border-t-2 border-primary rounded-t-sm hover:bg-primary/40 transition-all animate-pulse" title="Current - 92%"></div>
          </div>
        </div>

        {/* Dynamic Vehicle Distribution Donut Ring Chart */}
        <div className="lg:col-span-4 glass-panel rounded-xl p-4 flex flex-col justify-between">
          <span className="font-label-mono text-label-mono text-on-surface-variant uppercase tracking-widest text-[10px] mb-2">Vehicle Distribution</span>
          <div className="flex items-center justify-center gap-6 flex-1 py-1">
            {/* SVG Donut */}
            <div className="w-20 h-20 relative flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#16202f" strokeWidth="3" />
                <circle
                  cx="18"
                  cy="18"
                  r="15.915"
                  fill="none"
                  stroke="#b4c5ff"
                  strokeWidth="3.2"
                  strokeDasharray={`${evPercentage} ${100 - evPercentage}`}
                  strokeDashoffset="0"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15.915"
                  fill="none"
                  stroke="#cbbeff"
                  strokeWidth="3.2"
                  strokeDasharray={`${suvPercentage} ${100 - suvPercentage}`}
                  strokeDashoffset={-evPercentage}
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15.915"
                  fill="none"
                  stroke="#ffb596"
                  strokeWidth="3.2"
                  strokeDasharray={`${freightPercentage} ${100 - freightPercentage}`}
                  strokeDashoffset={-(evPercentage + suvPercentage)}
                />
              </svg>
              <span className="absolute font-semibold text-sm text-[12px]">{evPercentage}%</span>
            </div>

            <div className="space-y-1 font-label-mono text-[10px] text-on-surface-variant">
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary"></span> EV / Compact ({evPercentage}%)</div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-secondary"></span> SUV / Full-Size ({suvPercentage}%)</div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-tertiary"></span> Freight ({freightPercentage}%)</div>
            </div>
          </div>
        </div>

        {/* Dynamic Gate & Override Facility Quick Actions */}
        <div className="lg:col-span-4 glass-panel rounded-xl overflow-hidden relative group p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="font-label-mono text-label-mono text-primary text-[10px] uppercase tracking-widest">Facility Status</span>
              <h4 className={`text-sm font-bold mt-0.5 ${emergencyLockout ? 'text-error animate-pulse' : 'text-on-surface'}`}>
                {emergencyLockout ? "EMERGENCY LOCKDOWN" : "Floor 1: Optimal"}
              </h4>
            </div>
            <div className={`w-3 h-3 rounded-full ${emergencyLockout ? 'bg-[#ffb4ab] animate-ping' : 'bg-status-available'}`}></div>
          </div>

          <div className="text-[11px] text-on-surface-variant mt-2 mb-3 bg-surface-deep/30 p-2 rounded scale-95 origin-left">
            Gate Position: <b className={gateStatus === "open" ? "text-status-available" : "text-error"}>{gateStatus.toUpperCase()}</b>
            {overrideStatus ? " (Override Active)" : " (Automatic Telemetry)"}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowGateModal(true)}
              className="flex-1 bg-primary text-on-primary font-label-mono py-2 rounded-sm text-[10px] font-bold uppercase hover:bg-primary-container hover:text-white transition-colors"
            >
              Manage Gate
            </button>
            <button
              onClick={() => onUpdateGate(gateStatus, !overrideStatus)}
              className="px-3 bg-surface-container border border-white/10 rounded-sm text-[10px] font-bold uppercase hover:bg-white/5 text-on-surface font-label-mono transition-colors"
            >
              Override
            </button>
          </div>
        </div>
      </div>

      {/* Spot Modifier Overlay Modal Tool */}
      {selectedSpot && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#16202f] border border-white/10 rounded-xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-4">
              <h3 className="font-semibold text-primary font-label-mono">Modificar Spot: {selectedSpot.label}</h3>
              <button onClick={() => setSelectedSpot(null)} className="p-1 hover:bg-white/5 rounded-full text-on-surface-variant">
                <span className="material-symbols-outlined scale-75">close</span>
              </button>
            </div>

            <form onSubmit={submitOverride} className="space-y-4">
              <div>
                <label className="block text-xs font-label-mono text-on-surface-variant mb-1">STATE / STATUS</label>
                <select
                  value={overrideStatusVal}
                  onChange={(e) => setOverrideStatusVal(e.target.value as any)}
                  className="w-full bg-[#091422] border border-white/10 p-2.5 rounded-lg text-sm text-on-surface focus:ring-1 focus:ring-primary outline-none"
                >
                  <option value="available">Available (Libre)</option>
                  <option value="occupied">Occupied (Ocupado)</option>
                  <option value="reserved">Reserved (VIP Priority)</option>
                  <option value="blocked">Blocked (Isolado)</option>
                </select>
              </div>

              {overrideStatusVal === "occupied" && (
                <div>
                  <label className="block text-xs font-label-mono text-on-surface-variant mb-1">LICENSE PLATE NUMBER</label>
                  <input
                    type="text"
                    value={overridePlate}
                    onChange={(e) => setOverridePlate(e.target.value)}
                    required
                    maxLength={8}
                    className="w-full bg-[#091422] border border-white/10 p-2.5 rounded-lg text-sm text-on-surface font-mono uppercase focus:ring-1 focus:ring-primary outline-none"
                    placeholder="e.g. TX-492-L"
                  />
                </div>
              )}

              {overrideStatusVal === "reserved" && (
                <div>
                  <label className="block text-xs font-label-mono text-on-surface-variant mb-1">RESERVED GUEST NAME</label>
                  <input
                    type="text"
                    value={overrideGuest}
                    onChange={(e) => setOverrideGuest(e.target.value)}
                    required
                    className="w-full bg-[#091422] border border-white/10 p-2.5 rounded-lg text-sm text-on-surface focus:ring-1 focus:ring-primary outline-none"
                    placeholder="e.g. Morgan Stanley"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedSpot(null)}
                  className="flex-1 py-2 border border-white/10 rounded-lg text-xs hover:bg-white/5 font-label-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-primary text-on-primary font-bold rounded-lg text-xs hover:brightness-115 font-label-mono"
                >
                  Confirm Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Gate Controls Modal */}
      {showGateModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#16202f] border border-white/10 rounded-xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-4">
              <h3 className="font-semibold text-primary font-label-mono">Manage Facility Gate</h3>
              <button onClick={() => setShowGateModal(false)} className="p-1 hover:bg-white/5 rounded-full text-on-surface-variant">
                <span className="material-symbols-outlined scale-75">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-[#c3c6d7] leading-relaxed">
                Direct electromagnetic gate commands for Floor-1 Entrance Gantry-A. Override flag forces permanent positioning bypasses.
              </p>

              <div className="p-3 bg-surface-deep/40 rounded-lg text-xs font-mono flex justify-between">
                <span>Gate Position:</span>
                <span className={gateStatus === "open" ? "text-status-available font-bold" : "text-error font-bold"}>
                  {gateStatus.toUpperCase()}
                </span>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => {
                    onUpdateGate("open", overrideStatus);
                    setShowGateModal(false);
                  }}
                  className="w-full py-2.5 bg-status-available/10 hover:bg-status-available/20 border border-status-available text-status-available font-bold rounded-lg text-xs transition-colors font-label-mono uppercase"
                >
                  Pulse Gate Open
                </button>
                <button
                  onClick={() => {
                    onUpdateGate("closed", overrideStatus);
                    setShowGateModal(false);
                  }}
                  className="w-full py-2.5 bg-status-occupied/10 hover:bg-status-occupied/20 border border-status-occupied text-error font-bold rounded-lg text-xs transition-colors font-label-mono uppercase"
                >
                  Pulse Gate Closed
                </button>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <span className="text-xs font-label-mono text-on-surface-variant">TELEMETRY OVERRIDE</span>
                <input
                  type="checkbox"
                  checked={overrideStatus}
                  onChange={(e) => onUpdateGate(gateStatus, e.target.checked)}
                  className="text-primary focus:ring-primary border-white/10 bg-background rounded-sm"
                />
              </div>

              <button
                onClick={() => setShowGateModal(false)}
                className="w-full py-2 mt-2 bg-surface-container-high hover:bg-surface-bright text-on-surface text-xs rounded-lg font-label-mono"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
