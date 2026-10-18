// Cleans up free-text values (spelling of common short forms, capitalisation)
const SMALL = new Set(["of", "and", "the", "in", "for", "at", "on", "to", "a", "an", "de", "la"]);

const ACRONYMS = new Set(
  "IIT NIT IIM IIIT IISER IISC BITS AIIMS MDU KUK UP MP HP JK DU JNU BHU AMU IGNOU NIOS CBSE ICSE ISC CISCE UGC AICTE BCA MCA BBA MBA BMS BBM PGDM LLB LLM MBBS BDS BAMS BHMS BHM BFA MFA BJMC MJMC BPT MPT BSW MSW BPA BE ME MD MS MA BA IT CSE ECE EEE AI ML HR VLSI GIS SRM VIT LPU GGSIPU IP NMIMS ICFAI KIIT MIT DIT JSS SVKM NIFT NID TISS XLRI FMS DTU NSUT MAIT BPIT JIIT GLA GNA RIMT CT SGT DAV KIET ABES IMS COEP VJTI PEC PSG CMR REVA PES BMS RV MSRIT CBIT CVR GITAM SASTRA ISBM LNCT RGPV JECRC LNMIIT NIIT UPES JMI AKTU JNTU JNTUH SPPU GTU VTU KLE JC BML MM SOA KK GD OP SK AP BR DY HBSE BSEB RBSE MPBSE PSEB UBSE HPBOSE GSEB KSEAB BSEAP WBBSE WBCHSE JAC CGBSE JKBOSE IB IGCSE CIE CA CS ICWA CMA CFA FRM PGDCA DCA ADCA NCC NSS".split(" ")
);

const ABBR = {
  engg: "Engineering",
  engineering: "Engineering",
  mgmt: "Management",
  mgt: "Management",
  univ: "University",
  uni: "University",
  inst: "Institute",
  clg: "College",
  coll: "College",
  govt: "Government",
  gov: "Government",
  "&": "and",
  tech: "Technology",
  technlogy: "Technology",
  technolgy: "Technology",
  comp: "Computer",
  elec: "Electrical",
  elex: "Electronics",
  chem: "Chemical",
  maths: "Mathematics",
  math: "Mathematics",
  eco: "Economics",
  commerse: "Commerce",
  comerce: "Commerce",
  managment: "Management",
  mangement: "Management",
  enginering: "Engineering",
  engeneering: "Engineering",
  engineerng: "Engineering",
  sceince: "Science",
  sciance: "Science",
  scince: "Science",
  universty: "University",
  unversity: "University",
  univercity: "University",
  universiy: "University",
  colege: "College",
  collage: "College",
  insitute: "Institute",
  institue: "Institute",
  teknology: "Technology",
};

// words that should NOT be expanded even though they are in ABBR (when the whole value is one of these short degree names)
const KEEP_AS_IS = new Set(["tech"]);

const keyOf = (x) => String(x || "").toLowerCase().replace(/[^a-z0-9]/g, "");

export const makeKey = keyOf;

function fixToken(tok, idx) {
  if (!/[A-Za-z]/.test(tok)) return tok;
  const low = tok.toLowerCase();
  const bare = low.replace(/[^a-z]/g, "");
  const up = tok.toUpperCase();

  // initials like A.P.J. or B.R.
  if (/^([A-Za-z]\.){2,}[A-Za-z]?\.?$/.test(tok)) return up;
  if (ACRONYMS.has(up.replace(/[^A-Z]/g, "")) && tok.replace(/[A-Za-z]/g, "").length === 0) return up;
  if (idx > 0 && SMALL.has(low)) return low;
  if (ABBR[bare] && !KEEP_AS_IS.has(bare) && /^[a-z]+$/.test(low)) return ABBR[bare];
  // keep tokens like B.Tech, M.Sc in sensible case
  if (/^[A-Za-z]{1,2}\.[A-Za-z]+\.?$/.test(tok)) {
    const [a, ...rest] = tok.split(".");
    return a.toUpperCase() + "." + rest.join(".").charAt(0).toUpperCase() + rest.join(".").slice(1).toLowerCase();
  }
  return low.charAt(0).toUpperCase() + low.slice(1);
}

export function titleCase(input) {
  const clean = String(input || "").trim().replace(/\s+/g, " ");
  if (!clean) return "";
  const parts = clean.split(/([\s\-/(),]+)/);
  let wordIdx = 0;
  return parts.map((p) => (/[A-Za-z]/.test(p) ? fixToken(p, wordIdx++) : p)).join("");
}

// If the typed value matches an existing option ignoring case, spaces and dots, use that option's spelling.
export function normalizeValue(value, options = []) {
  const clean = String(value || "").trim().replace(/\s+/g, " ");
  if (!clean) return "";
  const k = keyOf(clean);
  const hit = options.find((o) => keyOf(o) === k);
  if (hit) return hit;
  return titleCase(clean);
}

export function mergeOptions(base = [], extras = []) {
  const seen = new Set();
  const out = [];
  [...base, ...extras].forEach((o) => {
    const k = keyOf(o);
    if (k && !seen.has(k)) {
      seen.add(k);
      out.push(o);
    }
  });
  return out;
}

export const hasOption = (options, value) => {
  const k = keyOf(value);
  return options.some((o) => keyOf(o) === k);
};
