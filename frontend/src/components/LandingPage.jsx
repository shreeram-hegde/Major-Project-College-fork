// frontend/src/components/LandingPage.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Map, ShieldCheck, Brain, Navigation, LogIn } from "lucide-react";

export default function Landing() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check if token exists
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);
  }, []);

  return (
    <div className="min-h-screen bg-[#050816] text-slate-100">
      {/* Top nav */}
      <header className="border-b border-slate-800/80 bg-[#050816]/90 backdrop-blur">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-sm font-bold">
              F
            </div>
            <span className="text-sm md:text-base font-semibold tracking-tight">
              FloodSafe Planner
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs md:text-sm text-slate-300">
            <a href="#how-it-works" className="hover:text-slate-100">How it works</a>
            <a href="#features" className="hover:text-slate-100">Features</a>
          </nav>

          <div className="flex items-center gap-2">
            {isLoggedIn ? (
              <Link
                to="/dashboard"
                className="px-4 py-1.5 text-xs md:text-sm rounded-full bg-emerald-600 text-white font-semibold hover:bg-emerald-500 transition flex items-center gap-2"
              >
                <Navigation size={14} />
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-3 py-1.5 text-xs md:text-sm rounded-full border border-slate-700 text-slate-200 hover:bg-slate-900 transition"
                >
                  Sign in
                </Link>
                <Link
                  to="/signup"
                  className="px-3 md:px-4 py-1.5 text-xs md:text-sm rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white font-semibold hover:from-emerald-400 hover:to-emerald-600 shadow-lg shadow-emerald-900/40 transition"
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-6xl mx-auto px-4 pt-10 pb-16 md:pt-16 md:pb-24">
        <section className="flex flex-col md:flex-row items-center gap-10">
          {/* Left: copy */}
          <div className="md:flex-1">
            <p className="inline-flex items-center gap-2 text-[11px] md:text-xs px-2.5 py-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-200 mb-4">
              <ShieldCheck className="w-3 h-3" />
              AI‑assisted flood evacuation planning
            </p>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-semibold leading-tight">
              Plan the safest route
              <span className="text-emerald-400"> before the water rises.</span>
            </h1>
            <p className="mt-4 text-sm md:text-base text-slate-300 max-w-xl">
              Upload a flood or satellite map, pick your start and destination,
              and let our multi‑agent AI planner compute a safe evacuation path
              that avoids high‑risk flooded zones.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {isLoggedIn ? (
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-2 px-4 md:px-5 py-2 md:py-2.5 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-sm md:text-base font-semibold hover:from-emerald-400 hover:to-emerald-600 shadow-lg shadow-emerald-900/40 transition"
                >
                  Launch Planner
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-2 px-4 md:px-5 py-2 md:py-2.5 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-sm md:text-base font-semibold hover:from-emerald-400 hover:to-emerald-600 shadow-lg shadow-emerald-900/40 transition"
                >
                  Start free
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
            {/* ... rest of the landing page remains the same ... */}
          </div>
        </section>
      </main>
    </div>
  );
}