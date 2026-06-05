import { useState, useEffect } from "react";

interface DatabaseTables {
  profiles: Array<{ id: number; full_name: string; role: string; created_at: string }>;
  vehicles: Array<{ id: number; professor_id: number; plate: string; is_authorized: boolean }>;
  parking_spaces: Array<{ id: number; label: string; status: "LIBRE" | "RESERVADO" | "OCUPADO" | "MANTENIMIENTO"; updated_at: string }>;
  vip_reservations: Array<{ id: number; parking_space_id: number; reservation_date: string; description: string; created_by: number }>;
  parking_log: Array<{ id: number; parking_space_id: number; plate: string; professor_id: number | null; check_in: string; check_out: string | null; registered_by: number }>;
  user_device_tokens: Array<{ id: number; user_id: number; device_token: string; updated_at: string }>;
}

export default function DatabaseInspector() {
  const [dbData, setDbData] = useState<DatabaseTables | null>(null);
  const [activeTab, setActiveTab] = useState<keyof DatabaseTables>("parking_spaces");
  const [isCollapsed, setIsCollapsed] = useState(false);

  const fetchDbTables = async () => {
    try {
      const res = await fetch("/api/db-tables");
      if (res.ok) {
        const data = await res.json();
        setDbData(data);
      }
    } catch (err) {
      console.error("Error fetching database tables:", err);
    }
  };

  useEffect(() => {
    fetchDbTables();
    const interval = setInterval(fetchDbTables, 2000);
    return () => clearInterval(interval);
  }, []);

  if (isCollapsed) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsCollapsed(false)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold py-2.5 px-4 rounded-xl shadow-2xl flex items-center gap-2 border border-emerald-400/20 active:scale-95 transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-sm animate-pulse">database</span>
          <span>Ver Base de Datos (PostgreSQL Sim)</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#0c141f] border border-emerald-500/20 rounded-2xl p-4 flex flex-col h-[400px] shadow-2xl overflow-hidden font-mono text-xs shrink-0 select-none">
      <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <h3 className="font-bold text-emerald-400 flex items-center gap-1.5 uppercase text-xs tracking-wider">
            <span className="material-symbols-outlined text-sm">database</span>
            PostgreSQL Schema Inspector (Live State)
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchDbTables}
            className="p-1.5 hover:bg-white/5 rounded-lg text-[#8d90a0] hover:text-emerald-400 active:scale-95 transition-all"
            title="Refresh tables"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
          </button>
          <button
            onClick={() => setIsCollapsed(true)}
            className="bg-white/5 hover:bg-white/10 text-[#8d90a0] text-[10px] font-bold py-1 px-2.5 rounded-lg cursor-pointer"
          >
            Minimizar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 mb-3 shrink-0">
        {(["parking_spaces", "profiles", "vehicles", "vip_reservations", "parking_log", "user_device_tokens"] as Array<keyof DatabaseTables>).map((tab) => {
          const count = dbData ? dbData[tab]?.length || 0 : 0;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-tight transition-all cursor-pointer ${
                activeTab === tab
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-black"
                  : "bg-white/5 text-[#8d90a0] border border-transparent hover:text-white hover:bg-white/10"
              }`}
            >
              db_{tab} ({count})
            </button>
          );
        })}
      </div>

      {/* Table grid viewer */}
      <div className="flex-1 overflow-auto border border-white/5 rounded-xl custom-scrollbar bg-[#060b11]">
        {!dbData ? (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-2"></div>
            <p className="text-[#8d90a0] text-[11px]">Conectando con esquemas PostgreSQL...</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse min-w-max text-[11px]">
            <thead className="bg-[#0e1620] text-emerald-400 sticky top-0 border-b border-white/10">
              <tr>
                {activeTab === "parking_spaces" && (
                  <>
                    <th className="p-2.5 font-bold">id (serial)</th>
                    <th className="p-2.5 font-bold">label (varchar)</th>
                    <th className="p-2.5 font-bold">status (varchar)</th>
                    <th className="p-2.5 font-bold">updated_at (timestamp)</th>
                  </>
                )}
                {activeTab === "profiles" && (
                  <>
                    <th className="p-2.5 font-bold">id (serial)</th>
                    <th className="p-2.5 font-bold">full_name (varchar)</th>
                    <th className="p-2.5 font-bold">role (varchar)</th>
                    <th className="p-2.5 font-bold">created_at (timestamp)</th>
                  </>
                )}
                {activeTab === "vehicles" && (
                  <>
                    <th className="p-2.5 font-bold">id (serial)</th>
                    <th className="p-2.5 font-bold">professor_id (int)</th>
                    <th className="p-2.5 font-bold">plate (varchar)</th>
                    <th className="p-2.5 font-bold">is_authorized (bool)</th>
                  </>
                )}
                {activeTab === "vip_reservations" && (
                  <>
                    <th className="p-2.5 font-bold">id (serial)</th>
                    <th className="p-2.5 font-bold">parking_space_id (int)</th>
                    <th className="p-2.5 font-bold">reservation_date (date)</th>
                    <th className="p-2.5 font-bold">description (text)</th>
                    <th className="p-2.5 font-bold">created_by (int)</th>
                  </>
                )}
                {activeTab === "parking_log" && (
                  <>
                    <th className="p-2.5 font-bold">id (serial)</th>
                    <th className="p-2.5 font-bold">parking_space_id (int)</th>
                    <th className="p-2.5 font-bold">plate (varchar)</th>
                    <th className="p-2.5 font-bold">professor_id (int)</th>
                    <th className="p-2.5 font-bold">check_in (timestamp)</th>
                    <th className="p-2.5 font-bold">check_out (timestamp)</th>
                    <th className="p-2.5 font-bold">registered_by (int)</th>
                  </>
                )}
                {activeTab === "user_device_tokens" && (
                  <>
                    <th className="p-2.5 font-bold">id (serial)</th>
                    <th className="p-2.5 font-bold">user_id (int)</th>
                    <th className="p-2.5 font-bold">device_token (varchar)</th>
                    <th className="p-2.5 font-bold">updated_at (timestamp)</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-[#c3c6d7]">
              {activeTab === "parking_spaces" &&
                dbData.parking_spaces.map((row) => (
                  <tr key={row.id} className="hover:bg-emerald-500/5 transition-colors">
                    <td className="p-2.5 font-semibold text-emerald-400">{row.id}</td>
                    <td className="p-2.5 text-white font-bold">{row.label}</td>
                    <td className="p-2.5">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          row.status === "LIBRE"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : row.status === "OCUPADO"
                            ? "bg-amber-500/10 text-amber-400"
                            : row.status === "RESERVADO"
                            ? "bg-indigo-500/10 text-indigo-400"
                            : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="p-2.5 text-[10px] text-[#8d90a0]">{row.updated_at}</td>
                  </tr>
                ))}

              {activeTab === "profiles" &&
                dbData.profiles.map((row) => (
                  <tr key={row.id} className="hover:bg-emerald-500/5 transition-colors">
                    <td className="p-2.5 font-semibold text-emerald-400">{row.id}</td>
                    <td className="p-2.5 text-white font-bold">{row.full_name}</td>
                    <td className="p-2.5 uppercase tracking-wider text-[10px] text-[#cbbeff]">{row.role}</td>
                    <td className="p-2.5 text-[10px] text-[#8d90a0]">{row.created_at}</td>
                  </tr>
                ))}

              {activeTab === "vehicles" &&
                dbData.vehicles.map((row) => (
                  <tr key={row.id} className="hover:bg-emerald-500/5 transition-colors">
                    <td className="p-2.5 font-semibold text-emerald-400">{row.id}</td>
                    <td className="p-2.5 text-[#cbbeff]">prof_id_{row.professor_id}</td>
                    <td className="p-2.5 text-white font-bold tracking-wider">{row.plate}</td>
                    <td className="p-2.5">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          row.is_authorized
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        {row.is_authorized ? "true" : "false"}
                      </span>
                    </td>
                  </tr>
                ))}

              {activeTab === "vip_reservations" &&
                dbData.vip_reservations.map((row) => (
                  <tr key={row.id} className="hover:bg-emerald-500/5 transition-colors">
                    <td className="p-2.5 font-semibold text-emerald-400">{row.id}</td>
                    <td className="p-2.5">space_id_{row.parking_space_id}</td>
                    <td className="p-2.5 text-[#baa9ff]">{row.reservation_date}</td>
                    <td className="p-2.5 text-white">{row.description}</td>
                    <td className="p-2.5 text-[#8d90a0]">Created by Guard {row.created_by}</td>
                  </tr>
                ))}

              {activeTab === "parking_log" &&
                dbData.parking_log.map((row) => (
                  <tr key={row.id} className="hover:bg-emerald-500/5 transition-colors">
                    <td className="p-2.5 font-semibold text-emerald-400">{row.id}</td>
                    <td className="p-2.5">space_id_{row.parking_space_id}</td>
                    <td className="p-2.5 text-white font-bold">{row.plate}</td>
                    <td className="p-2.5 text-[#baa9ff]">{row.professor_id ? `prof_${row.professor_id}` : "null"}</td>
                    <td className="p-2.5 text-[10px] text-emerald-400">{row.check_in}</td>
                    <td className="p-2.5 text-[10px] text-amber-400">{row.check_out || <span className="text-[#8d90a0] italic">active (null)</span>}</td>
                    <td className="p-2.5 text-[10px] text-[#8d90a0]">guard_id_{row.registered_by}</td>
                  </tr>
                ))}

              {activeTab === "user_device_tokens" &&
                dbData.user_device_tokens.map((row) => (
                  <tr key={row.id} className="hover:bg-emerald-500/5 transition-colors">
                    <td className="p-2.5 font-semibold text-emerald-400">{row.id}</td>
                    <td className="p-2.5">user_id_{row.user_id}</td>
                    <td className="p-2.5 text-[#baa9ff] select-all truncate max-w-xs" title={row.device_token}>{row.device_token}</td>
                    <td className="p-2.5 text-[10px] text-[#8d90a0]">{row.updated_at}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
