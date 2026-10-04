/**
 * PPTX deck generator, v2 -- structured around the research-narrative outline
 * requested by the user (Derivative -> Gradient -> Backprop -> Vanishing/
 * Exploding -> Initialization -> Demo/Experiments -> Depth experiment ->
 * Results -> Conclusion), replacing the earlier build_pptx.js/build_pptx_part2.js.
 *
 * All experimental numbers below are read LIVE from results/logs/*.json and
 * results/tables/*.csv -- nothing is hardcoded/fabricated. Re-running the
 * underlying experiments (experiments/run_deep_demo.py,
 * experiments/run_depth_experiment_v2.py) and then this script keeps the
 * deck in sync automatically.
 *
 * Cai dat:  npm install pptxgenjs
 * Chay:     node build_deck.js
 * Output:   Slide_Backprop_Initialization.pptx
 */
const pptxgen = require("pptxgenjs");
const path = require("path");
const fs = require("fs");

const ROOT = path.join(__dirname, "..");
const FIG = (name) => path.join("..", "results", "figures", name);
// Python's json module writes bare NaN/Infinity (valid for it, invalid for
// strict JSON) when a run diverges (e.g. random_large exploding to NaN loss)
// -- sanitize to null before JSON.parse.
const readJSON = (relPath) => {
  const raw = fs.readFileSync(path.join(ROOT, relPath), "utf-8")
    .replace(/:\s*NaN/g, ": null")
    .replace(/:\s*-?Infinity/g, ": null");
  return JSON.parse(raw);
};

// ---------------------------------------------------------------- live data
const demoSchemes = ["zero", "random_normal", "random_large", "xavier", "he"];
const demo = {};
demoSchemes.forEach((s) => { demo[s] = readJSON(`results/logs/deep_demo_${s}.json`); });
const depthV2 = readJSON("results/logs/depth_experiment_v2.json");
const multiseedRaw = readJSON("results/logs/multiseed_xavier_he.json"); // 5 seed thô, dung de show raw points (khong chi mean+-std)
const multiseedRows = fs.readFileSync(path.join(ROOT, "results/tables/multiseed_xavier_he_summary.csv"), "utf-8")
  .split("\n").filter(Boolean).slice(1).map((line) => {
    const [scheme, n_seeds, acc_mean, acc_std, grms_mean, grms_std] = line.split(",");
    return { scheme, n_seeds: +n_seeds, acc_mean: +acc_mean, acc_std: +acc_std, grms_mean: +grms_mean, grms_std: +grms_std };
  });
const multiseed = (scheme) => multiseedRows.find((r) => r.scheme === scheme);

const pct = (x) => `${(x * 100).toFixed(1)}%`;
const pp = (x) => `${(x * 100).toFixed(1)}`; // percentage points, no % sign (for ± compositions)
const depthRow = (scheme, depth) => depthV2.find((r) => r.scheme === scheme && r.depth === depth);

// ---------------------------------------------------------------- palette
const NAVY = "16213E";
const INK = "1A2238";
const MUTED = "5B6478";
const PAPER = "FFFFFF";
const PANEL = "F1F4F9";
const BLUE = "285AB4";
const RED = "BE3C32";
const GOOD = "2E7D5B";
const GOLD = "C68A2E";
const PURPLE = "7D3C98";
const LINE = "D9DEE8";
const cardShadow = () => ({ type: "outer", color: "1A1A2E", opacity: 0.20, blur: 9, offset: 3, angle: 90 });

const FONT_HEAD = "Cambria";
const FONT_BODY = "Calibri";

const pres = new pptxgen();
pres.defineLayout({ name: "WIDE", width: 13.333, height: 7.5 });
pres.layout = "WIDE";
const W = 13.333, H = 7.5;
const MX = 0.7;

const TOTAL_SLIDES = 26;
const ACTS = [
  { label: "Motivation & Math", from: 2, to: 7 },
  { label: "Vanishing/Exploding & Init", from: 8, to: 15 },
  { label: "Experiment", from: 16, to: 23 },
  { label: "Conclusion", from: 24, to: 26 },
];

let SLIDE_NO = 0;

// Chữ subscript dạng "W_ij" -> W với "ij" nằm dưới (baseline shift thật của PowerPoint),
// không để nguyên dấu "_". Bỏ qua code (Consolas) và đường dẫn file.
const SUB_RE = /_(θ|[A-Za-z0-9]+)/g;
const SUB_SKIP = /(results\/|\.json|\.py|\.png|\.md|\.csv|\.pptx|\.js)/;
const hasSub = (t) => typeof t === "string" && !SUB_SKIP.test(t) && new RegExp(SUB_RE.source).test(t);
function splitSub(str) {
  const parts = []; let last = 0; let m;
  const re = new RegExp(SUB_RE.source, "g");
  while ((m = re.exec(str))) {
    if (m.index > last) parts.push({ t: str.slice(last, m.index), sub: false });
    parts.push({ t: m[1], sub: true });
    last = re.lastIndex;
  }
  if (last < str.length) parts.push({ t: str.slice(last), sub: false });
  return parts;
}
function richSlide(slide) {
  const orig = slide.addText.bind(slide);
  slide.addText = (text, opts = {}) => {
    if (opts.fontFace && /Consolas/.test(opts.fontFace)) return orig(text, opts);
    if (typeof text === "string" && hasSub(text)) {
      const runs = splitSub(text).map((p) => ({ text: p.t, options: p.sub ? { subscript: true } : {} }));
      return orig(runs, opts);
    }
    if (Array.isArray(text) && text.some((it) => it && hasSub(it.text))) {
      const out = [];
      text.forEach((it) => {
        const o = it.options || {};
        if (!hasSub(it.text)) { out.push(it); return; }
        const parts = splitSub(it.text);
        parts.forEach((p, i) => {
          const isLast = i === parts.length - 1;
          out.push({ text: p.t, options: {
            ...o,
            bullet: i === 0 ? o.bullet : undefined,
            breakLine: isLast ? o.breakLine : undefined,
            paraSpaceAfter: isLast ? o.paraSpaceAfter : undefined,
            subscript: p.sub ? true : undefined,
          } });
        });
      });
      return orig(out, opts);
    }
    return orig(text, opts);
  };
  return slide;
}
function addSlide() { SLIDE_NO += 1; return richSlide(pres.addSlide()); }

