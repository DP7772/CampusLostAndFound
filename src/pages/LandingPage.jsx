import { useState, useEffect, useRef } from "react";
import AuthModal from "../components/AuthModal";

function SpotlightCard({ children, className, glowColor }) {
  const divRef = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      className={`relative overflow-hidden ${className}`}
    >
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-500"
        style={{
          opacity,
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, ${glowColor}, transparent 40%)`,
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export default function LandingPage() {
  const [animStep, setAnimStep] = useState(0);

  // Modal State
  const [modalData, setModalData] = useState({ isOpen: false, type: null });

  useEffect(() => {
    const t1 = setTimeout(() => setAnimStep(1), 100);
    const t2 = setTimeout(() => setAnimStep(2), 1000);
    const t3 = setTimeout(() => setAnimStep(3), 2800);
    const t4 = setTimeout(() => setAnimStep(4), 3400);
    const t5 = setTimeout(() => setAnimStep(5), 4200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, []);

  const handleLogoClick = (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
    setAnimStep(0);
    setTimeout(() => setAnimStep(1), 100);
    setTimeout(() => setAnimStep(2), 1000);
    setTimeout(() => setAnimStep(3), 2800);
    setTimeout(() => setAnimStep(4), 3400);
    setTimeout(() => setAnimStep(5), 4200);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 font-sans selection:bg-blue-900 selection:text-white overflow-x-hidden">
      {/* 🚀 ULTIMATE UNIVERSE & CAMERA ANIMATIONS */}
      <style>{`
        @keyframes space-travel {
          0% { background-position: 0 0; }
          100% { background-position: -500px 500px; }
        }
        .universe-bg {
          background-image: 
            radial-gradient(2px 2px at 40px 60px, #ffffff, transparent),
            radial-gradient(2px 2px at 150px 250px, #ffffff, transparent),
            radial-gradient(2.5px 2.5px at 300px 100px, rgba(150, 200, 255, 0.9), transparent),
            radial-gradient(1.5px 1.5px at 80px 300px, #ffffff, transparent),
            radial-gradient(2px 2px at 400px 350px, rgba(200, 150, 255, 0.9), transparent),
            radial-gradient(1.5px 1.5px at 200px 50px, #ffffff, transparent);
          background-size: 450px 450px;
          animation: space-travel 25s linear infinite;
        }

        @keyframes slowPan {
          0% { transform: scale(1.1) translate(0%, 0%); }
          50% { transform: scale(1.15) translate(-3%, 3%); }
          100% { transform: scale(1.1) translate(0%, 0%); }
        }

        @keyframes shooting-star {
          0% { transform: translate(-100px, -100px) scale(1); opacity: 0; }
          10% { opacity: 1; }
          25% { transform: translate(600px, 600px) scale(0.5); opacity: 0; }
          100% { transform: translate(600px, 600px); opacity: 0; }
        }
        .comet {
          position: absolute;
          width: 4px;
          height: 4px;
          background: #fff;
          border-radius: 50%;
          box-shadow: 0 0 20px 4px rgba(255,255,255,0.9), -15px -15px 20px 2px rgba(59, 130, 246, 0.7);
          animation: shooting-star 7s infinite;
        }
        .comet-delay { animation-delay: 3.5s; top: -10%; left: 30%; }
      `}</style>

      {/* --- Splash Screen --- */}
      {animStep < 5 && (
        <div
          className={`fixed inset-0 z-[100] flex items-center justify-center bg-[#050505] transition-opacity duration-1000 ${animStep === 4 ? "opacity-0 pointer-events-none" : "opacity-100"}`}
        >
          <div className="relative flex flex-col items-center">
            <div
              className={`w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center shadow-[0_0_50px_rgba(37,99,235,0.35)] transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)]
                ${animStep === 0 ? "-translate-y-[50vh] opacity-0 scale-50" : ""} 
                ${animStep > 0 && animStep < 4 ? "translate-y-0 opacity-100 scale-100 animate-pulse" : ""}
                ${animStep === 4 ? "-translate-x-[42vw] -translate-y-[45vh] scale-[0.4] opacity-100" : ""}
              `}
            >
              <span className="text-white font-black text-5xl">C</span>
            </div>
            <div className="absolute top-32 overflow-hidden h-16 flex items-center justify-center w-80">
              <h1
                className={`text-2xl font-black text-white tracking-widest transition-all duration-700 ease-out
                  ${animStep < 2 ? "-translate-x-full opacity-0" : ""}
                  ${animStep === 2 ? "translate-x-0 opacity-100" : ""}
                  ${animStep >= 3 ? "translate-x-full opacity-0" : ""}
                `}
              >
                SMART RECOVERY
              </h1>
            </div>
          </div>
        </div>
      )}

      {/* --- Main Web Portal --- */}
      <div
        className={`transition-opacity duration-1000 delay-300 ${animStep >= 4 ? "opacity-100" : "opacity-0"}`}
      >
        <div className="fixed top-[-10%] left-[-10%] w-96 h-96 bg-blue-900/15 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="fixed bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-900/15 rounded-full blur-[120px] pointer-events-none"></div>

        <nav className="fixed top-0 w-full z-50 bg-[#050505]/70 backdrop-blur-xl border-b border-white/5 px-8 py-5 flex justify-between items-center">
          <button
            onClick={handleLogoClick}
            className="flex items-center gap-3 active:scale-95 transition-transform hover:opacity-80"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/50">
              <span className="text-white font-black text-xl">C</span>
            </div>
            <span className="text-2xl font-extrabold tracking-tight text-white">
              Campus L&F
            </span>
          </button>
          <div className="hidden md:flex gap-10 text-sm font-semibold text-slate-400">
            <a href="#hero" className="hover:text-white transition-colors">
              Home
            </a>
            <a href="#access" className="hover:text-white transition-colors">
              Portals
            </a>
          </div>
        </nav>

        <main className="flex flex-col items-center pt-40 pb-20 px-6 relative z-10">
          <section
            id="hero"
            className="w-full max-w-6xl flex flex-col md:flex-row items-center justify-between gap-12 mb-40"
          >
            <div className="flex-1 text-left">
              <div className="inline-block px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-blue-400 text-xs font-bold tracking-widest uppercase mb-6 shadow-inner animate-pulse">
                Next-Gen Campus Ecosystem
              </div>
              <h1 className="text-6xl md:text-7xl font-black tracking-tighter text-white mb-6 leading-tight">
                Lost it? <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-indigo-400 to-purple-500">
                  Consider it found.
                </span>
              </h1>
              <p className="text-xl text-slate-400 mb-10 max-w-xl font-medium leading-relaxed">
                The most secure, lightning-fast platform to recover your
                belongings. Powered by intelligent matching and instant alerts.
              </p>
              <div className="flex gap-4">
                <a
                  href="#access"
                  className="px-8 py-4 bg-white text-black rounded-xl font-bold text-lg hover:bg-slate-200 hover:scale-105 hover:shadow-lg hover:shadow-white/10 transition-all duration-300 flex items-center gap-2"
                >
                  Get Started <span className="text-xl leading-none">↓</span>
                </a>
              </div>
            </div>

            <div className="flex-1 relative w-full h-[450px]">
              <div className="w-full h-full bg-[#030305] rounded-[3rem] border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden flex flex-col items-center justify-center p-6 group">
                <div className="absolute inset-0 universe-bg opacity-70"></div>

                <div
                  className="absolute inset-0"
                  style={{
                    animation: "slowPan 20s ease-in-out infinite alternate",
                  }}
                >
                  <div className="absolute top-[10%] left-[10%] w-64 h-64 bg-blue-600/20 rounded-full blur-[80px]"></div>
                  <div className="absolute bottom-[10%] right-[10%] w-64 h-64 bg-purple-600/20 rounded-full blur-[80px]"></div>

                  <div className="absolute top-1/2 left-1/2 w-[350px] h-[350px] -mt-[175px] -ml-[175px] border border-white/5 rounded-full animate-[spin_20s_linear_infinite]">
                    <div className="absolute top-[10%] left-[10%] w-3 h-3 bg-blue-400 rounded-full shadow-[0_0_10px_blue]"></div>
                  </div>
                  <div className="absolute top-1/2 left-1/2 w-[450px] h-[450px] -mt-[225px] -ml-[225px] border border-dashed border-white/5 rounded-full animate-[spin_30s_linear_infinite_reverse]">
                    <div className="absolute bottom-[20%] right-[10%] w-4 h-4 bg-purple-500 rounded-full shadow-[0_0_15px_purple]"></div>
                  </div>
                </div>

                <div className="comet top-[-10%] left-[-10%]"></div>
                <div className="comet comet-delay"></div>

                <div className="absolute inset-4 border border-white/10 rounded-2xl pointer-events-none z-10 flex flex-col justify-between p-4">
                  <div className="flex justify-between items-start text-xs font-mono text-white/70">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_red]"></span>
                      <span className="tracking-widest font-bold">REC</span>
                    </div>
                    <div className="text-right">
                      <p>SYS.OP. NORMAL</p>
                      <p className="text-white/40">CAM-04 : SECTOR-7</p>
                    </div>
                  </div>

                  <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white/30 rounded-tl-lg"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white/30 rounded-tr-lg"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white/30 rounded-bl-lg"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white/30 rounded-br-lg"></div>

                  <div className="flex justify-between items-end text-xs font-mono text-white/70 tracking-wider">
                    <div>
                      <p className="animate-pulse text-emerald-400">
                        TARGET LOCKED
                      </p>
                    </div>
                    <div>1080P / 60FPS</div>
                  </div>
                </div>

                <div className="relative z-20 bg-[#0a0a0f]/90 backdrop-blur-xl p-6 rounded-2xl shadow-[0_0_40px_rgba(30,58,138,0.4)] flex items-center gap-4 border border-blue-500/50 transform transition-all duration-700 hover:scale-105 cursor-pointer w-[90%] max-w-sm animate-[float_4s_ease-in-out_infinite]">
                  <style>{`@keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }`}</style>
                  <div className="w-12 h-12 bg-gradient-to-tr from-emerald-500/20 to-teal-500/10 text-emerald-400 rounded-full flex items-center justify-center text-xl border border-emerald-500/40 animate-[pulse_2s_infinite]">
                    ✓
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-extrabold text-white text-lg tracking-tight">
                        Match Found!
                      </p>
                      <span className="text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/40 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Instant
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 mt-0.5 font-medium">
                      Library — Black Wallet
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Access Gateways - Using buttons to trigger Modal */}
          <section id="access" className="w-full max-w-6xl mb-32">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-black text-white tracking-tight">
                Select Your Portal
              </h2>
              <p className="text-slate-400 mt-4">
                Secure access nodes for different campus roles.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              <SpotlightCard
                className="bg-[#0a0a0a] rounded-[2rem] p-10 h-[400px] flex flex-col justify-between border border-white/5 shadow-2xl"
                glowColor="rgba(59, 130, 246, 0.15)"
              >
                <div>
                  <div className="inline-block px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-xs font-bold uppercase tracking-wider mb-6">
                    For Students
                  </div>
                  <h3 className="text-4xl font-black text-white tracking-tight mb-4">
                    Student Hub
                  </h3>
                  <p className="text-slate-400 font-medium max-w-sm leading-relaxed">
                    Report missing items, browse the found registry, and
                    securely claim your belongings with digital proof.
                  </p>
                </div>
                <div className="flex gap-4 mt-8">
                  <button
                    onClick={() =>
                      setModalData({ isOpen: true, type: "student-login" })
                    }
                    className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/20"
                  >
                    Login
                  </button>
                  <button
                    onClick={() =>
                      setModalData({ isOpen: true, type: "student-signup" })
                    }
                    className="px-8 py-3 bg-transparent text-white border border-white/20 rounded-xl font-bold hover:bg-white/5 transition-colors"
                  >
                    Sign Up
                  </button>
                </div>
              </SpotlightCard>

              <SpotlightCard
                className="bg-[#0a0a0a] rounded-[2rem] p-10 h-[400px] flex flex-col justify-between border border-white/5 shadow-2xl"
                glowColor="rgba(168, 85, 247, 0.15)"
              >
                <div>
                  <div className="inline-block px-4 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-400 text-xs font-bold uppercase tracking-wider mb-6">
                    For Authorities
                  </div>
                  <h3 className="text-4xl font-black text-white tracking-tight mb-4">
                    Admin Desk
                  </h3>
                  <p className="text-slate-400 font-medium max-w-sm leading-relaxed">
                    Verify ownership proofs, resolve claims, and monitor
                    campus-wide security logs from a central dashboard.
                  </p>
                </div>
                <div className="mt-8">
                  <button
                    onClick={() =>
                      setModalData({ isOpen: true, type: "admin-login" })
                    }
                    className="inline-flex items-center gap-2 px-8 py-3 bg-white text-black rounded-xl font-bold hover:bg-slate-200 transition-colors"
                  >
                    Authority Access <span className="ml-2 text-xl">→</span>
                  </button>
                </div>
              </SpotlightCard>
            </div>
          </section>
        </main>

        {/* Dark Footer */}
        <footer className="bg-[#030303] text-slate-400 pt-20 pb-10 border-t border-white/5">
          <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 md:col-span-2">
              <button
                onClick={handleLogoClick}
                className="flex items-center gap-3 mb-6 transition-opacity hover:opacity-80"
              >
                <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                  <span className="text-white font-black text-sm">C</span>
                </div>
                <span className="text-xl font-extrabold tracking-tight text-white">
                  Campus L&F
                </span>
              </button>
              <p className="text-slate-500 max-w-md leading-relaxed mb-6">
                Building a smarter, safer campus ecosystem. We connect lost
                belongings with their rightful owners instantly using
                intelligent matching algorithms.
              </p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-6 text-lg tracking-tight">
                Quick Links
              </h4>
              <ul className="space-y-4 text-sm font-medium">
                <li>
                  <button
                    onClick={handleLogoClick}
                    className="hover:text-blue-400 transition-colors text-left"
                  >
                    Home
                  </button>
                </li>
                <li>
                  <button
                    onClick={() =>
                      setModalData({ isOpen: true, type: "student-login" })
                    }
                    className="hover:text-blue-400 transition-colors"
                  >
                    Student Login
                  </button>
                </li>
                <li>
                  <button
                    onClick={() =>
                      setModalData({ isOpen: true, type: "admin-login" })
                    }
                    className="hover:text-blue-400 transition-colors"
                  >
                    Admin Desk
                  </button>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-6 text-lg tracking-tight">
                Developer Info
              </h4>
              <ul className="space-y-4 text-sm font-medium text-slate-500">
                <li className="flex items-center gap-2">
                  <span>📧</span>{" "}
                  <a
                    href="mailto:240180107001@gecdahod.ac.in"
                    className="hover:text-white transition-colors"
                  >
                    240180107001@gecdahod.ac.in
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <span>💼</span>{" "}
                  <a href="https://www.linkedin.com/in/gecdhd-comp-akash-maurya7/?isSelfProfile=true" className="hover:text-white transition-colors">
                    LinkedIn Profile
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <span>💻</span>{" "}
                  <a href="https://github.com/DP7772" className="hover:text-white transition-colors">
                    GitHub Profile
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="max-w-6xl mx-auto px-6 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-600">
            <p>
              © {new Date().getFullYear()} Campus L&F Portal. All rights
              reserved.
            </p>
            <p>Engineered with React & NeonDB.</p>
          </div>
        </footer>
      </div>

      {/* RENDER THE AUTH MODAL */}
      <AuthModal
        isOpen={modalData.isOpen}
        type={modalData.type}
        onClose={() => setModalData({ isOpen: false, type: null })}
      />
    </div>
  );
}
