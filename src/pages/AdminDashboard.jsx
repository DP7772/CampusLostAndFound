import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (!token || !storedUser) {
      navigate('/');
      return;
    }

    const parsed = JSON.parse(storedUser);
    if (parsed.role !== 'admin') {
      navigate('/');
      return;
    }
    setUser(parsed);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 font-sans p-8">
      {/* Top Bar */}
      <header className="max-w-6xl mx-auto flex justify-between items-center pb-6 border-b border-purple-500/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center font-black text-white shadow-lg shadow-purple-900/40">
            A
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Authority Command Console</h1>
            <p className="text-xs text-purple-400 font-mono tracking-wide">{user.email} (SEC-CLEARANCE)</p>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="px-4 py-2 bg-white/5 hover:bg-red-500/20 text-slate-300 hover:text-red-400 rounded-xl border border-white/10 transition-colors text-sm font-semibold"
        >
          Logout Console
        </button>
      </header>

      {/* Main Section */}
      <main className="max-w-6xl mx-auto py-10 space-y-8">
        <div className="p-8 rounded-3xl bg-gradient-to-r from-purple-900/20 to-indigo-900/20 border border-purple-500/30">
          <span className="text-xs font-mono uppercase bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full font-bold">
            Administrative Root Session Active
          </span>
          <h2 className="text-3xl font-black text-white mt-4">Welcome, Authority Officer {user.name}</h2>
          <p className="text-slate-400 mt-2 text-sm max-w-xl">
            You hold permission to review physical claims, dispatch item handoffs, and audit system telemetries.
          </p>
        </div>

        {/* Audit Metrics */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="p-6 bg-[#0a0a0f] border border-purple-500/20 rounded-2xl">
            <p className="text-xs font-mono text-purple-400 uppercase">Pending Verifications</p>
            <p className="text-4xl font-black text-white mt-2">12</p>
          </div>
          <div className="p-6 bg-[#0a0a0f] border border-white/5 rounded-2xl">
            <p className="text-xs font-mono text-emerald-400 uppercase">Resolved Handoffs</p>
            <p className="text-4xl font-black text-white mt-2">48</p>
          </div>
          <div className="p-6 bg-[#0a0a0f] border border-white/5 rounded-2xl">
            <p className="text-xs font-mono text-blue-400 uppercase">Live Vault Assets</p>
            <p className="text-4xl font-black text-white mt-2">19</p>
          </div>
        </div>
      </main>
    </div>
  );
}
