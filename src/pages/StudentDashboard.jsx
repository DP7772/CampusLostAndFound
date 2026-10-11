import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardNavbar from '../components/DashboardNavbar';
import ProfileSetupModal from '../components/ProfileSetupModal';
import ReportLostModal from '../components/ReportLostModal';
import ClaimItemModal from '../components/ClaimItemModal';

export default function StudentDashboard() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isSetupNeeded, setIsSetupNeeded] = useState(false);
  const [loading, setLoading] = useState(true);

  // Feed State
  const [feedItems, setFeedItems] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [availableLocations, setAvailableLocations] = useState([]);
  
  // Dynamic Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedLocation, setSelectedLocation] = useState('ALL');
  const [selectedDate, setSelectedDate] = useState('');

  // Modals
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [claimTargetItem, setClaimTargetItem] = useState(null);

  const navigate = useNavigate();

  // Load Feed Data
  const fetchFeed = (userEmail) => {
    fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get-feed', payload: { userEmail } })
    })
      .then((res) => res.json())
      .then((data) => {
        setFeedItems(data.items || []);
        setAvailableCategories(data.categories || []);
        setAvailableLocations(data.locations || []);
      })
      .catch((err) => console.error('Error fetching registry feed:', err));
  };

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

    // Profile Existence Check
    fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get-profile', email: parsed.email, role: 'student' })
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
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));

    fetchFeed(parsed.email);
  }, [navigate]);

  // Dynamic Filtering Logic
  const filteredItems = useMemo(() => {
    return feedItems.filter((item) => {
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.tracking_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
      const matchesLocation = selectedLocation === 'ALL' || item.location === selectedLocation;
      const matchesDate = !selectedDate || item.lost_date.startsWith(selectedDate);

      return matchesSearch && matchesCategory && matchesLocation && matchesDate;
    });
  }, [feedItems, searchQuery, selectedCategory, selectedLocation, selectedDate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 font-mono text-xs">Connecting to Lost & Found Registry...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#06070a] text-slate-200">
      <DashboardNavbar profile={profile} role="student" />

      <ProfileSetupModal 
        isOpen={isSetupNeeded} 
        userRole="student" 
        email={user?.email} 
        onComplete={(newProfile) => {
          setProfile(newProfile);
          setIsSetupNeeded(false);
        }} 
      />

      <ReportLostModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        userEmail={user?.email}
        onSuccess={() => fetchFeed(user?.email)}
      />

      <ClaimItemModal
        isOpen={!!claimTargetItem}
        onClose={() => setClaimTargetItem(null)}
        item={claimTargetItem}
        userEmail={user?.email}
        onSuccess={() => fetchFeed(user?.email)}
      />

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8">
        
        {/* Banner with Broadcast CTA */}
        <div className="p-8 rounded-3xl bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-purple-950/20 border border-blue-500/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <span className="text-[10px] font-mono uppercase bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full font-bold">
              Student Command Network
            </span>
            <h1 className="text-3xl font-black text-white mt-2">Campus Recovery Grid</h1>
            <p className="text-slate-400 text-xs mt-1 max-w-xl">
              Browse lost reports across college zones. Verify ownership with physical proofs to initiate authority transfer.
            </p>
          </div>
          <button
            onClick={() => setIsReportModalOpen(true)}
            className="px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-blue-600/30 flex items-center gap-2 whitespace-nowrap"
          >
            <span>+</span> Report Lost Asset
          </button>
        </div>

        {/* Dynamic Filter Strip */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-2xl bg-[#0a0b12] border border-white/5">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search title, tracking ID, notes..."
            className="w-full bg-black border border-white/10 text-white rounded-xl px-4 py-2.5 text-xs focus:border-blue-500 focus:outline-none"
          />

          {/* Dynamic Categories */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full bg-black border border-white/10 text-slate-300 rounded-xl px-4 py-2.5 text-xs focus:border-blue-500 focus:outline-none"
          >
            <option value="ALL">All Categories ({availableCategories.length})</option>
            {availableCategories.map((cat, i) => (
              <option key={i} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Dynamic Locations */}
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="w-full bg-black border border-white/10 text-slate-300 rounded-xl px-4 py-2.5 text-xs focus:border-blue-500 focus:outline-none"
          >
            <option value="ALL">All Campus Zones ({availableLocations.length})</option>
            {availableLocations.map((loc, i) => (
              <option key={i} value={loc}>{loc}</option>
            ))}
          </select>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full bg-black border border-white/10 text-slate-300 rounded-xl px-4 py-2.5 text-xs focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Modern Grid Feed (YouTube / Instagram format) */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-20 bg-[#0a0b12]/50 border border-white/5 rounded-3xl">
            <span className="text-4xl">📡</span>
            <h3 className="text-lg font-bold text-white mt-3">No Misplaced Assets Reported Under Selected Filters</h3>
            <p className="text-xs text-slate-500 mt-1">Try resetting the search terms or change zones.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <div 
                key={item.id} 
                className="bg-[#0b0d14] border border-white/10 rounded-2xl overflow-hidden shadow-xl hover:border-blue-500/40 transition-all flex flex-col group"
              >
                {/* Image Banner */}
                <div className="relative h-56 bg-black overflow-hidden">
                  <img 
                    src={item.item_pic} 
                    alt={item.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                  />
                  
                  {/* Tracking ID Badge */}
                  <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full text-[10px] font-mono font-bold text-blue-400">
                    {item.tracking_id}
                  </div>

                  {/* Status Badge */}
                  <div className="absolute top-3 right-3">
                    {item.status === 'available' && (
                      <span className="bg-emerald-500/80 backdrop-blur-md text-white text-[10px] px-2.5 py-1 rounded-full font-bold">
                        OPEN
                      </span>
                    )}
                    {item.status === 'claim_pending' && (
                      <span className="bg-amber-500/80 backdrop-blur-md text-white text-[10px] px-2.5 py-1 rounded-full font-bold animate-pulse">
                        PENDING CLAIM
                      </span>
                    )}
                    {item.status === 'resolved' && (
                      <span className="bg-purple-500/80 backdrop-blur-md text-white text-[10px] px-2.5 py-1 rounded-full font-bold">
                        HANDOVER COMPLETE
                      </span>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-bold text-white text-base leading-tight group-hover:text-blue-400 transition-colors">
                        {item.title}
                      </h3>
                      <span className="text-[10px] font-mono text-slate-400 border border-white/10 px-2 py-0.5 rounded-md uppercase">
                        {item.category}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 mt-2 line-clamp-2">
                      {item.description || 'No extra descriptive marks provided.'}
                    </p>

                    <div className="mt-4 pt-3 border-t border-white/5 space-y-1.5 text-[11px] text-slate-400">
                      <div className="flex justify-between">
                        <span>📍 Location:</span>
                        <span className="text-white font-medium">{item.location}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>🕒 Logged:</span>
                        <span className="font-mono text-slate-300">{item.lost_date} at {item.lost_time}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action / Claim Button */}
                  <div className="pt-2">
                    {item.has_user_claimed ? (
                      <div className="w-full py-2.5 rounded-xl text-center text-xs font-mono font-bold border border-amber-500/30 bg-amber-500/10 text-amber-400">
                        ✓ CLAIM SUBMITTED ({item.user_claim_status?.toUpperCase()})
                      </div>
                    ) : item.status === 'resolved' ? (
                      <div className="w-full py-2.5 rounded-xl text-center text-xs font-mono font-bold border border-purple-500/30 bg-purple-500/10 text-purple-400">
                        CASE CLOSED BY ADMIN
                      </div>
                    ) : (
                      <button
                        onClick={() => setClaimTargetItem(item)}
                        className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-blue-900/30"
                      >
                        Claim This Item
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
