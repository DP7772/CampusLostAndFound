import { useState, useRef } from 'react';

export default function ClaimItemModal({ isOpen, onClose, item, userEmail, onSuccess }) {
  const [proofPic, setProofPic] = useState('');
  const [uniqueIdentifier, setUniqueIdentifier] = useState('');
  const [claimDescription, setClaimDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fileInputRef = useRef(null);

  if (!isOpen || !item) return null;

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('Proof photo must be under 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setProofPic(canvas.toDataURL('image/jpeg', 0.8));
        setError('');
      };
    };
    reader.readAsDataURL(file);
  };

  const handleClaimSubmit = async (e) => {
    e.preventDefault();
    if (!proofPic || !uniqueIdentifier) {
      setError('Proof photo and a unique ownership identifier are required.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'claim-item',
          payload: {
            email: userEmail,
            itemId: item.id,
            trackingId: item.tracking_id,
            proofPic,
            uniqueIdentifier,
            claimDescription
          }
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit claim.');

      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#0c0d14] border border-emerald-500/30 rounded-3xl p-6 md:p-8 text-slate-200">
        
        <button 
          onClick={onClose} 
          className="absolute top-5 right-5 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full p-2 transition-transform hover:rotate-90"
        >
          ✕
        </button>

        <div className="mb-6">
          <span className="text-[10px] font-mono uppercase bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full font-bold">
            Ownership Protocol
          </span>
          <h2 className="text-2xl font-black text-white mt-2">Assert Claim Ownership</h2>
          <p className="text-xs text-slate-400 font-mono">
            Target Item ID: <span className="text-blue-400">{item.tracking_id}</span> ({item.title})
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-semibold">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleClaimSubmit} className="space-y-4">
          {/* Proof Photo Upload */}
          <div 
            className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 hover:border-emerald-500/50 rounded-2xl p-4 bg-black/40 cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            {proofPic ? (
              <img src={proofPic} alt="Proof Preview" className="h-36 w-full object-cover rounded-xl" />
            ) : (
              <div className="text-center py-4">
                <span className="text-3xl">🧾</span>
                <p className="text-xs text-slate-400 mt-2 font-semibold">Upload Photo Proof (Invoice, Old Photo with item, Box)</p>
                <p className="text-[10px] text-slate-600">Max 2MB</p>
              </div>
            )}
            <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageUpload} className="hidden" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
              Unique Identification / Serial / Secret Mark
            </label>
            <input
              type="text"
              value={uniqueIdentifier}
              onChange={(e) => setUniqueIdentifier(e.target.value)}
              placeholder="e.g. Serial #DL89410 or Scratch on power button"
              required
              className="w-full bg-black border border-white/10 text-white rounded-xl px-4 py-2.5 text-xs font-mono focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Supporting Description</label>
            <textarea
              rows="2"
              value={claimDescription}
              onChange={(e) => setClaimDescription(e.target.value)}
              placeholder="Provide exact details of item contents or purchase records..."
              className="w-full bg-black border border-white/10 text-white rounded-xl px-4 py-2.5 text-xs focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-900/30 text-xs uppercase tracking-wider disabled:opacity-50"
          >
            {loading ? 'Submitting Claim...' : 'Dispatch Claim to Authority Desk'}
          </button>
        </form>
      </div>
    </div>
  );
}
