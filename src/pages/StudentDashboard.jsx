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

  // Tab State: 'active' vs 'resolved'
  const [activeTab, setActiveTab] = useState('active');

  // Feed Data
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
  const [previewImage, setPreviewImage] = useState(null);

  const navigate = useNavigate();

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

  // Split items into Active vs Resolved
  const filteredItems = useMemo(() => {
    return feedItems.filter((item) => {
      // Tab check
      if (activeTab === 'active' && item.status === 'resolved') return false;
      if (activeTab === 'resolved' && item.status !== 'resolved') return false;

      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.tracking_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
      const matchesLocation = selectedLocation === 'ALL' || item.location === selectedLocation;
      const matchesDate = !selectedDate || item.lost_date.startsWith(selectedDate);

      return matchesSearch && matchesCategory && matchesLocation && matchesDate;
    });
  }, [feedItems, activeTab, searchQuery, selectedCategory, selectedLocation, selectedDate]);

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

      {/* 🔍 Lightbox Preview */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
          onClick={() => setPreviewImage(null)}
        >
          <div 
            className="relative max-w-4xl max-h-[90vh] bg-[#0c0d15] border border-white/20 rounded-3xl p-3 shadow-2xl flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-4 -right-4 bg-black border border-white/20 text-white rounded-full p-2.5 hover:bg-white/10 hover:rotate-90 transition-all z-10 shadow-lg"
            >
              ✕
            </button>
            <div className="w-full max-h-[75vh] flex items-center justify-center overflow-hidden rounded-2xl bg-black">
              <img src={previewImage.item_pic} alt={previewImage.title} className="max-h-[75vh] w-auto max-w-full object-contain" />
            </div>
            <div className="w-full mt-3 px-4 py-2 bg-white/5 rounded-2xl flex items-center justify-between text-xs">
              <div>
                <h4 className="font-bold text-white text-sm">{previewImage.title}</h4>
                <p className="text-slate-400 text-[11px] font-mono mt-0.5">ID: {previewImage.tracking_id} • {previewImage.location}</p>
              </div>
              <span className="text-[10px] font-mono uppercase bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full font-bold">
                {previewImage.category}
              </span>
            </div>
          </div>
        </div>
      )}

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

        {/* Tab Switcher: Live Active Feed vs Resolved Archive */}
        <div className="flex border-b border-white/10 gap-6">
          <button
            onClick={() => setActiveTab('active')}
            className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'active' 
                ? 'border-blue-500 text-blue-400' 
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <span>📡 Live Active Registry</span>
            <span className="text-[10px] bg-blue-500/20 px-2 py-0.5 rounded-full font-mono">
              {feedItems.filter(i => i.status !== 'resolved').length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('resolved')}
            className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'resolved' 
                ? 'border-purple-500 text-purple-400' 
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <span>🔒 Closed & Recovered Archive</span>
            <span className="text-[10px] bg-purple-500/20 px-2 py-0.5 rounded-full font-mono">
              {feedItems.filter(i => i.status === 'resolved').length}
            </span>
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

        {/* Feed Cards */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-20 bg-[#0a0b12]/50 border border-white/5 rounded-3xl">
            <span className="text-4xl">{activeTab === 'active' ? '📡' : '🔒'}</span>
            <h3 className="text-lg font-bold text-white mt-3">
              {activeTab === 'active' ? 'No Active Misplaced Items' : 'No Resolved Recoveries Archived Yet'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">Try resetting search filters.</p>
          </div>
        ) : activeTab === 'active' ? (
          /* 1. Live Active Registry Cards */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <div 
                key={item.id} 
                className="bg-[#0b0d14] border border-white/10 rounded-2xl overflow-hidden shadow-xl hover:border-blue-500/40 transition-all flex flex-col group"
              >
                <div 
                  className="relative h-56 bg-black overflow-hidden cursor-pointer"
                  onClick={() => setPreviewImage(item)}
                >
                  <img src={item.item_pic} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="bg-black/70 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-full border border-white/20 font-medium">
                      🔍 Click to Zoom
                    </span>
                  </div>
                  <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full text-[10px] font-mono font-bold text-blue-400">
                    {item.tracking_id}
                  </div>
                  <div className="absolute top-3 right-3">
                    {item.status === 'available' ? (
                      <span className="bg-emerald-500/80 backdrop-blur-md text-white text-[10px] px-2.5 py-1 rounded-full font-bold">OPEN</span>
                    ) : (
                      <span className="bg-amber-500/80 backdrop-blur-md text-white text-[10px] px-2.5 py-1 rounded-full font-bold animate-pulse">PENDING CLAIM</span>
                    )}
                  </div>
                </div>

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
                    <p className="text-xs text-slate-400 mt-2 line-clamp-2">{item.description || 'No extra notes provided.'}</p>
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

                  <div className="pt-2">
                    {item.has_user_claimed ? (
                      <div className="w-full py-2.5 rounded-xl text-center text-xs font-mono font-bold border border-amber-500/30 bg-amber-500/10 text-amber-400">
                        ✓ CLAIM SUBMITTED ({item.user_claim_status?.toUpperCase()})
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
        ) : (
          /* 2. Closed / Recovered Archive (Split View: Report vs Claimant) */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredItems.map((item) => (
              <div 
                key={item.id}
                className="bg-[#0b0c14] border border-purple-500/30 rounded-3xl p-6 shadow-2xl space-y-5"
              >
                <div className="flex justify-between items-center pb-3 border-b border-white/10">
                  <div>
                    <span className="text-[10px] font-mono uppercase bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full font-bold">
                      Case Closed & Handed Over
                    </span>
                    <h3 className="text-lg font-bold text-white mt-1.5">{item.title}</h3>
                  </div>
                  <span className="text-xs font-mono text-slate-400">ID: {item.tracking_id}</span>
                </div>

                {/* Two-Split Showcase: Reported Asset (Left) vs Verified Claimant Proof (Right) */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Left: Original Lost Photo */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Original Misplaced Asset</p>
                    <div 
                      className="h-44 rounded-2xl bg-black overflow-hidden border border-white/10 cursor-pointer"
                      onClick={() => setPreviewImage(item)}
                    >
                      <img src={item.item_pic} alt="Lost Asset" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono">Lost at: {item.location}</p>
                  </div>

                  {/* Right: Verified Claimant Proof */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">Ownership Proof / Claim</p>
                    <div 
                      className="h-44 rounded-2xl bg-black overflow-hidden border border-purple-500/30 cursor-pointer"
                      onClick={() => setPreviewImage({ item_pic: item.approved_claimant_proof, title: `Proof: ${item.title}`, tracking_id: item.tracking_id, location: item.location, category: item.category })}
                    >
                      <img src={item.approved_claimant_proof} alt="Claimant Proof" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                    </div>
                    <p className="text-[10px] text-emerald-400 font-mono font-bold">✓ Verified by Authority</p>
                  </div>
                </div>

                {/* Permanent Claimant Audit Strip */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between text-xs">
                  <div>
                    <p className="text-slate-400 text-[11px]">Handed in by:</p>
                    <p className="font-bold text-white text-sm">{item.approved_claimant_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-400 text-[11px]">Enrollment Number:</p>
                    <p className="font-mono text-purple-300 font-bold">{item.approved_claimant_enrollment}</p>
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