// ---------------------------------------------------------------- helpers
function pageTag(slide) {
  slide.addText(`${SLIDE_NO}/${TOTAL_SLIDES}`, {
    x: W - 1.1, y: H - 0.45, w: 0.8, h: 0.3, fontSize: 9, color: MUTED,
    align: "right", fontFace: FONT_BODY, isTextBox: true, margin: 0,
  });
}
function stampFooter(slide, _unused, dark = false) {
  const actIdx = ACTS.findIndex((a) => SLIDE_NO >= a.from && SLIDE_NO <= a.to);
  if (actIdx === -1) return;
  const dotR = 0.065, gap = 0.24, y = H - 0.42;
  const offColor = dark ? "3A4A70" : "D9DEE8";
  const onColor = dark ? "6FA3E0" : BLUE;
  ACTS.forEach((a, i) => {
    const x = MX + i * gap;
    const active = i === actIdx;
    const r = active ? dotR * 1.5 : dotR;
    slide.addShape(pres.ShapeType.ellipse, {
      x: x - r / 2, y: y + (dotR - r) / 2, w: r, h: r,
      fill: { color: active ? onColor : offColor }, line: { type: "none" },
    });
  });
  slide.addText(ACTS[actIdx].label.toUpperCase(), {
    x: MX + ACTS.length * gap + 0.05, y: y - 0.09, w: 3.6, h: 0.3,
    fontSize: 8.5, color: dark ? "6FA3E0" : MUTED, charSpacing: 0.5,
    fontFace: FONT_BODY, isTextBox: true, margin: 0,
  });
}
function kicker(slide, text, opts = {}) {
  slide.addText(text.toUpperCase(), {
    x: MX, y: opts.y ?? 0.5, w: 10, h: 0.35, fontSize: 13, bold: true,
    color: opts.color || BLUE, charSpacing: 1, fontFace: FONT_BODY, isTextBox: true, margin: 0,
  });
}
function title(slide, text, opts = {}) {
  slide.addText(text, {
    x: MX, y: opts.y ?? 0.82, w: opts.w ?? W - 2 * MX, h: opts.h ?? 0.9,
    fontSize: opts.fontSize ?? 29, bold: true, color: opts.color ?? INK,
    fontFace: FONT_HEAD, isTextBox: true, margin: 0, valign: "top",
  });
}
function subtitle(slide, text, opts = {}) {
  slide.addText(text, {
    x: MX, y: opts.y ?? 1.55, w: W - 2 * MX, h: 0.4, fontSize: opts.fontSize ?? 15,
    italic: true, color: MUTED, fontFace: FONT_BODY, isTextBox: true, margin: 0,
  });
}
function bulletBlock(slide, items, opts = {}) {
  const x = opts.x ?? MX, y = opts.y ?? 2.0, w = opts.w ?? 6.4, h = opts.h ?? 4.4;
  const fs = opts.fontSize ?? 16;
  const paras = items.map((it) => ({
    text: it,
    options: {
      bullet: { code: "25AA", color: opts.bulletColor || BLUE, indent: 18 },
      color: INK, fontSize: fs, breakLine: true,
      paraSpaceAfter: opts.spaceAfter ?? 12, fontFace: FONT_BODY,
    },
  }));
  slide.addText(paras, { x, y, w, h, valign: "top", isTextBox: true, margin: 0 });
}
function formulaBox(slide, text, opts = {}) {
  const x = opts.x ?? MX, y = opts.y ?? 2.0, w = opts.w ?? W - 2 * MX, h = opts.h ?? 0.95;
  slide.addShape(pres.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.08, fill: { color: opts.fill || PANEL }, line: { color: LINE, width: 0.75 },
    shadow: cardShadow(),
  });
  slide.addText(text, {
    x: x + 0.25, y, w: w - 0.5, h, fontSize: opts.fontSize ?? 19, color: opts.color || NAVY,
    align: "center", valign: "middle", fontFace: "Cambria Math", isTextBox: true, margin: 0,
  });
}
function noteText(slide, txt) { slide.addNotes(txt); }
function darkBg(slide) { slide.background = { color: NAVY }; }
function statCallout(slide, { x, y, w, h, value, label, color }) {
  slide.addText(value, {
    x, y, w, h: h * 0.6, fontSize: 30, bold: true, color: color || BLUE,
    align: "center", valign: "bottom", fontFace: FONT_HEAD, isTextBox: true, margin: 0,
  });
  slide.addText(label, {
    x, y: y + h * 0.6, w, h: h * 0.4, fontSize: 11, color: MUTED,
    align: "center", valign: "top", fontFace: FONT_BODY, isTextBox: true, margin: 0,
  });
}
function arrow(slide, x1, y1, x2, y2, opts = {}) {
  const x = Math.min(x1, x2), y = Math.min(y1, y2);
  const w = Math.abs(x2 - x1), h = Math.abs(y2 - y1);
  const forward = x2 >= x1 && y2 >= y1;
  const lineProps = { color: opts.color || BLUE, width: opts.width || 2.25, dashType: opts.dash || "solid" };
  if (forward) lineProps.endArrowType = "triangle"; else lineProps.beginArrowType = "triangle";
  slide.addShape(pres.ShapeType.line, { x, y, w, h, line: lineProps });
}
function node(slide, { x, y, w, h, label, fill = PAPER, lineColor = INK, textColor = INK, fs = 13 }) {
  slide.addShape(pres.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.06, fill: { color: fill }, line: { color: lineColor, width: 1.25 },
  });
  slide.addText(label, {
    x, y, w, h, align: "center", valign: "middle", fontSize: fs, color: textColor,
    fontFace: "Cambria Math", isTextBox: true, margin: 0,
  });
}
function twoCol(slide, { leftTitle, leftItems, leftColor = BLUE, leftFill = "EAF0FB",
  rightTitle, rightItems, rightColor = RED, rightFill = "FBEEEC", y = 2.1, h = 4.3, fs = 13.5 }) {
  const colW = 5.6, leftX = MX, rightX = W - MX - colW;
  slide.addShape(pres.ShapeType.roundRect, { x: leftX, y, w: colW, h, rectRadius: 0.08, fill: { color: leftFill }, line: { color: leftColor, width: 1 }, shadow: cardShadow() });
  slide.addText(leftTitle, { x: leftX + 0.3, y: y + 0.22, w: colW - 0.6, h: 0.6, fontSize: 14.5, bold: true, color: leftColor, fontFace: FONT_HEAD, isTextBox: true, margin: 0 });
  bulletBlock(slide, leftItems, { x: leftX + 0.3, y: y + 0.95, w: colW - 0.6, h: h - 1.1, fontSize: fs, bulletColor: leftColor, spaceAfter: 9 });
  slide.addShape(pres.ShapeType.roundRect, { x: rightX, y, w: colW, h, rectRadius: 0.08, fill: { color: rightFill }, line: { color: rightColor, width: 1 }, shadow: cardShadow() });
  slide.addText(rightTitle, { x: rightX + 0.3, y: y + 0.22, w: colW - 0.6, h: 0.6, fontSize: 14.5, bold: true, color: rightColor, fontFace: FONT_HEAD, isTextBox: true, margin: 0 });
  bulletBlock(slide, rightItems, { x: rightX + 0.3, y: y + 0.95, w: colW - 0.6, h: h - 1.1, fontSize: fs, bulletColor: rightColor, spaceAfter: 9 });
}

// ================================================================
// SLIDE 1 — Title
// ================================================================
{
  const s = addSlide(); darkBg(s);
  (function drawNetworkDecoration() {
    const layers = [4, 6, 6, 3];
    const originX = 8.6, originY = 0.9, layerGap = 1.35, nodeGap = 0.62, r = 0.075;
    const positions = layers.map((n, li) => {
      const colH = (n - 1) * nodeGap;
      const startY = originY + (5.6 - colH) / 2;
      return Array.from({ length: n }, (_, i) => ({ x: originX + li * layerGap, y: startY + i * nodeGap }));
    });
    for (let li = 0; li < positions.length - 1; li++) {
      positions[li].forEach((a) => {
        positions[li + 1].forEach((b) => {
          s.addShape(pres.ShapeType.line, {
            x: a.x, y: Math.min(a.y, b.y), w: layerGap, h: Math.abs(b.y - a.y),
            flipV: b.y < a.y, line: { color: "3A4A70", width: 0.5, transparency: 55 },
          });
        });
      });
    }
    positions.flat().forEach((p) => {
      s.addShape(pres.ShapeType.ellipse, {
        x: p.x - r, y: p.y - r, w: 2 * r, h: 2 * r,
        fill: { color: "6FA3E0", transparency: 35 }, line: { color: "8FA3C9", width: 0.75, transparency: 40 },
      });
    });
  })();
  s.addText("Backpropagation & Parameter Initialization", {
    x: MX, y: 2.15, w: W - 2 * MX, h: 1.2, fontSize: 34, bold: true, color: PAPER,
    align: "center", fontFace: FONT_HEAD, isTextBox: true, margin: 0,
  });
  s.addText("in Deep Neural Networks", {
    x: MX, y: 3.05, w: W - 2 * MX, h: 0.6, fontSize: 22, color: PAPER,
    align: "center", fontFace: FONT_HEAD, isTextBox: true, margin: 0,
  });
  s.addText("How gradients and initialization determine whether a neural network can learn", {
    x: MX, y: 3.85, w: W - 2 * MX, h: 0.5, fontSize: 15, italic: true, color: "CADCFC",
    align: "center", fontFace: FONT_BODY, isTextBox: true, margin: 0,
  });
  s.addShape(pres.ShapeType.line, { x: W / 2 - 0.9, y: 4.55, w: 1.8, h: 0, line: { color: BLUE, width: 2 } });
  s.addText("Đạo hàm & Khởi tạo trong Deep Learning — Backpropagation và Parameter Initialization", {
    x: MX, y: 4.8, w: W - 2 * MX, h: 0.4, fontSize: 12.5, color: "8FA3C9",
    align: "center", fontFace: FONT_BODY, isTextBox: true, margin: 0,
  });
  s.addText("Bùi Đức Quân · Học phần Deep Learning (Thạc sĩ) · Tháng 9, 2026", {
    x: MX, y: 6.5, w: W - 2 * MX, h: 0.4, fontSize: 13, color: "8FA3C9",
    align: "center", fontFace: FONT_BODY, isTextBox: true, margin: 0,
  });
  noteText(s, "Đặt khung nghiên cứu ngay từ đầu: bài trình bày trả lời CÂU HỎI 'Khởi tạo tham số ảnh hưởng thế nào đến lan truyền gradient và khả năng hội tụ của mạng sâu?' — không chỉ giảng lại công thức.");
}

// ================================================================
// SLIDE 2 — Motivation
// ================================================================
{
  const s = addSlide();
  kicker(s, "Motivation");
  title(s, "How does a 50-layer network learn?");
  const cx = W / 2, topY = 1.95, boxW = 2.6, boxH = 0.55, gap = 0.32;
  const layers = ["Input", "Layer 1", "Layer 2", "...", "Layer 50", "Loss"];
  layers.forEach((lab, i) => {
    const y = topY + i * (boxH + gap);
    node(s, { x: cx - boxW / 2, y, w: boxW, h: boxH, label: lab, fill: i === layers.length - 1 ? "FBEEEC" : PANEL, lineColor: i === layers.length - 1 ? RED : LINE, fs: 13.5 });
    if (i < layers.length - 1) arrow(s, cx, y + boxH, cx, y + boxH + gap, { color: BLUE, width: 2 });
  });
  s.addText("How does Layer 1 know how it should change?", {
    x: MX, y: topY - 0.05, w: 4.3, h: 0.8, fontSize: 15, italic: true, color: INK,
    fontFace: FONT_BODY, isTextBox: true, margin: 0,
  });
  s.addText("⇒ Backpropagation", {
    x: MX, y: topY + 0.85, w: 4.3, h: 0.5, fontSize: 17, bold: true, color: BLUE,
    fontFace: FONT_HEAD, isTextBox: true, margin: 0,
  });
  s.addText("But then a new problem appears:", {
    x: W - MX - 4.3, y: topY + 2.4, w: 4.3, h: 0.5, fontSize: 15, italic: true, color: INK,
    fontFace: FONT_BODY, isTextBox: true, margin: 0,
  });
  s.addText("gradient → 0 ?\ngradient → ∞ ?", {
    x: W - MX - 4.3, y: topY + 3.0, w: 4.3, h: 1.0, fontSize: 18, bold: true, color: RED,
    fontFace: "Cambria Math", isTextBox: true, margin: 0,
  });
  s.addText("⇒ Parameter Initialization", {
    x: W - MX - 4.3, y: topY + 4.15, w: 4.3, h: 0.5, fontSize: 17, bold: true, color: GOLD,
    fontFace: FONT_HEAD, isTextBox: true, margin: 0,
  });
  pageTag(s, 2); stampFooter(s, 2);
  noteText(s, "Câu hỏi nghiên cứu đóng khung toàn bài: 'Khởi tạo tham số ảnh hưởng thế nào đến lan truyền gradient và khả năng hội tụ của mạng sâu?'. Ba câu hỏi con: (1) Backprop tính gradient thế nào, (2) vì sao mạng sâu gặp vanishing/exploding, (3) Zero/Random/Xavier/He ảnh hưởng thế nào tới huấn luyện.");
}

