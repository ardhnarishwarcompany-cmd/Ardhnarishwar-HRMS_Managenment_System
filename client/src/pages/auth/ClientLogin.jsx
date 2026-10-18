import { useEffect, useRef, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useClientAuth } from "../../context/ClientAuthContext";
import OtpLogin from "../../components/OtpLogin";

/* ═══════════════ keyframes (shared visual system with HR + Super Admin) ═══════════════ */
const styles = `
@keyframes hueDrift { 0%{filter:hue-rotate(0deg)} 50%{filter:hue-rotate(24deg)} 100%{filter:hue-rotate(0deg)} }
@keyframes meshMove1 { 0%,100%{transform:translate(-10%,-10%) scale(1)} 33%{transform:translate(15%,5%) scale(1.25)} 66%{transform:translate(-5%,15%) scale(.9)} }
@keyframes meshMove2 { 0%,100%{transform:translate(10%,10%) scale(1.1)} 50%{transform:translate(-15%,-8%) scale(.85)} }
@keyframes meshMove3 { 0%,100%{transform:translate(0,0) scale(.95)} 50%{transform:translate(12%,-14%) scale(1.2)} }
@keyframes letterIn { 0%{opacity:0;transform:translateY(34px) rotateX(70deg)} 100%{opacity:1;transform:translateY(0) rotateX(0)} }
@keyframes cardIn { 0%{opacity:0;transform:translateY(40px) scale(.96)} 100%{opacity:1;transform:translateY(0) scale(1)} }
@keyframes riseIn { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
@keyframes popIn { 0%{opacity:0;transform:translateY(14px) scale(.9)} 70%{transform:translateY(-2px) scale(1.03)} 100%{opacity:1;transform:translateY(0) scale(1)} }
@keyframes shineSweep { 0%,55%{transform:translateX(-130%) skewX(-20deg)} 85%,100%{transform:translateX(260%) skewX(-20deg)} }
@keyframes marquee { from{transform:translateX(0)} to{transform:translateX(-50%)} }
@keyframes floatY { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
@keyframes floatSoft { 0%,100%{transform:translateY(0) rotate(-1deg)} 50%{transform:translateY(-8px) rotate(1deg)} }
@keyframes ringPulse { 0%{transform:scale(1);opacity:.5} 100%{transform:scale(2.2);opacity:0} }
@keyframes gridPan { from{background-position:0 0} to{background-position:56px 56px} }
@keyframes twinkle { 0%,100%{opacity:.15;transform:scale(1)} 50%{opacity:.9;transform:scale(1.5)} }
@keyframes typeCaret { 0%,100%{opacity:1} 50%{opacity:0} }
@keyframes barGrow { 0%{transform:scaleY(0);opacity:0} 100%{transform:scaleY(1);opacity:1} }
@keyframes barPulse { 0%,100%{opacity:.75} 50%{opacity:1} }
@keyframes checkPop { 0%{opacity:0;transform:scale(.4)} 70%{transform:scale(1.15)} 100%{opacity:1;transform:scale(1)} }
@keyframes orbit { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
@keyframes fillX { 0%{transform:scaleX(0)} 60%,100%{transform:scaleX(1)} }
@keyframes ringDraw { from{stroke-dashoffset:264} to{stroke-dashoffset:21} }
@keyframes dotBounce { 0%,80%,100%{transform:translateY(0);opacity:.4} 40%{transform:translateY(-4px);opacity:1} }
@keyframes livePing { 0%{transform:scale(1);opacity:.8} 100%{transform:scale(2.4);opacity:0} }
.lx-rise { animation: riseIn .8s cubic-bezier(.22,1,.36,1) both; }
@media (prefers-reduced-motion: reduce) {
  .lx-anim, .lx-rise, .lx-letter { animation: none !important; opacity: 1 !important; transform: none !important; }
}
`;

