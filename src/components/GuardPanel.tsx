import React, { useState } from "react";
import { FullSystemState, ParkingSpot } from "../types";

interface GuardPanelProps {
  systemState: FullSystemState;
  onRegisterEntry: (payload: {
    plate: string;
    vehicleType: string;
    expectedDuration: string;
    recommendedSpotLabel?: string;
  }) => void;
  onRegisterExit: (payload: { label: string }) => void;
  onSelectAlternativeSpot: (spotLabel: string) => void;
}

export default function GuardPanel({
  systemState,
  onRegisterEntry,
  onRegisterExit,
  onSelectAlternativeSpot
}: GuardPanelProps) {
  const { parkingSpots, eventsLog, stats } = systemState;

  const [showEntryModal, setShowEntryModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

  // States for Entry Form
  const [entryPlate, setEntryPlate] = useState("ABC-1234");
  const [entryVehicleType, setEntryVehicleType] = useState("Electric Vehicle");
  const [entryDuration, setEntryDuration] = useState("Short Term (<2h)");
  const [chosenSpot, setChosenSpot] = useState("B-12");

  // States for Exit Form
  const [exitSpot, setExitSpot] = useState("");
  const [exitError, setExitError] = useState("");

  const [fcmAlerterActive, setFcmAlerterActive] = useState(false);

  const getSpotStatus = (label: string): ParkingSpot["status"] => {
    const spot = parkingSpots.find(s => s.label === label);
    return spot ? spot.status : "available";
  };

  const getSpotClass = (label: string) => {
    const status = getSpotStatus(label);
    if (label === chosenSpot && status === "available") {
      return "border-primary border-[3px] bg-primary/25 rounded-md text-primary font-bold animate-pulse-soft";
    }

    if (status === "available") {
      return "border-2 border-dashed border-status-available hover:border-status-available bg-status-available/5 rounded-md opacity-60 hover:opacity-100 cursor-pointer";
    } else if (status === "occupied") {
      return "border-2 border-solid border-status-occupied bg-status-occupied/15 rounded-md opacity-85";
    } else if (status === "reserved") {
      return "border-2 border-solid border-status-reserved bg-status-reserved/15 rounded-md opacity-85";
    } else {
      return "border-2 border-solid border-outline-variant bg-surface-variant/40 rounded-md opacity-50";
    }
  };

  const submitEntry = (e: React.FormEvent) => {
    e.preventDefault();
    onRegisterEntry({
      plate: entryPlate,
      vehicleType: entryVehicleType,
      expectedDuration: entryDuration,
      recommendedSpotLabel: chosenSpot
    });
    setShowEntryModal(false);
    // Refresh to a new mock plate for next arrival
    const plates = ["KLO-4421", "RTX-9080", "VIP-001", "A31-F992", "CA-201-B", "M40-X129"];
    setEntryPlate(plates[Math.floor(Math.random() * plates.length)]);
  };

  const submitExit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!exitSpot) return;

    const matchedSpot = parkingSpots.find(
      s => s.label.toUpperCase() === exitSpot.toUpperCase() || s.occupiedBy?.toUpperCase() === exitSpot.toUpperCase()
    );

    if (!matchedSpot || matchedSpot.status !== "occupied") {
      setExitError("No occupied spot found with this name or license plate.");
      return;
    }

    onRegisterExit({ label: matchedSpot.label });
    setExitSpot("");
    setExitError("");
    setShowExitModal(false);
  };

  const handleAlternativeSelect = (label: string) => {
    // Override chosen recommended spot
    const spot = parkingSpots.find(s => s.label === label);
    if (spot && spot.status === "available") {
      setChosenSpot(label);
      onSelectAlternativeSpot(label);
    }
  };

  const sendEmergencyAlert = () => {
    setFcmAlerterActive(true);
    setTimeout(() => {
      setFcmAlerterActive(false);
      alert("Emergency Push Notification Broadcast safely dispatched to all active mobile devices in Zone Alpha-1.");
    }, 1200);
  };

  return (
    <div className="flex-1 p-0 grid grid-cols-12 gap-6 overflow-y-auto custom-scrollbar">
      {/* Quick Action Header widget */}
      <section className="col-span-12 flex flex-col xl:flex-row items-center justify-between gap-6 bg-surface-container p-6 rounded-2xl border border-white/5 shadow-md">
        <div className="w-full xl:w-1/2">
          <h1 className="font-headline-lg text-headline-lg font-bold text-2xl mb-1 text-[#dbe1ff]">Guard Operational Panel</h1>
          <p className="text-on-surface-variant text-xs leading-relaxed">Real-time terminal for entrance registration, automated recommendations, and terminal site security.</p>
        </div>
        <div className="flex items-center gap-4 w-full xl:w-auto">
          <button
            onClick={() => setShowEntryModal(true)}
            className="flex-1 xl:flex-none px-6 py-3 bg-primary text-on-primary font-bold rounded-xl flex items-center justify-center gap-2.5 hover:scale-[1.03] active:scale-95 transition-all shadow-lg shadow-primary/10 font-label-mono text-xs cursor-pointer"
          >
            <span className="material-symbols-outlined font-bold text-sm">login</span>
            REGISTER ENTRY
          </button>
          <button
            onClick={() => setShowExitModal(true)}
            className="flex-1 xl:flex-none px-6 py-3 bg-surface-bright text-on-surface border border-outline-variant font-bold rounded-xl flex items-center justify-center gap-2.5 hover:bg-surface-variant active:scale-95 transition-all font-label-mono text-xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">logout</span>
            REGISTER EXIT
          </button>
        </div>
      </section>

      {/* Grid Map and Assistances Panel */}
      <section className="col-span-12 lg:col-span-8 bg-[#0a111e] rounded-2xl border border-white/5 overflow-hidden relative min-h-[500px] p-6 flex flex-col justify-between">
        {/* Map Header Overlay */}
        <div className="flex justify-between items-center mb-6">
          <div className="bg-surface-glass backdrop-blur-md px-4 py-1.5 rounded-lg border border-white/10 flex items-center gap-4 text-[11px] font-label-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-status-available"></span>
              <span>{stats.availableCount} FREE</span>
            </div>
            <div className="w-px h-3 bg-white/15"></div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-status-occupied"></span>
              <span>{stats.occupiedCount} BUSY</span>
            </div>
          </div>
          <span className="text-[10px] bg-secondary-container/20 text-[#cbbeff] border border-secondary/20 px-2 py-0.5 rounded font-label-mono uppercase tracking-wider">GATE ACTIVE</span>
        </div>

        {/* SVG/Tactile grid of spots specifically drawn around Driveway East */}
        <div className="flex-1 flex items-center justify-center bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] p-4">
          <div className="grid grid-cols-6 sm:grid-cols-10 gap-3 w-full max-w-2xl text-[10px] font-label-mono">
            {/* ROW A (A-01 to A-08) */}
            <div onClick={() => handleAlternativeSelect("A-01")} className={`h-14 flex items-center justify-center transition-all ${getSpotClass("A-01")}`}>A-01</div>
            <div onClick={() => handleAlternativeSelect("A-02")} className={`h-14 flex items-center justify-center transition-all ${getSpotClass("A-02")}`}>A-02</div>
            <div onClick={() => handleAlternativeSelect("A-03")} className={`h-14 flex items-center justify-center transition-all ${getSpotClass("A-03")}`}>A-03</div>
            <div onClick={() => handleAlternativeSelect("A-04")} className={`h-14 flex items-center justify-center transition-all ${getSpotClass("A-04")}`}>
              A-04 <span className="material-symbols-outlined text-[10px] ml-0.5">accessible</span>
            </div>

            <div className="col-span-2 flex items-center justify-center text-[#ffb596]/10 text-[9px] uppercase tracking-wide">Aisle</div>

            <div onClick={() => handleAlternativeSelect("A-05")} className={`h-14 flex items-center justify-center transition-all ${getSpotClass("A-05")}`}>A-05</div>
            <div onClick={() => handleAlternativeSelect("A-06")} className={`h-14 flex items-center justify-center transition-all ${getSpotClass("A-06")}`}>A-06</div>
            <div onClick={() => handleAlternativeSelect("A-07")} className={`h-14 flex items-center justify-center transition-all ${getSpotClass("A-07")}`}>A-07</div>
            <div onClick={() => handleAlternativeSelect("A-08")} className={`h-14 flex items-center justify-center transition-all ${getSpotClass("A-08")}`}>A-08</div>

            {/* SPACER SECTION - DRIVEWAY EAST */}
            <div onClick={() => handleAlternativeSelect("B-01")} className={`h-14 flex items-center justify-center transition-all ${getSpotClass("B-01")}`}>B-01</div>
            <div onClick={() => handleAlternativeSelect("B-02")} className={`h-14 flex items-center justify-center transition-all ${getSpotClass("B-02")}`}>B-02</div>
            <div className="col-span-6 flex items-center justify-center text-on-surface-variant/20 font-label-mono tracking-[0.6em] uppercase text-[9px] border border-white/5 bg-surface-deep/30 rounded py-2">
              DRIVEWAY EAST
            </div>
            <div onClick={() => handleAlternativeSelect("B-09")} className={`h-14 flex items-center justify-center transition-all ${getSpotClass("B-09")}`}>B-09</div>
            <div onClick={() => handleAlternativeSelect("B-10")} className={`h-14 flex items-center justify-center transition-all ${getSpotClass("B-10")}`}>B-10</div>

            {/* ROW B (B-11 to B-18) */}
            <div onClick={() => handleAlternativeSelect("B-11")} className={`h-14 flex items-center justify-center transition-all ${getSpotClass("B-11")}`}>B-11</div>
            <div onClick={() => handleAlternativeSelect("B-12")} className={`h-14 flex items-center justify-center transition-all ${getSpotClass("B-12")}`}>
              B-12 <span className="w-1.5 h-1.5 bg-primary rounded-full animate-ping ml-1"></span>
            </div>
            <div onClick={() => handleAlternativeSelect("B-13")} className={`h-14 flex items-center justify-center transition-all ${getSpotClass("B-13")}`}>B-13</div>
            <div onClick={() => handleAlternativeSelect("B-14")} className={`h-14 flex items-center justify-center transition-all ${getSpotClass("B-14")}`}>B-14</div>

            <div className="col-span-2 flex items-center justify-center text-neutral-500/10 text-[9px] uppercase tracking-wide">Exit</div>

            <div onClick={() => handleAlternativeSelect("B-15")} className={`h-14 flex items-center justify-center transition-all ${getSpotClass("B-15")}`}>B-15</div>
            <div onClick={() => handleAlternativeSelect("B-16")} className={`h-14 flex items-center justify-center transition-all ${getSpotClass("B-16")}`}>B-16</div>
            <div onClick={() => handleAlternativeSelect("B-17")} className={`h-14 flex items-center justify-center transition-all ${getSpotClass("B-17")}`}>B-17</div>
            <div onClick={() => handleAlternativeSelect("B-18")} className={`h-14 flex items-center justify-center transition-all ${getSpotClass("B-18")}`}>B-18</div>
          </div>
        </div>

        {/* Map view footer info */}
        <div className="flex justify-between items-center text-on-surface-variant font-label-mono text-[10px] mt-4 border-t border-white/5 pt-4">
          <span>Camera visual matching system ok</span>
          <span>Sync delay: &lt;120ms</span>
        </div>
      </section>

      {/* Right Side Bar: Suggestion Engine & Recent operations logs */}
      <aside className="col-span-12 lg:col-span-4 flex flex-col gap-6">
        {/* Suggestion Engine dynamic card */}
        <div className="bg-surface-container p-6 rounded-2xl border border-white/5 relative overflow-hidden flex flex-col justify-between min-h-[240px]">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-title-md text-title-md text-sm font-bold flex items-center gap-2 text-on-surface">
              <span className="material-symbols-outlined text-primary text-lg">auto_awesome</span>
              Smart Assignment
            </h3>
            <span className="text-[9px] font-label-mono bg-primary/15 text-primary px-2 py-0.5 rounded border border-primary/20">LIVE ENGINE</span>
          </div>

          <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl mb-4">
            <p className="text-label-mono font-label-mono text-primary text-[10px] mb-1 uppercase tracking-wider">Optimal Space Found</p>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold text-white tracking-widest">{chosenSpot}</span>
              <div className="text-right">
                <p className="text-on-surface text-xs font-semibold">Zone Alpha (North)</p>
                <p className="text-on-surface-variant text-[10px] font-label-mono">4.2m from Gantry-A</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-on-surface-variant text-[9px] font-label-mono uppercase tracking-wider">Premium Alternative Options</p>
            
            <div
              onClick={() => handleAlternativeSelect("A-04")}
              className={`flex items-center justify-between p-2 rounded-lg cursor-pointer border transition-colors ${
                chosenSpot === "A-04"
                  ? "bg-primary/20 border-primary"
                  : "bg-surface-variant/20 border-transparent hover:border-white/10"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 flex items-center justify-center bg-surface-container rounded text-xs font-bold font-mono">A-04</span>
                <span className="text-xs text-on-surface">Handicap Accessible</span>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant text-base">accessible</span>
            </div>

            <div
              onClick={() => handleAlternativeSelect("C-22")}
              className={`flex items-center justify-between p-2 rounded-lg cursor-pointer border transition-colors ${
                chosenSpot === "C-22"
                  ? "bg-primary/20 border-primary"
                  : "bg-surface-variant/20 border-transparent hover:border-white/10"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 flex items-center justify-center bg-surface-container rounded text-xs font-bold font-mono">C-22</span>
                <span className="text-xs text-on-surface font-semibold">EV-Charging Ready</span>
              </div>
              <span className="material-symbols-outlined text-status-available text-base">bolt</span>
            </div>
          </div>

          <button
            onClick={() => {
              // Cycle to a random available spot
              const avSpots = parkingSpots.filter(s => s.status === "available" && s.label !== chosenSpot);
              if (avSpots.length > 0) {
                const nextRandomLabel = avSpots[Math.floor(Math.random() * avSpots.length)].label;
                setChosenSpot(nextRandomLabel);
                onSelectAlternativeSpot(nextRandomLabel);
              }
            }}
            className="w-full mt-4 py-2.5 bg-secondary-container/40 text-on-secondary-container hover:bg-secondary-container/60 font-bold rounded-xl transition-all border border-secondary/20 font-label-mono text-[10px]"
          >
            OVERRIDE SUGGESTION
          </button>
        </div>

        {/* Recent operations timeline queue */}
        <div className="bg-surface-container p-6 rounded-2xl border border-white/5 flex-1 flex flex-col overflow-hidden min-h-[220px]">
          <h3 className="font-title-md text-title-md text-sm font-bold mb-4 flex items-center gap-2 text-on-surface">
            <span className="material-symbols-outlined text-sm">history</span>
            Recent Operations Log
          </h3>

          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 custom-scrollbar text-xs">
            {eventsLog.slice(0, 4).map((op) => {
              const isLogin = op.type === "occupied";
              const isAlert = op.type === "alert";

              let iconName = "login";
              let iconColor = "text-status-available";
              let bgIconColor = "bg-status-available/10";

              if (op.type === "vacated") {
                iconName = "logout";
                iconColor = "text-status-occupied";
                bgIconColor = "bg-status-occupied/10";
              } else if (op.type === "reserved") {
                iconName = "event";
                iconColor = "text-status-reserved";
                bgIconColor = "bg-status-reserved/10";
              } else if (op.type === "alert") {
                iconName = "campaign";
                iconColor = "text-error";
                bgIconColor = "bg-error/10";
              }

              return (
                <div key={op.id} className="flex items-start gap-3 pb-3 border-b border-white/5 last:border-none">
                  <div className={`w-8 h-8 rounded-lg ${bgIconColor} flex items-center justify-center ${iconColor} shrink-0`}>
                    <span className="material-symbols-outlined scale-75 font-semibold">{iconName}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-on-surface truncate">{op.statusText}</p>
                    <p className="text-[10px] text-on-surface-variant font-label-mono truncate">{op.details}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      {/* FCM ALERT DRIVER Floating Siren button */}
      <button
        onClick={sendEmergencyAlert}
        className={`fixed bottom-24 right-10 w-16 h-16 rounded-full shadow-2xl flex items-center justify-center group hover:scale-110 active:scale-95 transition-all z-50 cursor-pointer ${
          fcmAlerterActive ? "bg-status-occupied text-white animate-bounce" : "bg-error text-on-error shadow-error/30"
        }`}
      >
        <span className="material-symbols-outlined text-3xl">campaign</span>
        <div className="absolute -top-10 right-0 bg-[#93000a] border border-white/10 text-[#ffdad6] px-3 py-1 rounded-lg text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none font-label-mono uppercase">
          FCM ALERT ALL DRIVERS
        </div>
      </button>

      {/* modal: Register Entry */}
      {showEntryModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/85 backdrop-blur-sm">
          <div className="bg-[#16202f] w-full max-w-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-lg font-bold font-sans text-white">Vehicle Entry Terminal</h2>
              <button onClick={() => setShowEntryModal(false)} className="p-1 hover:bg-white/5 rounded-full text-on-surface-variant cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={submitEntry} className="p-6 space-y-5">
              <div>
                <label className="block text-[10px] font-label-mono text-on-surface-variant mb-1.5 uppercase">LICENSE PLATE</label>
                <input
                  type="text"
                  required
                  value={entryPlate}
                  onChange={(e) => setEntryPlate(e.target.value)}
                  className="w-full bg-[#091422] border border-white/10 p-3.5 rounded-xl text-2xl font-label-mono uppercase tracking-widest text-primary focus:border-primary outline-none focus:ring-1 focus:ring-primary"
                  placeholder="e.g. ABC-1234"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-label-mono text-on-surface-variant mb-1.5 uppercase">VEHICLE TYPE</label>
                  <select
                    value={entryVehicleType}
                    onChange={(e) => setEntryVehicleType(e.target.value)}
                    className="w-full bg-[#091422] border border-white/10 p-2.5 rounded-lg text-xs text-on-surface outline-none"
                  >
                    <option value="Passenger Car">Passenger Car</option>
                    <option value="Light Truck">Light Truck</option>
                    <option value="Electric Vehicle">Electric Vehicle</option>
                    <option value="Motorcycle">Motorcycle</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-label-mono text-on-surface-variant mb-1.5 uppercase">EXPECTED DURATION</label>
                  <select
                    value={entryDuration}
                    onChange={(e) => setEntryDuration(e.target.value)}
                    className="w-full bg-[#091422] border border-white/10 p-2.5 rounded-lg text-xs text-on-surface outline-none"
                  >
                    <option value="Short Term (<2h)">Short Term (&lt;2h)</option>
                    <option value="Medium Term (2-6h)">Medium Term (2-6h)</option>
                    <option value="Daily (24h)">Daily (24h)</option>
                  </select>
                </div>
              </div>

              <div className="bg-primary/10 p-4 rounded-xl border border-primary/20 flex items-center gap-3.5 scale-95 origin-center">
                <span className="material-symbols-outlined text-primary text-2xl animate-pulse">lightbulb</span>
                <div className="text-xs">
                  <p className="font-bold text-primary">Best Recommended Space: {chosenSpot}</p>
                  <p className="text-on-surface-variant text-[11px]">Size clearance auto-matching, optimal exit route flows.</p>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-primary text-on-primary font-bold rounded-xl text-sm hover:scale-[1.02] shadow-xl shadow-primary/10 transition-all font-label-mono uppercase tracking-wider cursor-pointer"
              >
                CONFIRM ENTRY &amp; PRINT TICKET
              </button>
            </form>
          </div>
        </div>
      )}

      {/* modal: Register Exit */}
      {showExitModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/85 backdrop-blur-sm">
          <div className="bg-[#16202f] w-full max-w-sm rounded-2xl border border-white/10 shadow-2xl p-6">
            <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-4">
              <h2 className="text-md font-bold text-white font-sans">Register Vehicle Exit</h2>
              <button onClick={() => { setShowExitModal(false); setExitError(""); }} className="p-1 hover:bg-white/5 rounded-full text-on-surface-variant cursor-pointer">
                <span className="material-symbols-outlined scale-75">close</span>
              </button>
            </div>

            <form onSubmit={submitExit} className="space-y-4">
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Enter the occupied parking slot ID (e.g. B-01) or license plate alphanumeric (e.g. TX-492-L) to clear the space.
              </p>

              <div>
                <label className="block text-[10px] font-label-mono text-on-surface-variant mb-1.5 uppercase">SLOT ID OR LICENSE PLATE</label>
                <input
                  type="text"
                  required
                  value={exitSpot}
                  onChange={(e) => { setExitSpot(e.target.value); setExitError(""); }}
                  className="w-full bg-[#091422] border border-white/10 p-3 rounded-lg text-sm font-mono text-on-surface uppercase tracking-widest focus:ring-1 focus:ring-primary outline-none"
                  placeholder="e.g. A-102"
                />
              </div>

              {exitError && (
                <p className="text-xs text-error font-medium bg-error-container/10 p-2.5 rounded border border-error/20">
                  {exitError}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowExitModal(false); setExitError(""); }}
                  className="flex-1 py-2.5 border border-white/10 rounded-xl text-xs hover:bg-white/5 font-label-mono font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-primary text-on-primary font-bold rounded-xl text-xs hover:brightness-110 font-label-mono uppercase tracking-wider cursor-pointer"
                >
                  Dispatch Exit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
