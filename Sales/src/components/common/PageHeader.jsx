import { useEffect, useState } from "react";
import { getTodayBirthdays } from "../../services/notificationService";

/**
 * Gradient hero banner used at the top of every Sales page.
 *
 * props
 *  - title / desc      : page heading and one-line description
 *  - eyebrow           : small uppercase label above the title
 *  - actions           : optional node rendered on the right (use .btn-on-brand / .btn-on-brand-ghost)
 *  - children          : alias for `actions`
 *
 * Bell / logout / theme live in the top bar; this component only keeps the
 * once-per-day birthday slide-in toasts that previously lived here.
 */
export default function PageHeader({ title, desc, eyebrow = "Sales Control Center", actions, children }) {
  const [slides, setSlides] = useState([]);

  useEffect(() => {
    let timer;
    (async () => {
      try {
        const res = await getTodayBirthdays();
        const list = res?.data?.data || [];
        const todayKey = `birthday_seen_${new Date().toDateString()}`;
        if (!localStorage.getItem(todayKey) && list.length > 0) {
          setSlides(list.map((b) => ({ id: b.id, message: `Happy Birthday ${b.name}` })));
          timer = setTimeout(() => setSlides([]), 10000 + list.length * 2000);
          localStorage.setItem(todayKey, "true");
        }
      } catch (err) {
        console.log(err);
      }
    })();
    return () => clearTimeout(timer);
  }, []);

  const right = actions ?? children;

  return (
    <>
      <section className="sp-hero mb-6 px-5 py-6 sm:px-8 sm:py-8">
        <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/75">{eyebrow}</p>
            )}
            <h1 className="mt-1.5 text-balance text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-[2.6rem]">
              {title}
            </h1>
            {desc && <p className="mt-2 max-w-2xl text-pretty text-sm text-white/85 sm:text-base">{desc}</p>}
          </div>
          {right && <div className="flex shrink-0 flex-wrap items-center gap-2.5 md:justify-end">{right}</div>}
        </div>
      </section>

      <div className="pointer-events-none fixed left-0 top-24 z-50 w-full">
        {slides.map((s, index) => (
          <div
            key={s.id}
            className="animate-slide-across absolute left-0 rounded-2xl border border-white/70 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-float"
            style={{ top: `${index * 60}px`, animationDelay: `${index * 1.5}s` }}
          >
            {s.message}
          </div>
        ))}
      </div>
    </>
  );
}
