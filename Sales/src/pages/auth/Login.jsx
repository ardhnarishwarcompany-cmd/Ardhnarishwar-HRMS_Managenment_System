import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import OtpLogin from "../../components/OtpLogin";
import { styles, Kinetic, Sheen, Spinner, HeroScene, MagicCard } from "../../components/LoginVisuals";

/* ═══════════════════════════════════════════════════════════
   EDIT ALL PAGE TEXT HERE
   ═══════════════════════════════════════════════════════════ */
const CONTENT = {
  badge: "HRMS Sales Workspace",
  headlineTop: "Sales performance,",
  headlineGradient: "managed with precision.",
  subtext:
    "Track leads, follow-ups, targets and invoices across your entire pipeline in one secure, role-based HRMS workspace.",
  marquee: [
    "Lead & pipeline management",
    "Due follow-up reminders",
    "Targets & performance",
    "Invoices & revenue",
    "Field sales tracking",
    "Role-based security",
  ],
};

const INPUT_CLASS =
  "w-full rounded-xl border border-white/10 bg-black/40 py-3 pl-11 pr-4 text-base text-white placeholder-white/25 outline-none transition-all duration-300 focus:border-fuchsia-400/60 focus:bg-black/60 focus:shadow-[0_0_0_3px_rgba(217,70,239,0.15),0_8px_30px_-10px_rgba(217,70,239,0.4)] sm:py-3.5 sm:text-sm";

const LABEL_CLASS = "mb-1.5 block text-[11px] font-bold uppercase tracking-[0.15em] text-white/50";

const BTN_CLASS =
  "group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-600 py-3 text-sm font-bold text-white shadow-[0_0_35px_rgba(217,70,239,0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_55px_rgba(217,70,239,0.65)] focus:outline-none focus:ring-2 focus:ring-fuchsia-400 focus:ring-offset-2 focus:ring-offset-[#0d0918] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 sm:py-3.5";

const segBtn = (active) =>
  `rounded-lg py-2 text-sm font-semibold transition-all duration-300 sm:py-2.5 ${
    active
      ? "scale-[1.02] bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-600 text-white shadow-[0_8px_24px_-8px_rgba(217,70,239,.7)]"
      : "text-white/45 hover:text-white"
  }`;

const STARS = [
  { l: "8%", t: "18%", d: "0s" }, { l: "16%", t: "72%", d: "-1.5s" }, { l: "28%", t: "34%", d: "-3s" }, { l: "44%", t: "12%", d: "-.8s" },
  { l: "58%", t: "82%", d: "-2.2s" }, { l: "72%", t: "22%", d: "-4s" }, { l: "84%", t: "58%", d: "-1s" }, { l: "93%", t: "30%", d: "-2.8s" },
];

