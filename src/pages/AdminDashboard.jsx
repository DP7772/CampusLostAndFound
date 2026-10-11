import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardNavbar from '../components/DashboardNavbar';
import ProfileSetupModal from '../components/ProfileSetupModal';

export default function AdminDashboard() {
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
    if (parsed.role !== 'admin') {
      navigate('/');
      return;
    }
    setUser(parsed);

    // NeonDB check for Admin
    fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get-profile', email: parsed.email, role: 'admin' })
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.isSetup && data.profile) {
          setProfile(data.profile);
          setIsSetupNeeded(false);
        } else {
          setIsSetupNeeded(true);
        }
      })
      .catch((err) => {
        console.error('Admin profile fetch error:', err);
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 font-mono text-xs">Verifying Administrator Token...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200">
      <DashboardNavbar profile={profile} role="admin" />

      <ProfileSetupModal 
        isOpen={isSetupNeeded} 
        userRole="admin" 
        email={user?.email} 
        onComplete={(newProfile) => {
          setProfile(newProfile);
          setIsSetupNeeded(false);
        }} 
      />

      <main className="max-w-6xl mx-auto p-8 space-y-8">
        <div className="p-8 rounded-3xl bg-gradient-to-r from-purple-900/20 to-indigo-900/20 border border-purple-500/20">
          <span className="text-[10px] font-mono uppercase bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full font-bold">
            Root Authority Console
          </span>
          <h2 className="text-3xl font-black text-white mt-4">Welcome, Authority Officer {profile?.full_name || user?.name}</h2>
          <p className="text-slate-400 mt-2 text-sm max-w-xl">
            Staff ID: <span className="font-mono text-purple-400 font-semibold">{profile?.emp_id}</span> • Phone: <span className="text-slate-300">{profile?.phone_no}</span>
          </p>
        </div>
      </main>
    </div>
  );
}
