import { useEffect, useRef, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useHrAuth } from "../../context/HrAuthContext";
import OtpLogin from "../../components/OtpLogin";

/* ═══════════════ keyframes ═══════════════ */
const styles = `
@keyframes hueDrift {
  0%   { filter: hue-rotate(0deg); }
  50%  { filter: hue-rotate(28deg); }
  100% { filter: hue-rotate(0deg); }
}
@keyframes meshMove1 {
  0%, 100% { transform: translate(-10%, -10%) scale(1); }
  33%      { transform: translate(15%, 5%) scale(1.25); }
  66%      { transform: translate(-5%, 15%) scale(0.9); }
}
@keyframes meshMove2 {
  0%, 100% { transform: translate(10%, 10%) scale(1.1); }
  50%      { transform: translate(-15%, -8%) scale(0.85); }
}
@keyframes meshMove3 {
  0%, 100% { transform: translate(0, 0) scale(0.95); }
  50%      { transform: translate(12%, -14%) scale(1.2); }
}
@keyframes letterIn {
  0%   { opacity: 0; transform: translateY(40px) rotateX(80deg); }
  100% { opacity: 1; transform: translateY(0) rotateX(0deg); }
}
@keyframes cardIn {
  0%   { opacity: 0; transform: translateY(50px) scale(0.94); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes riseIn {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes borderFlow {
  0%   { background-position: 0% 50%; }
  100% { background-position: 200% 50%; }
}
@keyframes shineSweep {
  0%, 55%  { transform: translateX(-130%) skewX(-20deg); }
  85%, 100% { transform: translateX(260%) skewX(-20deg); }
}
@keyframes marquee {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}
@keyframes floatY {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-12px); }
}
@keyframes ringPulse {
  0%   { transform: scale(1); opacity: 0.5; }
  100% { transform: scale(2.2); opacity: 0; }
}
@keyframes scanline {
  0%   { top: -10%; opacity: 0; }
  10%  { opacity: 0.6; }
  90%  { opacity: 0.6; }
  100% { top: 110%; opacity: 0; }
}
@keyframes gridPan {
  from { background-position: 0 0; }
  to   { background-position: 56px 56px; }
}
@keyframes twinkle {
  0%, 100% { opacity: 0.15; transform: scale(1); }
  50%      { opacity: 0.9; transform: scale(1.5); }
}
@keyframes typeCaret {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0; }
}
@keyframes barGrow {
  0%   { transform: scaleY(0); opacity: 0; }
  100% { transform: scaleY(1); opacity: 1; }
}
@keyframes barPulse {
  0%, 100% { opacity: 0.75; }
  50%      { opacity: 1; }
}
@keyframes checkPop {
  0%   { opacity: 0; transform: scale(0.4) translateX(-10px); }
  70%  { transform: scale(1.15) translateX(0); }
  100% { opacity: 1; transform: scale(1) translateX(0); }
}
@keyframes orbitSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes orbitSpinRev { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
@keyframes haloSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes corePulse {
  0%, 100% { box-shadow: 0 0 40px rgba(217,70,239,0.45), 0 0 90px rgba(139,92,246,0.35), inset 0 1px 0 rgba(255,255,255,0.2); }
  50%      { box-shadow: 0 0 70px rgba(217,70,239,0.75), 0 0 140px rgba(139,92,246,0.55), inset 0 1px 0 rgba(255,255,255,0.3); }
}
@keyframes nodeIn {
  0%   { opacity: 0; transform: scale(0.3); }
  70%  { transform: scale(1.12); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes popIn {
  0%   { opacity: 0; transform: translateY(16px) scale(0.9); }
  70%  { transform: translateY(-2px) scale(1.03); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes floatSoft {
  0%, 100% { transform: translateY(0) rotate(-1deg); }
  50%      { transform: translateY(-9px) rotate(1deg); }
}
@keyframes livePing { 0% { transform: scale(1); opacity: 0.8; } 100% { transform: scale(2.4); opacity: 0; } }
@keyframes dotBounce { 0%, 80%, 100% { transform: translateY(0); opacity: 0.4; } 40% { transform: translateY(-4px); opacity: 1; } }
@keyframes fillX { 0% { transform: scaleX(0); } 60%, 100% { transform: scaleX(1); } }
@keyframes cometTrail {
  0%   { opacity: 0; transform: rotate(0deg); }
  10%  { opacity: 1; }
  90%  { opacity: 1; }
  100% { opacity: 0; transform: rotate(360deg); }
}
.lx-rise { animation: riseIn 0.8s cubic-bezier(0.22, 1, 0.36, 1) both; }
@media (prefers-reduced-motion: reduce) {
  .lx-anim, .lx-rise, .lx-letter { animation: none !important; opacity: 1 !important; transform: none !important; }
}
`;

