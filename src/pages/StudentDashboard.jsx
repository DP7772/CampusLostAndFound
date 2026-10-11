import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardNavbar from '../components/DashboardNavbar';
import ProfileSetupModal from '../components/ProfileSetupModal';

export default function StudentDashboard() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isSetupNeeded, setIsSetupNeeded] = useState(false);
  const [loading, setLoading] = useState(true);
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

    // NeonDB se check karega ki is email ka profile already maujood hai ya nahi
    fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get-profile', email: parsed.email, role: 'student' })
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.isSetup && data.profile) {
          // Table me email mil gayi -> Direct profile load, NO SETUP POPUP
          setProfile(data.profile);
          setIsSetupNeeded(false);
        } else {
          // Table me email nahi mili -> Pehli baar setup dikhayega
          setIsSetupNeeded(true);
        }
      })
      .catch((err) => {
        console.error('Profile fetch error:', err);
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 font-mono text-xs">Authenticating Vault Credentials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200">
      <DashboardNavbar profile={profile} role="student" />

      {/* Sirf tabhi pop-up khulega agar DB mein profile null ho */}
      <ProfileSetupModal 
        isOpen={isSetupNeeded} 
        userRole="student" 
        email={user?.email} 
        onComplete={(newProfile) => {
          setProfile(newProfile);
          setIsSetupNeeded(false);
        }} 
      />

      <main className="max-w-6xl mx-auto p-8 space-y-8">
        <div className="p-8 rounded-3xl bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border border-blue-500/20">
          <span className="text-[10px] font-mono uppercase bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full font-bold">
            Verified Student Hub
          </span>
          <h2 className="text-3xl font-black text-white mt-4">Welcome, {profile?.full_name || user?.name}</h2>
          <p className="text-slate-400 mt-2 text-sm max-w-xl">
            Enrollment No: <span className="font-mono text-blue-400 font-semibold">{profile?.enrollment_no}</span> • Phone: <span className="text-slate-300">{profile?.phone_no}</span>
          </p>
        </div>

        {/* Dashboard Items */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-6 bg-[#0a0a0f] border border-white/5 rounded-2xl space-y-3">
            <h3 className="text-lg font-bold text-white">📦 Report Lost Item</h3>
            <p className="text-xs text-slate-400">Post details of an item you lost inside the college campus.</p>
          </div>
          <div className="p-6 bg-[#0a0a0f] border border-white/5 rounded-2xl space-y-3">
            <h3 className="text-lg font-bold text-white">🔍 Claim Found Item</h3>
            <p className="text-xs text-slate-400">Browse campus registry items and verify identity to claim.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