/* ═══════════════ kinetic headline (breaks only between words) ═══════════════ */
function Kinetic({ text, className, base = 0 }) {
  let idx = 0;
  return (
    <span aria-label={text} style={{ perspective: "600px" }}>
      {text.split(" ").map((word, wi, arr) => {
        const letters = word.split("").map((ch) => {
          const i = idx++;
          return (
            <span
              key={i}
              aria-hidden="true"
              className={`lx-letter inline-block ${className || ""}`}
              style={{
                animation: "letterIn .6s cubic-bezier(.22,1,.36,1) both",
                animationDelay: `${base + i * 0.03}s`,
                transformOrigin: "bottom center",
              }}
            >
              {ch}
            </span>
          );
        });
        idx++;
        return (
          <span key={wi} className="inline-block whitespace-nowrap">
            {letters}
            {wi < arr.length - 1 ? "\u00A0" : ""}
          </span>
        );
      })}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════
   EDIT ALL PAGE TEXT HERE
   ═══════════════════════════════════════════════════════════ */
const CONTENT = {
  badge: "HRMS Client Workspace",
  headlineTop: "Your workforce,",
  headlineGradient: "always in view.",
  subtext:
    "Track your teams, attendance, deliverables and invoices in real time — one secure HRMS workspace built for clients and their employees.",
  marquee: [
    "Real-time employee visibility",
    "Attendance & performance",
    "Deliverable tracking",
    "Invoices & payroll",
    "Live chat with HR",
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

function Sheen() {
  return (
    <span
      className="lx-anim pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent"
      style={{ animation: "shineSweep 3.4s ease-in-out infinite" }}
      aria-hidden="true"
    />
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" d="M4 12a8 8 0 0 1 8-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon({ className = "h-3 w-3" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 13 4 4L19 7" />
    </svg>
  );
}

/* ═══════════════ Hero Scene — living client workspace ═══════════════ */
const SCENE = {
  avatars: [
    { i: "AK", c: "from-violet-500 to-fuchsia-500" },
    { i: "PR", c: "from-fuchsia-500 to-pink-500" },
    { i: "SM", c: "from-indigo-500 to-violet-500" },
    { i: "NJ", c: "from-purple-500 to-indigo-500" },
  ],
  bars: [45, 60, 52, 78, 70, 92, 66],
  tasks: ["Website redesign delivered", "Sprint 12 approved", "Monthly report shared"],
};

function HeroScene() {
  return (
    <div
      className="lx-anim relative mx-auto aspect-[10/9] w-full max-w-[380px] sm:max-w-[420px] lg:max-w-[380px] xl:max-w-[440px]"
      style={{ animation: "riseIn .9s cubic-bezier(.22,1,.36,1) .3s both" }}
      aria-hidden="true"
    >
      {/* dotted orbits */}
      <div className="lx-anim absolute inset-[4%] rounded-full border border-dashed border-fuchsia-300/25" style={{ animation: "orbit 40s linear infinite" }}>
        <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-fuchsia-400 shadow-[0_0_12px_rgba(232,121,249,.9)]" />
      </div>
      <div className="lx-anim absolute inset-[16%] rounded-full border border-dashed border-violet-300/20" style={{ animation: "orbit 28s linear infinite reverse" }}>
        <span className="absolute -bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-violet-300" />
      </div>

      {/* core glow */}
      <div className="absolute inset-[22%] rounded-full blur-[70px]" style={{ background: "radial-gradient(circle, rgba(217,70,239,.38), transparent 70%)" }} />

      {/* dashboard on stacked slabs */}
      <div className="lx-anim absolute left-1/2 top-1/2 flex w-[64%] -translate-x-1/2 -translate-y-[52%] flex-col items-center" style={{ animation: "floatY 7s ease-in-out infinite" }}>
        <div
          className="relative w-full rounded-2xl border border-white/15 bg-[#120c22]/90 p-3.5 backdrop-blur-xl"
          style={{ boxShadow: "0 30px 60px -20px rgba(124,58,237,.55), 0 10px 30px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.12)" }}
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">Your team today</p>
            <span className="relative flex h-2 w-2">
              <span className="lx-anim absolute inset-0 rounded-full bg-emerald-400" style={{ animation: "livePing 1.8s ease-out infinite" }} />
              <span className="relative h-2 w-2 rounded-full bg-emerald-400" />
            </span>
          </div>

          <div className="mt-2.5 flex items-center">
            {SCENE.avatars.map((a, i) => (
              <span
                key={a.i}
                className={`lx-anim -ml-1.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#120c22] bg-gradient-to-br ${a.c} text-[9px] font-bold text-white first:ml-0`}
                style={{ animation: `popIn .5s cubic-bezier(.34,1.56,.64,1) ${0.9 + i * 0.1}s both` }}
              >
                {a.i}
              </span>
            ))}
            <span className="ml-2 text-[10px] font-semibold text-white/50">+36 working</span>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <div className="relative h-14 w-14 shrink-0">
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="9" />
                <circle
                  cx="50" cy="50" r="42" fill="none" stroke="url(#clientRingGrad)" strokeWidth="9" strokeLinecap="round"
                  strokeDasharray="264" strokeDashoffset="264"
                  className="lx-anim"
                  style={{ animation: "ringDraw 1.6s cubic-bezier(.22,1,.36,1) 1.2s both" }}
                />
                <defs>
                  <linearGradient id="clientRingGrad" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0%" stopColor="#a78bfa" />
                    <stop offset="100%" stopColor="#e879f9" />
                  </linearGradient>
                </defs>
              </svg>
              <span className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                <span className="text-xs font-black text-white">92%</span>
                <span className="mt-0.5 text-[7px] uppercase tracking-wider text-white/45">on time</span>
              </span>
            </div>
            <div className="flex-1">
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/40">Deliverables</p>
              <div className="mt-1.5 flex h-9 items-end gap-1">
                {SCENE.bars.map((h, i) => (
                  <span
                    key={i}
                    className="lx-anim flex-1 rounded-t bg-gradient-to-t from-violet-600 to-fuchsia-400"
                    style={{
                      height: `${h}%`,
                      transformOrigin: "bottom",
                      animation: `barGrow .7s cubic-bezier(.22,1,.36,1) ${1.3 + i * 0.07}s both, barPulse 3s ease-in-out ${i * 0.3}s infinite`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {[
          { c: "from-violet-600 to-violet-400", w: "w-[86%]", d: ".55s" },
          { c: "from-fuchsia-600 to-fuchsia-400", w: "w-[93%]", d: ".65s" },
          { c: "from-indigo-600 to-indigo-400", w: "w-full", d: ".75s" },
        ].map((s, i) => (
          <div
            key={i}
            className={`lx-anim ${s.w} -mt-1 h-5 rounded-xl bg-gradient-to-r ${s.c}`}
            style={{
              animation: `popIn .6s cubic-bezier(.22,1,.36,1) ${s.d} both`,
              boxShadow: "inset 0 2px 0 rgba(255,255,255,.35), 0 18px 30px -12px rgba(0,0,0,.7)",
              zIndex: 3 - i,
            }}
          />
        ))}
      </div>

      {/* floating: attendance */}
      <div
        className="lx-anim absolute left-0 top-[9%] flex items-center gap-2.5 rounded-2xl border border-white/12 bg-[#120c22]/90 px-3 py-2.5 backdrop-blur-xl"
        style={{ animation: "popIn .6s cubic-bezier(.22,1,.36,1) 1.5s both, floatSoft 6s ease-in-out -1s infinite", boxShadow: "0 20px 40px -18px rgba(217,70,239,.5), 0 6px 20px rgba(0,0,0,.5)" }}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">
          <CheckIcon className="h-3.5 w-3.5" />
        </span>
        <div className="leading-tight">
          <p className="text-[11px] font-semibold text-white">Attendance 96%</p>
          <p className="text-[9px] text-white/45">Team checked in · 9:02 AM</p>
        </div>
      </div>

      {/* floating: deliverables checklist */}
      <div
        className="lx-anim absolute right-0 top-[18%] hidden w-[44%] rounded-2xl border border-white/12 bg-[#120c22]/90 p-3 backdrop-blur-xl sm:block"
        style={{ animation: "popIn .6s cubic-bezier(.22,1,.36,1) 1.7s both, floatSoft 7s ease-in-out -3s infinite", boxShadow: "0 20px 40px -18px rgba(139,92,246,.5), 0 6px 20px rgba(0,0,0,.5)" }}
      >
        <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/45">Deliverables</p>
        <ul className="mt-2 flex flex-col gap-1.5">
          {SCENE.tasks.map((t, i) => (
            <li key={t} className="flex items-center gap-2">
              <span
                className="lx-anim flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white"
                style={{ animation: `checkPop .5s cubic-bezier(.34,1.56,.64,1) ${2.1 + i * 0.35}s both` }}
              >
                <CheckIcon className="h-2.5 w-2.5" />
              </span>
              <span className="text-[10px] font-medium text-white/75">{t}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* floating: invoice */}
      <div
        className="lx-anim absolute bottom-[10%] left-[2%] w-[44%] rounded-2xl border border-white/12 bg-[#120c22]/90 p-3 backdrop-blur-xl"
        style={{ animation: "popIn .6s cubic-bezier(.22,1,.36,1) 1.9s both, floatSoft 8s ease-in-out -2s infinite", boxShadow: "0 20px 40px -18px rgba(99,102,241,.5), 0 6px 20px rgba(0,0,0,.5)" }}
      >
        <div className="flex items-center justify-between">
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/45">Invoice · Sept</p>
          <span className="text-[9px] font-bold text-emerald-300">Paid</span>
        </div>
        <p className="mt-1 text-base font-black text-white">₹4.80L</p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
          <span
            className="lx-anim block h-full w-full origin-left rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500"
            style={{ animation: "fillX 3.2s cubic-bezier(.22,1,.36,1) 2.2s infinite" }}
          />
        </div>
      </div>

      {/* floating: HR chat */}
      <div
        className="lx-anim absolute bottom-[6%] right-[2%] hidden items-center gap-2.5 rounded-2xl border border-white/12 bg-[#120c22]/90 px-3 py-2.5 backdrop-blur-xl sm:flex"
        style={{ animation: "popIn .6s cubic-bezier(.22,1,.36,1) 2.1s both, floatSoft 6.5s ease-in-out -4s infinite", boxShadow: "0 20px 40px -18px rgba(217,70,239,.5), 0 6px 20px rgba(0,0,0,.5)" }}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-500 text-[9px] font-bold text-white">HR</span>
        <div className="leading-tight">
          <p className="text-[11px] font-semibold text-white">HR is replying</p>
          <p className="flex items-center gap-1 text-[9px] text-white/45">
            Live chat
            <span className="ml-1 flex gap-0.5">
              {[0, 1, 2].map((d) => (
                <span key={d} className="lx-anim h-1 w-1 rounded-full bg-fuchsia-300" style={{ animation: `dotBounce 1.2s ease-in-out ${d * 0.15}s infinite` }} />
              ))}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ Magic Card ═══════════════ */
function MagicCard({ children, className = "" }) {
  const ref = useRef(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [hovered, setHovered] = useState(false);

  const onMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    el.style.setProperty("--cx", `${x}px`);
    el.style.setProperty("--cy", `${y}px`);
    setTilt({ rx: (y / r.height - 0.5) * -4, ry: (x / r.width - 0.5) * 6 });
  };
  const onLeave = () => {
    setTilt({ rx: 0, ry: 0 });
    setHovered(false);
  };

  return (
    <div style={{ perspective: "1400px" }} className={className}>
      <div
        ref={ref}
        onMouseMove={onMove}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={onLeave}
        className="lx-anim relative rounded-3xl p-px transition-transform duration-150 ease-out"
        style={{
          "--cx": "50%",
          "--cy": "0%",
          animation: "cardIn .9s cubic-bezier(.22,1,.36,1) .3s both",
          transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
          transformStyle: "preserve-3d",
        }}
      >
        <div className="absolute inset-0 rounded-3xl bg-white/10" aria-hidden="true" />
        <div
          className="absolute inset-0 rounded-3xl transition-opacity duration-500"
          style={{
            opacity: hovered ? 1 : 0.55,
            background:
              "radial-gradient(360px circle at var(--cx) var(--cy), rgba(232,121,249,1), rgba(139,92,246,.9) 35%, rgba(99,102,241,.35) 60%, transparent 80%)",
          }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -inset-10 rounded-[3rem] opacity-70"
          style={{ background: "radial-gradient(ellipse 60% 55% at 50% 40%, rgba(217,70,239,.22), transparent 70%)" }}
          aria-hidden="true"
        />
        <div
          className="relative overflow-hidden rounded-[calc(1.5rem-1px)] bg-[#0d0918]/95 backdrop-blur-2xl"
          style={{ boxShadow: "0 50px 100px -30px rgba(217,70,239,.4), 0 8px 30px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.08)" }}
        >
          <div
            className="pointer-events-none absolute inset-0 transition-opacity duration-500"
            style={{ opacity: hovered ? 1 : 0, background: "radial-gradient(420px circle at var(--cx) var(--cy), rgba(217,70,239,.14), transparent 70%)" }}
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-[.06]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.7) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
              maskImage: "radial-gradient(ellipse 90% 80% at 50% 0%, black 20%, transparent 100%)",
            }}
            aria-hidden="true"
          />
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <span className="lx-anim absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" style={{ animation: "shineSweep 7s ease-in-out infinite" }} />
          </div>
          <div className="relative">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default function ClientLogin() {
  const [loginType, setLoginType] = useState("admin");
  const [mode, setMode] = useState("password");
  const [form, setForm] = useState({ email: "", password: "", client_code: "" });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const navigate = useNavigate();
  const { login } = useClientAuth();

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
  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const endpoint =
        loginType === "admin" ? "/client/auth/login-admin" : "/client/auth/login-employee";
      const payload =
        loginType === "admin" ? form : { ...form, client_code: form.client_code };

      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}${endpoint}`, payload);
      login(res.data);

      if (loginType === "admin") navigate("/employees");
      else navigate("/sales");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const subtitle =
    loginType === "admin"
      ? "Sign in to your client workspace."
      : "Sign in with your client code to continue.";

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
      {[
        { l: "8%", t: "18%", d: "0s" }, { l: "16%", t: "72%", d: "-1.5s" }, { l: "28%", t: "34%", d: "-3s" }, { l: "44%", t: "12%", d: "-.8s" },
        { l: "58%", t: "82%", d: "-2.2s" }, { l: "72%", t: "22%", d: "-4s" }, { l: "84%", t: "58%", d: "-1s" }, { l: "93%", t: "30%", d: "-2.8s" },
      ].map((s, i) => (
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
            <span className="block text-lg font-bold tracking-wide">Client Portal</span>
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
            {/* account type */}
            <div className="grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-black/40 p-1" role="tablist" aria-label="Account type">
              <button type="button" role="tab" aria-selected={loginType === "admin"} onClick={() => setLoginType("admin")} className={segBtn(loginType === "admin")}>
                Client
              </button>
              <button type="button" role="tab" aria-selected={loginType === "employee"} onClick={() => setLoginType("employee")} className={segBtn(loginType === "employee")}>
                Employee
              </button>
            </div>

            {/* login method — client admin only */}
            {loginType === "admin" && (
              <div className="mt-2 grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-black/40 p-1" role="tablist" aria-label="Login method">
                <button type="button" role="tab" aria-selected={mode === "password"} onClick={() => setMode("password")} className={segBtn(mode === "password")}>
                  Password
                </button>
                <button type="button" role="tab" aria-selected={mode === "otp"} onClick={() => setMode("otp")} className={segBtn(mode === "otp")}>
                  OTP Login
                </button>
              </div>
            )}

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
            <p className="mt-1 text-sm text-white/45">{subtitle}</p>

            <div className="mt-5">
              {loginType === "admin" && mode === "otp" && (
                <OtpLogin
                  portal="client"
                  variant="glass"
                  onSuccess={(data) => {
                    login(data);
                    navigate("/employees");
                  }}
                />
              )}

              {(loginType !== "admin" || mode === "password") && (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div>
                    <label htmlFor="client-email" className={LABEL_CLASS}>Email address</label>
                    <div className="group relative">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/25 transition-colors duration-300 group-focus-within:text-fuchsia-300">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                          <rect x="3" y="5" width="18" height="14" rx="2" />
                          <path d="m3 7 9 6 9-6" />
                        </svg>
                      </span>
                      <input
                        id="client-email"
                        type={loginType === "employee" ? "text" : "email"}
                        name="email"
                        required
                        autoComplete="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder={loginType === "employee" ? "EMP-0001 or employee@email.com" : "you@company.com"}
                        className={INPUT_CLASS}
                      />
                    </div>
                  </div>

                  {loginType === "employee" && (
                    <div>
                      <label htmlFor="client-code" className={LABEL_CLASS}>Client code</label>
                      <div className="group relative">
                        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/25 transition-colors duration-300 group-focus-within:text-fuchsia-300">
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
                          </svg>
                        </span>
                        <input
                          id="client-code"
                          type="text"
                          name="client_code"
                          required
                          value={form.client_code || ""}
                          onChange={handleChange}
                          placeholder="Provided by your client admin"
                          className={INPUT_CLASS}
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label htmlFor="client-password" className={LABEL_CLASS}>Password</label>
                    <div className="group relative">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/25 transition-colors duration-300 group-focus-within:text-fuchsia-300">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                          <rect x="4" y="10" width="16" height="11" rx="2" />
                          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                        </svg>
                      </span>
                      <input
                        id="client-password"
                        type={showPass ? "text" : "password"}
                        name="password"
                        required
                        autoComplete="current-password"
                        value={form.password}
                        onChange={handleChange}
                        placeholder="Enter your password"
                        className={`${INPUT_CLASS} pr-12`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass((s) => !s)}
                        aria-label={showPass ? "Hide password" : "Show password"}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-white/35 transition-colors hover:text-white/80 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40"
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

                  <button disabled={loading} className={BTN_CLASS}>
                    <Sheen />
                    {loading ? (
                      <span className="relative inline-flex items-center justify-center gap-2">
                        <Spinner />
                        Signing in…
                      </span>
                    ) : (
                      <span className="relative inline-flex items-center justify-center gap-2">
                        Sign in as {loginType === "admin" ? "Client" : "Employee"}
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

            <p className="mt-5 text-center text-xs text-white/30">Trouble signing in? Contact your client administrator.</p>
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
        <p className="sr-only">Real-time employee visibility, attendance and performance, deliverable tracking, invoices and payroll, live chat with HR, role-based security</p>
      </footer>
    </div>
  );
}