/* ═══════════════ kinetic headline ═══════════════ */
function Kinetic({ text, className, base = 0 }) {
  return (
    <span aria-label={text} style={{ perspective: "600px" }}>
      {text.split("").map((ch, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={`lx-letter inline-block ${className || ""}`}
          style={{
            animation: `letterIn 0.65s cubic-bezier(0.22, 1, 0.36, 1) both`,
            animationDelay: `${base + i * 0.035}s`,
            transformOrigin: "bottom center",
            whiteSpace: ch === " " ? "pre" : undefined,
          }}
        >
          {ch === " " ? "\u00A0" : ch}
        </span>
      ))}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════
   EDIT ALL PAGE TEXT HERE — one place to change every word
   ═══════════════════════════════════════════════════════════ */
const CONTENT = {
  badge: "Intelligent HRMS for modern HR teams",
  headlineTop: "Your HR team,",
  headlineGradient: "powered by HRMS.",
  subtext: "Hiring, attendance, payroll and growth — all in one place.",
  features: [
    "AI-powered candidate screening",
    "Live interview proctoring",
    "One-click reports & analytics",
  ],
  stat: {
    label: "This week",
    value: "48",
    pill: "+12% interviews",
    bars: [38, 55, 42, 68, 52, 80, 100],
  },
  marquee: [
    "AI-powered candidate screening",
    "Real-time interview proctoring",
    "Face-recognition attendance",
    "Zero-touch payroll",
    "Instant analytics & reports",
    "Enterprise-grade security",
  ],
};

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("password");
  const [showPass, setShowPass] = useState(false);

  const navigate = useNavigate();
  const { login } = useHrAuth();

  /* mouse-follow spotlight */
  const rootRef = useRef(null);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;
    const onMove = (e) => {
      el.style.setProperty("--mx", `${e.clientX}px`);
      el.style.setProperty("--my", `${e.clientY}px`);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  /* card tilt */
  const cardRef = useRef(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const handleTilt = (e) => {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ rx: py * -5, ry: px * 7 });
  };
  const resetTilt = () => setTilt({ rx: 0, ry: 0 });

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/hr/auth/login`,
        form,
      );
      login(res.data);
      toast.success("Login successful");
      navigate("/dashboard");
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Login failed";

      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      ref={rootRef}
      className="relative min-h-screen overflow-hidden bg-[#07050e] text-white"
      style={{ "--mx": "50vw", "--my": "50vh" }}
    >
      <style>{styles}</style>

      {/* ═══ animated mesh background with slow hue drift ═══ */}
      <div
        className="lx-anim pointer-events-none absolute inset-0"
        style={{ animation: "hueDrift 24s ease-in-out infinite" }}
        aria-hidden="true"
      >
        <div
          className="lx-anim absolute left-[-10%] top-[-20%] h-[70vh] w-[60vw] rounded-full blur-[120px]"
          style={{
            background: "radial-gradient(circle, rgba(124,58,237,0.4), transparent 65%)",
            animation: "meshMove1 22s ease-in-out infinite",
          }}
        />
        <div
          className="lx-anim absolute right-[-15%] top-[10%] h-[80vh] w-[55vw] rounded-full blur-[130px]"
          style={{
            background: "radial-gradient(circle, rgba(217,70,239,0.32), transparent 65%)",
            animation: "meshMove2 26s ease-in-out infinite",
          }}
        />
        <div
          className="lx-anim absolute bottom-[-25%] left-[20%] h-[65vh] w-[55vw] rounded-full blur-[120px]"
          style={{
            background: "radial-gradient(circle, rgba(79,70,229,0.35), transparent 65%)",
            animation: "meshMove3 30s ease-in-out infinite",
          }}
        />
      </div>

      {/* panning grid */}
      <div
        className="lx-anim pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(196,181,253,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(196,181,253,0.6) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          animation: "gridPan 8s linear infinite",
          maskImage: "radial-gradient(ellipse 80% 70% at 50% 45%, black 30%, transparent 100%)",
        }}
        aria-hidden="true"
      />

      {/* mouse spotlight */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-500"
        style={{
          background:
            "radial-gradient(520px circle at var(--mx) var(--my), rgba(168,85,247,0.14), transparent 70%)",
        }}
        aria-hidden="true"
      />

      {/* twinkling stars */}
      {[
        { l: "8%", t: "18%", d: "0s" },
        { l: "16%", t: "72%", d: "-1.5s" },
        { l: "28%", t: "34%", d: "-3s" },
        { l: "44%", t: "12%", d: "-0.8s" },
        { l: "58%", t: "82%", d: "-2.2s" },
        { l: "72%", t: "22%", d: "-4s" },
        { l: "84%", t: "58%", d: "-1s" },
        { l: "93%", t: "30%", d: "-2.8s" },
      ].map((s, i) => (
        <span
          key={i}
          className="lx-anim pointer-events-none absolute h-1 w-1 rounded-full bg-fuchsia-200"
          style={{ left: s.l, top: s.t, animation: "twinkle 3.6s ease-in-out infinite", animationDelay: s.d }}
          aria-hidden="true"
        />
      ))}

      {/* scanline drifting down */}
      <div
        className="lx-anim pointer-events-none absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-fuchsia-400/40 to-transparent"
        style={{ animation: "scanline 9s linear infinite" }}
        aria-hidden="true"
      />

      {/* ═══ top bar ═══ */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-12 lx-rise">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-indigo-500 text-sm font-black shadow-[0_0_30px_rgba(217,70,239,0.5)]">
            <img src="/logo.jpeg" alt="Ardhnarishwar" className="h-full w-full object-cover" />
            <span
              className="lx-anim absolute inset-0 rounded-xl border border-fuchsia-400/60"
              style={{ animation: "ringPulse 2.6s ease-out infinite" }}
              aria-hidden="true"
            />
          </div>
          <span className="text-lg font-bold tracking-wide">HR&nbsp;Portal</span>
        </div>
        <span className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs font-medium text-white/60 backdrop-blur-md sm:inline-flex">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          All systems operational
        </span>
      </header>

      {/* ═══ main split ═══ */}
      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-160px)] w-full max-w-7xl flex-col items-center justify-center gap-14 px-6 py-10 lg:flex-row lg:gap-20 lg:px-12">
        {/* ── left: hero illustration ── */}
        <section className="flex w-full max-w-xl flex-col items-center lg:items-start">
          <p
            className="lx-rise inline-flex items-center gap-2 rounded-full border border-fuchsia-400/25 bg-fuchsia-500/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-fuchsia-300"
            style={{ animationDelay: "0.1s" }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-400" aria-hidden="true" />
            {CONTENT.badge}
          </p>

          {/* headline */}
          <h1 className="mt-5 text-balance text-center text-3xl font-black leading-[1.1] tracking-tight sm:text-4xl lg:text-left lg:text-[2.6rem]">
            <Kinetic text={CONTENT.headlineTop} base={0.2} />
            <br />
            <Kinetic
              text={CONTENT.headlineGradient}
              base={0.5}
              className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-purple-300 bg-clip-text text-transparent"
            />
            <span
              className="lx-anim ml-1 inline-block h-[0.8em] w-[3px] translate-y-1 rounded-full bg-fuchsia-400 align-baseline"
              style={{ animation: "typeCaret 1.1s step-end infinite" }}
              aria-hidden="true"
            />
          </h1>
          <p className="lx-rise mt-3 max-w-md text-pretty text-center text-sm leading-relaxed text-white/55 lg:text-left" style={{ animationDelay: "0.9s" }}>
            {CONTENT.subtext}
          </p>

          {/* ═══ HR orbit scene ═══ */}
          <div
            className="lx-anim relative mt-6 aspect-square w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[400px]"
            style={{ animation: "riseIn 0.9s cubic-bezier(0.22,1,0.36,1) 0.35s both" }}
            aria-hidden="true"
          >
            {/* ambient glow */}
            <div
              className="absolute inset-[18%] rounded-full blur-[70px]"
              style={{ background: "radial-gradient(circle, rgba(217,70,239,0.42), rgba(124,58,237,0.25) 50%, transparent 72%)" }}
            />

            {/* outer orbit — dashed ring + comet */}
            <div
              className="lx-anim absolute inset-0 rounded-full border border-dashed border-fuchsia-300/25"
              style={{ animation: "orbitSpin 46s linear infinite" }}
            >
              <span className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fuchsia-300 shadow-[0_0_16px_rgba(232,121,249,1)]" />
            </div>
            <div
              className="lx-anim absolute inset-0 rounded-full"
              style={{
                animation: "cometTrail 9s linear infinite",
                background: "conic-gradient(from 0deg, transparent 0deg, transparent 300deg, rgba(232,121,249,0.55) 345deg, transparent 360deg)",
                WebkitMask: "radial-gradient(circle, transparent calc(50% - 2px), black calc(50% - 1px), black 50%, transparent calc(50% + 1px))",
                mask: "radial-gradient(circle, transparent calc(50% - 2px), black calc(50% - 1px), black 50%, transparent calc(50% + 1px))",
              }}
            />

            {/* inner orbit — dashed ring */}
            <div
              className="lx-anim absolute inset-[19%] rounded-full border border-dashed border-violet-300/25"
              style={{ animation: "orbitSpinRev 32s linear infinite" }}
            >
              <span className="absolute bottom-0 left-1/2 h-2 w-2 -translate-x-1/2 translate-y-1/2 rounded-full bg-violet-300 shadow-[0_0_12px_rgba(196,181,253,0.9)]" />
            </div>

            {/* outer icon nodes — rotate with the ring, counter-rotate to stay upright */}
            {[
              { deg: 0, delay: "1.0s", label: "Team", icon: <><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3 20a6 6 0 0 1 12 0" /><path d="M15 20a5 5 0 0 1 6-4.6" /></> },
              { deg: 60, delay: "1.1s", label: "Resume", icon: <><rect x="5" y="3" width="14" height="18" rx="2" /><circle cx="10" cy="9" r="2" /><path d="M14 8h2M14 11h2M8 16h8" /></> },
              { deg: 120, delay: "1.2s", label: "Automation", icon: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" /></> },
              { deg: 180, delay: "1.3s", label: "Onboarding", icon: <><path d="m11 17 2 2a1 1 0 1 0 3-3" /><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4" /><path d="m21 3 1 11h-2" /><path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3" /><path d="M3 4h8" /></> },
              { deg: 240, delay: "1.4s", label: "Growth", icon: <><path d="M3 20h18" /><path d="M6 17v-5M11 17V8M16 17v-7" /><path d="m14 5 4-2 1 4" /></> },
              { deg: 300, delay: "1.5s", label: "Certified", icon: <><circle cx="12" cy="9" r="5" /><path d="m9 13.5-1 7 4-2 4 2-1-7" /></> },
            ].map((n) => (
              <div
                key={n.label}
                className="lx-anim absolute inset-0"
                style={{ transform: `rotate(${n.deg}deg)`, animation: "orbitSpin 46s linear infinite" }}
              >
                <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
                  <div
                    className="lx-anim"
                    style={{ transform: `rotate(-${n.deg}deg)`, animation: "orbitSpinRev 46s linear infinite" }}
                  >
                    <div
                      className="lx-anim flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-[#160f2a]/95 text-fuchsia-200 backdrop-blur-xl sm:h-12 sm:w-12"
                      style={{
                        animation: `nodeIn 0.6s cubic-bezier(0.34,1.56,0.64,1) ${n.delay} both`,
                        boxShadow: "0 14px 30px -10px rgba(217,70,239,0.55), 0 4px 14px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.14)",
                      }}
                    >
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        {n.icon}
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* core */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              {/* pulse rings */}
              {[0, 1, 2].map((r) => (
                <span
                  key={r}
                  className="lx-anim absolute inset-0 rounded-full border border-fuchsia-400/50"
                  style={{ animation: `ringPulse 3.6s ease-out ${r * 1.2}s infinite` }}
                />
              ))}
              {/* spinning conic halo */}
              <div
                className="lx-anim absolute -inset-2 rounded-full"
                style={{
                  animation: "haloSpin 6s linear infinite",
                  background: "conic-gradient(from 0deg, transparent, rgba(232,121,249,0.9), transparent 40%, transparent 60%, rgba(139,92,246,0.9), transparent)",
                  WebkitMask: "radial-gradient(circle, transparent calc(50% - 3px), black calc(50% - 2px))",
                  mask: "radial-gradient(circle, transparent calc(50% - 3px), black calc(50% - 2px))",
                }}
              />
              <div
                className="lx-anim relative flex h-24 w-24 flex-col items-center justify-center overflow-hidden rounded-full border border-white/20 bg-gradient-to-br from-[#1b1233] via-[#241640] to-[#120c22] sm:h-28 sm:w-28"
                style={{ animation: "corePulse 4s ease-in-out infinite, floatY 6s ease-in-out infinite" }}
              >
                {/* inner glow + top highlight */}
                <span
                  className="pointer-events-none absolute inset-0 rounded-full"
                  style={{ background: "radial-gradient(circle at 50% 60%, rgba(217,70,239,0.35), transparent 65%)" }}
                />
                <span
                  className="pointer-events-none absolute inset-x-3 top-1.5 h-6 rounded-full opacity-60 blur-sm"
                  style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.35), transparent)" }}
                />
                {/* wordmark */}
                <span className="relative bg-gradient-to-r from-violet-200 via-fuchsia-200 to-white bg-clip-text text-xl font-black tracking-[0.08em] text-transparent sm:text-2xl">
                  HRMS
                </span>
                <span className="relative mt-1 h-px w-8 rounded-full bg-gradient-to-r from-transparent via-fuchsia-300/80 to-transparent" />
                <span className="relative mt-1 text-[7px] font-bold uppercase tracking-[0.28em] text-fuchsia-200/70 sm:text-[8px]">
                  HR Portal
                </span>
              </div>
            </div>

            {/* floating: interview scheduled */}
            <div
              className="lx-anim absolute left-[-4%] top-[30%] flex items-center gap-2.5 rounded-2xl border border-white/12 bg-[#120c22]/90 px-3 py-2.5 backdrop-blur-xl sm:left-[-8%]"
              style={{
                animation: "popIn 0.6s cubic-bezier(0.22,1,0.36,1) 1.8s both, floatSoft 6s ease-in-out -1s infinite",
                boxShadow: "0 20px 40px -18px rgba(217,70,239,0.5), 0 6px 20px rgba(0,0,0,0.5)",
              }}
            >
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="lx-anim absolute inset-0 rounded-full bg-emerald-400" style={{ animation: "livePing 1.8s ease-out infinite" }} />
                <span className="relative h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <div className="leading-tight">
                <p className="text-[11px] font-semibold text-white">AI interview live</p>
                <p className="text-[9px] text-white/45">Priya S. · Frontend · 92% match</p>
              </div>
            </div>

            {/* floating: candidate hired */}
            <div
              className="lx-anim absolute right-[-6%] top-[8%] w-[44%] rounded-2xl border border-white/12 bg-[#120c22]/90 p-3 backdrop-blur-xl sm:right-[-12%]"
              style={{
                animation: "popIn 0.6s cubic-bezier(0.22,1,0.36,1) 2.1s both, floatSoft 7s ease-in-out -3s infinite",
                boxShadow: "0 20px 40px -18px rgba(139,92,246,0.5), 0 6px 20px rgba(0,0,0,0.5)",
              }}
            >
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/45">Hiring · Sept</p>
                <span className="flex gap-0.5">
                  {[0, 1, 2].map((d) => (
                    <span key={d} className="lx-anim h-1 w-1 rounded-full bg-fuchsia-300" style={{ animation: `dotBounce 1.2s ease-in-out ${d * 0.15}s infinite` }} />
                  ))}
                </span>
              </div>
              <p className="mt-1 text-base font-black text-white">{CONTENT.stat.value} <span className="text-[10px] font-semibold text-emerald-300">{CONTENT.stat.pill}</span></p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <span
                  className="lx-anim block h-full w-full origin-left rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500"
                  style={{ animation: "fillX 3.2s cubic-bezier(0.22,1,0.36,1) 2.4s infinite" }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── right: the card ── */}
        <section className="w-full max-w-md" style={{ perspective: "1400px" }}>
          <div
            ref={cardRef}
            onMouseMove={handleTilt}
            onMouseLeave={resetTilt}
            className="lx-anim relative rounded-3xl p-[1.5px] transition-transform duration-150 ease-out"
            style={{
              animation: "cardIn 0.9s cubic-bezier(0.22,1,0.36,1) 0.35s both",
              transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
              transformStyle: "preserve-3d",
            }}
          >
            {/* flowing gradient border */}
            <div
              className="lx-anim absolute inset-0 rounded-3xl"
              style={{
                background:
                  "linear-gradient(90deg, rgba(139,92,246,0.7), rgba(232,121,249,0.9), rgba(99,102,241,0.7), rgba(139,92,246,0.7))",
                backgroundSize: "200% 100%",
                animation: "borderFlow 5s linear infinite",
              }}
              aria-hidden="true"
            />
            {/* glow */}
            <div
              className="pointer-events-none absolute -inset-8 rounded-[3rem] opacity-70"
              style={{
                background: "radial-gradient(ellipse 65% 55% at 50% 40%, rgba(217,70,239,0.22), transparent 70%)",
              }}
              aria-hidden="true"
            />

            <div
              className="relative rounded-[calc(1.5rem-1.5px)] bg-[#0d0918]/95 p-8 backdrop-blur-2xl sm:p-9"
              style={{
                boxShadow:
                  "0 50px 100px -30px rgba(217,70,239,0.4), 0 8px 30px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)",
              }}
            >
              {/* sheen sweep across whole card */}
              <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]" aria-hidden="true">
                <span
                  className="lx-anim absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent"
                  style={{ animation: "shineSweep 6s ease-in-out infinite" }}
                />
              </div>

              <div className="relative">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold sm:text-[1.7rem]">
                    Welcome{" "}
                    <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-indigo-300 bg-clip-text text-transparent">
                      back
                    </span>
                  </h2>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-300">
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="4" y="10" width="16" height="11" rx="2" />
                      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                    </svg>
                    Secure
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-white/45">
                  Sign in to continue to your dashboard
                </p>

                {/* mode switch */}
                <div
                  className="mt-7 grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-black/40 p-1"
                  role="tablist"
                  aria-label="Login method"
                >
                  {["password", "otp"].map((m) => (
                    <button
                      key={m}
                      type="button"
                      role="tab"
                      aria-selected={mode === m}
                      onClick={() => setMode(m)}
                      className={`rounded-lg py-2.5 text-sm font-semibold transition-all duration-300 ${
                        mode === m
                          ? "bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-600 text-white shadow-[0_8px_24px_-8px_rgba(217,70,239,0.7)] scale-[1.02]"
                          : "text-white/45 hover:text-white"
                      }`}
                    >
                      {m === "password" ? "Password" : "OTP Login"}
                    </button>
                  ))}
                </div>

                <div className="mt-6">
                  {mode === "otp" && (
                    <OtpLogin
                      portal="hr"
                      variant="glass"
                      onSuccess={(data) => {
                        login(data);
                        navigate("/dashboard");
                      }}
                    />
                  )}

                  {mode === "password" && (
                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div>
                        <label
                          htmlFor="login-email"
                          className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.15em] text-white/50"
                        >
                          Email address
                        </label>
                        <div className="group relative">
                          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors duration-300 group-focus-within:text-fuchsia-300">
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                              <rect x="3" y="5" width="18" height="14" rx="2" />
                              <path d="m3 7 9 6 9-6" />
                            </svg>
                          </span>
                          <input
                            id="login-email"
                            type="email"
                            name="email"
                            required
                            autoComplete="email"
                            value={form.email}
                            onChange={handleChange}
                            placeholder="you@company.com"
                            className="w-full rounded-xl border border-transparent bg-indigo-50 py-3.5 pl-11 pr-4 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all duration-300 focus:border-fuchsia-400/60 focus:bg-white focus:shadow-[0_0_0_3px_rgba(217,70,239,0.15),0_8px_30px_-10px_rgba(217,70,239,0.4)]"
                          />
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="login-password"
                          className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.15em] text-white/50"
                        >
                          Password
                        </label>
                        <div className="group relative">
                          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors duration-300 group-focus-within:text-fuchsia-300">
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                              <rect x="4" y="10" width="16" height="11" rx="2" />
                              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                            </svg>
                          </span>
                          <input
                            id="login-password"
                            type={showPass ? "text" : "password"}
                            name="password"
                            required
                            autoComplete="current-password"
                            value={form.password}
                            onChange={handleChange}
                            placeholder="Enter your password"
                            className="w-full rounded-xl border border-transparent bg-indigo-50 py-3.5 pl-11 pr-12 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all duration-300 focus:border-fuchsia-400/60 focus:bg-white focus:shadow-[0_0_0_3px_rgba(217,70,239,0.15),0_8px_30px_-10px_rgba(217,70,239,0.4)]"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPass((s) => !s)}
                            aria-label={showPass ? "Hide password" : "Show password"}
                            className="absolute right-3 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg !border-0 !bg-transparent !p-0 !shadow-none text-slate-600 transition-colors hover:text-fuchsia-600 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40"
                          >
                            {showPass ? (
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

                      <button
                        disabled={loading}
                        className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-600 py-3.5 text-sm font-bold text-white shadow-[0_0_35px_rgba(217,70,239,0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_55px_rgba(217,70,239,0.65)] focus:outline-none focus:ring-2 focus:ring-fuchsia-400 focus:ring-offset-2 focus:ring-offset-[#0d0918] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <span
                          className="lx-anim pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                          style={{ animation: "shineSweep 3.4s ease-in-out infinite" }}
                          aria-hidden="true"
                        />
                        {loading ? (
                          <span className="relative inline-flex items-center justify-center gap-2">
                            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-90" d="M4 12a8 8 0 0 1 8-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                            </svg>
                            Signing in…
                          </span>
                        ) : (
                          <span className="relative inline-flex items-center justify-center gap-2">
                            Sign in
                            <svg
                              className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.4"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M5 12h14" />
                              <path d="m13 6 6 6-6 6" />
                            </svg>
                          </span>
                        )}
                      </button>
                    </form>
                  )}
                </div>

                <p className="mt-7 text-center text-xs text-white/30">
                  Trouble signing in? Contact your system administrator.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ═══ bottom marquee ═══ */}
      <footer className="relative z-10 border-t border-white/[0.06] py-4">
        <div className="overflow-hidden" aria-hidden="true">
          <div
            className="lx-anim flex w-max items-center gap-10 whitespace-nowrap"
            style={{ animation: "marquee 28s linear infinite" }}
          >
            {[...CONTENT.marquee, ...CONTENT.marquee].map((item, i) => (
              <span key={i} className="flex items-center gap-10 text-xs font-semibold uppercase tracking-[0.25em] text-white/25">
                {item}
                <span className="h-1 w-1 rounded-full bg-fuchsia-400/50" />
              </span>
            ))}
          </div>
        </div>
        <p className="sr-only">
          AI candidate screening, live interview proctoring, smart attendance, payroll automation, one-click reports, role-based access
        </p>
      </footer>
    </div>
  );
}
