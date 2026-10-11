import { useState, useRef } from 'react';

export default function ReportLostModal({ isOpen, onClose, userEmail, onSuccess }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [lostDate, setLostDate] = useState('');
  const [lostTime, setLostTime] = useState('');
  const [description, setDescription] = useState('');
  const [itemPic, setItemPic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('Item image must be under 2MB.');
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
        setItemPic(canvas.toDataURL('image/jpeg', 0.8));
        setError('');
      };
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !category || !location || !lostDate || !lostTime || !itemPic) {
      setError('All marked details and an item photo are required.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'report-item',
          payload: {
            email: userEmail,
            title,
            category: category.trim().toUpperCase(),
            location: location.trim(),
            lostDate,
            lostTime,
            description,
            itemPic
          }
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit report');

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
      <div className="relative w-full max-w-xl bg-[#0b0c13] border border-blue-500/30 rounded-3xl shadow-2xl p-6 md:p-8 my-8 text-slate-200">
        
        <button 
          onClick={onClose} 
          className="absolute top-5 right-5 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full p-2 transition-transform hover:rotate-90"
        >
          ✕
        </button>

        <div className="mb-6">
          <span className="text-[10px] font-mono uppercase bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full font-bold">
            Catalog Broadcast
          </span>
          <h2 className="text-2xl font-black text-white mt-2">Broadcast Lost Asset</h2>
          <p className="text-xs text-slate-400">Post details to the global campus feed for verification and claimant matching.</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-semibold">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Photo Uploader */}
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 hover:border-blue-500/50 rounded-2xl p-4 bg-black/40 cursor-pointer"
               onClick={() => fileInputRef.current?.click()}>
            {itemPic ? (
              <img src={itemPic} alt="Item Preview" className="h-44 w-full object-cover rounded-xl" />
            ) : (
              <div className="text-center py-6">
                <span className="text-3xl">📷</span>
                <p className="text-xs text-slate-400 mt-2 font-semibold">Click to upload clear photograph of the asset</p>
                <p className="text-[10px] text-slate-600">JPEG/PNG under 2MB</p>
              </div>
            )}
            <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageUpload} className="hidden" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Asset Name / Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Dell XPS Laptop, Casio Watch"
                required
                className="w-full bg-black border border-white/10 text-white rounded-xl px-4 py-2.5 text-xs focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Category</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="ELECTRONICS, DOCUMENTS, KEYS"
                required
                className="w-full bg-black border border-white/10 text-white rounded-xl px-4 py-2.5 text-xs uppercase focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Location Lost</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Library 2nd Floor, Canteen"
                required
                className="w-full bg-black border border-white/10 text-white rounded-xl px-4 py-2.5 text-xs focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Date Misplaced</label>
              <input
                type="date"
                value={lostDate}
                onChange={(e) => setLostDate(e.target.value)}
                required
                className="w-full bg-black border border-white/10 text-white rounded-xl px-4 py-2.5 text-xs focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Approx. Time</label>
              <input
                type="time"
                value={lostTime}
                onChange={(e) => setLostTime(e.target.value)}
                required
                className="w-full bg-black border border-white/10 text-white rounded-xl px-4 py-2.5 text-xs focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Identifying Notes / Marks</label>
            <textarea
              rows="2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Black sleeve case with small sticker on the corner..."
              className="w-full bg-black border border-white/10 text-white rounded-xl px-4 py-2.5 text-xs focus:border-blue-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-900/30 text-xs uppercase tracking-wider disabled:opacity-50"
          >
            {loading ? 'Transmitting Broadcast...' : 'Broadcast to Registry'}
          </button>
        </form>
      </div>
    </div>
  );
}