export default function Login() {
  const navigate = useNavigate();
  const { setAuth } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState("password");

  const BASE_URL = import.meta.env.VITE_API_BASE_URL;

  /* page spotlight */
  const rootRef = useRef(null);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const onMove = (e) => {
      el.style.setProperty("--mx", `${e.clientX}px`);
      el.style.setProperty("--my", `${e.clientY}px`);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  /* ───────── auth logic (unchanged) ───────── */
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const { data: res } = await axios.post(`${BASE_URL}/sales/auth/login`, { email, password });
      if (!res?.success) throw new Error(res?.message || "Login failed");
      setAuth({ token: res.token, user: res.user });
      toast.success("Login successful");
      navigate("/sales-reports");
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      ref={rootRef}
      className="relative flex min-h-[100dvh] flex-col overflow-x-hidden bg-[#07050e] text-white lg:h-screen lg:overflow-hidden"
      style={{ "--mx": "50vw", "--my": "50vh" }}
    >
      <style>{styles}</style>

      {/* mesh background */}
      <div className="lx-anim pointer-events-none fixed inset-0" style={{ animation: "hueDrift 24s ease-in-out infinite" }} aria-hidden="true">
        <div className="lx-anim absolute left-[-10%] top-[-20%] h-[70vh] w-[70vw] rounded-full blur-[120px] lg:w-[60vw]" style={{ background: "radial-gradient(circle, rgba(124,58,237,.4), transparent 65%)", animation: "meshMove1 22s ease-in-out infinite" }} />
        <div className="lx-anim absolute right-[-15%] top-[10%] h-[80vh] w-[65vw] rounded-full blur-[130px] lg:w-[55vw]" style={{ background: "radial-gradient(circle, rgba(217,70,239,.32), transparent 65%)", animation: "meshMove2 26s ease-in-out infinite" }} />
        <div className="lx-anim absolute bottom-[-25%] left-[20%] h-[65vh] w-[65vw] rounded-full blur-[120px] lg:w-[55vw]" style={{ background: "radial-gradient(circle, rgba(79,70,229,.35), transparent 65%)", animation: "meshMove3 30s ease-in-out infinite" }} />
      </div>

      {/* panning grid */}
      <div
        className="lx-anim pointer-events-none fixed inset-0 opacity-[0.08]"
        style={{
          backgroundImage: "linear-gradient(rgba(196,181,253,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(196,181,253,.6) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          animation: "gridPan 8s linear infinite",
          maskImage: "radial-gradient(ellipse 80% 70% at 50% 45%, black 30%, transparent 100%)",
        }}
        aria-hidden="true"
      />

      {/* page spotlight */}
      <div className="pointer-events-none fixed inset-0 hidden lg:block" style={{ background: "radial-gradient(520px circle at var(--mx) var(--my), rgba(168,85,247,.14), transparent 70%)" }} aria-hidden="true" />

      {/* stars */}
      {STARS.map((s, i) => (
        <span key={i} className="lx-anim pointer-events-none fixed h-1 w-1 rounded-full bg-fuchsia-200" style={{ left: s.l, top: s.t, animation: "twinkle 3.6s ease-in-out infinite", animationDelay: s.d }} aria-hidden="true" />
      ))}

      {/* header */}
      <header className="lx-rise relative z-10 flex shrink-0 items-center justify-between px-5 py-4 sm:px-8 lg:px-12">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-indigo-500 text-sm font-black shadow-[0_0_30px_rgba(217,70,239,.5)]">
            <img src="/logo.jpeg" alt="Ardhnarishwar" className="h-full w-full object-cover" />
            <span className="lx-anim absolute inset-0 rounded-xl border border-fuchsia-400/60" style={{ animation: "ringPulse 2.6s ease-out infinite" }} aria-hidden="true" />
          </div>
          <div className="leading-none">
            <span className="block text-lg font-bold tracking-wide">Sales Portal</span>
            <span className="mt-1 block text-[9px] tracking-[0.12em] text-white/50 sm:text-[10px]">HUMAN RESOURCE MANAGEMENT SYSTEM</span>
          </div>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-white/60 backdrop-blur-md sm:px-4 sm:text-xs">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          <span className="hidden sm:inline">All systems operational</span>
          <span className="sm:hidden">Online</span>
        </span>
      </header>

      {/* main */}
      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col items-center justify-center gap-10 px-5 py-6 sm:px-8 lg:min-h-0 lg:flex-row lg:gap-12 lg:px-12 lg:py-2 xl:gap-20">
        {/* left: headline + animated scene */}
        <section className="flex w-full max-w-xl flex-col items-center text-center lg:items-start lg:text-left">
          <p
            className="lx-rise inline-flex items-center gap-2 rounded-full border border-fuchsia-400/25 bg-fuchsia-500/10 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-fuchsia-300 sm:text-[11px]"
            style={{ animationDelay: ".1s" }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-400" aria-hidden="true" />
            {CONTENT.badge}
          </p>

          <h1 className="mt-4 text-balance text-[1.9rem] font-black leading-[1.1] tracking-tight sm:text-4xl lg:text-[2.4rem] xl:text-[2.9rem]">
            <Kinetic text={CONTENT.headlineTop} base={0.2} />
            <br />
            <Kinetic text={CONTENT.headlineGradient} base={0.45} className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-purple-300 bg-clip-text text-transparent" />
            <span className="lx-anim ml-1 inline-block h-[0.8em] w-[3px] translate-y-1 rounded-full bg-fuchsia-400 align-baseline" style={{ animation: "typeCaret 1.1s step-end infinite" }} aria-hidden="true" />
          </h1>

          <p className="lx-rise mt-3 max-w-md text-pretty text-sm leading-relaxed text-white/55 lg:hidden xl:block" style={{ animationDelay: ".8s" }}>
            {CONTENT.subtext}
          </p>

          <div className="mt-5 w-full lg:mt-4">
            <HeroScene />
          </div>
        </section>

        {/* right: magic card */}
        <MagicCard className="w-full max-w-md">
          <div className="p-5 sm:p-7">
            <div className="grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-black/40 p-1" role="tablist" aria-label="Login method">
              <button type="button" role="tab" aria-selected={mode === "password"} onClick={() => setMode("password")} className={segBtn(mode === "password")}>
                Password
              </button>
              <button type="button" role="tab" aria-selected={mode === "otp"} onClick={() => setMode("otp")} className={segBtn(mode === "otp")}>
                OTP Login
              </button>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold sm:text-2xl">
                Welcome <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-indigo-300 bg-clip-text text-transparent">back</span>
              </h2>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-300">
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="4" y="10" width="16" height="11" rx="2" />
                  <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                </svg>
                Secure
              </span>
            </div>
            <p className="mt-1 text-sm text-white/45">Sign in to the HRMS Sales panel.</p>

            <div className="mt-5">
              {mode === "otp" ? (
                <OtpLogin
                  portal="sales"
                  variant="glass"
                  onSuccess={(data) => {
                    setAuth({ token: data.token, user: data.user });
                    navigate("/sales-reports");
                  }}
                />
              ) : (
                <form onSubmit={handleLogin} className="flex flex-col gap-4">
                  <div>
                    <label htmlFor="sales-email" className={LABEL_CLASS}>Email address</label>
                    <div className="group relative">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/25 transition-colors duration-300 group-focus-within:text-fuchsia-300">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                          <rect x="3" y="5" width="18" height="14" rx="2" />
                          <path d="m3 7 9 6 9-6" />
                        </svg>
                      </span>
                      <input
                        id="sales-email"
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        className={INPUT_CLASS}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="sales-password" className={LABEL_CLASS}>Password</label>
                    <div className="group relative">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/25 transition-colors duration-300 group-focus-within:text-fuchsia-300">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                          <rect x="4" y="10" width="16" height="11" rx="2" />
                          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                        </svg>
                      </span>
                      <input
                        id="sales-password"
                        type={showPassword ? "text" : "password"}
                        required
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className={`${INPUT_CLASS} pr-12`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-white/35 transition-colors hover:text-white/80 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40"
                      >
                        {showPassword ? (
                          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                            <path d="M3 3l18 18" strokeLinecap="round" />
                            <path d="M10.6 5.1A9.8 9.8 0 0 1 12 5c7 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6A16.7 16.7 0 0 0 2 12s3 7 10 7a9.9 9.9 0 0 0 4.3-1" />
                            <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <button disabled={loading} className={BTN_CLASS}>
                    <Sheen />
                    {loading ? (
                      <span className="relative inline-flex items-center justify-center gap-2">
                        <Spinner />
                        Signing in…
                      </span>
                    ) : (
                      <span className="relative inline-flex items-center justify-center gap-2">
                        Sign in
                        <svg className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M5 12h14" />
                          <path d="m13 6 6 6-6 6" />
                        </svg>
                      </span>
                    )}
                  </button>
                </form>
              )}
            </div>

            <p className="mt-5 text-center text-xs text-white/30">Trouble signing in? Contact your system administrator.</p>
          </div>
        </MagicCard>
      </main>

      {/* footer marquee */}
      <footer className="relative z-10 shrink-0 border-t border-white/[0.06] py-3">
        <div className="overflow-hidden" aria-hidden="true">
          <div className="lx-anim flex w-max items-center gap-10 whitespace-nowrap" style={{ animation: "marquee 28s linear infinite" }}>
            {[...CONTENT.marquee, ...CONTENT.marquee].map((item, i) => (
              <span key={i} className="flex items-center gap-10 text-[11px] font-semibold uppercase tracking-[0.25em] text-white/25">
                {item}
                <span className="h-1 w-1 rounded-full bg-fuchsia-400/50" />
              </span>
            ))}
          </div>
        </div>
        <p className="sr-only">Lead and pipeline management, due follow-up reminders, targets and performance, invoices and revenue, field sales tracking, role-based security</p>
      </footer>
    </div>
  );
}
