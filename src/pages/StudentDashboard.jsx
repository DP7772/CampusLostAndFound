import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function StudentDashboard() {
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
    if (parsed.role !== 'student') {
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
      <header className="max-w-6xl mx-auto flex justify-between items-center pb-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-white">
            S
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Student Recovery Hub</h1>
            <p className="text-xs text-slate-400">{user.email}</p>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="px-4 py-2 bg-white/5 hover:bg-red-500/20 text-slate-300 hover:text-red-400 rounded-xl border border-white/10 transition-colors text-sm font-semibold"
        >
          Logout
        </button>
      </header>

      {/* Main Section */}
      <main className="max-w-6xl mx-auto py-10 space-y-8">
        <div className="p-8 rounded-3xl bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border border-blue-500/20">
          <span className="text-xs font-mono uppercase bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full font-bold">
            Authenticated Clearance: Student
          </span>
          <h2 className="text-3xl font-black text-white mt-4">Welcome, {user.name}</h2>
          <p className="text-slate-400 mt-2 text-sm max-w-xl">
            You can report misplaced assets, check automated recovery matching, and upload verifiable proofs of ownership.
          </p>
        </div>

        {/* Action Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-6 bg-[#0a0a0f] border border-white/5 rounded-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">📦 Report a Lost Item</h3>
            <p className="text-sm text-slate-400">Submit metadata, location last seen, and distinguishing tags.</p>
            <button className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-blue-900/30">
              Submit Report
            </button>
          </div>

          <div className="p-6 bg-[#0a0a0f] border border-white/5 rounded-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">🔍 Browse Registry</h3>
            <p className="text-sm text-slate-400">View campus-wide catalogued recoveries awaiting claimant confirmation.</p>
            <button className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-sm transition-all">
              Search Catalog
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
