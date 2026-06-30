const fs = require("fs");
const path = require("path");

const root = __dirname;
const shotsDir = path.join(root, "..", "screenshots");
const outDir = path.join(root, "frames");
const htmlDir = path.join(root, "html");
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(htmlDir, { recursive: true });

const fontDir = path.join(root, "fonts");
const mont600 = fs.readFileSync(path.join(fontDir, "mont-600.ttf")).toString("base64");
const mont800 = fs.readFileSync(path.join(fontDir, "mont-800.ttf")).toString("base64");

const copy = {
  "01-setup": { h: "Tu reproductor de medios", s: "Conecta tu servidor en segundos" },
  "03-peliculas": { h: "Tu biblioteca de películas", s: "Tu catálogo siempre contigo" },
  "04-series": { h: "Tus series favoritas", s: "Continúa donde lo dejaste" },
  "05-series-details": { h: "Explora cada título", s: "Temporadas, episodios y más" },
  "06-settings": { h: "Hecho a tu medida", s: "Control total y privacidad" },
};

const devices = {
  iphone: { w: 1284, h: 2778 },
  ipad: { w: 2048, h: 2732 },
};

function pngSize(file) {
  const buf = fs.readFileSync(file);
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

function frameHtml(device, shotPath, h, s) {
  const dim = devices[device];
  const isPad = device === "ipad";
  const shot = pngSize(shotPath);
  const shotRatio = shot.h / shot.w;

  const padTop = isPad ? 168 : 188;
  const markSize = isPad ? 40 : 38;
  const hSize = isPad ? 112 : 102;
  const sSize = isPad ? 50 : 45;

  const phoneOuterW = isPad ? Math.round(dim.w * 0.625) : Math.round(dim.w * 0.78);
  const bezel = isPad ? 20 : 18;
  const innerW = phoneOuterW - bezel * 2;
  const innerH = Math.round(innerW * shotRatio);
  const phoneOuterH = innerH + bezel * 2;
  const outerRadius = isPad ? 62 : 92;
  const innerRadius = outerRadius - bezel;
  const bottomBleed = isPad ? -90 : -150;

  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:'Mont';font-weight:600;src:url(data:font/ttf;base64,${mont600}) format('truetype');}
@font-face{font-family:'Mont';font-weight:800;src:url(data:font/ttf;base64,${mont800}) format('truetype');}
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:${dim.w}px;height:${dim.h}px;overflow:hidden;}
body{
  position:relative;
  background:
    radial-gradient(95% 60% at 50% -10%, rgba(212,170,125,0.40) 0%, rgba(212,170,125,0) 58%),
    radial-gradient(75% 55% at 112% 14%, rgba(212,170,125,0.18) 0%, rgba(212,170,125,0) 52%),
    radial-gradient(90% 65% at -18% 95%, rgba(212,170,125,0.14) 0%, rgba(212,170,125,0) 52%),
    linear-gradient(155deg,#37312b 0%,#272320 32%,#1b1a18 68%,#131211 100%);
  font-family:'Mont',-apple-system,sans-serif;
  color:#fff;
}
body::before{
  content:"";position:absolute;inset:0;pointer-events:none;
  background-image:radial-gradient(rgba(255,255,255,0.055) 1.5px, transparent 1.7px);
  background-size:40px 40px;
  -webkit-mask-image:radial-gradient(135% 95% at 50% 0%, #000 0%, transparent 68%);
  mask-image:radial-gradient(135% 95% at 50% 0%, #000 0%, transparent 68%);
  opacity:0.55;
}
body::after{
  content:"";position:absolute;inset:0;pointer-events:none;
  background:radial-gradient(125% 85% at 50% 40%, transparent 52%, rgba(0,0,0,0.5) 100%);
}
.wrap{position:absolute;inset:0;z-index:3;display:flex;flex-direction:column;align-items:center;padding-top:${padTop}px;}
.mark{font-weight:800;font-size:${markSize}px;letter-spacing:3px;text-transform:uppercase;color:#fff;opacity:0.9;}
.mark b{color:#D4AA7D;}
.headline{font-weight:800;font-size:${hSize}px;line-height:1.03;text-align:center;max-width:${Math.round(dim.w*0.84)}px;margin-top:${isPad?52:60}px;letter-spacing:-1.5px;text-shadow:0 4px 30px rgba(0,0,0,0.4);}
.sub{font-weight:600;font-size:${sSize}px;color:#D4AA7D;text-align:center;margin-top:${isPad?26:30}px;letter-spacing:0.2px;opacity:0.96;}
.accent{width:80px;height:5px;border-radius:3px;background:#D4AA7D;margin-top:${isPad?38:44}px;opacity:0.9;}
.stage{position:absolute;z-index:3;left:50%;transform:translateX(-50%);bottom:${bottomBleed}px;width:${phoneOuterW}px;height:${phoneOuterH}px;}
.glow{position:absolute;left:50%;top:46%;transform:translate(-50%,-50%);width:${Math.round(phoneOuterW*1.35)}px;height:${Math.round(phoneOuterH*0.9)}px;background:radial-gradient(closest-side, rgba(212,170,125,0.22), rgba(212,170,125,0) 75%);filter:blur(20px);}
.device{
  position:relative;
  width:${phoneOuterW}px;
  height:${phoneOuterH}px;
  padding:${bezel}px;
  border-radius:${outerRadius}px;
  background:linear-gradient(150deg,#48464a 0%,#2a282b 26%,#161517 60%,#050505 100%);
  box-shadow:
    0 60px 150px rgba(0,0,0,0.62),
    0 18px 50px rgba(0,0,0,0.5),
    inset 0 0 0 1.5px rgba(255,255,255,0.10),
    inset 0 0 0 ${bezel}px rgba(0,0,0,0.55);
}
.screen{
  display:block;
  width:${innerW}px;
  height:${innerH}px;
  object-fit:cover;
  object-position:top center;
  border-radius:${innerRadius}px;
}
</style></head><body>
<div class="wrap">
  <div class="mark">Mi<b>ra</b></div>
  <div class="headline">${h}</div>
  <div class="sub">${s}</div>
  <div class="accent"></div>
</div>
<div class="stage">
  <div class="glow"></div>
  <div class="device"><img class="screen" src="file://${shotPath}"></div>
</div>
</body></html>`;
}

const jobs = [];
for (const device of Object.keys(devices)) {
  for (const key of Object.keys(copy)) {
    const shot = path.join(shotsDir, `${device}-${key}.png`);
    if (!fs.existsSync(shot)) continue;
    const { h, s } = copy[key];
    const html = frameHtml(device, shot, h, s);
    const htmlPath = path.join(htmlDir, `${device}-${key}.html`);
    fs.writeFileSync(htmlPath, html);
    jobs.push({ device, htmlPath, out: path.join(outDir, `${device}-${key}.png`), w: devices[device].w, hpx: devices[device].h });
  }
}
fs.writeFileSync(path.join(root, "jobs.json"), JSON.stringify(jobs, null, 2));
console.log(`generated ${jobs.length} html frames`);
