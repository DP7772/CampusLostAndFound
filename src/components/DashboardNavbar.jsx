import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function DashboardNavbar({ profile, role }) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const prevCountRef = useRef(0);
  const audioCtxRef = useRef(null);
  const profileRef = useRef(null);
  const notifRef = useRef(null);
  const navigate = useNavigate();

  // 🔔 Reliable Sci-Fi Chime Sound
  const playChime = () => {
    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtxClass) return;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtxClass();
      }

      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880.00, ctx.currentTime + 0.12); // A5

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
      console.warn('Audio feedback blocked by autoplay policy:', e);
    }
  };

  // 🔄 Notification Fetcher & Polling
  const loadNotifications = async () => {
    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get-notifications' })
      });
      const data = await res.json();
      const list = data.notifications || [];

      // Pehli baar load hua aur database mein unread items hain
      if (prevCountRef.current === 0 && list.length > 0) {
        setUnreadCount(list.length);
      } 
      // Background poll ke dauran nayi notification aayi
      else if (list.length > prevCountRef.current) {
        const diff = list.length - prevCountRef.current;
        setUnreadCount((prev) => prev + diff);
        playChime();
      }

      prevCountRef.current = list.length;
      setNotifications(list);
    } catch (err) {
      console.error('Notification sync failed:', err);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 6000); // Poll every 6 seconds
    return () => clearInterval(interval);
  }, []);

  // 🖱️ Click Outside Handlers
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  return (
    <nav className="w-full bg-[#07080c]/90 backdrop-blur-md border-b border-white/10 sticky top-0 z-40 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Brand / Logo */}
        <div 
          className="flex items-center gap-3 cursor-pointer select-none" 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 font-black text-white">
            Ω
          </div>
          <span className="font-bold tracking-tight text-lg text-white">
            CAMPUS <span className="text-blue-500">L&F</span>
          </span>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-5">
          
          {/* 🔔 Notification Bell Alert */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => {
                setShowNotifMenu(!showNotifMenu);
                setShowProfileMenu(false);
                setUnreadCount(0); // Click karne par badge clear ho jayega
              }}
              className={`relative p-2.5 rounded-xl border transition-all cursor-pointer ${
                unreadCount > 0 
                  ? 'bg-red-500/20 border-red-500 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse' 
                  : 'bg-white/5 hover:bg-white/10 border-white/5 text-slate-300 hover:text-white'
              }`}
              title="Notifications"
            >
              🔔
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg border border-black">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Drawer Dropdown */}
            {showNotifMenu && (
              <div className="absolute right-0 mt-3 w-80 md:w-96 bg-[#0e0f17] border border-white/10 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in duration-200">
                <div className="flex justify-between items-center pb-3 border-b border-white/5">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Campus Broadcast Feed</h4>
                  <span className="text-[10px] text-blue-400 font-mono">Live Sync</span>
                </div>
                
                <div className="mt-3 space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-4">No active broadcasts found.</p>
                  ) : (
                    notifications.map((n, i) => (
                      <div 
                        key={i} 
                        className={`p-3 rounded-xl border text-xs transition-all ${
                          n.title && n.title.includes('Resolved') 
                            ? 'bg-purple-950/20 border-purple-500/30' 
                            : 'bg-blue-950/20 border-blue-500/20'
                        }`}
                      >
                        <p className="font-bold text-white flex items-center justify-between">
                          <span>{n.title}</span>
                        </p>
                        <p className="text-slate-300 text-[11px] mt-1 leading-relaxed">{n.message}</p>
                        <span className="text-[9px] text-slate-500 font-mono mt-1.5 block">
  {n.created_at || 'Just now'}
</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Avatar & Dropdown */}
          <div className="relative" ref={profileRef}>
            <button 
              onClick={() => {
                setShowProfileMenu(!showProfileMenu);
                setShowNotifMenu(false);
              }}
              className="flex items-center gap-3 p-1 rounded-full border border-white/10 hover:border-blue-500/50 transition-all bg-white/5 cursor-pointer"
            >
              <img 
                src={profile?.profile_pic || 'https://api.dicebear.com/7.x/identicon/svg?seed=user'} 
                alt="Avatar" 
                className="w-9 h-9 rounded-full object-cover" 
              />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-3 w-72 bg-[#0d0e15] border border-white/10 rounded-3xl shadow-2xl p-5 z-50 animate-in fade-in duration-200">
                <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                  <img 
                    src={profile?.profile_pic || 'https://api.dicebear.com/7.x/identicon/svg?seed=user'} 
                    alt="Avatar" 
                    className="w-12 h-12 rounded-2xl object-cover border border-white/10" 
                  />
                  <div>
                    <h4 className="text-sm font-bold text-white leading-tight">{profile?.full_name || 'Verified User'}</h4>
                    <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-md font-bold mt-1 inline-block ${role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                      {role}
                    </span>
                  </div>
                </div>

                <div className="py-3 space-y-2 text-xs text-slate-400">
                  <div className="flex justify-between">
                    <span>{role === 'admin' ? 'Staff ID:' : 'Enrollment:'}</span>
                    <span className="font-mono text-white">{profile?.emp_id || profile?.enrollment_no || 'Verified'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Phone:</span>
                    <span className="text-white">{profile?.phone_no || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Email:</span>
                    <span className="text-slate-300 truncate max-w-[130px]">{profile?.email}</span>
                  </div>
                </div>

                <button 
                  onClick={handleLogout}
                  className="w-full mt-3 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold rounded-xl text-xs border border-red-500/20 transition-all cursor-pointer"
                >
                  Terminate Session (Logout)
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </nav>
  );
}