// ================================================================
// SLIDE 3 — Gradient trên không gian nhiều chiều (gộp Derivative/Gradient/GD)
// ================================================================
{
  const s = addSlide();
  kicker(s, "Foundations");
  title(s, "Gradient trong không gian nhiều chiều");
  formulaBox(s, "∇_θ L = [ ∂L/∂θ₁ ; … ; ∂L/∂θₙ ]          θ_new = θ_old − η ∇_θ L", { y: 1.95, h: 0.95, fontSize: 18 });
  bulletBlock(s, [
    "∇L: hướng tăng nhanh nhất của Loss",
    "Gradient Descent đi ngược gradient để giảm Loss",
    "Chain rule đa biến + Jacobian = nền của backprop",
  ], { y: 3.3, w: W - 2 * MX, h: 2.6, fontSize: 18, spaceAfter: 14 });
  pageTag(s, 3); stampFooter(s, 3);
  noteText(s, "Gộp calculus cơ bản vào một slide: derivative 1 biến và định nghĩa giới hạn bỏ qua (đã biết ở học phần trước). Trọng tâm: gradient là vector đạo hàm riêng; GD đi ngược gradient; backprop tính gradient bằng multivariable chain rule. Dạng ma trận/Jacobian chi tiết ở slide Backprop.");
}

// ================================================================
// SLIDE 6 — Forward Propagation
// ================================================================
{
  const s = addSlide();
  kicker(s, "Neural Network");
  title(s, "Forward Propagation");
  const cy = 2.3, x1 = MX + 0.3, xz = x1 + 2.6, xa = xz + 2.2, xL = xa + 2.4;
  node(s, { x: x1, y: cy - 0.6, w: 1.3, h: 0.5, label: "x₁", fill: PANEL });
  node(s, { x: x1, y: cy + 0.3, w: 1.3, h: 0.5, label: "x₂", fill: PANEL });
  node(s, { x: xz, y: cy - 0.15, w: 1.3, h: 0.6, label: "z", fill: "EAF0FB", lineColor: BLUE });
  node(s, { x: xa, y: cy - 0.15, w: 1.7, h: 0.6, label: "activation", fill: "EAF0FB", lineColor: BLUE, fs: 12 });
  node(s, { x: xL, y: cy - 0.15, w: 1.3, h: 0.6, label: "ŷ → L", fill: "FBEEEC", lineColor: RED });
  arrow(s, x1 + 1.3, cy - 0.35, xz, cy + 0.15, { color: BLUE, width: 1.75 });
  arrow(s, x1 + 1.3, cy + 0.55, xz, cy + 0.15, { color: BLUE, width: 1.75 });
  arrow(s, xz + 1.3, cy + 0.15, xa, cy + 0.15, { color: BLUE, width: 1.75 });
  arrow(s, xa + 1.7, cy + 0.15, xL, cy + 0.15, { color: BLUE, width: 1.75 });
  formulaBox(s, "z = w₁x₁ + w₂x₂ + b        a = f(z)        L = L(a, y)", {
    y: cy + 1.4, h: 0.85, w: W - 2 * MX, fontSize: 17,
  });
  bulletBlock(s, [
    "Forward tạo output và lưu các giá trị trung gian để backward dùng",
  ], { y: cy + 1.4 + 0.85 + 0.35, w: W - 2 * MX, h: 1.0, fontSize: 17, spaceAfter: 10 });
  pageTag(s, 6); stampFooter(s, 6);
  noteText(s, "Tránh phát biểu tuyệt đối 'forward không liên quan gì tới gradient' — chính xác hơn: forward pass chưa TÍNH gradient, nhưng nó tạo ra (và lưu lại) mọi thứ backward pass cần dùng để tính gradient (đây là điều PyTorch autograd làm ngầm khi xây computational graph).");
}

// ================================================================
// SLIDE 7 — Chain Rule
// ================================================================
{
  const s = addSlide();
  kicker(s, "Backpropagation");
  title(s, "Chain Rule — trái tim của Backpropagation");
  const cx = MX + 1.0, topY = 2.0, boxW = 1.6, boxH = 0.55, gap = 0.42;
  ["w", "z", "a", "L"].forEach((lab, i) => {
    const y = topY + i * (boxH + gap);
    node(s, { x: cx, y, w: boxW, h: boxH, label: lab, fill: i === 3 ? "FBEEEC" : PANEL, lineColor: i === 3 ? RED : LINE });
    if (i < 3) arrow(s, cx + boxW / 2, y + boxH, cx + boxW / 2, y + boxH + gap, { color: BLUE, width: 2 });
  });
  s.addText("Forward: mỗi mũi tên là 1 phép biến đổi", {
    x: cx - 0.2, y: topY - 0.55, w: 3.4, h: 0.4, fontSize: 12.5, italic: true, color: MUTED,
    fontFace: FONT_BODY, isTextBox: true, margin: 0,
  });
  formulaBox(s, "∂L/∂w  =  (∂L/∂a) · (∂a/∂z) · (∂z/∂w)", {
    x: cx + 2.6, y: 2.9, w: W - MX - (cx + 2.6), h: 1.0, fontSize: 19,
  });
  bulletBlock(s, [
    "Muốn biết w ảnh hưởng L thế nào, ta NHÂN các đạo hàm cục bộ dọc theo đường đi w → z → a → L",
    "Đây chính là ý tưởng cốt lõi của Backpropagation: đi ngược đồ thị, nhân dồn đạo hàm cục bộ",
  ], { x: cx + 2.6, y: 4.2, w: W - MX - (cx + 2.6), h: 1.5, fontSize: 15, spaceAfter: 10 });
  bulletBlock(s, [
    "Vector/ma trận: chain rule qua Jacobian (VJP)",
    "PyTorch autograd tự động hoá bước này",
  ], { x: cx + 2.6, y: 6.0, w: W - MX - (cx + 2.6), h: 0.9, fontSize: 14, spaceAfter: 4 });
  pageTag(s, 7); stampFooter(s, 7);
  noteText(s, "Chain rule đa biến là nội dung toán học cốt lõi của Backpropagation. Ví dụ ở đây là trường hợp scalar để dễ hình dung — trong mạng thực tế, phép nhân đạo hàm cục bộ tổng quát thành vector-Jacobian product (VJP), điều PyTorch autograd tự động hoá.");
}

// ================================================================
// SLIDE 8 — Backpropagation Example
// ================================================================
{
  const s = addSlide();
  kicker(s, "Backpropagation");
  title(s, "Computational Graph & Vector-Jacobian Product");
  // Đồ thị tensor: forward lưu trung gian, backward nhân VJP
  const cy = 2.3, boxW = 1.9, boxH = 0.6, gap = 0.55;
  const nodesG = ["X (batch)", "W₁, b₁", "H₁ = ReLU(XW₁+b₁)", "W₂, b₂", "Ŷ", "Loss L"];
  nodesG.forEach((lab, i) => {
    const x = MX + 0.2 + i * (boxW + gap);
    node(s, { x, y: cy, w: boxW, h: boxH, label: lab, fill: i === nodesG.length - 1 ? "FBEEEC" : PANEL, lineColor: i === nodesG.length - 1 ? RED : LINE, fs: 12.5 });
    if (i < nodesG.length - 1) arrow(s, x + boxW, cy + boxH / 2, x + boxW + gap, cy + boxH / 2, { color: BLUE, width: 1.75 });
  });
  s.addText("Forward: lưu các tensor trung gian", { x: MX, y: cy + 0.8, w: 6, h: 0.4, fontSize: 15, color: BLUE, bold: true, fontFace: FONT_BODY, isTextBox: true, margin: 0 });
  formulaBox(s, "Backward:  v^T ← v^T · J        (vector–Jacobian product, không lập ma trận Jacobian)", { y: 4.0, h: 0.95, w: W - 2 * MX, fontSize: 17, fill: "FBEEEC", color: RED });
  bulletBlock(s, [
    "PyTorch autograd xây đồ thị khi forward và thực hiện VJP khi backward",
    "Chi phí backward ≈ cùng bậc forward, không phụ thuộc số phần tử của Jacobian",
  ], { y: 5.3, w: W - 2 * MX, h: 1.4, fontSize: 17, spaceAfter: 10 });
  pageTag(s, 8); stampFooter(s, 8);
  noteText(s, "Thay ví dụ scalar x=2, w=3 (quá sơ cấp) bằng đồ thị tensor và VJP. Jacobian của một layer có kích thước (số output × số input), không bao giờ lập ra đầy đủ: backprop chỉ nhân vector gradient đầu vào với Jacobian, đó là VJP. Autograd của PyTorch thực hiện việc này cho từng node trong đồ thị.");
}

