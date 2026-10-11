import { useState, useRef } from 'react';

export default function ProfileSetupModal({ isOpen, userRole, email, onComplete }) {
  const [fullName, setFullName] = useState('');
  const [uniqueId, setUniqueId] = useState(''); // Enrollment or Emp ID
  const [phoneNo, setPhoneNo] = useState('');
  const [profilePic, setProfilePic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  // Image upload with compression to Base64
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be under 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setProfilePic(reader.result);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName || !uniqueId || !phoneNo || !profilePic) {
      setError('All fields including Profile Photo are strictly mandatory.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save-profile',
          email,
          role: userRole,
          profileData: { fullName, uniqueId, phoneNo, profilePic }
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to initialize profile.');

      setIsSuccess(true);
      setTimeout(() => {
        onComplete(data.profile);
      }, 2200);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
      <div className="relative w-full max-w-lg bg-[#0c0d14] border border-blue-500/30 rounded-3xl p-8 shadow-[0_0_50px_rgba(59,130,246,0.15)]">

        {isSuccess ? (
          <div className="py-12 text-center space-y-4">
            <div className="w-24 h-24 bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 rounded-full flex items-center justify-center text-5xl mx-auto animate-bounce shadow-[0_0_40px_rgba(16,185,129,0.4)]">
              ✓
            </div>
            <h3 className="text-3xl font-black text-white tracking-tight">Identity Established!</h3>
            <p className="text-sm text-slate-300">Profile synchronized securely with NeonDB vault. Launching command console...</p>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <span className="text-[11px] font-mono uppercase bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full font-bold">
                Mandatory Clearance Required
              </span>
              <h2 className="text-2xl font-black text-white mt-3">
                {userRole === 'admin' ? 'Admin Identity Setup' : 'Student Identity Setup'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">Complete your profile to proceed into your ecosystem.</p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-semibold">
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Profile Photo Upload */}
              <div className="flex flex-col items-center justify-center mb-4">
                <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-blue-500/40 bg-black flex items-center justify-center shadow-lg">
                  {profilePic ? (
                    <img src={profilePic} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl text-slate-600">👤</span>
                  )}
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept="image/*" 
                  onChange={handleImageUpload} 
                  className="hidden" 
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 text-xs font-semibold text-blue-400 hover:text-blue-300 underline underline-offset-4"
                >
                  {profilePic ? 'Change Photo' : 'Upload Profile Photo'}
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Full Name</label>
                <input 
                  type="text" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. John Doe"
                  required
                  className="w-full bg-black border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                  {userRole === 'admin' ? 'Employee ID (Unique)' : 'Enrollment Number (Unique)'}
                </label>
                <input 
                  type="text" 
                  value={uniqueId}
                  onChange={(e) => setUniqueId(e.target.value)}
                  placeholder={userRole === 'admin' ? 'EMP-90214' : 'ENR202684910'}
                  required
                  className="w-full bg-black border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Contact Phone</label>
                <input 
                  type="tel" 
                  value={phoneNo}
                  onChange={(e) => setPhoneNo(e.target.value)}
                  placeholder="+91 98765 43210"
                  required
                  className="w-full bg-black border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-900/30 disabled:opacity-50"
              >
                {loading ? 'Verifying & Saving...' : 'Save & Enter Dashboard'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
