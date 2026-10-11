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

    fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get-profile', email: parsed.email, role: 'admin' })
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.isSetup) {
          setIsSetupNeeded(true);
        } else {
          setProfile(data.profile);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [navigate]);

  if (loading) {
    return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-purple-500 font-mono">Verifying Root Key...</div>;
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
          <h2 className="text-3xl font-black text-white">Authority Console: {profile?.full_name || user?.name}</h2>
          <p className="text-slate-400 mt-2 text-sm max-w-xl">
            Employee ID: <span className="font-mono text-purple-400">{profile?.emp_id}</span>. Audit vault items and process physical claims.
          </p>
        </div>
      </main>
    </div>
  );
}