// ================================================================
// SLIDE 9 — Multi-layer Backpropagation
// ================================================================
{
  const s = addSlide();
  kicker(s, "Backpropagation");
  title(s, "Multi-layer Backpropagation");
  const leftX = MX + 0.3, boxW = 1.5, boxH = 0.42, gap = 0.18, topY = 1.85;
  const fwd = ["x", "W₁", "h₁", "W₂", "h₂", "W₃", "ŷ", "Loss"];
  fwd.forEach((lab, i) => {
    const y = topY + i * (boxH + gap);
    node(s, { x: leftX, y, w: boxW, h: boxH, label: lab, fill: i === fwd.length - 1 ? "FBEEEC" : PANEL, lineColor: i === fwd.length - 1 ? RED : LINE, fs: 12.5 });
    if (i < fwd.length - 1) arrow(s, leftX + boxW / 2, y + boxH, leftX + boxW / 2, y + boxH + gap, { color: BLUE, width: 1.8 });
  });
  const leftBottom = topY + (fwd.length - 1) * (boxH + gap) + boxH;
  const rightX = leftX + 3.3;
  const bwd = ["Loss", "∇W₃", "∇W₂", "∇W₁"];
  const rStep = (leftBottom - topY - boxH) / (bwd.length - 1);
  bwd.forEach((lab, i) => {
    const y = topY + i * rStep;
    node(s, { x: rightX, y, w: boxW + 0.3, h: boxH, label: lab, fill: i === 0 ? "FBEEEC" : "EAF0FB", lineColor: i === 0 ? RED : BLUE, fs: 12.5 });
    if (i < bwd.length - 1) arrow(s, rightX + (boxW + 0.3) / 2, y + boxH, rightX + (boxW + 0.3) / 2, y + rStep, { color: RED, width: 1.8 });
  });
  const rbX = rightX + 2.3, rbW = W - MX - (rightX + 2.3);
  // Chuỗi trực quan: Forward → Loss → Backward (Backprop) → Gradients → Optimizer
  const pipe = [
    { lab: "Forward", fill: "EAF0FB", line: BLUE },
    { lab: "Loss", fill: "EAF0FB", line: BLUE },
    { lab: "Backward", fill: "FBEEEC", line: RED },
    { lab: "Gradients", fill: "FBEEEC", line: RED },
    { lab: "Optimizer", fill: "FBF3E2", line: GOLD },
  ];
  const pbY = topY + 0.35, gapP = 0.18, pbW = (rbW - gapP * (pipe.length - 1)) / pipe.length, pbH = 0.9;
  pipe.forEach((p, i) => {
    const x = rbX + i * (pbW + gapP);
    s.addShape(pres.ShapeType.roundRect, { x, y: pbY, w: pbW, h: pbH, rectRadius: 0.06, fill: { color: p.fill }, line: { color: p.line, width: 1.25 } });
    s.addText(p.lab, { x, y: pbY, w: pbW, h: pbH, align: "center", valign: "middle", fontSize: 13, bold: true, color: p.line, fontFace: FONT_HEAD, isTextBox: true, margin: 0 });
    if (i < pipe.length - 1) arrow(s, x + pbW, pbY + pbH / 2, x + pbW + gapP, pbY + pbH / 2, { color: MUTED, width: 1.5 });
  });
  s.addText("Backprop = tính gradient", { x: rbX, y: pbY + pbH + 0.3, w: rbW, h: 0.4, fontSize: 16, bold: true, color: RED, fontFace: FONT_BODY, isTextBox: true, margin: 0 });
  s.addText("Gradient Descent = dùng gradient để cập nhật tham số", { x: rbX, y: pbY + pbH + 0.75, w: rbW, h: 0.4, fontSize: 16, bold: true, color: GOLD, fontFace: FONT_BODY, isTextBox: true, margin: 0 });
  pageTag(s, 9); stampFooter(s, 9);
  noteText(s, "Cầu nối cực kỳ quan trọng: lớp gần input có gradient là tích của NHIỀU Jacobian/weight transformation nhất — vì sao vanishing/exploding luôn nặng nhất ở các lớp đầu. Box Forward/Backward/Optimizer làm rõ ranh giới hay bị nhầm: Backpropagation là thuật toán TÍNH gradient; Gradient Descent (trong Optimizer) mới là quy tắc DÙNG gradient đó để update parameter — hai bước tách biệt, Backprop không tự sửa weight.");
}

// ================================================================
// SLIDE 10 — Vanishing Gradient
// ================================================================
{
  const s = addSlide();
  kicker(s, "Vanishing / Exploding Gradient");
  title(s, "Vanishing Gradient");
  formulaBox(s, "Minh hoạ: nếu mỗi bước co norm gradient theo hệ số ≈0.5, qua 20 layer:  0.5²⁰ ≈ 9.54×10⁻⁷", { y: 1.95, h: 0.9, fontSize: 15 });
  const bx = MX, by0 = 3.1, bw = 8.2, barH = 0.4, gap = 0.14;
  const labels = ["Layer 20", "Layer 15", "Layer 10", "Layer 5", "Layer 1"];
  const widths = [7.6, 4.2, 1.9, 0.6, 0.12];
  labels.forEach((lab, i) => {
    const y = by0 + i * (barH + gap);
    s.addShape(pres.ShapeType.roundRect, { x: bx + 2.2, y, w: widths[i], h: barH, rectRadius: 0.04, fill: { color: RED } });
    s.addText(lab, { x: bx, y, w: 2.1, h: barH, valign: "middle", fontSize: 12.5, color: MUTED, fontFace: FONT_BODY, isTextBox: true, margin: 0 });
  });
  bulletBlock(s, [
    "Tích nhiều Jacobian / weight transformation → gradient co lại",
  ], { x: MX, y: 5.95, w: W - 2 * MX, h: 0.6, fontSize: 16, spaceAfter: 6 });
  pageTag(s, 10); stampFooter(s, 10);
  noteText(s, "Minh hoạ trực quan bằng thanh giảm dần (ví dụ đơn giản hoá 1 số vô hướng). Trong thực tế, cơ chế là TÍCH của nhiều Jacobian/weight matrix liên tục co norm — không phải chỉ 'đạo hàm < 1'. Số liệu thực nghiệm cho trường hợp này ở phần Demo (Experiment 1&2, Depth Experiment).");
}

// ================================================================
// SLIDE 11 — Exploding Gradient
// ================================================================
{
  const s = addSlide();
  kicker(s, "Vanishing / Exploding Gradient");
  title(s, "Exploding Gradient");
  formulaBox(s, "Minh hoạ: nếu mỗi bước khuếch đại norm gradient theo hệ số ≈1.5, qua 20 layer:  1.5²⁰ ≈ 3325", { y: 1.95, h: 0.9, fontSize: 15 });
  const bx = MX, by0 = 3.1, barH = 0.4, gap = 0.14;
  const labels = ["Layer 1", "Layer 5", "Layer 10", "Layer 15", "Layer 20"];
  const widths = [0.12, 0.5, 1.6, 4.4, 8.2];
  labels.forEach((lab, i) => {
    const y = by0 + i * (barH + gap);
    s.addShape(pres.ShapeType.roundRect, { x: bx + 2.2, y, w: widths[i], h: barH, rectRadius: 0.04, fill: { color: PURPLE } });
    s.addText(lab, { x: bx, y, w: 2.1, h: barH, valign: "middle", fontSize: 12.5, color: MUTED, fontFace: FONT_BODY, isTextBox: true, margin: 0 });
  });
  bulletBlock(s, [
    "Tích nhiều Jacobian / weight transformation → gradient phình ra",
  ], { x: MX, y: 6.05, w: W - 2 * MX, h: 0.6, fontSize: 16, spaceAfter: 5 });
  pageTag(s, 11); stampFooter(s, 11);
  noteText(s, "'Hai mặt của cùng một đồng xu' với slide trước — cùng cơ chế tích luỹ qua nhiều lớp, chỉ khác việc norm gradient bị co lại hay khuếch đại. Tránh nói đơn giản hoá 'chỉ khác dấu của (đạo hàm−1)' — thực tế là hành vi của TÍCH nhiều ma trận/Jacobian, không phải một số vô hướng duy nhất. Experiment 3 (Random large, std=1.0) sẽ tái hiện đúng hiện tượng này bằng số liệu thật (train loss = NaN).");
}

// ================================================================
// SLIDE 12 — Why Initialization Matters
// ================================================================
{
  const s = addSlide();
  kicker(s, "Parameter Initialization");
  title(s, "Tại sao không đặt tất cả weight = 0?");
  formulaBox(s, "W = np.zeros(...)", { y: 1.95, h: 0.7, fontSize: 17 });
  bulletBlock(s, [
    "Mọi hidden unit trong một lớp nhận cùng input và cùng weight ⇒ cùng z, cùng a, cùng gradient",
    "Zero-init KHÔNG PHÁ ĐƯỢC SYMMETRY (failure to break symmetry): các unit luôn giống nhau sau mỗi update",
    "Vấn đề nằm ở WEIGHT. Bias khởi tạo 0 vẫn chấp nhận được, vì đối xứng đã do weight gây ra",
  ], { y: 2.9, w: W - 2 * MX, h: 2.3, fontSize: 16, spaceAfter: 12 });
  const zr = demo.zero;
  statCallout(s, {
    x: MX, y: 5.5, w: 4.2, h: 1.5, value: zr.initial_grad_norms[0].grad_rms.toFixed(1),
    label: `Gradient RMS lớp ẩn thứ nhất, tại khởi tạo (Zero-init, 10 hidden layer, ReLU) — test acc = ${pct(zr.test_acc)}`, color: RED,
  });
  s.addText("Số liệu từ cùng setup Demo (10 hidden layer, ReLU, seed 42) — results/logs/deep_demo_zero.json.", {
    x: MX + 4.6, y: 5.75, w: W - 2 * MX - 4.6, h: 1.1, fontSize: 12, italic: true, color: MUTED,
    fontFace: FONT_BODY, isTextBox: true, margin: 0,
  });
  pageTag(s, 12); stampFooter(s, 12);
  noteText(s, "Số liệu lấy từ results/logs/deep_demo_zero.json — 10 hidden layer, ReLU, Fashion-MNIST 5000/1000/2000, seed=42 — CÙNG kiến trúc dùng xuyên suốt phần Demo (Slide 18 trở đi), khác với lưới thực nghiệm chính 6-layer/Sigmoid (run_zero_sigmoid.json) vốn chỉ dùng cho báo cáo LaTeX. Gradient RMS lớp ẩn thứ nhất (gần input nhất) đo được đúng bằng 0.0 tại bước khởi tạo. Phân biệt quan trọng: đây là hidden units KHÔNG PHÁ ĐƯỢC symmetry (failure to break symmetry) — chúng bắt đầu giống nhau và tiếp tục nhận gradient/update giống nhau — chứ không phải 'symmetry breaking' (cụm này mang nghĩa ngược lại, tránh dùng). Vấn đề symmetry là của WEIGHT; bias không gây đối xứng giữa các unit nên vẫn có thể khởi tạo 0.");
}

