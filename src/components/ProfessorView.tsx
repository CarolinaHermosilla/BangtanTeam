import React, { useEffect, useState } from "react";
import { FullSystemState, ParkingSpot } from "../types";

interface ProfessorViewProps {
  systemState: FullSystemState;
  onContactSecurity: () => void;
  onRaiseAlert: () => void;
}

export default function ProfessorView({
  systemState,
  onContactSecurity,
  onRaiseAlert
}: ProfessorViewProps) {
  const { parkingSpots, stats, emergencyLockout } = systemState;

  // Active duration spent count up timer simulation
  const [secondsElapsed, setSecondsElapsed] = useState(8085); // 2 hours, 14 minutes, 45 seconds initial

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatSpentTime = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Find user's active vehicle spot (A-102)
  const professorSpot = parkingSpots.find(s => s.label === "A-102");
  const isParked = professorSpot ? professorSpot.status === "occupied" : false;

  return (
    <div className="flex items-center justify-center py-4 w-full h-full max-h-[780px] overflow-hidden">
      {/* Smartphone frame container */}
      <div className="w-[330px] h-[640px] bg-[#050e1d] rounded-[36px] border-[8px] border-[#2b3545] shadow-2xl relative flex flex-col justify-between overflow-hidden text-xs">
        
        {/* Notch / Speaker header */}
        <div className="absolute top-0 inset-x-0 h-5 bg-[#2b3545] rounded-b-xl flex justify-between items-center px-4 pt-1 z-50 text-[8px] font-label-mono text-[#c3c6d7]/70 select-none">
          <span>PARK-OS Mobile</span>
          {/* Notch Pill */}
          <div className="w-12 h-3 bg-black rounded-b-lg -mt-1 mx-auto"></div>
          <div className="flex items-center gap-1">
            <span>5G</span>
            <span className="material-symbols-outlined text-[8px]">battery_very_low</span>
          </div>
        </div>

        {/* Dynamic Mobile body scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 pt-8 pb-16 custom-scrollbar space-y-4">
          
          {/* Top Mobile Bar header */}
          <header className="flex justify-between items-center py-2 h-10 border-b border-white/5">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-base">grid_view</span>
              <h2 className="font-bold text-white text-xs font-headline-lg-mobile tracking-tight">Kinetic Grid</h2>
            </div>
            <div className="w-7 h-7 rounded-full border border-primary/40 overflow-hidden shrink-0">
              <img
                alt="Professor Profile"
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida/AP1WRLtULRnf0vHSM9t1ANmECF2d4i2LsfzdfUWXuRn1V4vcvsppf_1jzD7HhU4rBtX7zGQYmXEtjYyde7wazTF5n3Ym3g-VPL-V5sR6OaxRWa5khyE2BpsfFx6J-YoLGFprzWbEGvu5vCYP-K_Nuyod4VM6PryvZrg05FZgjQ9pLsY4vIhL1l1xtOCCML7Hp1r-KcDHi79hm0moEXZwDNGE0hVktqwGSBzFUpOPwYQpiGf8gRIdUparZ7J61O0"
              />
            </div>
          </header>

          {/* User Vehicle status container */}
          <section className="relative overflow-hidden rounded-xl bg-surface-container-high/60 border-l-4 border-status-available p-4 border border-white/5 shadow-md">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-label-mono text-[9px] text-[#8d90a0] uppercase tracking-widest leading-none mb-1">Your Vehicle</h3>
                <h4 className="font-bold text-white text-sm leading-tight">
                  {isParked ? "Parked in A-102" : "Transit Out of Bay"}
                </h4>
              </div>
              <span className={`material-symbols-outlined text-base ${isParked ? 'text-status-available animate-pulse-soft' : 'text-on-surface-variant'}`}>
                directions_car
              </span>
            </div>

            <div className="flex items-center gap-4 text-on-surface-variant font-label-mono text-[9px]">
              <div className="flex items-center gap-0.5">
                <span className="material-symbols-outlined text-[10px]">schedule</span>
                <span>{isParked ? formatSpentTime(secondsElapsed) : "--:--:--"}</span>
              </div>
              <div className="flex items-center gap-0.5">
                <span className="material-symbols-outlined text-[10px]">payments</span>
                <span>Faculty Access</span>
              </div>
            </div>

            {/* Parking watermark inside */}
            <div className="absolute -right-2 -bottom-2 opacity-5 pointer-events-none">
              <span className="material-symbols-outlined text-7xl font-bold">local_parking</span>
            </div>
          </section>

          {/* Availability summary indicator */}
          <section className="space-y-1.5 pt-1">
            <div className="flex justify-between items-baseline">
              <h3 className="font-semibold text-white ml-0.5 text-[11px]">Campus Main Lot</h3>
              <span className="font-label-mono text-[9px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                {stats.availableCount}/{stats.totalSpots} Available
              </span>
            </div>
            
            <div className="h-2 w-full bg-[#121c2a] rounded-full overflow-hidden border border-white/5">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${100 - stats.occupancyPercentage}%` }}
              ></div>
            </div>

            <div className="flex justify-between text-[9px] font-label-mono text-on-surface-variant">
              <span>{stats.occupancyPercentage > 85 ? "High Density" : "Moderate Capacity"}</span>
              <span>{stats.occupancyPercentage}% Occupied</span>
            </div>
          </section>

          {/* Mini Real-time map representation */}
          <section className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-[#dbe1ff] text-[11px]">Live Dot Matrix</h3>
              <div className="flex gap-2 text-[9px] font-label-mono text-on-surface-variant">
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-status-available"></div>
                  <span>Free</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-status-occupied"></div>
                  <span>Busy</span>
                </div>
              </div>
            </div>

            {/* Dots matrix represent our spots */}
            <div className="glass-panel p-3 rounded-xl min-h-[160px] flex flex-col justify-between relative overflow-hidden bg-surface-container-low/40">
              <div className="grid grid-cols-11 gap-1.5 w-full">
                {parkingSpots.slice(0, 110).map((spot, idx) => {
                  let dotColor = "bg-status-available";
                  if (spot.status === "occupied") dotColor = "bg-status-occupied";
                  else if (spot.status === "reserved") dotColor = "bg-status-reserved";
                  else if (spot.status === "blocked") dotColor = "bg-outline-variant";

                  // Highlight Spot A-102 (idx === 1 is spot 2) or our special spot
                  const isProfessorDot = spot.label === "A-102";

                  return (
                    <div
                      key={spot.id}
                      className={`w-full aspect-square rounded-full transition-colors duration-300 ${
                        isProfessorDot && isParked
                          ? "bg-primary ring-2 ring-primary ring-offset-2 ring-offset-[#091422] scale-110 animate-pulse"
                          : dotColor
                      } opacity-70 hover:opacity-100 cursor-help`}
                      title={`${spot.label}: ${spot.status}`}
                    ></div>
                  );
                })}
              </div>

              {/* Gradient layer */}
              <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-surface-container/60 via-transparent to-transparent"></div>

              {/* Overlay zone labels */}
              <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center text-[8px] font-label-mono">
                <span className="bg-surface-container-highest/80 border border-white/5 px-2 py-0.5 rounded-full text-[7px]">ZONE ALPHA-1 NORTH</span>
                <span className="text-[#a1b8ff]">FACILITY ACTIVE</span>
              </div>
            </div>
          </section>

          {/* Quick Actions bento grid */}
          <div className="grid grid-cols-2 gap-3 pt-1 text-center">
            <div
              onClick={onRaiseAlert}
              className="bg-surface-container/40 p-3 rounded-xl border border-outline-variant/30 hover:bg-surface-bright/20 cursor-pointer transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-primary text-base mb-1">notifications_active</span>
              <p className="font-label-mono text-[8px] uppercase text-on-surface-variant tracking-wider leading-none mb-1">Local Alerts</p>
              <p className="font-semibold text-white text-[11px]">System Nominal</p>
            </div>
            <div
              onClick={onContactSecurity}
              className="bg-surface-container/40 p-3 rounded-xl border border-outline-variant/30 hover:bg-surface-bright/20 cursor-pointer transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-secondary text-base mb-1">support_agent</span>
              <p className="font-label-mono text-[8px] uppercase text-on-surface-variant tracking-wider leading-none mb-1">Emergency Help</p>
              <p className="font-semibold text-[#cbbeff] text-[11px]">Call Gate Security</p>
            </div>
          </div>
        </div>

        {/* Stick bottom navigation tab bar wrapper */}
        <nav className="absolute bottom-0 inset-x-0 bg-surface-glass backdrop-blur-md h-14 border-t border-white/10 rounded-b-[28px] flex justify-around items-center px-2 select-none z-40 text-[9px] font-label-mono">
          <button className="flex flex-col items-center justify-center text-primary font-bold scale-[0.9] origin-center cursor-pointer">
            <span className="material-symbols-outlined text-primary text-base">map</span>
            <span>Live Map</span>
          </button>
          <button className="flex flex-col items-center justify-center text-on-surface-variant hover:text-white scale-[0.9] origin-center cursor-pointer">
            <span className="material-symbols-outlined text-lg">directions_car</span>
            <span>My Vehicle</span>
          </button>
          <button className="flex flex-col items-center justify-center text-on-surface-variant hover:text-white scale-[0.9] origin-center cursor-pointer">
            <span className="material-symbols-outlined text-lg">history</span>
            <span>History</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
