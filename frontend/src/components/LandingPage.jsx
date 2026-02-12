// Landing.jsx
import { Link } from "react-router-dom";
import { ArrowRight, Map, ShieldCheck, Brain, Navigation } from "lucide-react";

export default function Landing() {
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
            <a href="#how-it-works" className="hover:text-slate-100">
              How it works
            </a>
            <a href="#features" className="hover:text-slate-100">
              Features
            </a>
            <a href="#faq" className="hover:text-slate-100">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-2">
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
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 px-4 md:px-5 py-2 md:py-2.5 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-sm md:text-base font-semibold hover:from-emerald-400 hover:to-emerald-600 shadow-lg shadow-emerald-900/40 transition"
              >
                Start free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 px-3 md:px-4 py-2 rounded-full border border-slate-700 text-xs md:text-sm text-slate-200 hover:bg-slate-900 transition"
              >
                Try with a sample map
              </Link>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 max-w-md text-xs md:text-sm text-slate-300">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 h-5 w-5 rounded-md bg-slate-900 flex items-center justify-center">
                  <Map className="w-3 h-3 text-emerald-400" />
                </span>
                <p>
                  Works with satellite, flood and terrain imagery of real
                  locations.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-0.5 h-5 w-5 rounded-md bg-slate-900 flex items-center justify-center">
                  <Brain className="w-3 h-3 text-emerald-400" />
                </span>
                <p>
                  Multi‑agent reasoning ranks routes by safety, not just distance.
                </p>
              </div>
            </div>
          </div>

          {/* Right: mock card matching Results style */}
          <div className="md:flex-1 w-full">
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.6)] p-4 md:p-5">
              <div className="text-xs text-slate-300 mb-2 flex items-center gap-2">
                <Navigation className="w-4 h-4 text-emerald-400" />
                <span>AI path preview</span>
              </div>
              <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-900">
                {/* Placeholder gradient “map” */}
                <div className="h-52 md:h-64 w-full bg-gradient-to-br from-green-900 via-emerald-800 to-slate-900 opacity-90" />
                {/* Simple legend overlay */}
                <div className="absolute bottom-2 right-2 bg-slate-950/80 rounded-lg px-2 py-1 text-[10px] text-slate-200 border border-slate-700 flex flex-col gap-1">
                  <div className="flex items-center gap-1">
                    <span className="inline-block w-3 h-1 rounded-full bg-[rgb(0,255,0)]" />
                    <span>Safe path</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="inline-block w-3 h-3 rounded-sm bg-[rgb(50,100,50)]" />
                    <span>Safe zone</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="inline-block w-3 h-3 rounded-sm bg-[rgb(0,0,150)]" />
                    <span>Flooded zone</span>
                  </div>
                </div>
              </div>

              <p className="mt-3 text-xs md:text-sm text-slate-400">
                “The model selected a safe route that stays on higher ground and
                avoids predicted flood corridors.”
              </p>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mt-14 md:mt-20">
          <h2 className="text-lg md:text-xl font-semibold text-white">
            Built for first responders, city teams, and planners
          </h2>
          <p className="mt-2 text-xs md:text-sm text-slate-400 max-w-2xl">
            Use FloodSafe Planner in drills, tabletop exercises, or real events
            to quickly explore safe evacuation options on top of your own maps.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-3 text-xs md:text-sm">
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
              <p className="text-slate-200 font-medium mb-1">
                Upload any map image
              </p>
              <p className="text-slate-400">
                Drag‑and‑drop satellite or flood maps from your GIS tools and
                run analysis in seconds.
              </p>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
              <p className="text-slate-200 font-medium mb-1">
                AI‑guided pathfinding
              </p>
              <p className="text-slate-400">
                Multi‑agent system rewards wide corridors and penalizes choke
                points, panic zones, and rising waters.
              </p>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
              <p className="text-slate-200 font-medium mb-1">
                Transparent reasoning
              </p>
              <p className="text-slate-400">
                See a plain‑language report of why certain areas are marked as
                risky and which regions to avoid.
              </p>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="mt-14 md:mt-20">
          <h2 className="text-lg md:text-xl font-semibold text-white">
            How it works
          </h2>
          <ol className="mt-4 space-y-3 text-xs md:text-sm text-slate-300">
            <li>
              <span className="font-semibold text-emerald-400">1.</span> Sign in
              and upload a geographical / satellite map of your area.
            </li>
            <li>
              <span className="font-semibold text-emerald-400">2.</span> On the
              Results page, click on the map to mark start (A) and goal (B).
            </li>
            <li>
              <span className="font-semibold text-emerald-400">3.</span> Our
              multi‑agent AI computes the safest route and explains which paths
              to avoid.
            </li>
          </ol>
        </section>

        {/* Simple FAQ / footer */}
        <section id="faq" className="mt-14 md:mt-20 mb-6 text-xs md:text-sm text-slate-400">
          <p className="font-semibold text-slate-200 mb-2">Is my data safe?</p>
          <p className="mb-3">
            Maps you upload are used only to compute evacuation paths in this
            tool. Avoid uploading any personal photos or sensitive imagery.
          </p>
          <p className="font-semibold text-slate-200 mb-2">
            What kind of images work best?
          </p>
          <p>
            Clear satellite or flood‑extent images of real locations. Random
            photos (people, cars, documents) are automatically rejected.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              to="/signup"
              className="px-4 py-2 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white text-sm font-semibold hover:from-emerald-400 hover:to-emerald-600 shadow-md shadow-emerald-900/40 transition"
            >
              Create a free account
            </Link>
            <Link
              to="/dashboard"
              className="text-xs md:text-sm text-slate-300 hover:text-slate-100"
            >
              Jump to dashboard →
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