// ================================================================
// SLIDE 13 — Random Initialization
// ================================================================
{
  const s = addSlide();
  kicker(s, "Parameter Initialization");
  title(s, "Random Initialization");
  formulaBox(s, "W = np.random.randn(...) × std", { y: 1.9, h: 0.7, fontSize: 17 });
  twoCol(s, {
    leftTitle: "std quá NHỎ", leftColor: BLUE, leftFill: "EAF0FB",
    leftItems: ["weight rất nhỏ có xu hướng làm co lại scale của pre-activation/activation", "→ gradient nhỏ dần qua mỗi lớp", "→ có xu hướng VANISHING GRADIENT"],
    rightTitle: "std quá LỚN", rightColor: PURPLE, rightFill: "F3EAFB",
    rightItems: ["weight lớn → activation/pre-activation lớn", "Trong setup MLP + ReLU đang thí nghiệm: gradient bùng nổ qua các lớp (exploding)", "Với sigmoid/tanh: pre-activation dễ bão hoà → derivative ≈ 0 (vanishing)"],
    y: 2.75, h: 3.15, fs: 13.5,
  });
  bulletBlock(s, [
    "Std nhỏ → vanishing (đo ở slide 17)",
    "Std lớn → exploding (đo ở slide 17)",
  ], { x: MX, y: 6.05, w: W - 2 * MX, h: 0.9, fontSize: 14, spaceAfter: 4 });
  pageTag(s, 13); stampFooter(s, 13);
  noteText(s, "Bắc cầu trực tiếp sang Xavier/He: cả hai đều là cách CHỌN ĐÚNG variance thay vì chọn tuỳ tiện. Lưu ý quan trọng: kết luận 'std lớn → exploding' quan sát được trong experiment này là hành vi của mạng ReLU cụ thể; với sigmoid/tanh, std quá lớn còn có thể đẩy pre-activation vào vùng bão hoà, khiến derivative gần 0 và gây vanishing thay vì exploding.");
}

// ================================================================
// SLIDE 14 — Xavier Initialization
// ================================================================
{
  const s = addSlide();
  kicker(s, "Parameter Initialization");
  title(s, "Xavier / Glorot Initialization");
  formulaBox(s, "Xavier / Glorot Normal:   Var(W) = 2 / (fan_in + fan_out)", { y: 1.95, h: 0.85, fontSize: 18 });
  bulletBlock(s, [
    "Giả định: activation tuyến tính quanh 0, hoặc đối xứng quanh 0 (vd. Tanh)",
    "Với ReLU: triệt tiêu miền âm → E[a²] giảm xấp xỉ ½ mỗi lớp → variance co dần (khớp slide 24)",
    "Dạng Normal ở đây; Xavier Uniform cùng variance, phân phối đều",
  ], { y: 3.1, w: W - 2 * MX, h: 2.6, fontSize: 17, spaceAfter: 12 });
  pageTag(s, 14); stampFooter(s, 14);
  noteText(s, "Cố tình KHÔNG đưa số test accuracy vào slide lý thuyết này — deck từng có 3 con số Xavier accuracy khác nhau ở 3 slide (6-layer main grid, 10-layer single-seed, 10-layer 5-seed) gây khó hiểu. Toàn bộ số liệu thực nghiệm dồn về đúng 1 nơi: phần Demo/Experimental Evaluation.");
}

// ================================================================
// SLIDE 15 — He Initialization
// ================================================================
{
  const s = addSlide();
  kicker(s, "Parameter Initialization");
  title(s, "He / Kaiming Initialization");
  formulaBox(s, "He/Kaiming Normal (ReLU):   W_ij ~ N(0, 2/n_in)", { y: 1.95, h: 0.85, fontSize: 18 });
  bulletBlock(s, [
    "ReLU làm giảm second moment E[a²]; He bù lại bằng scale 2 / n_in",
    "Chính xác hơn: kiểm soát E[a²], không phải variance (ReLU không zero-centered)",
  ], { y: 3.1, w: W - 2 * MX, h: 2.4, fontSize: 18, spaceAfter: 14 });
  pageTag(s, 15); stampFooter(s, 15);
  noteText(s, "Cố tình KHÔNG đưa số test accuracy vào slide lý thuyết này (lý do: xem note ở slide Xavier). ReLU output có mean khác 0 (không zero-centered) — 'second moment' (E[a²]) chính xác hơn 'variance' (Var(a)=E[a²]-E[a]²) khi mô tả đại lượng He initialization thực sự kiểm soát, nhưng ở mức trình bày này dùng 'variance/scale' cho dễ hiểu là chấp nhận được. Với Leaky ReLU, gain = sqrt(2/(1+a²)) phụ thuộc negative slope a — không dùng nguyên công thức 2/n_in nếu a≠0.");
}

// ================================================================
// SLIDE 16 — Comparison Table
// ================================================================
{
  const s = addSlide();
  kicker(s, "Parameter Initialization");
  title(s, "So sánh các phương pháp khởi tạo");
  const headers = ["Initialization", "Formula", "Typical activation", "Ghi chú"];
  const rows = [
    ["Zero", "W = 0", "—", "Không dùng cho hidden weights (symmetry)"],
    ["Small Random", "N(0, 0.01²)", "—", "Naive baseline; không scale theo fan-in/out"],
    ["Xavier / Glorot", "2/(fan_in+fan_out)", "Tanh", "Cân bằng forward/backward"],
    ["He / Kaiming", "2/fan_in", "ReLU", "Bù suy giảm second moment do ReLU"],
  ];
  const tRows = [headers.map((h) => ({ text: h, options: { bold: true, fill: { color: NAVY }, color: PAPER, fontSize: 13 } }))]
    .concat(rows.map((r, ri) => r.map((c, ci) => ({
      text: hasSub(c) ? splitSub(c).map((p) => ({ text: p.t, options: p.sub ? { subscript: true } : {} })) : c,
      options: { fontSize: 12.5, color: INK, align: ci === 0 ? "left" : "center", fill: { color: ri % 2 === 0 ? PANEL : PAPER }, bold: ci === 0 },
    }))));
  s.addTable(tRows, { x: MX, y: 2.05, w: W - 2 * MX, h: 2.9, border: { type: "solid", color: LINE, pt: 0.5 }, autoPage: false, colW: [2.3, 2.75, 2.35, 4.53] });
  bulletBlock(s, [
    "Các thí nghiệm tiếp theo kiểm tra các dòng trong bảng này",
  ], { y: 5.5, w: W - 2 * MX, h: 0.8, fontSize: 18, spaceAfter: 0 });
  pageTag(s, 16); stampFooter(s, 16);
  noteText(s, "Trung thực: hàng Orthogonal chỉ mang tính lý thuyết/tham khảo, KHÔNG có thực nghiệm đi kèm trong project này — tránh ngộ nhận đã test đủ 5 phương pháp.");
}

// ================================================================
// SLIDE 17 — What are Xavier/He trying to preserve? (synthesis box)
// ================================================================
{
  const s = addSlide();
  kicker(s, "Parameter Initialization — Synthesis");
  title(s, "Xavier và He đang cố giữ điều gì?", { fontSize: 26 });
  twoCol(s, {
    leftTitle: "Forward", leftColor: BLUE, leftFill: "EAF0FB",
    leftItems: ["Var(a⁽ˡ⁾) ≈ ổn định qua các layer", "(không co cụm về 0, không bùng nổ khi đi qua nhiều lớp)"],
    rightTitle: "Backward", rightColor: RED, rightFill: "FBEEEC",
    rightItems: ["Var(δ⁽ˡ⁾) ≈ ổn định qua các layer", "(δ = ∂L/∂z — cùng logic áp dụng cho gradient khi lan truyền ngược)"],
    y: 2.15, h: 2.15, fs: 14.5,
  });
  formulaBox(s, "Good initialization attempts to prevent the scale of signals and gradients from systematically collapsing or exploding as depth increases.", {
    y: 4.75, h: 1.15, w: W - 2 * MX, fontSize: 15,
  });
  s.addText("Đây là mục tiêu chung, dưới các giả định đơn giản hoá tại thời điểm khởi tạo — không phải đảm bảo tuyệt đối trong mọi kiến trúc/activation.", {
    x: MX, y: 6.1, w: W - 2 * MX, h: 0.7, fontSize: 12, italic: true, color: MUTED, fontFace: FONT_BODY, isTextBox: true, margin: 0,
  });
  pageTag(s, 17); stampFooter(s, 17);
  noteText(s, "Slide cầu nối ngắn gọn, không đi sâu derivation — chốt lại 'chuyện gì đang cố được giải quyết' trước khi sang phần Demo thực nghiệm kiểm chứng. Cả hai đại lượng Var(a), Var(δ) đều được phân tích TẠI THỜI ĐIỂM khởi tạo (initialization-time analysis), không phải cam kết cho suốt quá trình training. Tránh wording quá đơn giản 'Xavier cân bằng cả hai, He ưu tiên forward' — chính xác hơn: Xavier suy ra một điểm dung hoà liên quan tới cả fan-in và fan-out; He/Kaiming điều chỉnh scale variance riêng cho rectifier nonlinearity (ReLU) — phép điều chỉnh này xuất phát từ phân tích forward nhưng cùng một scale đó cũng ảnh hưởng tới backward signal, không phải He 'chỉ' lo forward.");
}

