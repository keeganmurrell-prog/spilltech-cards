// Builds the Spill Tech contact cards from staff.json.
//   public/<slug>/index.html  the page the QR code opens
//   public/<slug>.vcf         the contact file behind "Save to contacts"
//   print/qr/<slug>.svg       the QR code for the printer (not deployed)
import fs from "node:fs";
import path from "node:path";
import QRCode from "qrcode";

const root = path.dirname(new URL(import.meta.url).pathname);
const data = JSON.parse(fs.readFileSync(path.join(root, "staff.json"), "utf8"));
const { company: co, staff } = data;
const baseUrl = (process.env.SITE_URL || data.baseUrl).replace(/\/+$/, "");

const out = path.join(root, "public");
const printDir = path.join(root, "print", "qr");
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
fs.mkdirSync(printDir, { recursive: true });

const esc = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const vesc = (s = "") => String(s).replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");

// +27821234567 -> 082 123 4567
function displayPhone(e164) {
  const m = /^\+27(\d{2})(\d{3})(\d{4})$/.exec(e164 || "");
  return m ? `0${m[1]} ${m[2]} ${m[3]}` : e164;
}

const errors = [];
const slugs = new Set();
for (const p of staff) {
  if (!/^[a-z0-9-]+$/.test(p.slug || "")) errors.push(`bad slug: ${JSON.stringify(p.slug)}`);
  if (slugs.has(p.slug)) errors.push(`duplicate slug: ${p.slug}`);
  slugs.add(p.slug);
  if (!["active", "retired"].includes(p.status)) errors.push(`${p.slug}: status must be active or retired`);
  if (!p.firstName || !p.lastName) errors.push(`${p.slug}: firstName and lastName are required`);
  if (p.status === "active") {
    if (!/^\+\d{8,15}$/.test(p.mobile || "")) errors.push(`${p.slug}: mobile must look like +27821234567`);
    if (!/^[^@\s]+@[^@\s]+$/.test(p.email || "")) errors.push(`${p.slug}: email is missing or invalid`);
  }
}
if (errors.length) {
  console.error("staff.json has problems:\n  " + errors.join("\n  "));
  process.exit(1);
}

const css = `
:root{--black:#0C0C0C;--panel:#161616;--hover:#1F1F1F;--red:#E2001A;--red-hi:#FF1B33;--white:#FFFFFF;--grey:#9A9A9A;--rule:rgba(255,255,255,.14);color-scheme:dark}
*,*::before,*::after{box-sizing:border-box}
html,body{margin:0}
body{background:var(--black);color:var(--white);font-family:"Helvetica Neue",Helvetica,Arial,"Liberation Sans",sans-serif;font-size:16px;line-height:1.45;-webkit-font-smoothing:antialiased;padding:env(safe-area-inset-top,0) 0 env(safe-area-inset-bottom,0)}
:focus-visible{outline:2px solid var(--red-hi);outline-offset:3px}
.wrap{max-width:430px;margin:0 auto;padding:40px 26px}
.logo{font-weight:700;font-size:30px;letter-spacing:-.025em;margin:0}
.logo em{font-style:normal;color:var(--red)}
.tag{margin:4px 0 0;font-size:11px;font-weight:500;letter-spacing:.06em;color:var(--grey)}
.hair{height:2px;background:var(--red);margin:26px 0 34px}
.name{font-size:clamp(38px,11vw,50px);font-weight:700;letter-spacing:-.035em;line-height:1;margin:0}
.title{margin:14px 0 0}
.where{margin:3px 0 0;color:var(--grey)}
.msg{margin:22px 0 0;font-size:17px;line-height:1.5;color:var(--grey);max-width:34ch}
.msg strong{color:var(--white);font-weight:600}
.actions{margin-top:34px;display:flex;flex-direction:column;gap:8px}
.btn{display:flex;align-items:center;justify-content:space-between;gap:14px;width:100%;min-height:56px;padding:14px 18px;font:inherit;font-weight:600;text-decoration:none;background:var(--panel);color:var(--white);border:1px solid var(--rule);border-radius:2px;transition:background .13s,border-color .13s}
.btn .meta{font-weight:400;font-size:13px;color:var(--grey);overflow-wrap:anywhere;text-align:right}
.btn:hover{background:var(--hover);border-color:rgba(255,255,255,.3)}
.btn-primary{background:var(--red);border-color:var(--red);min-height:62px;font-size:17px}
.btn-primary .meta{color:rgba(255,255,255,.8)}
.btn-primary:hover{background:var(--red-hi);border-color:var(--red-hi)}
.pair{display:flex;gap:8px}.pair .btn{flex:1;justify-content:center}
.foot{margin-top:34px;padding-top:18px;border-top:1px solid var(--rule);font-size:13px;color:var(--grey)}
.foot a{color:var(--grey);text-decoration:none}.foot a:hover{color:var(--white)}
.foot div{margin-bottom:3px}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}`;

const head = (title) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#0C0C0C">
<title>${esc(title)}</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/card.css">
</head>
<body>
<div class="wrap">
  <p class="logo">SPILL <em>TECH</em></p>
  <p class="tag">${esc(co.tagline)}</p>
  <div class="hair"></div>`;

const host = co.website.replace(/^https?:\/\//, "");
const foot = `
  <div class="foot">
    <div>RSA <a href="tel:${esc(co.phoneRSA)}">${esc(co.phoneRSADisplay)}</a> · NAM <a href="tel:${esc(co.phoneNAM)}">${esc(co.phoneNAMDisplay)}</a></div>
    <div><a href="mailto:${esc(co.email)}">${esc(co.email)}</a></div>
    <div><a href="${esc(co.website)}">${esc(host)}</a></div>
  </div>
