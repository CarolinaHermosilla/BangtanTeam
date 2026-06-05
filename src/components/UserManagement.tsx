import React, { useState } from "react";
import { FullSystemState, UserProfile } from "../types";

interface UserManagementProps {
  systemState: FullSystemState;
  onAddUser: (userPayload: {
    name: string;
    email: string;
    role: string;
    plate: string;
    status: "active" | "offline";
  }) => void;
  onToggleUserStatus: (userId: string) => void;
  onDeleteUser: (userId: string) => void;
}

export default function UserManagement({
  systemState,
  onAddUser,
  onToggleUserStatus,
  onDeleteUser
}: UserManagementProps) {
  const { users } = systemState;

  const [searchQuery, setSearchQuery] = useState("");
  const [activeRoleFilter, setActiveRoleFilter] = useState<"all" | "admin" | "guard" | "professor">("all");
  
  const [showAddUserModal, setShowAddUserModal] = useState(false);

  // Form States for creating a user
  const [newUsername, setNewUsername] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<"admin" | "guard" | "professor">("guard");
  const [newUserPlate, setNewUserPlate] = useState("");
  const [newUserStatus, setNewUserStatus] = useState<"active" | "offline">("active");

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.plate.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = activeRoleFilter === "all" || u.role === activeRoleFilter;

    return matchesSearch && matchesRole;
  });

  const submitNewUser = (e: React.FormEvent) => {
    e.preventDefault();
    onAddUser({
      name: newUsername,
      email: newUserEmail,
      role: newUserRole,
      plate: newUserPlate || "N/A",
      status: newUserStatus
    });

    // Reset Form
    setNewUsername("");
    setNewUserEmail("");
    setNewUserRole("guard");
    setNewUserPlate("");
    setNewUserStatus("active");
    setShowAddUserModal(false);
  };

  const handleScanFeature = () => {
    const mockPlates = ["ABC-1234", "XKY-9980", "ZPT-5541", "KLO-4421", "TX-492-L", "CA-991-X"];
    const luckyPick = mockPlates[Math.floor(Math.random() * mockPlates.length)];
    setSearchQuery(luckyPick);
    alert(`ALPR (Automated License Plate Reader) simulated scan. Query set to: ${luckyPick}`);
  };

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-hidden pr-2">
      {/* Search and Filters controls */}
      <section className="space-y-4">
        {/* Search Input */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-outline">
            <span className="material-symbols-outlined text-lg">search</span>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 pl-11 pr-24 bg-surface-container-low border border-outline-variant/60 rounded-xl focus:ring-1 focus:ring-primary focus:border-transparent outline-none font-label-mono text-xs text-on-surface placeholder:text-outline transition-all"
            placeholder="Search credentials, email address, or license plate..."
          />
          <div className="absolute inset-y-0 right-2 flex items-center">
            <button
              onClick={handleScanFeature}
              className="flex items-center gap-1.5 bg-primary-container text-on-primary-container px-3.5 py-1.5 rounded-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-xs">photo_camera</span>
              <span className="font-label-mono text-[10px] font-bold">ALPR SCAN</span>
            </button>
          </div>
        </div>

        {/* Roles Filter Selector Tabs */}
        <div className="flex flex-wrap gap-2 items-center text-xs">
          <span className="font-label-mono text-[10px] text-outline uppercase tracking-widest mr-2 leading-none">Roles:</span>
          
          <button
            onClick={() => setActiveRoleFilter("all")}
            className={`px-4 py-1.5 rounded-full font-semibold transition-all cursor-pointer ${
              activeRoleFilter === "all"
                ? "bg-primary text-on-primary"
                : "bg-surface-container border border-outline-variant text-on-surface-variant hover:bg-surface-bright"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveRoleFilter("admin")}
            className={`px-4 py-1.5 rounded-full font-semibold transition-all cursor-pointer ${
              activeRoleFilter === "admin"
                ? "bg-primary text-on-primary"
                : "bg-surface-container border border-outline-variant text-on-surface-variant hover:bg-surface-bright"
            }`}
          >
            Admin
          </button>
          <button
            onClick={() => setActiveRoleFilter("guard")}
            className={`px-4 py-1.5 rounded-full font-semibold transition-all cursor-pointer ${
              activeRoleFilter === "guard"
                ? "bg-primary text-on-primary"
                : "bg-surface-container border border-outline-variant text-on-surface-variant hover:bg-surface-bright"
            }`}
          >
            Guard
          </button>
          <button
            onClick={() => setActiveRoleFilter("professor")}
            className={`px-4 py-1.5 rounded-full font-semibold transition-all cursor-pointer ${
              activeRoleFilter === "professor"
                ? "bg-primary text-on-primary"
                : "bg-surface-container border border-outline-variant text-on-surface-variant hover:bg-surface-bright"
            }`}
          >
            Professor
          </button>
        </div>
      </section>

      {/* User cards catalog grid container */}
      <section className="flex-1 overflow-y-auto custom-scrollbar">
        {filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-on-surface-variant bg-surface-container/20 rounded-xl border border-dashed border-white/5">
            <span className="material-symbols-outlined text-4xl mb-2 text-outline">group_off</span>
            <p className="text-xs">No personnel matched current filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-20">
            {filteredUsers.map((user) => {
              const isActive = user.status === "active";

              let roleBadgeColor = "bg-secondary-container text-on-secondary-container";
              if (user.role === "admin") {
                roleBadgeColor = "bg-primary-container text-on-primary-container";
              } else if (user.role === "professor") {
                roleBadgeColor = "bg-tertiary-container text-[#ffede6]";
              }

              return (
                <div
                  key={user.id}
                  className={`glass-panel rounded-xl p-5 relative overflow-hidden group hover:border-primary/20 transition-all duration-300 ${
                    isActive ? "opacity-100" : "opacity-70 h-auto"
                  }`}
                >
                  {/* Status Indicator Bar */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${isActive ? "bg-status-available" : "bg-outline-variant"}`}></div>

                  <div className="flex justify-between items-start mb-3.5">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className={`w-11 h-11 rounded-full overflow-hidden border border-outline-variant/60 ${isActive ? "" : "grayscale"}`}>
                        <img alt={user.name} className="w-full h-full object-cover" src={user.avatar} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-on-surface text-sm leading-tight">{user.name}</h3>
                        <div
                          onClick={() => onToggleUserStatus(user.id)}
                          className="flex items-center gap-1.5 mt-1 cursor-pointer hover:bg-white/5 px-1.5 py-0.5 rounded"
                          title="Click to toggle active status"
                        >
                          <span className={`w-2 h-2 rounded-full ${isActive ? "bg-status-available animate-pulse" : "bg-outline-variant"}`}></span>
                          <span className={`font-label-mono text-[9px] uppercase ${isActive ? "text-status-available" : "text-outline"}`}>
                            {user.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick remove operator button */}
                    <button
                      onClick={() => onDeleteUser(user.id)}
                      className="text-[#ffb4ab] hover:text-red-500 hover:bg-[#93000a]/30 p-1.5 rounded-full transition-colors cursor-pointer"
                      title="Remove Operator profile"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                  </div>

                  {/* Profile data list */}
                  <div className="space-y-2.5 text-xs">
                    <div>
                      <span className={`${roleBadgeColor} px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider`}>
                        {user.role}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-on-surface-variant">
                      <span className="material-symbols-outlined text-sm text-outline">mail</span>
                      <span className="truncate max-w-xs">{user.email}</span>
                    </div>

                    <div className="flex items-center gap-2 text-on-surface-variant">
                      <span className="material-symbols-outlined text-xs text-outline">directions_car</span>
                      <span className="font-label-mono text-[10px] bg-surface-container-highest px-2 py-0.5 rounded tracking-tighter shrink-0 select-all font-bold text-white">
                        {user.plate}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Floating Action Button (FAB) (+) to trigger dynamic creation modal */}
      <button
        onClick={() => setShowAddUserModal(true)}
        className="fixed bottom-24 right-8 w-14 h-14 rounded-full bg-primary text-on-primary shadow-xl hover:scale-105 active:scale-95 transition-transform flex items-center justify-center cursor-pointer z-40 shadow-primary/20"
      >
        <span className="material-symbols-outlined text-2xl font-bold">add</span>
      </button>

      {/* modal: Add New User */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/85 backdrop-blur-sm">
          <div className="bg-[#16202f] w-full max-w-sm rounded-2xl border border-white/10 shadow-3xl p-6">
            <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-4">
              <h2 className="text-md font-bold text-white font-sans">Create Operator Profile</h2>
              <button onClick={() => setShowAddUserModal(false)} className="p-1 hover:bg-white/5 rounded-full text-on-surface-variant cursor-pointer">
                <span className="material-symbols-outlined scale-75">close</span>
              </button>
            </div>

            <form onSubmit={submitNewUser} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-label-mono text-on-surface-variant mb-1 uppercase">FULL NAME</label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full bg-[#091422] border border-white/10 p-2.5 rounded-lg text-xs text-on-surface outline-none focus:ring-1 focus:ring-primary"
                  placeholder="e.g. Julian Vance"
                />
              </div>

              <div>
                <label className="block text-[10px] font-label-mono text-on-surface-variant mb-1 uppercase">EMAIL ADDRESS</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full bg-[#091422] border border-white/10 p-2.5 rounded-lg text-xs text-on-surface outline-none"
                  placeholder="e.g. j.vance@university.edu"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-label-mono text-on-surface-variant mb-1 uppercase">ROLE</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as any)}
                    className="w-full bg-[#091422] border border-white/10 p-2.5 rounded-lg text-[11px] text-on-surface outline-none"
                  >
                    <option value="admin">Administrator</option>
                    <option value="guard">Security Guard</option>
                    <option value="professor">Professor User</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-label-mono text-on-surface-variant mb-1 uppercase">VEHICLE PLATE</label>
                  <input
                    type="text"
                    value={newUserPlate}
                    onChange={(e) => setNewUserPlate(e.target.value)}
                    className="w-full bg-[#091422] border border-white/10 p-2.5 rounded-lg text-xs font-mono uppercase text-on-surface outline-none"
                    placeholder="e.g. ABC-1234"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-label-mono text-on-surface-variant mb-1 uppercase">STARTUP STATUS</label>
                <select
                  value={newUserStatus}
                  onChange={(e) => setNewUserStatus(e.target.value as any)}
                  className="w-full bg-[#091422] border border-white/10 p-2.5 rounded-lg text-xs text-on-surface outline-none"
                >
                  <option value="active">Active (Conectado)</option>
                  <option value="offline">Offline (Ausente)</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="flex-1 py-2 border border-white/10 rounded-xl hover:bg-white/5 font-label-mono font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-primary text-on-primary font-bold rounded-xl hover:brightness-110 font-label-mono uppercase tracking-wider cursor-pointer"
                >
                  Add operator
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