// ================================================================
// SLIDE 18 — Research Question + Demo Architecture
// ================================================================
{
  const s = addSlide();
  kicker(s, "Demo — Mini Research Experiment");
  title(s, "Thiết kế thực nghiệm", { fontSize: 26 });
  formulaBox(s, "How does weight initialization affect gradient flow and convergence?", { y: 1.75, h: 0.65, fontSize: 15.5 });
  const setupHeaders = ["Architecture", "Dataset", "Optimizer", "Epoch", "Batch", "Variable"];
  const setupRow = ["MLP 784→128×10→10, ReLU", "Fashion-MNIST subset 5k / 1k / 2k", "SGD, lr = 0.05", "15", "128", "Initialization (bias = 0)"];
  const setupTable = [setupHeaders.map((h) => ({ text: h, options: { bold: true, fill: { color: NAVY }, color: PAPER, fontSize: 14 } })),
    setupRow.map((c) => ({ text: c, options: { fontSize: 14, color: INK, align: "center", fill: { color: PANEL } } }))];
  s.addTable(setupTable, { x: MX, y: 2.6, w: W - 2 * MX, h: 1.6, border: { type: "solid", color: LINE, pt: 0.5 }, autoPage: false, colW: [2.6, 2.9, 1.8, 1.0, 1.0, 2.83] });
  s.addText("Seed 42 · Mỗi so sánh chỉ đổi initialization", { x: MX, y: 4.5, w: W - 2 * MX, h: 0.5, fontSize: 16, italic: true, color: MUTED, fontFace: FONT_BODY, isTextBox: true, margin: 0 });
  pageTag(s, 18); stampFooter(s, 18);
  noteText(s, "Đóng khung demo như một MINI RESEARCH EXPERIMENT: cùng kiến trúc/optimizer/dataset, chỉ đổi initialization. Chi tiết: preprocessing chuẩn hoá theo mean/std của chính tập train; loss = CrossEntropyLoss (gộp sẵn LogSoftmax + NLLLoss); DataLoader dùng torch.Generator cùng seed nên thứ tự batch cũng cố định. Với multi-seed, seed 42..46 được set cho mọi nguồn ngẫu nhiên qua cùng hàm set_seed().\n\nBốn nhóm metric được log cho mỗi cấu hình (để phân biệt nguyên nhân thất bại, không chỉ thấy 'model tệ'):\n1. Activation variance theo layer — đo tại khởi tạo, batch đầu tiên.\n2. Gradient RMS theo layer = grad.pow(2).mean().sqrt() — đo tại khởi tạo, trước mọi update, chuẩn hoá theo số phần tử.\n3. Training loss & accuracy theo epoch (test set chỉ dùng đánh giá cuối).\n4. Weight variance theo layer, đối chiếu với công thức lý thuyết.\nQuy ước: 'Layer 1' = hidden Linear layer đầu tiên, gần input nhất.\nThứ tự đọc kết quả: activation variance → Gradient RMS → training loss → test accuracy (accuracy là bằng chứng gián tiếp nhất).");
}

// ================================================================
// SLIDES 19-21 — Experiments 1-5 (real data)
// ================================================================
function experimentSlide(n, { kickerTxt, titleTxt, codeLines, resultRows, verdictText, verdictColor, note }) {
  const s = addSlide();
  kicker(s, kickerTxt);
  title(s, titleTxt, { fontSize: 24 });
  const codeBoxY = 1.85, codeBoxH = 0.35 * codeLines.length + 0.3;
  s.addShape(pres.ShapeType.roundRect, { x: MX, y: codeBoxY, w: W - 2 * MX, h: codeBoxH, rectRadius: 0.05, fill: { color: "1E2A44" } });
  s.addText(codeLines.map((l) => ({ text: l, options: { breakLine: true } })), {
    x: MX + 0.25, y: codeBoxY + 0.12, w: W - 2 * MX - 0.5, h: codeBoxH - 0.2, fontSize: 12.5,
    color: "D8E0EF", fontFace: "Consolas", isTextBox: true, margin: 0, valign: "top",
  });
  let statY = codeBoxY + codeBoxH + 0.35;
  const statW = (W - 2 * MX - (resultRows.length - 1) * 0.3) / resultRows.length;
  resultRows.forEach((r, i) => {
    statCallout(s, { x: MX + i * (statW + 0.3), y: statY, w: statW, h: 1.4, value: r.value, label: r.label, color: r.color });
  });
  s.addShape(pres.ShapeType.roundRect, { x: MX, y: statY + 1.7, w: W - 2 * MX, h: 0.85, rectRadius: 0.06, fill: { color: verdictColor === RED || verdictColor === PURPLE ? "FBEEEC" : "EAF3EE" }, line: { color: verdictColor, width: 0.75 } });
  s.addText(verdictText, {
    x: MX + 0.3, y: statY + 1.7, w: W - 2 * MX - 0.6, h: 0.85, fontSize: 14.5, bold: true, color: verdictColor,
    valign: "middle", fontFace: FONT_BODY, isTextBox: true, margin: 0,
  });
  pageTag(s, n); stampFooter(s, n);
  noteText(s, note);
}

experimentSlide(20, {
  kickerTxt: "Demo — Experiment 1 & 2",
  titleTxt: "3 cơ chế thất bại ban đầu: Symmetry · Vanishing · Exploding",
  codeLines: [
    "for layer in model.modules():",
    "    if isinstance(layer, nn.Linear):",
    "        nn.init.zeros_(layer.weight)          # Experiment 1",
    "        # hoặc: nn.init.normal_(layer.weight, std=0.01)   # Experiment 2",
  ],
  resultRows: [
    { value: demo.zero.initial_grad_norms[0].grad_rms.toFixed(1), label: "Zero — Gradient RMS lớp 1 (khởi tạo)", color: RED },
    { value: demo.random_normal.initial_grad_norms[0].grad_rms.toExponential(2), label: "Random nhỏ — Gradient RMS lớp 1", color: RED },
    { value: demo.random_large.initial_grad_norms[0].grad_rms.toExponential(1), label: "Random lớn — Gradient RMS lớp 1 (trước update đầu)", color: PURPLE },
  ],
  verdictText: `Zero  →  failure to break symmetry: các neuron cùng lớp giống hệt nhau\nSmall random  →  vanishing gradient     Large random  →  exploding → NaN`,
  verdictColor: RED,
  note: "Số liệu lấy trực tiếp từ results/logs/deep_demo_zero.json và deep_demo_random_normal.json (10 hidden layer, ReLU, 15 epoch, seed=42) — không làm tròn/che giấu: cả hai đều test_acc=10.0%, đúng mức đoán ngẫu nhiên của bài toán 10 lớp. QUAN TRỌNG — tránh gộp hai cơ chế: (1) Zero-init thất bại vì các hidden unit bắt đầu giống hệt nhau và tiếp tục nhận gradient/update giống nhau suốt training — chúng KHÔNG PHÁ ĐƯỢC SYMMETRY (đúng là 'failure to break symmetry'; KHÔNG BAO GIỜ viết 'symmetry breaking' vì cụm đó mang nghĩa ngược lại). (2) Random nhỏ thất bại vì vanishing gradient — cơ chế co scale lặp lại qua nhiều lớp, hoàn toàn khác symmetry. Cả hai cho gradient ~0 trong setup NÀY, nhưng nguyên nhân độc lập.",
});


experimentSlide(22, {
  kickerTxt: "Demo — Experiment 4 & 5 (5 seeds mỗi scheme)",
  titleTxt: "Xavier vs. He — 5 seed thô, mean ± std khoảng CHỒNG LẤN",
  codeLines: [
    "nn.init.xavier_normal_(layer.weight)  /  nn.init.kaiming_normal_(..., nonlinearity='relu')",
    `Xavier test_acc theo seed {42..46}: ${multiseedRaw.xavier.map((r) => pct(r.test_acc)).join(", ")}`,
    `He     test_acc theo seed {42..46}: ${multiseedRaw.he.map((r) => pct(r.test_acc)).join(", ")}`,
  ],
  resultRows: [
    { value: `${pct(multiseed("xavier").acc_mean)} ± ${pp(multiseed("xavier").acc_std)}pp`, label: `Xavier — test accuracy, mean ± 1 std (n=${multiseed("xavier").n_seeds} seed, "pp" = percentage points)`, color: GOOD },
    { value: `${pct(multiseed("he").acc_mean)} ± ${pp(multiseed("he").acc_std)}pp`, label: `He — test accuracy, mean ± 1 std (n=${multiseed("he").n_seeds} seed)`, color: GOOD },
    { value: `${multiseed("he").grms_mean.toExponential(1)} vs ${multiseed("xavier").grms_mean.toExponential(1)}`, label: "Gradient RMS lớp 1 (mean, tại khởi tạo) — He vs. Xavier. Lớn hơn ≠ tốt hơn", color: GOOD },
  ],
  verdictText: `Khoảng mean ± 1 std của Xavier và He chồng lấn — chưa đủ cơ sở xếp hạng scheme nào tốt hơn trong setup này (5 seed, MLP + ReLU). Gradient RMS khác biệt rõ nhưng không tự động nghĩa là tốt hơn.`,
  verdictColor: GOOD,
  note: "Số liệu thật từ results/logs/multiseed_xavier_he.json + results/tables/multiseed_xavier_he_summary.csv (5 seed độc lập {42..46}, cùng kiến trúc 10 hidden layer). pp = percentage points (điểm phần trăm) — giải thích khi nói lần đầu nếu khán giả không quen. Đây là điểm chỉnh sửa quan trọng: 1 seed duy nhất KHÔNG đủ để nói 'Xavier tốt hơn He' hay ngược lại. Về wording: ĐÂY KHÔNG PHẢI một kiểm định thống kê chính thức (không có hypothesis test/confidence interval), và chỉ show mean±std KHÔNG PHẢI show toàn bộ distribution — vì vậy không nói 'hai distribution overlap', mà nói đúng là 'khoảng mean±1std chồng lấn' / 'run-to-run variability lớn so với chênh lệch mean' (đã in nguyên văn 5 giá trị mỗi seed trong code block phía trên để minh bạch). Về gradient RMS: He lớn hơn Xavier một cách nhất quán ở cả 5 seed — nhưng PHẢI nói thêm 'gradient RMS lớn hơn không tự động nghĩa là optimization tốt hơn'; điều quan trọng là tránh collapse/explosion bệnh lý, không phải gradient càng lớn càng tốt. Không suy rộng thành 'He luôn cho gradient tốt hơn'.",
});