</div>
</body>
</html>
`;

function activePage(p) {
  const full = `${p.firstName} ${p.lastName}`;
  const wa = p.mobile.replace(/\D/g, "");
  const linkedin = p.linkedin
    ? `\n    <a class="btn" href="${esc(p.linkedin)}" target="_blank" rel="noopener"><span>LinkedIn</span><span class="meta">Profile</span></a>`
    : "";
  return `${head(`${full} — ${co.name}`)}
  <h1 class="name">${esc(p.firstName)}<br>${esc(p.lastName)}</h1>
  <p class="title">${esc(p.title || "")}</p>
  <p class="where">${esc([co.name, p.region].filter(Boolean).join(" · "))}</p>
  <div class="actions">
    <a class="btn btn-primary" href="/${p.slug}.vcf"><span>Save to contacts</span><span class="meta">One tap</span></a>
    <a class="btn" href="tel:${esc(p.mobile)}"><span>Call</span><span class="meta">${esc(displayPhone(p.mobile))}</span></a>
    <a class="btn" href="mailto:${esc(p.email)}"><span>Email</span><span class="meta">${esc(p.email)}</span></a>${linkedin}
    <div class="pair">
      <a class="btn" href="https://wa.me/${wa}">WhatsApp</a>
      <a class="btn" href="${esc(co.website)}" target="_blank" rel="noopener">Website</a>
    </div>
  </div>${foot}`;
}

function retiredPage(p) {
  return `${head(co.name)}
  <h1 class="name">No longer<br>with us</h1>
  <p class="msg"><strong>${esc(p.firstName)} ${esc(p.lastName)}</strong> has left ${esc(co.name)}. For anything they were handling, get in touch with the office and we will point you to the right person.</p>
  <div class="actions">
    <a class="btn btn-primary" href="tel:${esc(co.phoneRSA)}"><span>Call the office</span><span class="meta">${esc(co.phoneRSADisplay)}</span></a>
    <a class="btn" href="mailto:${esc(co.email)}"><span>Email</span><span class="meta">${esc(co.email)}</span></a>
    <a class="btn" href="${esc(co.website)}"><span>Website</span><span class="meta">${esc(host)}</span></a>
  </div>${foot}`;
}

function vcard(p) {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${vesc(p.lastName)};${vesc(p.firstName)};;;`,
    `FN:${vesc(`${p.firstName} ${p.lastName}`)}`,
    `ORG:${vesc(co.name)}`,
    p.title && `TITLE:${vesc(p.title)}`,
    `TEL;TYPE=CELL,VOICE:${p.mobile}`,
    `TEL;TYPE=WORK,VOICE:${co.phoneRSA}`,
    `EMAIL;TYPE=WORK,INTERNET:${p.email}`,
    `URL:${co.website}`,
    p.linkedin && `X-SOCIALPROFILE;TYPE=linkedin:${p.linkedin}`,
    p.region && `ADR;TYPE=WORK:;;;${vesc(p.region)};;;South Africa`,
    "END:VCARD",
  ];
  return lines.filter(Boolean).join("\r\n") + "\r\n";
}

fs.writeFileSync(path.join(out, "card.css"), css.trim() + "\n");
fs.writeFileSync(
  path.join(out, "favicon.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#0C0C0C"/><rect x="6" y="20" width="20" height="4" fill="#E2001A"/></svg>\n`
);
fs.writeFileSync(
  path.join(out, "404.html"),
  `${head(co.name)}
  <h1 class="name">Card not<br>found</h1>
  <p class="msg">This contact card does not exist. Get in touch with the office and we will point you to the right person.</p>
  <div class="actions">
    <a class="btn btn-primary" href="tel:${esc(co.phoneRSA)}"><span>Call the office</span><span class="meta">${esc(co.phoneRSADisplay)}</span></a>
    <a class="btn" href="${esc(co.website)}"><span>Website</span><span class="meta">${esc(host)}</span></a>
  </div>${foot}`
);

const summary = [];
for (const p of staff) {
  const dir = path.join(out, p.slug);
  fs.mkdirSync(dir, { recursive: true });
  if (p.status === "active") {
    fs.writeFileSync(path.join(dir, "index.html"), activePage(p));
    fs.writeFileSync(path.join(out, `${p.slug}.vcf`), vcard(p));
  } else {
    fs.writeFileSync(path.join(dir, "index.html"), retiredPage(p));
  }
  // The QR always points at the page, so a retired card keeps working.
  const url = `${baseUrl}/${p.slug}`;
  const svg = await QRCode.toString(url, { type: "svg", errorCorrectionLevel: "M", margin: 4, color: { dark: "#000000", light: "#FFFFFF" } });
  fs.writeFileSync(path.join(printDir, `${p.slug}.svg`), svg);
  const modules = QRCode.create(url, { errorCorrectionLevel: "M" }).modules.size;
  summary.push(`${p.status.padEnd(7)} ${url}  (${modules}×${modules} QR)`);
}
console.log(`Built ${staff.length} card(s) for ${baseUrl}\n  ` + summary.join("\n  "));
