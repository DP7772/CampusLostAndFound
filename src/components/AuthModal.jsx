import { useState, useEffect } from "react";

export default function AuthModal({ isOpen, type, onClose }) {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!\%*?&]{8,}$/;

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setEmail("");
      setOtp("");
      setPassword("");
      setError("");
      setSuccessMsg("");
    }
  }, [isOpen, type]);

  if (!isOpen) return null;

  // --- Real API: Send OTP ---
  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send-otp", email }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to send OTP");

      setSuccessMsg("Branded OTP sent to your email! (Valid for 5 mins)");
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Real API: Verify OTP ---
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (otp.length < 6) {
      setError("Please enter the 6-digit OTP.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify-otp", email, otp }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Invalid OTP");

      setSuccessMsg("Email verified successfully!");
      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Real API: Complete Signup & Hash Password ---
  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    if (!passwordRegex.test(password)) {
      setError(
        "Password must be 8+ chars, 1 uppercase, 1 lowercase, 1 number & 1 special symbol.",
      );
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete-signup", email, password }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Signup failed");

      alert(
        "Signup Successful! Your account has been securely created in NeonDB.",
      );
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Real API: Login (Student & Admin) ---
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!emailRegex.test(email) || !password) {
      setError("Please fill in all required fields.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const portalType = type === "admin-login" ? "admin" : "student";
      const res = await fetch("/api/auth-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, portalType }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Login failed");

      // Save Token & User Session
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      alert(`Login Successful! Welcome back, ${data.user.name}`);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="absolute inset-0" onClick={onClose}></div>

      <div className="relative w-full max-w-md bg-[#0a0a0f] border border-white/10 rounded-3xl shadow-2xl p-8 z-10">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full p-2 transition-all duration-300 hover:rotate-90"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M6 18L18 6M6 6l12 12"
            ></path>
          </svg>
        </button>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white mb-1">
            {type === "student-signup"
              ? "Create Account"
              : type === "student-login"
                ? "Student Login"
                : "Admin Access"}
          </h2>
          <p className="text-xs text-slate-400">
            Campus Lost & Found Secure Portal
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-medium">
            ⚠️ {error}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-medium">
            ✓ {successMsg}
          </div>
        )}

        <div>
          {type === "student-signup" && (
            <>
              {step === 1 && (
                <form onSubmit={handleSendOTP} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                      College Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@campus.edu"
                      required
                      className="w-full bg-black border border-white/10 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50"
                  >
                    {loading ? "Sending Branded OTP..." : "Verify Email"}
                  </button>
                </form>
              )}

              {step === 2 && (
                <form onSubmit={handleVerifyOTP} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                      Enter 6-Digit OTP
                    </label>
                    <input
                      type="text"
                      maxLength="6"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="123456"
                      required
                      className="w-full bg-black border border-white/10 text-white text-center tracking-widest font-mono rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50"
                  >
                    {loading ? "Verifying..." : "Confirm OTP"}
                  </button>
                </form>
              )}

              {step === 3 && (
                <form onSubmit={handleSignupSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full bg-black border border-white/10 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      8+ chars, 1 upper, 1 lower, 1 number, 1 symbol.
                    </p>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50"
                  >
                    {loading ? "Securing & Saving..." : "Complete Signup"}
                  </button>
                </form>
              )}
            </>
          )}

          {(type === "student-login" || type === "admin-login") && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@campus.edu"
                  required
                  className="w-full bg-black border border-white/10 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-black border border-white/10 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 ${type === "admin-login" ? "bg-purple-600 hover:bg-purple-500" : "bg-blue-600 hover:bg-blue-500"}`}
              >
                {loading ? "Authenticating..." : "Login"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