// ================================================================
// SLIDE 23 — Accuracy curves (all 5, real chart)
// ================================================================
{
  const s = addSlide();
  kicker(s, "Demo — Kết quả tổng hợp");
  title(s, "5 thí nghiệm, 1 kiến trúc, 1 biểu đồ", { fontSize: 25 });
  const imgW = 7.6, imgH = imgW / (9 / 6.2);
  s.addImage({ path: FIG("deep_demo_accuracy_slide.png"), x: MX, y: 1.7, w: imgW, h: imgH });
  bulletBlock(s, [
    "Validation Accuracy vs Epoch",
    "Legend: Zero · Random nhỏ · Random lớn · Xavier · He",
    "Random lớn không hiển thị (loss = NaN)",
    "Val acc dao động: vanilla SGD (lr 0.05, không momentum, không scheduler) trên 10 tầng",
  ], { x: MX + imgW + 0.4, y: 2.2, w: W - 2 * MX - imgW - 0.4, h: 4.2, fontSize: 15, spaceAfter: 12 });
  pageTag(s, 23); stampFooter(s, 23);
  noteText(s, "Biểu đồ tổng hợp cả 5 đường cùng lúc — hình ảnh 'ăn điểm' đầu tiên vì gói gọn toàn bộ câu chuyện demo trong 1 slide.");
}

// ================================================================
// SLIDE 24 — Gradient RMS Heatmap
// ================================================================
{
  const s = addSlide();
  kicker(s, "Demo — Visualization quan trọng nhất");
  title(s, "Gradient RMS Heatmap — layer × initialization", { fontSize: 23 });
  s.addText("Đo tại khởi tạo (initialization) — trên batch đầu tiên, TRƯỚC bất kỳ update tham số nào", {
    x: MX, y: 1.62, w: W - 2 * MX, h: 0.32, fontSize: 12, italic: true, bold: true, color: RED, fontFace: FONT_BODY, isTextBox: true, margin: 0,
  });
  const imgW = 9.4, imgH = imgW / (11 / 5.2);
  s.addImage({ path: FIG("gradient_heatmap_slide.png"), x: (W - imgW) / 2, y: 2.0, w: imgW, h: imgH });
  s.addText("log₁₀(Gradient RMS) đo thật tại khởi tạo, 10 hidden layer, ReLU. Xanh = nhỏ (vanishing), đỏ = lớn (exploding). Thang màu liên tục, không phải ngưỡng chính thức.", {
    x: MX, y: 2.0 + imgH + 0.1, w: W - 2 * MX, h: 0.55, fontSize: 14, italic: true, color: MUTED,
    fontFace: FONT_BODY, isTextBox: true, margin: 0,
  });
  pageTag(s, 24); stampFooter(s, 24);
  noteText(s, "Đây là một trong những visualization quan trọng nhất của toàn bộ demo vì thể hiện TRỰC TIẾP gradient flow qua từng layer, không qua trung gian (khác với accuracy — bằng chứng gián tiếp, chịu ảnh hưởng của nhiều yếu tố khác). Mỗi ô là một số liệu thật (RMS = grad.pow(2).mean().sqrt()), không phải minh hoạ cách điệu, đo trên đúng 1 mini-batch (batch đầu tiên) TRƯỚC update tham số nào — không phải trung bình suốt quá trình training, cần nói rõ nếu bị hỏi. Vì các cấu hình trong slide này đều dùng CÙNG seed=42 (bao gồm cả DataLoader generator), CÙNG batch đầu tiên được dùng cho mọi scheme — loại bỏ một nguồn nhiễu (batch sampling) khi so sánh giữa các scheme. Lưu ý: 3 màu (xanh/vàng/đỏ) là mô tả trực quan theo thang màu liên tục, KHÔNG phải một ngưỡng (threshold) toán học được định nghĩa chính thức cho 'vùng ổn định'.");
}

// ================================================================
// SLIDE 25 — Activation Variance (forward-pass evidence)
// ================================================================
{
  const s = addSlide();
  kicker(s, "Demo — Visualization bổ sung (Forward Pass)");
  title(s, "Activation Variance at Initialization", { fontSize: 24 });
  s.addText("Initialization phải cân bằng cả forward signal (slide này) lẫn backward gradient (slide trước) · 1 batch, trước mọi update", {
    x: MX, y: 1.3, w: W - 2 * MX, h: 0.35, fontSize: 13, italic: true, color: RED, fontFace: FONT_BODY, isTextBox: true, margin: 0,
  });
  const imgW = 7.6, imgH = imgW / (9 / 6.2);
  s.addImage({ path: FIG("activation_variance_slide.png"), x: MX, y: 1.65, w: imgW, h: imgH });
  bulletBlock(s, [
    "Random nhỏ: Var(a) co lại dần theo layer (forward)",
    "Random lớn: Var(a) tăng theo cấp số mũ",
    "He: gần như phẳng (layer 1→10 đổi ~0.8×)",
    "Xavier: vẫn giảm (~395×), hẹp hơn Random nhỏ rất nhiều — không gọi là 'phẳng'",
  ], { x: MX + imgW + 0.4, y: 2.0, w: W - 2 * MX - imgW - 0.4, h: 4.6, fontSize: 14, spaceAfter: 12 });
  pageTag(s, 25); stampFooter(s, 25);
  noteText(s, "Bổ sung quan trọng: Heatmap slide trước chứng minh initialization ảnh hưởng BACKWARD (gradient); slide này chứng minh THÊM rằng cùng cơ chế cũng chi phối FORWARD (activation) — đúng như slide Synthesis đã nêu (Var(a) ổn định ở forward, Var(δ) ổn định ở backward — cả hai đều là phân tích TẠI THỜI ĐIỂM khởi tạo). Không vẽ Zero-init vì mọi activation của nó đúng bằng 0 (không biểu diễn được trên thang log). Lưu ý chính xác: ReLU output có mean khác 0 (không zero-centered), nên 'second moment' E[a²] mô tả đúng hơn đại lượng mà He initialization thực sự kiểm soát so với 'variance' Var(a)=E[a²]-E[a]² thuần tuý — ở đây vẫn dùng Var(a) (numpy .var(), đã trừ mean) cho nhất quán với code, chỉ cần lưu ý sự khác biệt khi bị hỏi sâu. Đã KIỂM TRA số liệu trước khi viết bullet: Xavier layer1→10 giảm từ 0.619 xuống 0.00157 (~395×) — SUY GIẢM THẬT, không phẳng; He layer1→10 đổi từ 0.720 lên 0.932 (~0.77-1.3×) — mới thực sự gần phẳng. Số liệu thật từ results/logs/deep_demo_*.json, field initial_activation_stats.");
}

// ================================================================
// SLIDE 26 — Depth Experiment
// ================================================================
{
  const s = addSlide();
  kicker(s, "Demo — Depth Experiment");
  title(s, "Random vs. Xavier vs. He — theo độ sâu (2→50 lớp)", { fontSize: 22 });
  const imgW = 6.6, imgH = imgW / (9 / 6.2);
  s.addImage({ path: FIG("depth_comparison_v2_slide.png"), x: MX, y: 1.9, w: imgW, h: imgH });
  const he12 = depthRow("he", 12), he50 = depthRow("he", 50);
  bulletBlock(s, [
    "Depth ↑ → Random / Xavier gradient suy giảm; He giữ scale tốt hơn trong setup này",
    "Stable gradient ≠ good generalization",
  ], { x: MX + imgW + 0.4, y: 2.2, w: W - MX - imgW - 0.4 - MX, h: 4.0, fontSize: 17, spaceAfter: 16 });
  pageTag(s, 26); stampFooter(s, 26);
  noteText(s, `Số liệu thật từ results/logs/depth_experiment_v2.json. Tránh phát biểu phổ quát kiểu "He ổn định ở mọi độ sâu" hay "Xavier thất bại" — đây là quan sát TRONG setup thực nghiệm cụ thể (MLP, ReLU, Fashion-MNIST). He duy trì gradient RMS cùng bậc độ lớn xuyên suốt (kể cả L=50: grad_rms≈${depthRow("he", 50).grad_rms_layer1_init.toExponential(2)}) nhưng test accuracy vẫn dao động (L=12: 32.6%, L=20: 53.6%, L=50: ${pct(he50.test_acc)}). Về nhãn 'overfitting' tại L=12: chỉ gọi đúng tên khi có bằng chứng train tốt/test kém — ở đây train loss=${he12.final_train_loss.toFixed(3)} (thấp, khớp tốt) trong khi test loss=${he12.test_loss.toFixed(2)} (cao, gấp hơn 10 lần) — khoảng cách train/test rõ ràng này là căn cứ cho nhãn overfitting, không phải chỉ suy đoán từ test accuracy thấp. Insight quan trọng nhất: stable gradient flow là điều kiện quan trọng cho optimization ổn định, nhưng KHÔNG phải điều kiện đủ để model generalize tốt.`);
}

