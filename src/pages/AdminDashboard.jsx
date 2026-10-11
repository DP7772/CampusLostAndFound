import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardNavbar from '../components/DashboardNavbar';
import ProfileSetupModal from '../components/ProfileSetupModal';

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isSetupNeeded, setIsSetupNeeded] = useState(false);
  const [loading, setLoading] = useState(true);

  // Feed & Tabs
  const [feedItems, setFeedItems] = useState([]);
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'resolved'
  const [searchQuery, setSearchQuery] = useState('');

  // 🎬 YouTube Theater Modal States
  const [selectedTheaterItem, setSelectedTheaterItem] = useState(null);
  const [itemClaims, setItemClaims] = useState([]);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [zoomedProof, setZoomedProof] = useState(null);

  // 👤 User Provisioning Modal
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'student',
    phone: '',
    identifier: ''
  });
  const [createUserLoading, setCreateUserLoading] = useState(false);
  const [createUserMsg, setCreateUserMsg] = useState('');

  const navigate = useNavigate();

  // Load Feed Data
  const fetchFeed = () => {
    fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get-feed', payload: {} })
    })
      .then((res) => res.json())
      .then((data) => setFeedItems(data.items || []))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (!token || !storedUser) {
      navigate('/');
      return;
    }

    const parsed = JSON.parse(storedUser);
    if (parsed.role !== 'admin') {
      navigate('/student-dashboard');
      return;
    }
    setUser(parsed);

    // Profile check
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
      .finally(() => setLoading(false));

    fetchFeed();
  }, [navigate]);

  // Load claims for selected item in Theater mode
  const openTheater = (item) => {
    setSelectedTheaterItem(item);
    setClaimsLoading(true);
    fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get-item-claims', payload: { itemId: item.id } })
    })
      .then((res) => res.json())
      .then((data) => setItemClaims(data.claims || []))
      .catch((err) => console.error(err))
      .finally(() => setClaimsLoading(false));
  };

  // Process Claim (Approve or Reject)
  const handleClaimDecision = async (claimId, decision) => {
    if (!confirm(`Are you sure you want to ${decision.toUpperCase()} this claim?`)) return;

    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'admin-process-claim',
          payload: { claimId, itemId: selectedTheaterItem.id, decision }
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Success: ${data.message}`);
        fetchFeed();
        if (decision === 'approve') {
          setSelectedTheaterItem(null); // Close theater on case closed
        } else {
          // Re-fetch claims after rejecting
          openTheater(selectedTheaterItem);
        }
      } else {
        alert(data.error || 'Operation failed');
      }
    } catch (e) {
      alert('Network error occurred.');
    }
  };

  // Direct User Creation
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreateUserLoading(true);
    setCreateUserMsg('');

    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'admin-create-user', payload: newUserForm })
      });
      const data = await res.json();
      if (data.success) {
        setCreateUserMsg(`✅ ${data.message}`);
        setNewUserForm({ fullName: '', email: '', password: '', role: 'student', phone: '', identifier: '' });
      } else {
        setCreateUserMsg(`❌ ${data.error || 'Failed to register'}`);
      }
    } catch (err) {
      setCreateUserMsg('❌ Server request failed');
    } finally {
      setCreateUserLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    return feedItems.filter((item) => {
      if (activeTab === 'active' && item.status === 'resolved') return false;
      if (activeTab === 'resolved' && item.status !== 'resolved') return false;

      return (
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tracking_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [feedItems, activeTab, searchQuery]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#06070a] text-slate-200">
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

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8">
        {/* Admin Header Banner */}
        <div className="p-8 rounded-3xl bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-blue-950/20 border border-purple-500/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <span className="text-[10px] font-mono uppercase bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full font-bold">
              Central Administration Node
            </span>
            <h1 className="text-3xl font-black text-white mt-2">Authority Claim Console</h1>
            <p className="text-slate-400 text-xs mt-1 max-w-xl">
              Inspect reported items, cross-examine ownership claims in Theater View, and grant verified handovers.
            </p>
          </div>

          <button
            onClick={() => {
              setIsCreateUserModalOpen(true);
              setCreateUserMsg('');
            }}
            className="px-6 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-2xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-purple-600/30 flex items-center gap-2 cursor-pointer"
          >
            <span>+</span> Provision User (No OTP)
          </button>
        </div>

        {/* Tab Controls & Search */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 pb-2 border-b border-white/10">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('active')}
              className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'active' ? 'border-purple-500 text-purple-400' : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <span>📡 Open Inquiries</span>
              <span className="text-[10px] bg-purple-500/20 px-2 py-0.5 rounded-full font-mono">
                {feedItems.filter((i) => i.status !== 'resolved').length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('resolved')}
              className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'resolved' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <span>🔒 Verified & Handed Over</span>
              <span className="text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded-full font-mono">
                {feedItems.filter((i) => i.status === 'resolved').length}
              </span>
            </button>
          </div>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tracking ID, item title, zones..."
            className="w-full md:w-80 bg-black border border-white/10 text-white rounded-xl px-4 py-2 text-xs focus:border-purple-500 focus:outline-none"
          />
        </div>

        {/* Feed Cards Grid */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-20 bg-[#0a0b12]/50 border border-white/5 rounded-3xl">
            <span className="text-4xl">📂</span>
            <h3 className="text-lg font-bold text-white mt-3">No Records Under Current Scope</h3>
            <p className="text-xs text-slate-500 mt-1">Items will appear here once students submit reports.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                onClick={() => openTheater(item)}
                className="bg-[#0b0d14] border border-white/10 hover:border-purple-500/60 rounded-2xl overflow-hidden shadow-xl transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-52 bg-black overflow-hidden">
                    <img
                      src={item.item_pic}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full text-[10px] font-mono font-bold text-purple-400">
                      {item.tracking_id}
                    </div>
                    <div className="absolute top-3 right-3">
                      {item.status === 'resolved' ? (
                        <span className="bg-emerald-500/80 backdrop-blur-md text-white text-[10px] px-2.5 py-1 rounded-full font-bold">
                          CLOSED
                        </span>
                      ) : item.status === 'claim_pending' ? (
                        <span className="bg-amber-500/80 backdrop-blur-md text-white text-[10px] px-2.5 py-1 rounded-full font-bold animate-pulse">
                          CLAIMS ATTACHED
                        </span>
                      ) : (
                        <span className="bg-blue-500/80 backdrop-blur-md text-white text-[10px] px-2.5 py-1 rounded-full font-bold">
                          AVAILABLE
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-5 space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-bold text-white text-base leading-tight group-hover:text-purple-400 transition-colors">
                        {item.title}
                      </h3>
                      <span className="text-[10px] font-mono text-slate-400 border border-white/10 px-2 py-0.5 rounded-md uppercase">
                        {item.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2">{item.description || 'No additional notes logged.'}</p>
                    <div className="pt-2 text-[11px] text-slate-400 space-y-1">
                      <p>📍 Location: <span className="text-slate-200">{item.location}</span></p>
                      <p>🕒 Logged: <span className="text-slate-200">{item.lost_date}</span></p>
                    </div>
                  </div>
                </div>

                <div className="px-5 pb-5 pt-2 border-t border-white/5">
                  <span className="text-xs font-bold text-purple-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    Inspect in Theater View →
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 🎬 YOUTUBE-STYLE SPLIT THEATER MODAL */}
      {selectedTheaterItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/90 backdrop-blur-2xl animate-in fade-in duration-200"
          onClick={() => setSelectedTheaterItem(null)}
        >
          <div
            className="relative w-full max-w-7xl h-[92vh] bg-[#0c0d16] border border-white/20 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Close Button */}
            <button
              onClick={() => setSelectedTheaterItem(null)}
              className="absolute top-4 right-4 z-20 bg-black/80 hover:bg-white/20 text-white p-2.5 rounded-full border border-white/20 transition-all cursor-pointer"
            >
              ✕
            </button>

            {/* LEFT 65%: MAIN PLAYER AREA (Reported Item Visual & Coordinates) */}
            <div className="w-full md:w-[62%] h-full p-6 md:p-8 flex flex-col justify-between overflow-y-auto border-b md:border-b-0 md:border-r border-white/10">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono uppercase bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full font-bold">
                    Case Asset Theater
                  </span>
                  <span className="text-xs font-mono text-slate-400">ID: {selectedTheaterItem.tracking_id}</span>
                </div>

                {/* Theater Main Frame */}
                <div className="w-full h-72 md:h-96 rounded-2xl bg-black border border-white/10 overflow-hidden flex items-center justify-center relative shadow-inner">
                  <img
                    src={selectedTheaterItem.item_pic}
                    alt={selectedTheaterItem.title}
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur-md px-3 py-1 rounded-xl text-xs font-mono text-purple-300 border border-white/10">
                    Category: {selectedTheaterItem.category}
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-black text-white">{selectedTheaterItem.title}</h2>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed bg-white/5 p-4 rounded-xl border border-white/5">
                    {selectedTheaterItem.description || 'No descriptive marks logged by reporter.'}
                  </p>
                </div>
              </div>

              {/* Status Ribbon */}
              <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <p className="text-slate-500 text-[10px] uppercase font-bold">Zone / Location</p>
                  <p className="font-bold text-white mt-0.5">{selectedTheaterItem.location}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-[10px] uppercase font-bold">Date Logged</p>
                  <p className="font-mono text-slate-200 mt-0.5">{selectedTheaterItem.lost_date}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-[10px] uppercase font-bold">Time</p>
                  <p className="font-mono text-slate-200 mt-0.5">{selectedTheaterItem.lost_time || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-[10px] uppercase font-bold">Current Status</p>
                  <p className="font-bold text-purple-400 uppercase mt-0.5">{selectedTheaterItem.status}</p>
                </div>
              </div>
            </div>

            {/* RIGHT 35%: YOUTUBE PLAYLIST STYLE CLAIMANT STREAM */}
            <div className="w-full md:w-[38%] h-full bg-[#080910] p-6 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center pb-4 border-b border-white/10">
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Claims Playlist</h3>
                    <p className="text-[11px] text-slate-400">Competing verified student submissions</p>
                  </div>
                  <span className="text-xs font-mono bg-purple-500/20 text-purple-400 px-2.5 py-1 rounded-full font-bold">
                    {itemClaims.length} Claims
                  </span>
                </div>

                {/* Playlist Scroll Container */}
                <div className="mt-4 space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
                  {claimsLoading ? (
                    <div className="text-center py-12">
                      <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                      <p className="text-xs text-slate-500 mt-2 font-mono">Syncing claims...</p>
                    </div>
                  ) : itemClaims.length === 0 ? (
                    <div className="text-center py-16 bg-white/5 rounded-2xl border border-white/5 p-6">
                      <span className="text-3xl">📭</span>
                      <p className="text-xs font-bold text-white mt-2">No Claims Filed Yet</p>
                      <p className="text-[11px] text-slate-400 mt-1">This asset has not been contested by any student.</p>
                    </div>
                  ) : (
                    itemClaims.map((claim) => (
                      <div
                        key={claim.id}
                        className={`p-4 rounded-2xl border transition-all space-y-3 ${
                          claim.status === 'approved'
                            ? 'bg-emerald-950/20 border-emerald-500/40'
                            : claim.status === 'rejected'
                            ? 'bg-red-950/10 border-red-500/20 opacity-60'
                            : 'bg-white/5 border-white/10 hover:border-purple-500/30'
                        }`}
                      >
                        {/* Claimant Card Header */}
                        <div className="flex gap-3 items-center">
                          <img
                            src={claim.proof_pic || 'https://via.placeholder.com/80'}
                            alt="Proof Visual"
                            onClick={() => setZoomedProof(claim.proof_pic)}
                            className="w-16 h-16 rounded-xl object-cover border border-white/20 cursor-pointer hover:scale-105 transition-transform shrink-0"
                            title="Click to Zoom Proof"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-white truncate">{claim.full_name}</h4>
                            <p className="text-[11px] font-mono text-purple-300">Enr: {claim.enrollment_no}</p>
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">{claim.submitted_time}</p>
                          </div>
                        </div>

                        {/* Claim Metadata */}
                        <div className="bg-black/50 p-2.5 rounded-xl border border-white/5 text-[11px] space-y-1">
                          <p className="text-slate-400">
                            Identifier: <span className="text-white font-mono">{claim.unique_identifier || 'None'}</span>
                          </p>
                          <p className="text-slate-400 line-clamp-2">
                            Description: <span className="text-slate-300">{claim.claim_description}</span>
                          </p>
                        </div>

                        {/* Action Buttons: Cross Red (Reject) / Green Tick (Approve) */}
                        {claim.status === 'pending' && selectedTheaterItem.status !== 'resolved' && (
                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={() => handleClaimDecision(claim.id, 'reject')}
                              className="flex-1 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                            >
                              <span>✕</span> Reject
                            </button>
                            <button
                              onClick={() => handleClaimDecision(claim.id, 'approve')}
                              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-900/40 cursor-pointer"
                            >
                              <span>✓</span> Approve
                            </button>
                          </div>
                        )}

                        {claim.status === 'approved' && (
                          <div className="text-center py-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 rounded-lg">
                            ✓ VERIFIED & HANDED OVER
                          </div>
                        )}

                        {claim.status === 'rejected' && (
                          <div className="text-center py-1 text-xs font-bold text-red-400 bg-red-500/10 rounded-lg">
                            ✕ CLAIM REJECTED
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🔍 CLAIMANT PROOF HIGH-RES LIGHTBOX */}
      {zoomedProof && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl"
          onClick={() => setZoomedProof(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] bg-[#0c0d15] border border-white/20 rounded-3xl p-3 flex flex-col items-center">
            <button
              onClick={() => setZoomedProof(null)}
              className="absolute -top-3 -right-3 bg-black border border-white/20 text-white rounded-full p-2.5 hover:rotate-90 transition-all cursor-pointer"
            >
              ✕
            </button>
            <img src={zoomedProof} alt="Proof Enlarged" className="max-h-[80vh] w-auto max-w-full rounded-2xl object-contain" />
            <p className="text-xs font-mono text-slate-400 mt-2">Claimant Physical Ownership Proof</p>
          </div>
        </div>
      )}

      {/* 👤 PROVISION USER MODAL (NO OTP) */}
      {isCreateUserModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          onClick={() => setIsCreateUserModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-[#0e0f18] border border-white/20 rounded-3xl p-6 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white">Direct Member Provisioning</h3>
              <button
                onClick={() => setIsCreateUserModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Full Legal Name</label>
                <input
                  type="text"
                  required
                  value={newUserForm.fullName}
                  onChange={(e) => setNewUserForm({ ...newUserForm, fullName: e.target.value })}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={newUserForm.email}
                    onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                    placeholder="user@college.edu"
                    className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Assign Password</label>
                  <input
                    type="password"
                    required
                    value={newUserForm.password}
                    onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                    placeholder="Minimum 6 chars"
                    className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">System Role</label>
                  <select
                    value={newUserForm.role}
                    onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                    className="w-full bg-black border border-white/10 rounded-xl px-3 py-2.5 text-white focus:border-purple-500 focus:outline-none"
                  >
                    <option value="student">Student</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">
                    {newUserForm.role === 'admin' ? 'Employee ID' : 'Enrollment No.'}
                  </label>
                  <input
                    type="text"
                    required
                    value={newUserForm.identifier}
                    onChange={(e) => setNewUserForm({ ...newUserForm, identifier: e.target.value })}
                    placeholder={newUserForm.role === 'admin' ? 'EMP-9021' : '210200107000'}
                    className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Mobile Contact</label>
                <input
                  type="tel"
                  required
                  value={newUserForm.phone}
                  onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value })}
                  placeholder="+91 9876543210"
                  className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              {createUserMsg && (
                <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-xs font-mono">
                  {createUserMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={createUserLoading}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
              >
                {createUserLoading ? 'Provisioning Account...' : 'Register Member Instantly'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
