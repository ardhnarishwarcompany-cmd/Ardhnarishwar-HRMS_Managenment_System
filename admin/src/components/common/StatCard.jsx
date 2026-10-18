/* KPI card — white 26px surface, uppercase label, gradient icon tile,
   big tabular number and a soft lavender disc in the corner. */
const TONES = {
  indigo: { tile: "var(--grad-tile)", fg: "#fff", shadow: "0 8px 18px rgba(124,58,237,.3)" },
  green: { tile: "linear-gradient(135deg,#059669,#34d399)", fg: "#fff", shadow: "0 8px 18px rgba(5,150,105,.3)" },
  amber: { tile: "linear-gradient(135deg,#d97706,#fbbf24)", fg: "#fff", shadow: "0 8px 18px rgba(217,119,6,.3)" },
  red: { tile: "linear-gradient(135deg,#e11d48,#fb7185)", fg: "#fff", shadow: "0 8px 18px rgba(225,29,72,.3)" },
};

function toneFor(gradient = "") {
  const g = gradient.toLowerCase();
  if (g.includes("green") || g.includes("emerald") || g.includes("teal")) return TONES.green;
  if (g.includes("amber") || g.includes("orange") || g.includes("yellow")) return TONES.amber;
  if (g.includes("red") || g.includes("rose") || g.includes("pink")) return TONES.red;
  return TONES.indigo;
}

export default function StatCard({ title, value, subText, icon, gradient }) {
  const tone = toneFor(gradient);
  return (
    <div className="adm-k">
      <div className="adm-k-top">
        <p className="adm-k-label">{title}</p>
        <span
          className="adm-k-ic"
          style={{ background: tone.tile, color: tone.fg, boxShadow: tone.shadow }}
        >
          {icon}
        </span>
      </div>
      <strong className="adm-k-value">{value}</strong>
      {subText ? <p className="adm-k-sub">{subText}</p> : null}
    </div>
  );
}