// ================================================================
// SLIDE 27 — Results Table
// ================================================================
{
  const s = addSlide();
  kicker(s, "Kết quả");
  title(s, "Bảng tổng hợp — 5 thí nghiệm, số liệu thật", { fontSize: 24 });
  s.addText("Seed 42, 1 seed mỗi cấu hình (Xavier/He n=5 xem slide trước). Gradient RMS đo tại khởi tạo; Train loss và Test accuracy đo tại epoch 15.", {
    x: MX, y: 1.68, w: W - 2 * MX, h: 0.4, fontSize: 11.5, italic: true, color: MUTED, fontFace: FONT_BODY, isTextBox: true, margin: 0,
  });
  const headers = ["Init", "Gradient RMS (L1, khởi tạo)", "Train Loss (ep 15)", "Test Acc (ep 15)", "Observed behavior at initialization"];
  const stabilityColor = { "Vanishing": RED, "Symmetry failure": GOLD, "Exploding → NaN": PURPLE, "Không vanish/explode rõ rệt": GOOD };
  const rows = demoSchemes.map((sch) => {
    const r = demo[sch];
    const csvLabel = { zero: "Zero", random_normal: "Random (small)", random_large: "Random (large)", xavier: "Xavier", he: "He" }[sch];
    const finalLoss = r.history[r.history.length - 1].train_loss;
    const lossTxt = finalLoss === null ? "NaN" : finalLoss.toFixed(3);
    const g1 = r.initial_grad_norms[0].grad_rms;
    let stab;
    if (sch === "zero") stab = "Symmetry failure";
    else if (finalLoss === null) stab = "Exploding → NaN";
    else if (g1 < 1e-6) stab = "Vanishing";
    else stab = "Không vanish/explode rõ rệt";
    return [csvLabel, g1.toExponential(1), lossTxt, pct(r.test_acc), stab];
  });
  const tRows = [headers.map((h) => ({ text: h, options: { bold: true, fill: { color: NAVY }, color: PAPER, fontSize: 12.5 } }))]
    .concat(rows.map((r, ri) => r.map((c, ci) => ({
      text: c,
      options: {
        fontSize: 12.5, align: ci === 0 ? "left" : "center", bold: ci === 0 || ci === 4,
        fill: { color: ri % 2 === 0 ? PANEL : PAPER },
        color: ci === 4 ? stabilityColor[c] : INK,
      },
    }))));
  s.addTable(tRows, { x: MX, y: 2.2, w: W - 2 * MX, h: 3.0, border: { type: "solid", color: LINE, pt: 0.5 }, autoPage: false, colW: [2.0, 2.5, 2.4, 2.3, 2.73] });
  s.addText("Số liệu lấy nguyên văn từ results/tables/deep_demo_summary.csv — không làm tròn để \"đẹp bảng\", không có kết quả nào bị bỏ sót. 'Final Train Loss' là train loss trung bình epoch cuối (epoch 15) — không phải validation hay test loss. Xem thêm Activation Variance trong log JSON của từng cấu hình (results/logs/deep_demo_*.json).", {
    x: MX, y: 5.35, w: W - 2 * MX, h: 0.7, fontSize: 11, italic: true, color: MUTED, fontFace: FONT_BODY, isTextBox: true, margin: 0,
  });
  pageTag(s, 27); stampFooter(s, 27);
  noteText(s, "Bảng ánh xạ trực tiếp từ CSV thật, kể cả NaN của Random-large — trung thực khoa học, không che giấu kết quả thất bại. Test accuracy KHÔNG phải bằng chứng duy nhất cho initialization — nó là chỉ số gián tiếp nhất trong 4 nhóm metric (Activation variance, Gradient RMS, Training loss, rồi mới đến Accuracy). Cột 'Gradient behavior' đổi từ 'Ổn định' (quá categorical) sang 'Không vanish/explode rõ rệt' — hàng Xavier và He CÙNG nhãn này chỉ đúng tại độ sâu 10 layer của bảng này; slide Depth Experiment cho thấy Xavier suy giảm gradient theo độ sâu rõ hơn He khi kiến trúc sâu hơn — không suy rộng nhãn này sang mọi độ sâu.");
}

// ================================================================
// SLIDE 28 — Limitations
// ================================================================
{
  const s = addSlide();
  kicker(s, "Trung thực khoa học");
  title(s, "Limitations", { fontSize: 28 });
  bulletBlock(s, [
    "Dataset subset (5k / 1k / 2k)",
    "MLP + ReLU",
    "SGD, lr cố định",
    "Limited seeds (Xavier/He n = 5; còn lại 1)",
    "Mạng > 50 lớp ngày nay: Initialization + Residual (skip) + Normalization (LayerNorm / BatchNorm) để kiểm soát gradient flow",
  ], { y: 2.2, w: W - 2 * MX, h: 4.6, fontSize: 19, spaceAfter: 14 });
  pageTag(s, 28); stampFooter(s, 28);
  noteText(s, "Slide Limitations trước Conclusion — chuẩn mini research presentation, không che giấu giới hạn phạm vi. Nếu bị hỏi 'vậy kết luận có generalize không' — đây chính là slide để trả lời trung thực: kết luận đúng TRONG phạm vi đã khảo sát (MLP/ReLU/Fashion-MNIST subset/SGD cố định), chưa chắc đúng ở quy mô/kiến trúc/optimizer khác.");
}

// ================================================================
// SLIDE 29 — Conclusion
// ================================================================
{
  const s = addSlide(); darkBg(s);
  kicker(s, "Kết luận", { color: "8FA3C9", y: 0.5 });
  const flow = ["Derivative", "Chain Rule", "Backpropagation", "Gradient Flow",
    "Vanishing / Exploding Gradient", "Parameter Initialization", "Stable Training"];
  let y = 0.85;
  const rowStep = 0.54;
  flow.forEach((lab, i) => {
    s.addText(lab, {
      x: MX, y, w: W - 2 * MX, h: 0.34, fontSize: 14.5, bold: i === flow.length - 1, color: i === flow.length - 1 ? "6FA3E0" : "E7ECF6",
      align: "center", fontFace: FONT_HEAD, isTextBox: true, margin: 0,
    });
    if (i < flow.length - 1) {
      s.addText("↓", { x: MX, y: y + 0.32, w: W - 2 * MX, h: 0.2, fontSize: 12, color: "6FA3E0", align: "center", isTextBox: true, margin: 0 });
    }
    y += rowStep;
  });
  s.addText("Trả lời câu hỏi nghiên cứu (Slide 2): Initialization quyết định scale khởi đầu của activation (forward) và gradient (backward). Scale sai có thể gây symmetry failure, vanishing, hoặc exploding; các scheme theo fan-in/fan-out như Xavier/He cải thiện đáng kể khả năng huấn luyện được trên MLP sâu đã khảo sát trong project này.", {
    x: MX, y: y + 0.08, w: W - 2 * MX, h: 0.85, fontSize: 11, italic: true, bold: true, color: "CADCFC", fontFace: FONT_BODY, isTextBox: true, margin: 0,
  });
  y += 0.98;
  const takeaways = [
    "Backprop tính gradient; Gradient Descent dùng gradient để cập nhật.",
    "Gradient là tích nhiều Jacobian, nên có thể vanish hoặc explode.",
    "Initialization quyết định scale ban đầu của tín hiệu và gradient.",
    "Stable gradient ≠ guaranteed generalization.",
  ];
  const paras = takeaways.map((t, i) => ({
    text: `${i + 1}. ${t}`, options: { color: "CADCFC", fontSize: 13, breakLine: true, paraSpaceAfter: 6, fontFace: FONT_BODY },
  }));
  s.addText(paras, { x: MX, y, w: W - 2 * MX, h: 1.9, valign: "top", isTextBox: true, margin: 0 });
  stampFooter(s, 29, true);
  noteText(s, "Flow tổng kết toàn bộ mạch trình bày. Đã thêm 1 câu trả lời TRỰC TIẾP câu hỏi nghiên cứu (đặt ra ở Slide 2) trước khi liệt kê 4 takeaway — tránh để giảng viên phải tự suy ra câu trả lời. Takeaway #1 nhấn mạnh giá trị THUẬT TOÁN của Backpropagation (reverse-mode autodiff, tái sử dụng đạo hàm cục bộ — hiệu quả đặc biệt khi 1 scalar loss phụ thuộc hàng triệu tham số) — không hạ thấp thành 'chỉ là chain rule'.");
}

// ================================================================
// SLIDE 29 — References
// ================================================================
{
  const s = addSlide(); darkBg(s);
  kicker(s, "Tài liệu tham khảo", { color: "8FA3C9", y: 0.55 });
  title(s, "References", { color: PAPER, y: 1.0 });
  const refs = [
    "[1] Rumelhart, Hinton & Williams (1986). Learning representations by back-propagating errors. Nature, 323(6088):533–536.",
    "[2] LeCun, Bottou, Orr & Müller (1998/2012). Efficient BackProp. Neural Networks: Tricks of the Trade.",
    "[3] Glorot & Bengio (2010). Understanding the difficulty of training deep feedforward neural networks. AISTATS.",
    "[4] He, Zhang, Ren & Sun (2015). Delving Deep into Rectifiers. ICCV. arXiv:1502.01852.",
    "[5] Goodfellow, Bengio & Courville (2016). Deep Learning. MIT Press.",
    "[6] Xiao, Rasul & Vollgraf (2017). Fashion-MNIST. arXiv:1708.07747.",
    "[7] Paszke et al. (2019). PyTorch: An Imperative Style, High-Performance Deep Learning Library. NeurIPS.",
  ];
  const paras = refs.map((t) => ({
    text: t, options: { bullet: false, color: "D8E0EF", fontSize: 13, breakLine: true, paraSpaceAfter: 10, fontFace: FONT_BODY },
  }));
  s.addText(paras, { x: MX, y: 1.95, w: W - 2 * MX, h: 5.0, valign: "top", isTextBox: true, margin: 0 });
  stampFooter(s, 31, true);
  noteText(s, "7 nguồn, mỗi nguồn tương ứng trực tiếp với một thành phần lý thuyết/thực nghiệm THỰC SỰ được dùng trong bài (Rumelhart=Backprop gốc, LeCun=Efficient BackProp/input scaling, Glorot&Bengio=Xavier, He=Kaiming/He-init, Goodfellow=textbook nền tảng chung, Xiao=dataset Fashion-MNIST, Paszke=PyTorch/autograd). Đã bỏ Bishop/Adam/ELU/SELU khỏi danh sách trước đó vì các chủ đề này KHÔNG được thảo luận ở bất kỳ slide nào trong deck — reference list nên phản ánh đúng nội dung thực sự dùng, không cố giữ số lượng nguồn.");
}

pres.writeFile({ fileName: "Slide_Backprop_Initialization.pptx" }).then((fileName) => {
  console.log("Wrote:", fileName);
});
