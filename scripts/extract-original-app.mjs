// One-off: turns the first budgetr prototype ("Budget2027.html") into the app served at /app.
//   node scripts/extract-original-app.mjs <path-to-Budget2027.html> [userId=kbj]
//
// Writes
//   public/budgetr-app/index.html     the app, WITHOUT any budget data (committed)
//   public/budgetr-app/vendor/*.js    jsPDF, jsPDF-AutoTable and SheetJS, split out of the HTML (committed)
//   public/private/<userId>.legacy.json  the embedded budget data (git-ignored, never committed)
//
// After the first run, public/budgetr-app/index.html is the source of truth and is edited directly;
// only re-run this to start over from the prototype.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const [src, userId = "kbj"] = process.argv.slice(2);
if (!src) {
  console.error("Usage: node scripts/extract-original-app.mjs <path-to-Budget2027.html> [userId]");
  process.exit(1);
}

const outer = readFileSync(src, "utf8");
const m = outer.match(/<script type="text\/plain" id="appSrc">([\s\S]*?)<\/script>/);
if (!m) throw new Error("No appSrc script in the file");
let html = m[1].replaceAll("@@ENDSCRIPT@@>", "</script>");

const must = (cond, msg) => {
  if (!cond) throw new Error(`Patch failed: ${msg}`);
};
const replaceOnce = (from, to, what) => {
  const n = html.split(from).length - 1;
  must(n === 1, `${what} (found ${n} times)`);
  html = html.replace(from, to);
};

// 1. Budget data → private file; the committed app gets an empty seed.
const seedRe = /(<script type="application\/json" id="seed">)([\s\S]*?)(<\/script>)/;
const seed = html.match(seedRe);
must(seed, "seed script");
JSON.parse(seed[2]); // validate
mkdirSync("public/private", { recursive: true });
writeFileSync(`public/private/${userId}.legacy.json`, seed[2]);
html = html.replace(seedRe, "$1null$3");

// 2. Vendor libraries → separate files.
mkdirSync("public/budgetr-app/vendor", { recursive: true });
const vendors = [
  { test: /^\s*\/\*\* @license\s*\*\s*\* jsPDF/, file: "jspdf.umd.min.js" },
  { test: /^\s*\/\*!\s*\*\s*\*\s*jsPDF AutoTable/, file: "jspdf.plugin.autotable.min.js" },
  { test: /^\s*\/\*! xlsx\.js/, file: "xlsx.full.min.js" },
];
for (const v of vendors) {
  let found = false;
  html = html.replace(/<script>([\s\S]*?)<\/script>/g, (all, body) => {
    if (found || !v.test.test(body)) return all;
    found = true;
    writeFileSync(`public/budgetr-app/vendor/${v.file}`, body);
    return `<script src="/budgetr-app/vendor/${v.file}"></script>`;
  });
  must(found, `vendor ${v.file}`);
}

// 3. Test-user layer: per-user storage key, private seed, redirect to /login without a session.
const prelude = `<script>
/* budgetr test-user layer (no password): the session is set by /login. Each user has their own storage key.
   A user's first visit loads /private/<user>.legacy.json if it exists (git-ignored real data), else the guide. */
(function(){
  var uid=null;try{uid=localStorage.getItem('budgetr:session')}catch(e){}
  if(!uid){location.replace('/login?next=/app');return}
  window.BUDGETR_USER=uid;window.BUDGETR_KEY='budgetr-app:'+uid;window.BUDGETR_SEED=null;
  var has=null;try{has=localStorage.getItem(window.BUDGETR_KEY)}catch(e){}
  if(!has){try{var x=new XMLHttpRequest();x.open('GET','/private/'+encodeURIComponent(uid)+'.legacy.json',false);x.send();
    if(x.status===200&&/^\\s*\\{/.test(x.responseText))window.BUDGETR_SEED=x.responseText}catch(e){}}
  document.addEventListener('DOMContentLoaded',function(){
    var n=document.getElementById('bxUser');if(n)n.textContent=uid.toUpperCase();
    var b=document.getElementById('btnUser');if(b)b.onclick=function(){try{localStorage.removeItem('budgetr:session')}catch(e){}location.href='/login?next=/app'};
  });
})();
</script>
`;
replaceOnce("<head>\n", `<head>\n${prelude}`, "head");
must(!html.includes("budgetr-mitbudget-") , "unexpected key variant");
const keyCount = html.split("'budgetr-mitbudget'").length - 1;
must(keyCount === 2, `storage key (found ${keyCount})`);
html = html.replaceAll("'budgetr-mitbudget'", "window.BUDGETR_KEY");
replaceOnce(
  "const sd=document.getElementById('seed');return sd?JSON.parse(sd.textContent):null",
  "return window.BUDGETR_SEED?JSON.parse(window.BUDGETR_SEED):null",
  "seed loader",
);

// 4. Header: who is logged in, switch user, link to the landing page.
replaceOnce(
  `<button type="button" class="tb" id="btnSet">`,
  `<a class="tb" href="/" title="Til forsiden">Forside</a>
      <span class="tsep" aria-hidden="true"></span>
      <span class="tb" title="Testbruger"><b id="bxUser"></b></span>
      <button type="button" class="tb" id="btnUser">Skift bruger</button>
      <span class="tsep" aria-hidden="true"></span>
      <button type="button" class="tb" id="btnSet">`,
  "settings button",
);

// 5. No real names in the committed app.
html = html.replace(/placeholder="fx Budget for [^"]*"/, 'placeholder="fx Budget for Anna og Jonas"');

writeFileSync("public/budgetr-app/index.html", html);
console.log(`public/budgetr-app/index.html ${(html.length / 1024).toFixed(0)} KB`);
console.log(`public/private/${userId}.legacy.json ${(seed[2].length / 1024).toFixed(0)} KB (git-ignored)`);
