import crypto from "crypto";
import { db } from "../../config/db.js";
import { protect } from "../../middleware/auth.middleware.js";

/**
 * Access + "live sync" helpers for the Website Forms inbox.
 *
 * LIVE server (recruweb):   set WEBFORMS_SERVICE_KEY=<long random string>
 *   -> a trusted server (your local backend) may call the inbox routes with
 *      header  X-Service-Key: <that key>   (no user login needed).
 *
 * LOCAL server (dev):       set WEBFORMS_UPSTREAM_URL=https://<live-backend>/api
 *                               WEBFORMS_UPSTREAM_KEY=<same long random string>
 *   -> the local user logs in locally as usual, but every inbox request is
 *      forwarded to the live backend, so the real Recruweb contact-form
 *      submissions are shown / replied / edited / deleted there.
 */

const safeEqual = (a = "", b = "") => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

const upstreamUrl = () => (process.env.WEBFORMS_UPSTREAM_URL || "").replace(/\/+$/, "");

const headerStr = (v, max = 150) => String(Array.isArray(v) ? v[0] : v ?? "").trim().slice(0, max);

// Names travel between servers URI-encoded so non-ASCII (e.g. Devanagari) survives HTTP headers
const decodeName = (v) => {
  try {
    return decodeURIComponent(headerStr(v, 600)).slice(0, 150);
  } catch {
    return headerStr(v);
  }
};

const ADMIN_ROLES = /^(SUPER_ADMIN|MANAGER|TL)$/i;

/**
 * Who is acting on this request? Portal JWTs differ: super-admin tokens carry
 * name/email, HR tokens only id/employee_id/role. Look the display name up so
 * replies are never signed with a bare role like "hr".
 * Returns { id, name, role, email }.
 */
export const resolveActor = async (req) => {
  const u = req.user || {};
  const role = String(u.role || "");
  const id = u.id ?? u.employee_id ?? u.userId ?? null;
  let name = String(u.name || u.fullName || "").trim();
  let email = String(u.email || "").trim();

  if (!name && id != null && id !== "") {
    const table = ADMIN_ROLES.test(role) ? "super_admins" : "employees";
    try {
      const [[row]] = await db.query(`SELECT name, email FROM ${table} WHERE id = ? LIMIT 1`, [id]);
      if (row) {
        name = String(row.name || "").trim();
        email = email || String(row.email || "").trim();
      }
    } catch {
      /* table/column mismatch on an older DB — fall back to defaults below */
    }
  }

  if (!name) name = email || "HR Team";
  return { id, name: name.slice(0, 150), role, email };
};

/* Auth: valid service key (live side) OR normal logged-in role */
export const inboxAuth = (roles) => {
  const jwtGuard = protect(roles);
  return (req, res, next) => {
    const sent = req.headers["x-service-key"];
    const expected = process.env.WEBFORMS_SERVICE_KEY || "";
    if (sent && expected.length >= 24 && safeEqual(sent, expected)) {
      const actingId = headerStr(req.headers["x-acting-user-id"], 50);
      const actingRole = headerStr(req.headers["x-acting-role"], 30);
      req.user = {
        id: actingId || null,
        name: decodeName(req.headers["x-acting-user"]) || "HR Team",
        role: actingRole || "SERVICE",
      };
      req.viaServiceKey = true;
      return next();
    }
    return jwtGuard(req, res, next);
  };
};

const upstreamProblem = (res, base, message) =>
  res.status(502).json({ success: false, upstream: base, message });

/* Local dev: forward the request to the live backend (if configured) */
export const forwardToLive = async (req, res, next) => {
  const base = upstreamUrl();
  if (!base) return next(); // we ARE the live server (or no sync wanted)
  if (req.viaServiceKey) return next(); // already forwarded to us — never bounce it onward again
  const key = process.env.WEBFORMS_UPSTREAM_KEY;
  if (!key)
    return res.status(500).json({
      success: false,
      message: "WEBFORMS_UPSTREAM_KEY missing in backend .env",
    });

  try {
    const actor = await resolveActor(req);
    const qs = req.originalUrl.includes("?") ? req.originalUrl.slice(req.originalUrl.indexOf("?")) : "";
    const target = `${base}/web-forms${req.path}${qs}`;
    const hasBody = !["GET", "HEAD", "DELETE"].includes(req.method);
    const headers = {
      "Content-Type": "application/json",
      "X-Service-Key": key,
      "X-Acting-User": encodeURIComponent(actor.name),
      "X-Acting-Role": headerStr(actor.role, 30),
    };
    if (actor.id != null && actor.id !== "") headers["X-Acting-User-Id"] = headerStr(actor.id, 50);

    const r = await fetch(target, {
      method: req.method,
      headers,
      body: hasBody ? JSON.stringify(req.body || {}) : undefined,
      signal: AbortSignal.timeout(30000),
    });
    const text = await r.text();
    const isJson = (r.headers.get("content-type") || "").includes("application/json");

    // The live server is still on a build without these routes (Express/nginx HTML 404)
    if (r.status === 404 && !isJson)
      return upstreamProblem(
        res,
        base,
        `Live server (${base}) is running an older backend without Website Forms v2. Deploy the updated backend and restart it (pm2).`,
      );
    // Never relay an auth failure from live as-is: the portals treat 401 as "your session expired" and log the user out
    if (r.status === 401 || r.status === 403)
      return upstreamProblem(
        res,
        base,
        `Live server (${base}) rejected the service key. Set WEBFORMS_SERVICE_KEY in the LIVE backend .env to the same value as local WEBFORMS_UPSTREAM_KEY and restart it.`,
      );
    if (!isJson)
      return upstreamProblem(res, base, `Live server (${base}) returned an unexpected ${r.status} response.`);

    res.status(r.status).type("application/json").send(text);
  } catch (e) {
    upstreamProblem(res, base, `Could not reach live server (${base}): ${e.message}`);
  }
};
