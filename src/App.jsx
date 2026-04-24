import { useState, useEffect, useRef, useCallback } from "react";

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwer1KXCdelksKdIGhvdgTBIM0-3-092_aLQ9ivMpWGniQZBTUkqT8nYFgilLbQXHtF/exec";
const DEFAULT_MAPEL = [
  "Bahasa Indonesia","Pendidikan Pancasila","IPAS","Matematika",
  "Seni Rupa","Bahasa Madura","Pendidikan Agama Islam","PJOK"
];
const DEFAULT_ASESMEN = [
  "Sumatif 1","Sumatif 2","Sumatif 3","Sumatif 4",
  "Sumatif 5","Sumatif 6","Sumatif 7","Sumatif 8",
  "Asesmen Akhir Semester"
];
const JENIS_SOAL_LENGKAP = ["Pilihan Ganda","Pilihan Ganda Kompleks","Benar/Salah Kompleks","Uraian/Esai"];
const GURU_PASSWORD = "guru123";
const DEMO_TOKEN = "UJIAN2024";

// ============================================================
// KATEX — Render formula matematika
// ============================================================
let katexLoaded = false;
async function loadKatex() {
  if (katexLoaded || window.katex) return;
  if (!document.getElementById("katex-css")) {
    const link = document.createElement("link");
    link.id = "katex-css";
    link.rel = "stylesheet";
    link.href = "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css";
    document.head.appendChild(link);
  }
  await new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js";
    s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
  katexLoaded = true;
}

// Render teks dengan formula KaTeX
function MathText({ text, className = "" }) {
  const ref = useRef(null);
  const [ready, setReady] = useState(!!window.katex);
  useEffect(() => {
    if (!window.katex) loadKatex().then(() => setReady(true));
  }, []);
  useEffect(() => {
    if (!ready || !ref.current || !text) return;
    const el = ref.current;
    try {
      const segments = [];
      let remaining = String(text);
      const pattern = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g;
      let lastIndex = 0, match;
      while ((match = pattern.exec(remaining)) !== null) {
        if (match.index > lastIndex) segments.push({ type: "text", content: remaining.slice(lastIndex, match.index) });
        const raw = match[0];
        const isBlock = raw.startsWith("$$");
        const formula = isBlock ? raw.slice(2, -2).trim() : raw.slice(1, -1).trim();
        segments.push({ type: isBlock ? "block" : "inline", content: formula });
        lastIndex = match.index + raw.length;
      }
      if (lastIndex < remaining.length) segments.push({ type: "text", content: remaining.slice(lastIndex) });
      let html = "";
      segments.forEach(seg => {
        if (seg.type === "text") html += seg.content.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
        else try {
          html += window.katex.renderToString(seg.content, { displayMode: seg.type === "block", throwOnError: false });
        } catch { html += `<span style="color:#dc2626">[formula error]</span>`; }
      });
      el.innerHTML = html;
    } catch { el.textContent = text; }
  }, [text, ready]);
  if (!text) return null;
  if (!ready || !String(text).includes("$")) return <span className={className}>{text}</span>;
  return <span ref={ref} className={className} />;
}

const isMapelMath = (mapel) => mapel === "Matematika";

const MATH_TOOLBAR = [
  { label:"½", insert:"\\frac{}{}", title:"Pecahan" },
  { label:"√", insert:"\\sqrt{}", title:"Akar" },
  { label:"x²", insert:"^{2}", title:"Pangkat 2" },
  { label:"xⁿ", insert:"^{}", title:"Pangkat n" },
  { label:"×", insert:"\\times ", title:"Kali" },
  { label:"÷", insert:"\\div ", title:"Bagi" },
  { label:"±", insert:"\\pm ", title:"Plus minus" },
  { label:"≤", insert:"\\leq ", title:"Kurang sama dengan" },
  { label:"≥", insert:"\\geq ", title:"Lebih sama dengan" },
  { label:"≠", insert:"\\neq ", title:"Tidak sama" },
  { label:"π", insert:"\\pi ", title:"Pi" },
  { label:"°", insert:"^{\\circ}", title:"Derajat" },
  { label:"∑", insert:"\\sum_{i=1}^{n}", title:"Sigma" },
  { label:"|x|", insert:"\\left|{}\\right|", title:"Nilai mutlak" },
  { label:"( )", insert:"\\left({}\\right)", title:"Kurung" },
];

function MathInput({ value, onChange, onPaste, rows = 3, placeholder = "Tulis teks atau formula $...$ di sini...", showToolbar = false, id }) {
  const textareaRef = useRef(null);
  const inputRef = useRef(null);
  const isMultiline = rows > 1;

  const insertAtCursor = (toInsert) => {
    const el = isMultiline ? textareaRef.current : inputRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const before = value.slice(0, start);
    const after = value.slice(end);
    const dollarsBefore = (before.match(/\$/g) || []).length;
    let newText;
    if (dollarsBefore % 2 === 1) {
      newText = before + toInsert + after;
    } else {
      newText = before + "$" + toInsert + "$" + after;
    }
    onChange({ target: { value: newText } });
    setTimeout(() => {
      el.focus();
      const pos = before.length + (dollarsBefore % 2 === 1 ? toInsert.length : toInsert.length + 2);
      el.setSelectionRange(pos, pos);
    }, 0);
  };

  return (
    <div>
      {showToolbar && (
        <div className="bg-blue-50 border border-blue-200 rounded-t-xl px-2 py-1.5 flex flex-wrap gap-1 border-b-0">
          <span className="text-xs text-blue-500 font-semibold self-center mr-1">∑ Math:</span>
          {MATH_TOOLBAR.map(btn => (
            <button
              key={btn.label}
              type="button"
              title={btn.title}
              onClick={() => insertAtCursor(btn.insert)}
              className="text-xs bg-white hover:bg-blue-100 border border-blue-200 text-blue-700 font-bold px-2 py-1 rounded-lg transition-colors"
            >
              {btn.label}
            </button>
          ))}
          <span className="text-xs text-blue-400 self-center ml-auto italic">Format: $rumus$</span>
        </div>
      )}
      {isMultiline ? (
        <textarea
          ref={textareaRef}
          id={id}
          value={value}
          onChange={onChange}
          onPaste={onPaste}
          rows={rows}
          placeholder={placeholder}
          className={`w-full border-2 border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none font-mono ${showToolbar ? "rounded-none" : "rounded-xl"}`}
        />
      ) : (
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={value}
          onChange={onChange}
          onPaste={onPaste}
          placeholder={placeholder}
          className={`w-full border-2 border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500 font-mono ${showToolbar ? "rounded-none" : "rounded-xl"}`}
        />
      )}
      {showToolbar && value && value.includes("$") && (
        <div className="mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 leading-relaxed">
          <span className="text-xs text-slate-400 mr-2">Preview:</span>
          <MathText text={value} />
        </div>
      )}
    </div>
  );
}

const defaultOpsi = (jenis) => {
  if (jenis === "Benar/Salah Kompleks") return ["", "", ""];
  return ["", "", "", ""];
};

const DEMO_SOAL = {
  "Matematika_Sumatif 1": [
    { id:"1", soal:"Berapakah hasil dari 12 × 15?", gambar:"", jenisSoal:"Pilihan Ganda", opsi:JSON.stringify(["150","170","180","160"]), jawabanBenar:JSON.stringify(["180"]), point:10 },
    { id:"2", soal:"Manakah bilangan yang merupakan kelipatan 4? (pilih SEMUA yang benar)", gambar:"", jenisSoal:"Pilihan Ganda Kompleks", opsi:JSON.stringify(["12","15","20","22"]), jawabanBenar:JSON.stringify(["12","20"]), point:20 },
    { id:"3", soal:"Tentukan pernyataan berikut, Benar atau Salah?", gambar:"", jenisSoal:"Benar/Salah Kompleks", opsi:JSON.stringify(["5 × 5 = 25","3 × 8 = 21","7 + 9 = 16"]), jawabanBenar:JSON.stringify(["Benar","Salah","Benar"]), point:20 },
  ],
  "IPAS_Sumatif 1": [
    { id:"1", soal:"Apa yang dimaksud dengan fotosintesis?", gambar:"", jenisSoal:"Pilihan Ganda", opsi:JSON.stringify(["Proses pembuatan makanan pada tumbuhan dengan bantuan sinar matahari","Proses pernapasan pada hewan","Proses penyerapan air oleh akar","Proses penyerbukan pada bunga"]), jawabanBenar:JSON.stringify(["Proses pembuatan makanan pada tumbuhan dengan bantuan sinar matahari"]), point:10 },
  ],
};

function extractDriveFileId(url) {
  if (!url || typeof url !== "string") return null;
  url = url.trim();
  const m1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]{10,})/);
  if (m1) return m1[1];
  const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (m2) return m2[1];
  const m3 = url.match(/\/d\/([a-zA-Z0-9_-]{10,})/);
  return m3 ? m3[1] : null;
}
function isDriveUrl(url) { return url && (url.includes("drive.google.com") || url.includes("docs.google.com")); }

function GambarSoal({ url, alt = "Gambar soal" }) {
  if (!url || !url.trim()) return null;
  if (isDriveUrl(url)) {
    const fileId = extractDriveFileId(url);
    if (!fileId) return <p className="text-xs text-red-500 text-center py-2">⚠️ Format link Google Drive tidak dikenali.</p>;
    return (
      <div className="relative w-full overflow-hidden" style={{ height:"220px" }}>
        <iframe src={`https://drive.google.com/file/d/${fileId}/preview`} title={alt} allow="autoplay"
          className="absolute inset-0 w-full h-full border-0" style={{ pointerEvents:"none" }} />
      </div>
    );
  }
  return <img src={url} alt={alt} className="w-full max-h-60 object-contain" onError={e => { e.target.style.display = "none"; e.target.parentNode.appendChild(<p className="text-xs text-red-500 text-center py-2">⚠️ Gambar tidak dapat dimuat.</p>); }} />;
}

function LogoSekolah({ url, className = "" }) {
  const [errCount, setErrCount] = useState(0);
  useEffect(() => setErrCount(0), [url]);
  if (!url || !url.trim() || errCount >= 3) return <span className="text-4xl select-none">🏫</span>;
  let src = url.trim();
  if (isDriveUrl(url)) {
    const fileId = extractDriveFileId(url);
    if (!fileId) return <span className="text-4xl select-none">🏫</span>;
    if (errCount === 0) src = `https://drive.google.com/thumbnail?id=${fileId}&sz=w200-h200`;
    else if (errCount === 1) src = `https://drive.google.com/uc?export=view&id=${fileId}`;
    else src = `https://lh3.googleusercontent.com/d/${fileId}=w200-h200`;
  }
  return <img src={src} alt="Logo sekolah" className={className} referrerPolicy="no-referrer" onError={() => setErrCount(c => c + 1)} />;
}

async function unduhPDF({ siswa, hasilAkhir, soalList, jawabanSiswa, namaGuru, nipGuru, kotaTTD, namaSekolah }) {
  if (!window.jspdf) {
    await new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const tgl = new Date().toLocaleDateString("id-ID", { day:"numeric", month:"long", year:"numeric" });
  const W = 210, margin = 18, colW = W - margin * 2;
  let y = margin;
  const checkY = (need = 10) => { if (y + need > 280) { doc.addPage(); y = margin; } };
  const wrappedText = (text, x, yy, maxW, lineH = 5) => {
    const lines = doc.splitTextToSize(String(text), maxW);
    lines.forEach((l, i) => doc.text(l, x, yy + i * lineH));
    return lines.length * lineH;
  };
  doc.setFillColor(30, 58, 138); doc.rect(0, 0, W, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(14);
  doc.text("LAPORAN HASIL ASESMEN", W / 2, 11, { align: "center" });
  doc.setFontSize(10); doc.setFont("helvetica", "normal");
  doc.text(namaSekolah || "Portal Ujian Digital", W / 2, 18, { align: "center" });
  doc.setFontSize(8);
  doc.text("Aplikasi Web Asesmen — Copyright © 2026 Hairur Rahman", W / 2, 24, { align: "center" });
  y = 36;
  doc.setTextColor(30, 30, 30);
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y - 5, colW, 7, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(10);
  doc.text("DATA SISWA", margin + 2, y);
  y += 6;
  const dataRows = [["Nama", siswa.nama], ["NISN", siswa.nisn], ["No. Absen", siswa.noAbsen], ["Mata Pelajaran", siswa.mapel], ["Jenis Asesmen", siswa.asesmen], ["Tanggal", tgl]];
  doc.setFontSize(9.5);
  dataRows.forEach(([k, v]) => {
    checkY(7);
    doc.setFont("helvetica", "bold"); doc.text(k, margin + 2, y);
    doc.setFont("helvetica", "normal"); doc.text(`: ${v}`, margin + 38, y);
    y += 6;
  });
  y += 4;
  checkY(32);
  const predikat = hasilAkhir.nilai >= 90 ? "Sangat Baik" : hasilAkhir.nilai >= 75 ? "Baik" : hasilAkhir.nilai >= 60 ? "Cukup" : "Perlu Bimbingan";
  const nilaiRGB = hasilAkhir.nilai >= 75 ? [22,163,74] : hasilAkhir.nilai >= 50 ? [217,119,6] : [220,38,38];
  doc.setDrawColor(...nilaiRGB); doc.setLineWidth(0.8);
  doc.roundedRect(margin, y, colW, 28, 3, 3, "D");
  doc.setTextColor(...nilaiRGB);
  doc.setFont("helvetica", "bold"); doc.setFontSize(30);
  doc.text(String(hasilAkhir.nilai), W / 2, y + 14, { align: "center" });
  doc.setFontSize(10); doc.text(predikat, W / 2, y + 21, { align: "center" });
  doc.setTextColor(100,100,100); doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
  doc.text(`Point: ${hasilAkhir.didapatPoint} / ${hasilAkhir.totalPoint}`, W / 2, y + 27, { align: "center" });
  y += 33;
  checkY(14);
  doc.setTextColor(30,30,30);
  doc.setFillColor(241,245,249); doc.rect(margin, y - 5, colW, 7, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(10);
  doc.text("RINCIAN POIN PER SOAL", margin + 2, y);
  y += 4;
  const cols = { no:12, jenis:28, ket:80, dapat:22, maks:22 };
  const colX = { no:margin, jenis:margin+cols.no, ket:margin+cols.no+cols.jenis, dapat:margin+cols.no+cols.jenis+cols.ket, maks:margin+cols.no+cols.jenis+cols.ket+cols.dapat };
  doc.setFillColor(30,58,138); doc.rect(margin, y, colW, 7, "F");
  doc.setTextColor(255,255,255); doc.setFont("helvetica","bold"); doc.setFontSize(8.5);
  ["No","Jenis","Keterangan","Dapat","Maks"].forEach((h, i) => {
    const xArr = [colX.no+2, colX.jenis+1, colX.ket+1, colX.dapat+1, colX.maks+1];
    doc.text(h, xArr[i], y + 5);
  });
  y += 7;
  doc.setFont("helvetica","normal"); doc.setFontSize(8.5);
  hasilAkhir.detail.forEach((d, i) => {
    checkY(7);
    doc.setFillColor(...(i%2===0?[255,255,255]:[248,250,252]));
    doc.rect(margin, y-4.5, colW, 6.5, "F");
    doc.setTextColor(30,30,30);
    doc.text(String(d.no), colX.no+4, y, { align:"center" });
    doc.text(d.jenis, colX.jenis+1, y);
    doc.text(d.ket, colX.ket+1, y);
    if (d.dapat < d.max) doc.setTextColor(180,30,30);
    doc.text(String(d.dapat), colX.dapat+cols.dapat/2, y, { align:"center" });
    doc.setTextColor(30,30,30);
    doc.text(String(d.max), colX.maks+cols.maks/2, y, { align:"center" });
    y += 6.5;
  });
  checkY(8);
  doc.setFillColor(226,232,240); doc.rect(margin, y-4.5, colW, 7, "F");
  doc.setFont("helvetica","bold"); doc.setFontSize(8.5); doc.setTextColor(30,30,30);
  doc.text("TOTAL", colX.ket+1, y);
  doc.text(String(hasilAkhir.didapatPoint), colX.dapat+cols.dapat/2, y, { align:"center" });
  doc.text(String(hasilAkhir.totalPoint), colX.maks+cols.maks/2, y, { align:"center" });
  y += 10;
  const soalSalah = soalList.filter((s, idx) => { const d = hasilAkhir.detail[idx]; return d && d.dapat < d.max; });
  if (soalSalah.length > 0) {
    checkY(16);
    doc.setFillColor(254,243,199); doc.rect(margin, y-5, colW, 8, "F");
    doc.setFont("helvetica","bold"); doc.setFontSize(10); doc.setTextColor(146,64,14);
    doc.text(`REVIEW SOAL YANG PERLU DIPELAJARI ULANG (${soalSalah.length} soal)`, margin+2, y);
    doc.setFontSize(7.5); doc.setFont("helvetica","italic"); doc.setTextColor(120,80,20);
    doc.text("Opsi yang kamu jawab salah diberi tanda [X]. Opsi yang kamu jawab benar diberi tanda [v].", margin+2, y+5.5);
    y += 11;
    soalSalah.forEach((s) => {
      const idxAsli = soalList.findIndex(x => x.id === s.id);
      const d = hasilAkhir.detail[idxAsli];
      const opsiArr = JSON.parse(s.opsi || "[]");
      const benarArr = JSON.parse(s.jawabanBenar || "[]");
      const jwbSiswa = jawabanSiswa[s.id] || [];
      checkY(22);
      doc.setFillColor(241,245,249); doc.rect(margin, y-5, colW, 7, "F");
      doc.setFont("helvetica","bold"); doc.setFontSize(9); doc.setTextColor(30,30,30);
      doc.text(`Soal ${idxAsli+1}   [${s.jenisSoal}]   Poin kamu: ${d.dapat} / ${d.max}`, margin+2, y);
      y += 5.5;
      doc.setFont("helvetica","normal"); doc.setFontSize(8.5); doc.setTextColor(40,40,40);
      const soalLines = doc.splitTextToSize(s.soal, colW - 4);
      soalLines.forEach(l => { checkY(5); doc.text(l, margin+3, y); y += 4.8; });
      y += 2;
      if (s.jenisSoal === "Pilihan Ganda") {
        opsiArr.forEach((opsi, oi) => {
          checkY(7);
          const dipilihSiswa = jwbSiswa[0] === opsi;
          if (dipilihSiswa) {
            doc.setFillColor(254,226,226);
            const oH = doc.splitTextToSize(`${String.fromCharCode(65+oi)}. ${opsi}`, colW-14).length * 5 + 3;
            doc.rect(margin+2, y-4, colW-4, oH, "F");
            doc.setTextColor(185,28,28); doc.setFont("helvetica","bold"); doc.text("[X]", margin+4, y);
          } else {
            doc.setTextColor(100,100,100); doc.setFont("helvetica","normal"); doc.text("[ ]", margin+4, y);
          }
          doc.setFont("helvetica", dipilihSiswa ? "bold" : "normal");
          doc.setTextColor(dipilihSiswa ? 185 : 60, dipilihSiswa ? 28 : 60, dipilihSiswa ? 28 : 60);
          const labelH = wrappedText(`${String.fromCharCode(65+oi)}. ${opsi}`, margin+12, y, colW-16, 5);
          y += Math.max(labelH, 5) + 1;
        });
        checkY(6);
        doc.setTextColor(146,64,14); doc.setFont("helvetica","italic"); doc.setFontSize(7.5);
        doc.text("* Opsi bertanda [X] adalah jawaban kamu yang tidak tepat. Pelajari kembali materi ini.", margin+3, y);
        y += 5;
      } else if (s.jenisSoal === "Pilihan Ganda Kompleks") {
        opsiArr.forEach((opsi, oi) => {
          checkY(7);
          const dipilihSiswa = jwbSiswa.includes(opsi);
          const harusBenar = benarArr.includes(opsi);
          let simbol, bgColor, textColor, fontStyle;
          if (dipilihSiswa && harusBenar) { simbol = "[v]"; bgColor = [220,252,231]; textColor = [21,128,61]; fontStyle = "normal"; }
          else if (dipilihSiswa && !harusBenar) { simbol = "[X]"; bgColor = [254,226,226]; textColor = [185,28,28]; fontStyle = "bold"; }
          else if (!dipilihSiswa && harusBenar) { simbol = "[!]"; bgColor = [255,237,213]; textColor = [154,52,18]; fontStyle = "bold"; }
          else { simbol = "[ ]"; bgColor = null; textColor = [100,100,100]; fontStyle = "normal"; }
          if (bgColor) { const oH = doc.splitTextToSize(`${String.fromCharCode(65+oi)}. ${opsi}`, colW-14).length * 5 + 3; doc.setFillColor(...bgColor); doc.rect(margin+2, y-4, colW-4, oH, "F"); }
          doc.setTextColor(...textColor); doc.setFont("helvetica", fontStyle); doc.setFontSize(8.5);
          doc.text(simbol, margin+4, y);
          const lH = wrappedText(`${String.fromCharCode(65+oi)}. ${opsi}`, margin+12, y, colW-16, 5);
          y += Math.max(lH, 5) + 1;
        });
        checkY(6);
        doc.setTextColor(146,64,14); doc.setFont("helvetica","italic"); doc.setFontSize(7.5);
        doc.text("* [X]=salah pilih  [!]=seharusnya dipilih tapi terlewat  [v]=tepat  [ ]=tidak dipilih", margin+3, y);
        y += 5;
      } else {
        opsiArr.forEach((opsi, oi) => {
          checkY(8);
          const jwbSiswaItem = jwbSiswa[oi] || null;
          const jwbBenar = benarArr[oi];
          const tepat = jwbSiswaItem === jwbBenar;
          if (!tepat) { doc.setFillColor(254,226,226); const oH = doc.splitTextToSize(`${oi+1}. ${opsi}`, colW-30).length * 5 + 3; doc.rect(margin+2, y-4, colW-4, oH, "F"); }
          doc.setFont("helvetica","normal"); doc.setFontSize(8.5); doc.setTextColor(40,40,40);
          const pH = wrappedText(`${oi+1}. ${opsi}`, margin+4, y, colW-30, 5);
          const jwbLabel = jwbSiswaItem || "(tidak dijawab)";
          const statusLabel = tepat ? "[v]" : "[X]";
          doc.setFont("helvetica","bold"); doc.setTextColor(tepat ? 21 : 185, tepat ? 128 : 28, tepat ? 61 : 28);
          doc.text(`${statusLabel} ${jwbLabel}`, W - margin - 2, y, { align:"right" });
          doc.setFont("helvetica","normal");
          y += Math.max(pH, 6) + 1;
        });
        checkY(6);
        doc.setTextColor(146,64,14); doc.setFont("helvetica","italic"); doc.setFontSize(7.5);
        doc.text("* [X] = jawaban kamu tidak tepat, [v] = tepat", margin+3, y);
        y += 5;
      }
      checkY(5);
      doc.setDrawColor(200,200,200); doc.setLineWidth(0.2);
      doc.line(margin, y, W-margin, y);
      y += 6;
    });
  }
  checkY(40);
  doc.setTextColor(30,30,30);
  const ttdX = W - margin - 50;
  doc.setFont("helvetica","normal"); doc.setFontSize(9);
  const kotaLabel = kotaTTD ? `${kotaTTD}, ${tgl}` : tgl;
  doc.text(kotaLabel, ttdX, y, { align:"center" });
  y += 5;
  doc.text(`Guru ${siswa.mapel}`, ttdX, y, { align:"center" });
  y += 22;
  doc.setDrawColor(30,30,30); doc.setLineWidth(0.4);
  doc.line(ttdX - 28, y, ttdX + 28, y);
  y += 5;
  doc.setFont("helvetica","bold"); doc.setFontSize(9);
  doc.text(namaGuru || "________________________", ttdX, y, { align:"center" });
  if (nipGuru) { y += 5; doc.setFont("helvetica","normal"); doc.setFontSize(8.5); doc.text(`NIP. ${nipGuru}`, ttdX, y, { align:"center" }); }
  checkY(8);
  doc.setFont("helvetica","italic"); doc.setFontSize(7.5); doc.setTextColor(150,150,150);
  doc.text("Dokumen ini digenerate otomatis oleh Aplikasi Web Asesmen", W/2, 290, { align:"center" });
  const mapelKode = siswa.mapel.replace(/\s+/g,"_");
  const asesmenKode = siswa.asesmen.replace(/\s+/g,"_");
  const tanggalKode = new Date().toISOString().slice(0,10);
  doc.save(`Laporan_${mapelKode}_${asesmenKode}_${tanggalKode}.pdf`);
}

const toastColors = { success:"#15803d", error:"#CC0000", warning:"#b45309", info:"#003082" };
function Toast({ toasts }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-xs w-full">
      {toasts.map(t => (
        <div key={t.id} className="shadow-lg px-4 py-3 text-white text-sm font-bold flex items-start gap-3"
          style={{ backgroundColor: toastColors[t.type] || toastColors.info, borderRadius: "0", borderLeft: "4px solid rgba(255,255,255,0.4)" }}>
          <span className="text-lg leading-none mt-0.5">{t.type==="success"?"✓":t.type==="error"?"✕":t.type==="warning"?"⚠":"ℹ"}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
function useToast() {
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((message, type = "info") => {
    const id = Date.now();
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);
  return { toasts, addToast };
}

function AppHeader({ logoUrl, namaSekolah }) {
  return (
    <header style={{ background: "linear-gradient(135deg, #CC0000 0%, #990000 100%)", borderBottom: "4px solid #003082" }}>
      <div style={{ background: "#003082", height: "6px" }} />
      <div className="max-w-4xl mx-auto px-4 py-4 flex flex-col items-center gap-2">
        {logoUrl && (
          <LogoSekolah url={logoUrl} className="object-contain" style={{ maxHeight: "36px", maxWidth: "44px", mixBlendMode: "multiply", filter: "brightness(0) invert(1)" }} />
        )}
        <h1 className="text-lg md:text-xl font-black tracking-widest text-white uppercase leading-tight" style={{ fontFamily: "'Georgia', serif", textShadow: "0 1px 3px rgba(0,0,0,0.3)", letterSpacing: "0.12em" }}>
          PORTAL UJIAN DIGITAL
        </h1>
        {namaSekolah && <p className="text-xs text-red-200 font-medium tracking-wide -mt-1">{namaSekolah}</p>}
      </div>
    </header>
  );
}

function GuruLogin({ onLogin }) {
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState("");
  const handle = () => { if (pwd === GURU_PASSWORD) { onLogin(); setErr(""); } else setErr("Password salah!"); };
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(160deg, #003082 0%, #001a4d 60%, #8B0000 100%)" }}>
      <div className="bg-white rounded-none shadow-2xl w-full max-w-sm text-center overflow-hidden" style={{ border: "3px solid #CC0000" }}>
        <div style={{ background: "linear-gradient(135deg, #CC0000, #990000)", padding: "24px 24px 20px" }}>
          <div className="text-4xl mb-2">🔐</div>
          <h2 className="text-xl font-black text-white tracking-wide" style={{ fontFamily: "'Georgia', serif" }}>PANEL GURU</h2>
          <p className="text-red-200 text-xs mt-1 uppercase tracking-widest">Portal Ujian Digital</p>
        </div>
        <div className="p-6">
          <p className="text-slate-600 text-sm mb-5 font-medium">Masukkan password untuk mengakses panel guru</p>
          <input type="password" value={pwd} onChange={e => setPwd(e.target.value)} onKeyDown={e => e.key==="Enter" && handle()} placeholder="Password guru..." className="w-full border-2 border-slate-200 rounded-none px-4 py-3 text-slate-800 focus:outline-none mb-3" style={{ borderColor: "#003082", borderRadius: "0" }} />
          {err && <p className="text-red-600 text-sm mb-3 font-semibold">{err}</p>}
          <button onClick={handle} className="w-full text-white font-bold py-3 transition-colors uppercase tracking-widest text-sm" style={{ background: "#CC0000", borderRadius: "0" }}>Masuk</button>
        </div>
        <div style={{ background: "#003082", height: "6px" }} />
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color="blue" }) {
  const styles = {
    blue: { background: "#eff6ff", color: "#003082", border: "1px solid #93c5fd" },
    green: { background: "#f0fdf4", color: "#15803d", border: "1px solid #86efac" },
    purple: { background: "#fef2f2", color: "#CC0000", border: "1px solid #fca5a5" },
  };
  return (
    <div className="p-4" style={{ ...styles[color], borderRadius: "0", borderLeft: `4px solid ${color === "blue" ? "#003082" : color === "green" ? "#16a34a" : "#CC0000"}` }}>
      <div className="text-3xl mb-2">{icon}</div>
      <div className="text-2xl font-black">{value}</div>
      <div className="text-xs font-bold mt-1 opacity-75 uppercase tracking-wide">{label}</div>
    </div>
  );
}

function Field({ label, children, hint }) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-600 block mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}
const inp = "w-full border-2 border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500" + " " + "rounded-none";
const btn = (color="blue") => ({
  blue:"text-white font-bold py-2.5 px-4 text-sm transition-colors rounded-none" + " " + "bg-blue-700 hover:bg-blue-800",
  green:"text-white font-bold py-2.5 px-4 text-sm transition-colors rounded-none" + " " + "bg-green-600 hover:bg-green-700",
  red:"text-white font-bold py-2.5 px-4 text-sm transition-colors rounded-none" + " " + "bg-red-700 hover:bg-red-800",
  amber:"text-white font-bold py-2.5 px-4 text-sm transition-colors rounded-none" + " " + "bg-amber-500 hover:bg-amber-600",
  slate:"text-slate-700 font-bold py-2.5 px-4 text-sm transition-colors rounded-none" + " " + "bg-slate-200 hover:bg-slate-300",
}[color]);

// ============================================================
// API helpers
// ============================================================
async function fetchMapelList(scriptUrl) {
  const url = scriptUrl || APPS_SCRIPT_URL;
  if (url.includes("YOUR_APPS_SCRIPT_ID")) return [...DEFAULT_MAPEL];
  try {
    const res = await fetch(`${url}?action=getAllMapel`);
    const data = await res.json();
    if (data.status === "success") return data.data;
    return [...DEFAULT_MAPEL];
  } catch { return [...DEFAULT_MAPEL]; }
}
async function fetchAsesmenList(scriptUrl) {
  const url = scriptUrl || APPS_SCRIPT_URL;
  if (url.includes("YOUR_APPS_SCRIPT_ID")) return [...DEFAULT_ASESMEN];
  try {
    const res = await fetch(`${url}?action=getAllAsesmen`);
    const data = await res.json();
    if (data.status === "success") return data.data;
    return [...DEFAULT_ASESMEN];
  } catch { return [...DEFAULT_ASESMEN]; }
}
async function fetchKKM(scriptUrl) {
  const url = scriptUrl || APPS_SCRIPT_URL;
  if (url.includes("YOUR_APPS_SCRIPT_ID")) return {};
  try {
    const res = await fetch(`${url}?action=getKKM`);
    const data = await res.json();
    if (data.status === "success") return data.data;
    return {};
  } catch { return {}; }
}
async function simpanKKM(scriptUrl, kkmData) {
  const url = scriptUrl || APPS_SCRIPT_URL;
  if (url.includes("YOUR_APPS_SCRIPT_ID")) return false;
  try {
    const res = await fetch(url, { method:"POST", body:JSON.stringify({ action:"simpanKKM", kkm: kkmData }) });
    const d = await res.json();
    return d.status === "success";
  } catch { return false; }
}

// ============================================================
// DASHBOARD (dengan profil guru)
// ============================================================
function TabDashboard({ onNav, addToast, settings }) {
  const [stats, setStats] = useState({ siswa:0, soal:0, hasil:0 });
  const [loadingStats, setLoadingStats] = useState(false);
  
  useEffect(() => {
    const url = APPS_SCRIPT_URL;
    if (url.includes("YOUR_APPS_SCRIPT_ID")) return;
    setLoadingStats(true);
    fetch(`${url}?action=getStats`)
      .then(r => r.json())
      .then(d => { if (d.status==="success") setStats(d.data); })
      .catch(()=>{})
      .finally(()=>setLoadingStats(false));
  }, []);

  const aksiCepat = [
    { icon:"✏️", label:"Buat Soal Baru", page:"soal", color:"bg-blue-700 hover:bg-blue-800" },
    { icon:"🔑", label:"Kelola Token", page:"mapel", color:"bg-green-600 hover:bg-green-700" },
    { icon:"📊", label:"Lihat Hasil Ujian", page:"rekap", color:"bg-purple-600 hover:bg-purple-700" },
    { icon:"👤", label:"Data Siswa", page:"siswa", color:"bg-amber-500 hover:bg-amber-600" },
  ];

  const getInitials = () => {
    const namaGuru = settings.namaGuru || "Guru";
    return namaGuru.split(" ").map(n => n[0]).join("").toUpperCase().slice(0,2);
  };

  // Handler error gambar
  const handleImageError = (e) => {
    e.target.onerror = null;
    e.target.src = `https://ui-avatars.com/api/?background=blue&color=fff&name=${getInitials()}`;
  };

  return (
    <div className="space-y-6">
      {/* Profil Guru */}
      <div className="bg-white p-5 flex items-center gap-4" style={{ border: "1px solid #e2e8f0", borderLeft: "5px solid #CC0000", borderRadius: "0" }}>
      <div className="flex-shrink-0">
  {settings.fotoGuru ? (
    <img 
      src={settings.fotoGuru} 
      alt="Foto Guru" 
      className="w-20 h-20 rounded-full object-cover shadow-md" 
      style={{ border: "3px solid #CC0000" }}
      onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?background=CC0000&color=fff&name=${getInitials()}`; }}
    />
  ) : (
    <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-md" style={{ background: "linear-gradient(135deg,#CC0000,#003082)" }}>
      {getInitials()}
    </div>
  )}
</div>
        <div className="flex-1">
          <h2 className="text-xl font-extrabold text-slate-800">Selamat Datang, {settings.namaGuru || "Guru"}!</h2>
          <p className="text-sm text-slate-500">{settings.namaSekolah || "Portal Ujian Digital"}</p>
          {settings.nipGuru && <p className="text-xs text-slate-400 mt-1">NIP: {settings.nipGuru}</p>}
        </div>
      </div>

      {/* Statistik */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard icon="👤" label="Total Siswa" value={loadingStats ? "..." : stats.siswa} color="blue" />
        <StatCard icon="📝" label="Bank Soal" value={loadingStats ? "..." : stats.soal} color="green" />
        <StatCard icon="📋" label="Hasil Ujian" value={loadingStats ? "..." : stats.hasil} color="purple" />
      </div>

      {/* Aksi cepat */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: "#003082" }}>⚡ Aksi Cepat</h3>
        <div className="grid grid-cols-2 gap-3">
          {aksiCepat.map((a, idx) => (
            <button key={a.page} onClick={() => onNav(a.page)} className="text-white p-4 text-left transition-colors flex items-center gap-3" style={{ background: idx === 0 ? "#CC0000" : idx === 1 ? "#003082" : idx === 2 ? "#7c3aed" : "#d97706", borderRadius: "0", borderBottom: "3px solid rgba(0,0,0,0.2)" }}>
              <span className="text-2xl">{a.icon}</span>
              <span className="font-bold text-sm">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="p-4 text-xs space-y-1" style={{ background: "#eff6ff", border: "1px solid #93c5fd", borderLeft: "4px solid #003082", borderRadius: "0" }}>
        <p className="font-bold uppercase tracking-wide" style={{ color: "#003082" }}>💡 Cara Kerja Aplikasi</p>
        <p>1. Tambahkan siswa di menu <strong>Data Siswa</strong></p>
        <p>2. Input soal di menu <strong>Input Soal</strong></p>
        <p>3. Buat token ujian di <strong>Manajemen Mapel</strong></p>
        <p>4. Siswa login dengan NISN + Token</p>
        <p>5. Koreksi esai & lihat nilai di <strong>Rekap Hasil</strong></p>
      </div>
    </div>
  );
}

// ============================================================
// DATA SISWA (import/export XLSX)
// ============================================================
function TabSiswa({ scriptUrl, addToast }) {
  const [daftarSiswa, setDaftarSiswa] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [nisn, setNisn] = useState("");
  const [nama, setNama] = useState("");
  const [kelas, setKelas] = useState("");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);
  const fetchSiswa = async () => {
    const url = scriptUrl || APPS_SCRIPT_URL;
    if (url.includes("YOUR_APPS_SCRIPT_ID")) return;
    setLoading(true);
    try { const r = await fetch(`${url}?action=getSiswa`); const d = await r.json(); if (d.status==="success") setDaftarSiswa(d.data || []); } catch {} finally { setLoading(false); }
  };
  useEffect(() => { fetchSiswa(); }, []);
  const handleTambah = async () => {
    if (!nisn.trim() || !nama.trim() || !kelas.trim()) return addToast("Semua field harus diisi!", "error");
    setSaving(true);
    try {
      const url = scriptUrl || APPS_SCRIPT_URL;
      const r = await fetch(url, { method:"POST", body:JSON.stringify({ action:"tambahSiswa", nisn:nisn.trim(), nama:nama.trim(), kelas:kelas.trim() }) });
      const d = await r.json();
      if (d.status==="success") { addToast("Siswa berhasil ditambahkan!", "success"); setNisn(""); setNama(""); setKelas(""); setShowForm(false); fetchSiswa(); }
      else addToast(d.message || "Gagal", "error");
    } catch { addToast("Tidak terhubung ke server", "warning"); } finally { setSaving(false); }
  };
  const handleHapus = async (nisnTarget) => {
    if (!window.confirm(`Hapus siswa NISN ${nisnTarget}?`)) return;
    try {
      const url = scriptUrl || APPS_SCRIPT_URL;
      await fetch(url, { method:"POST", body:JSON.stringify({ action:"hapusSiswa", nisn:nisnTarget }) });
      addToast("Siswa dihapus!", "success"); fetchSiswa();
    } catch { addToast("Gagal menghapus siswa", "error"); }
  };
  const handleDownloadTemplate = async () => {
    try {
      if (!window.XLSX) await new Promise((res, rej) => { const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
      const wb = window.XLSX.utils.book_new();
      const wsData = [["NISN", "Nama", "Kelas"], ["1234567890", "Contoh Nama Siswa", "5A"], ["0987654321", "Contoh Siswa Dua", "5B"]];
      const ws = window.XLSX.utils.aoa_to_sheet(wsData);
      ws["!cols"] = [{ wch: 15 }, { wch: 30 }, { wch: 10 }];
      window.XLSX.utils.book_append_sheet(wb, ws, "Data Siswa");
      window.XLSX.writeFile(wb, "template_import_siswa.xlsx");
      addToast("✅ Template XLSX berhasil diunduh!", "success");
    } catch (err) { addToast("Gagal membuat template: " + err.message, "error"); }
  };
  const handleFileImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setImporting(true);
    addToast("Membaca file...", "info");
    try {
      if (!window.XLSX) await new Promise((res, rej) => { const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
      const buffer = await file.arrayBuffer();
      const workbook = window.XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = window.XLSX.utils.sheet_to_json(sheet, { header: 1 });
      if (rows.length < 2) return addToast("File kosong atau tidak ada data siswa.", "error");
      const header = rows[0].map(h => String(h).toLowerCase().trim());
      const nisnCol = header.findIndex(h => h.includes("nisn"));
      const namaCol = header.findIndex(h => h.includes("nama"));
      const kelasCol = header.findIndex(h => h.includes("kelas"));
      if (nisnCol < 0 || namaCol < 0) return addToast("Kolom NISN atau Nama tidak ditemukan.", "error");
      const siswaList = [];
      for (let i=1; i<rows.length; i++) {
        const row = rows[i];
        const nisnVal = String(row[nisnCol] || "").trim();
        const namaVal = String(row[namaCol] || "").trim();
        const kelasVal = kelasCol >= 0 ? String(row[kelasCol] || "").trim() : "";
        if (nisnVal && namaVal) siswaList.push({ nisn: nisnVal, nama: namaVal, kelas: kelasVal });
      }
      if (siswaList.length === 0) return addToast("Tidak ada data valid dalam file.", "error");
      const url = scriptUrl || APPS_SCRIPT_URL;
      if (url.includes("YOUR_APPS_SCRIPT_ID")) { addToast(`Demo: Ditemukan ${siswaList.length} siswa. Hubungkan ke Apps Script untuk menyimpan.`, "warning"); setImporting(false); return; }
      let sukses = 0, gagal = 0;
      for (const s of siswaList) {
        try { const r = await fetch(url, { method:"POST", body:JSON.stringify({ action:"tambahSiswa", ...s }) }); const d = await r.json(); if (d.status === "success") sukses++; else gagal++; } catch { gagal++; }
      }
      addToast(`✅ Import selesai: ${sukses} berhasil, ${gagal} gagal (duplikasi NISN dilewati).`, sukses > 0 ? "success" : "error");
      fetchSiswa();
    } catch (err) { addToast("Gagal membaca file: " + err.message, "error"); } finally { setImporting(false); }
  };
  const filtered = daftarSiswa.filter(s => s.nama?.toLowerCase().includes(search.toLowerCase()) || s.nisn?.includes(search) || s.kelas?.includes(search));
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-black uppercase tracking-wide" style={{ color: "#003082" }}>Data Siswa</h2>
          <p className="text-sm text-slate-500">{daftarSiswa.length} siswa terdaftar</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleDownloadTemplate} className="font-bold py-2 px-4 text-sm" style={{ background: "#f1f5f9", color: "#475569", borderRadius: "0", border: "1px solid #cbd5e1" }}>📥 Download Template</button>
          <button onClick={() => fileInputRef.current?.click()} disabled={importing} className="font-bold py-2 px-4 text-sm disabled:opacity-50" style={{ background: "#f0fdf4", color: "#15803d", borderRadius: "0", border: "1px solid #86efac" }}>
            {importing ? <><span className="w-4 h-4 border-2 border-green-400 border-t-green-700 rounded-full animate-spin inline-block" /> Mengimpor...</> : <>📤 Import XLSX/CSV</>}
          </button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileImport} />
          <button onClick={() => setShowForm(v => !v)} className={btn(showForm ? "slate" : "blue")}>{showForm ? "✕ Batal" : "➕ Tambah Manual"}</button>
        </div>
      </div>
      <div className="p-3 text-xs space-y-1" style={{ background: "#f0fdf4", border: "1px solid #86efac", borderLeft: "4px solid #16a34a", borderRadius: "0", color: "#15803d" }}>
        <p className="font-bold mb-1">📋 Cara Import Massal:</p>
        <p>1. Klik <strong>Download Template</strong> → buka di Excel/Google Sheets</p>
        <p>2. Isi data siswa (NISN, Nama, Kelas) sesuai kolom</p>
        <p>3. Simpan sebagai <strong>.xlsx</strong> atau <strong>.csv</strong></p>
        <p>4. Klik <strong>Import XLSX/CSV</strong> → pilih file → data otomatis masuk</p>
      </div>
      {showForm && (
        <div className="p-5 space-y-4" style={{ background: "#eff6ff", border: "1px solid #93c5fd", borderLeft: "4px solid #003082", borderRadius: "0" }}>
          <h3 className="font-bold text-sm uppercase tracking-wide" style={{ color: "#003082" }}>Tambah Siswa Manual</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="NISN"><input value={nisn} onChange={e=>setNisn(e.target.value)} placeholder="10 digit NISN" className={inp} maxLength={20} /></Field>
            <Field label="Nama Lengkap"><input value={nama} onChange={e=>setNama(e.target.value)} placeholder="Nama lengkap siswa" className={inp} /></Field>
            <Field label="Kelas"><input value={kelas} onChange={e=>setKelas(e.target.value)} placeholder="Contoh: 5A, 6B" className={inp} /></Field>
          </div>
          <button onClick={handleTambah} disabled={saving} className={btn("green") + " w-full"}>{saving ? "Menyimpan..." : "💾 Simpan Siswa"}</button>
        </div>
      )}
      <div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Cari siswa (nama/NISN/kelas)..." className={inp + " mb-3"} />
        {loading ? <div className="text-center py-8 text-slate-400">Memuat data siswa...</div>
        : filtered.length === 0 ? <div className="text-center py-8 text-slate-400">{daftarSiswa.length === 0 ? "Belum ada siswa. Tambah manual atau import dari Excel." : "Tidak ada siswa yang cocok."}</div>
        : <div className="overflow-x-auto" style={{ border: "1px solid #e2e8f0", borderRadius: "0" }}>
            <table className="w-full text-sm">
              <thead><tr style={{ background: "#003082" }} className="text-white"><th className="px-4 py-3 text-left">NISN</th><th className="px-4 py-3 text-left">Nama</th><th className="px-4 py-3 text-left">Kelas</th><th className="px-4 py-3 text-center">Aksi</th></tr></thead>
              <tbody>{filtered.map((s, i) => (
                <tr key={s.nisn} style={{ background: i%2===0 ? "#fff" : "#f8fafc" }}>
                  <td className="px-4 py-3 font-mono text-xs">{s.nisn}</td><td className="px-4 py-3 font-medium">{s.nama}</td><td className="px-4 py-3">{s.kelas}</td>
                  <td className="px-4 py-3 text-center"><button onClick={() => handleHapus(s.nisn)} className="text-xs font-bold px-2 py-1" style={{ color: "#CC0000", borderRadius: "0" }}>Hapus</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        }
      </div>
    </div>
  );
}

// ============================================================
// MANAJEMEN MAPEL & ASESMEN (dengan toggle switch token, edit token)
// ============================================================
function TabMapel({ scriptUrl, addToast, mapelList, setMapelList, asesmenList, setAsesmenList }) {
  const [newMapel, setNewMapel] = useState("");
  const [newAsesmen, setNewAsesmen] = useState("");
  const [tokenMapel, setTokenMapel] = useState(mapelList[0] || "");
  const [tokenAsesmen, setTokenAsesmen] = useState(asesmenList[0] || "");
  const [tokenValue, setTokenValue] = useState("");
  const [daftarToken, setDaftarToken] = useState([]);
  const [loadToken, setLoadToken] = useState(false);
  const [kkmData, setKkmData] = useState({});
  const [kkmLoading, setKkmLoading] = useState(false);
  const [kkmSaving, setKkmSaving] = useState(false);
  // Modal edit token
  const [editModal, setEditModal] = useState(null); // { mapel, asesmen, token }
  const [editTokenValue, setEditTokenValue] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const loadKKM = async () => {
    setKkmLoading(true);
    const data = await fetchKKM(scriptUrl);
    setKkmData(data);
    setKkmLoading(false);
  };
  useEffect(() => { loadKKM(); }, []);

  const handleKKMChange = (mapel, value) => {
    setKkmData(prev => ({ ...prev, [mapel]: value === "" ? "" : Number(value) }));
  };
  const handleSaveKKM = async () => {
    setKkmSaving(true);
    const success = await simpanKKM(scriptUrl, kkmData);
    if (success) addToast("KKM berhasil disimpan!", "success");
    else addToast("Gagal menyimpan KKM", "error");
    setKkmSaving(false);
  };

  const handleTambahMapel = async () => {
    const m = newMapel.trim();
    if (!m) return addToast("Nama mapel tidak boleh kosong!", "error");
    if (mapelList.includes(m)) return addToast("Mapel sudah ada!", "warning");
    try {
      const url = scriptUrl || APPS_SCRIPT_URL;
      const res = await fetch(url, { method:"POST", body:JSON.stringify({ action:"tambahMapelKustom", nama:m }) });
      const d = await res.json();
      if (d.status === "success") {
        addToast(`Mapel "${m}" ditambahkan!`, "success");
        setNewMapel("");
        const newMapels = await fetchMapelList(scriptUrl);
        setMapelList(newMapels);
        loadKKM();
      } else addToast(d.message, "error");
    } catch { addToast("Gagal terhubung ke server", "error"); }
  };
  const handleHapusMapel = async (m) => {
    if (DEFAULT_MAPEL.includes(m)) return addToast("Mapel bawaan tidak bisa dihapus.", "warning");
    if (!window.confirm(`Hapus mapel "${m}"?`)) return;
    try {
      const url = scriptUrl || APPS_SCRIPT_URL;
      const res = await fetch(url, { method:"POST", body:JSON.stringify({ action:"hapusMapelKustom", nama:m }) });
      const d = await res.json();
      if (d.status === "success") {
        addToast(`Mapel "${m}" dihapus.`, "success");
        const newMapels = await fetchMapelList(scriptUrl);
        setMapelList(newMapels);
        loadKKM();
      } else addToast(d.message, "error");
    } catch { addToast("Gagal terhubung ke server", "error"); }
  };
  const handleTambahAsesmen = async () => {
    const a = newAsesmen.trim();
    if (!a) return addToast("Nama asesmen tidak boleh kosong!", "error");
    if (asesmenList.includes(a)) return addToast("Asesmen sudah ada!", "warning");
    try {
      const url = scriptUrl || APPS_SCRIPT_URL;
      const res = await fetch(url, { method:"POST", body:JSON.stringify({ action:"tambahAsesmenKustom", nama:a }) });
      const d = await res.json();
      if (d.status === "success") {
        addToast(`Asesmen "${a}" ditambahkan!`, "success");
        setNewAsesmen("");
        const newAsesmens = await fetchAsesmenList(scriptUrl);
        setAsesmenList(newAsesmens);
      } else addToast(d.message, "error");
    } catch { addToast("Gagal terhubung ke server", "error"); }
  };
  const handleHapusAsesmen = async (a) => {
    if (DEFAULT_ASESMEN.includes(a)) return addToast("Asesmen bawaan tidak bisa dihapus.", "warning");
    if (!window.confirm(`Hapus asesmen "${a}"?`)) return;
    try {
      const url = scriptUrl || APPS_SCRIPT_URL;
      const res = await fetch(url, { method:"POST", body:JSON.stringify({ action:"hapusAsesmenKustom", nama:a }) });
      const d = await res.json();
      if (d.status === "success") {
        addToast(`Asesmen "${a}" dihapus.`, "success");
        const newAsesmens = await fetchAsesmenList(scriptUrl);
        setAsesmenList(newAsesmens);
      } else addToast(d.message, "error");
    } catch { addToast("Gagal terhubung ke server", "error"); }
  };

  const fetchToken = async () => {
    const url = scriptUrl || APPS_SCRIPT_URL;
    if (url.includes("YOUR_APPS_SCRIPT_ID")) return;
    setLoadToken(true);
    try { const r = await fetch(`${url}?action=getDaftarToken`); const d = await r.json(); if (d.status==="success") setDaftarToken(d.data || []); } catch {} finally { setLoadToken(false); }
  };
  useEffect(() => { fetchToken(); }, []);

  const handleSimpanToken = async () => {
    if (!tokenValue.trim()) return addToast("Isi token terlebih dahulu!", "error");
    try {
      const url = scriptUrl || APPS_SCRIPT_URL;
      const r = await fetch(url, { method:"POST", body:JSON.stringify({ action:"simpanToken", mapel:tokenMapel, asesmen:tokenAsesmen, token:tokenValue.toUpperCase() }) });
      const d = await r.json();
      if (d.status==="success") { addToast(`Token "${tokenValue.toUpperCase()}" disimpan!`, "success"); setTokenValue(""); fetchToken(); }
      else addToast(d.message, "error");
    } catch { addToast(`Demo: Token "${tokenValue}" (belum terhubung)`, "warning"); }
  };

  // Update status token (aktif/nonaktif)
  const handleToggleStatus = async (mapel, asesmen, token, currentStatus) => {
    try {
      const url = scriptUrl || APPS_SCRIPT_URL;
      const newStatus = currentStatus === "TRUE" ? "FALSE" : "TRUE";
      const response = await fetch(url, {
        method: "POST",
        body: JSON.stringify({ action: "updateTokenStatus", mapel, asesmen, status: newStatus })
      });
      const result = await response.json();
      if (result.status === "success") {
        addToast(`Token ${newStatus === "TRUE" ? "diaktifkan" : "dinonaktifkan"}!`, "success");
        fetchToken();
      } else {
        addToast(result.message || "Gagal mengubah status token", "error");
      }
    } catch (error) {
      console.error(error);
      addToast("Gagal mengubah status token", "error");
    }
  };

  // Edit token
  const openEditModal = (t) => {
    setEditModal({ mapel: t.mapel, asesmen: t.asesmen, token: t.token });
    setEditTokenValue(t.token);
  };
  const closeEditModal = () => {
    setEditModal(null);
    setEditTokenValue("");
  };
  const handleEditToken = async () => {
    if (!editTokenValue.trim()) return addToast("Token tidak boleh kosong!", "error");
    setEditSaving(true);
    try {
      const url = scriptUrl || APPS_SCRIPT_URL;
      const res = await fetch(url, {
        method: "POST",
        body: JSON.stringify({
          action: "simpanToken",
          mapel: editModal.mapel,
          asesmen: editModal.asesmen,
          token: editTokenValue.toUpperCase()
        })
      });
      const d = await res.json();
      if (d.status === "success") {
        addToast("Token berhasil diubah!", "success");
        fetchToken();
        closeEditModal();
      } else {
        addToast(d.message || "Gagal mengubah token", "error");
      }
    } catch (error) {
      addToast("Gagal terhubung ke server", "error");
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black uppercase tracking-wide" style={{ color: "#003082" }}>Manajemen Mapel & Token</h2>
        <p className="text-sm text-slate-500">Kelola mata pelajaran, asesmen, token, dan KKM.</p>
      </div>
      <div className="grid md:grid-cols-2 gap-5">
        <div className="bg-white p-5 space-y-4" style={{ border: "1px solid #e2e8f0", borderTop: "3px solid #003082", borderRadius: "0" }}>
          <h3 className="font-bold uppercase tracking-wide text-sm" style={{ color: "#003082" }}>📚 Mata Pelajaran</h3>
          <div className="flex gap-2"><input value={newMapel} onChange={e=>setNewMapel(e.target.value)} placeholder="Tambah mapel baru..." className={inp + " flex-1"} onKeyDown={e=>e.key==="Enter" && handleTambahMapel()} /><button onClick={handleTambahMapel} className={btn("blue")}>+ Tambah</button></div>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {mapelList.map(m => (
              <div key={m} className="flex items-center justify-between px-3 py-2" style={{ background: "#f8fafc", borderLeft: "3px solid #003082", marginBottom: "2px" }}>
                <div className="flex items-center gap-2"><span className="text-sm font-medium text-slate-700">{m}</span>{!DEFAULT_MAPEL.includes(m) && <span className="text-xs px-1.5 py-0.5 font-medium" style={{ background: "#eff6ff", color: "#003082", borderRadius: "0" }}>Kustom</span>}</div>
                {!DEFAULT_MAPEL.includes(m) && <button onClick={() => handleHapusMapel(m)} className="text-xs font-medium" style={{ color: "#CC0000" }}>Hapus</button>}
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400">Total: {mapelList.length} mapel ({mapelList.length - DEFAULT_MAPEL.length} kustom)</p>
        </div>
        <div className="bg-white p-5 space-y-4" style={{ border: "1px solid #e2e8f0", borderTop: "3px solid #CC0000", borderRadius: "0" }}>
          <h3 className="font-bold uppercase tracking-wide text-sm" style={{ color: "#CC0000" }}>📋 Jenis Asesmen</h3>
          <div className="flex gap-2"><input value={newAsesmen} onChange={e=>setNewAsesmen(e.target.value)} placeholder="Tambah asesmen baru..." className={inp + " flex-1"} onKeyDown={e=>e.key==="Enter" && handleTambahAsesmen()} /><button onClick={handleTambahAsesmen} className={btn("blue")}>+ Tambah</button></div>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {asesmenList.map(a => (
              <div key={a} className="flex items-center justify-between px-3 py-2" style={{ background: "#f8fafc", borderLeft: "3px solid #CC0000", marginBottom: "2px" }}>
                <div className="flex items-center gap-2"><span className="text-sm font-medium text-slate-700">{a}</span>{!DEFAULT_ASESMEN.includes(a) && <span className="text-xs px-1.5 py-0.5 font-medium" style={{ background: "#fef2f2", color: "#CC0000", borderRadius: "0" }}>Kustom</span>}</div>
                {!DEFAULT_ASESMEN.includes(a) && <button onClick={() => handleHapusAsesmen(a)} className="text-xs font-medium" style={{ color: "#CC0000" }}>Hapus</button>}
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400">Total: {asesmenList.length} asesmen ({asesmenList.length - DEFAULT_ASESMEN.length} kustom)</p>
        </div>
      </div>

      {/* KKM Settings */}
      <div className="bg-white p-5 space-y-4" style={{ border: "1px solid #e2e8f0", borderTop: "3px solid #16a34a", borderRadius: "0" }}>
        <h3 className="font-bold uppercase tracking-wide text-sm" style={{ color: "#15803d" }}>🎯 Nilai Ketuntasan Minimal (KKM) per Mapel</h3>
        {kkmLoading ? <p className="text-xs text-slate-400">Memuat KKM...</p> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {mapelList.map(mapel => (
              <div key={mapel} className="flex items-center gap-2">
                <label className="text-xs font-medium text-slate-600 w-32 truncate">{mapel}</label>
                <input type="number" min={0} max={100} value={kkmData[mapel] !== undefined ? kkmData[mapel] : ""} onChange={e => handleKKMChange(mapel, e.target.value)} placeholder="75" className="w-20 border-2 border-slate-200 px-2 py-1 text-sm text-center" style={{ borderRadius: "0" }} />
                <span className="text-xs text-slate-400">(default 75)</span>
              </div>
            ))}
          </div>
        )}
        <button onClick={handleSaveKKM} disabled={kkmSaving} className={btn("green") + " w-full md:w-auto"}>{kkmSaving ? "Menyimpan..." : "💾 Simpan KKM"}</button>
        <p className="text-xs text-slate-500">* KKM digunakan untuk menentukan "Tuntas" / "Belum Tuntas" di halaman Rekap Hasil.</p>
      </div>

      <div className="p-3 text-xs" style={{ background: "#f0fdf4", border: "1px solid #86efac", borderLeft: "4px solid #16a34a", borderRadius: "0", color: "#15803d" }}>✅ Mapel dan asesmen kustom otomatis tersedia di login, input soal, dan rekap hasil.</div>
      
      {/* Token Management */}
      <div className="bg-white p-5 space-y-4" style={{ border: "1px solid #e2e8f0", borderTop: "3px solid #d97706", borderRadius: "0" }}>
        <h3 className="font-bold uppercase tracking-wide text-sm" style={{ color: "#b45309" }}>🔑 Token Ujian</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Mata Pelajaran"><select value={tokenMapel} onChange={e=>setTokenMapel(e.target.value)} className={inp}>{mapelList.map(m=><option key={m}>{m}</option>)}</select></Field>
          <Field label="Asesmen"><select value={tokenAsesmen} onChange={e=>setTokenAsesmen(e.target.value)} className={inp}>{asesmenList.map(a=><option key={a}>{a}</option>)}</select></Field>
          <Field label="Token"><input value={tokenValue} onChange={e=>setTokenValue(e.target.value.toUpperCase())} placeholder="Contoh: MTK2024" className={inp + " uppercase tracking-widest font-mono font-bold"} /></Field>
        </div>
        <button onClick={handleSimpanToken} className={btn("green") + " w-full md:w-auto"}>🔑 Simpan Token</button>
        
        <div>
          <div className="flex items-center justify-between mb-2"><p className="text-xs font-bold text-slate-600 uppercase">Daftar Token Aktif</p><button onClick={fetchToken} className="text-xs" style={{ color: "#003082" }}>🔄 Refresh</button></div>
          {loadToken ? <p className="text-xs text-slate-400">Memuat...</p> : daftarToken.length === 0 ? <p className="text-xs text-slate-400">Belum ada token</p> : (
            <div className="overflow-x-auto" style={{ border: "1px solid #e2e8f0", borderRadius: "0" }}>
              <table className="w-full text-xs">
                <thead><tr style={{ background: "#003082" }} className="text-white"><th className="px-3 py-2 text-left">Mapel</th><th className="px-3 py-2 text-left">Asesmen</th><th className="px-3 py-2 text-left">Token</th><th className="px-3 py-2 text-center">Status</th><th className="px-3 py-2 text-center">Aksi</th></tr></thead>
                <tbody>{daftarToken.map((t, i) => (
                  <tr key={i} style={{ background: i%2===0 ? "#fff" : "#f8fafc" }}>
                    <td className="px-3 py-2">{t.mapel}</td>
                    <td className="px-3 py-2">{t.asesmen}</td>
                    <td className="px-3 py-2 font-mono font-bold" style={{ color: "#003082" }}>{t.token}</td>
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => handleToggleStatus(t.mapel, t.asesmen, t.token, t.aktif)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${t.aktif === "TRUE" ? "bg-green-500" : "bg-gray-300"}`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${t.aktif === "TRUE" ? "translate-x-6" : "translate-x-1"}`} />
                      </button>
                      <span className="ml-2 text-xs font-medium">{t.aktif === "TRUE" ? "Aktif" : "Nonaktif"}</span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => openEditModal(t)} className="text-xs font-medium px-2 py-1" style={{ color: "#003082" }}>✏️ Edit</button>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal Edit Token */}
      {editModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e=>{ if(e.target===e.currentTarget) closeEditModal(); }}>
          <div className="bg-white shadow-2xl w-full max-w-md p-6" style={{ border: "2px solid #003082", borderRadius: "0" }}>
            <div className="flex items-center gap-2 mb-4" style={{ borderBottom: "3px solid #CC0000", paddingBottom: "10px" }}>
              <span className="text-lg">✏️</span>
              <h3 className="text-lg font-black uppercase tracking-wide" style={{ color: "#003082" }}>Edit Token</h3>
            </div>
            <div className="space-y-4">
              <Field label="Mata Pelajaran"><input value={editModal.mapel} disabled className={inp + " bg-slate-100"} /></Field>
              <Field label="Asesmen"><input value={editModal.asesmen} disabled className={inp + " bg-slate-100"} /></Field>
              <Field label="Token Baru">
                <input value={editTokenValue} onChange={e=>setEditTokenValue(e.target.value.toUpperCase())} placeholder="Token baru" className={inp + " uppercase tracking-widest font-mono font-bold"} />
              </Field>
              <div className="flex gap-3 pt-2">
                <button onClick={closeEditModal} className={btn("slate") + " flex-1"}>Batal</button>
                <button onClick={handleEditToken} disabled={editSaving} className={btn("blue") + " flex-1"}>{editSaving ? "Menyimpan..." : "Simpan"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// RICH TEXT EDITOR dengan toolbar (bold, italic, list, formula)
// ============================================================
function RichTextEditor({ value, onChange, placeholder = "Tulis soal di sini..." }) {
  const editorRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);

  // Inisialisasi editor saat mount
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }
  }, []);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      const selection = window.getSelection();
      if (!selection.rangeCount) return;
      
      const node = selection.getRangeAt(0).startContainer;
      const isInList = node.parentElement?.closest?.("li") || node.closest?.("li");
      
      if (isInList) {
        e.preventDefault();
        document.execCommand("insertParagraph", false);
        setTimeout(() => {
          const newSelection = window.getSelection();
          if (newSelection.rangeCount) {
            const newNode = newSelection.getRangeAt(0).startContainer;
            const newLi = newNode.parentElement?.closest?.("li");
            if (newLi && newLi.innerText.trim() === "") {
              newLi.remove();
            }
          }
        }, 10);
      }
    }
  };

  const execCommand = (command, val = null) => {
    document.execCommand(command, false, val);
    handleInput();
    editorRef.current?.focus();
  };

  const insertFormula = () => {
    const formula = prompt("Masukkan formula LaTeX (contoh: \\frac{1}{2} atau \\sqrt{x})", "\\frac{}{}");
    if (formula) {
      document.execCommand("insertText", false, `$${formula}$`);
      handleInput();
      editorRef.current?.focus();
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    handleInput();
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  // Cek apakah ada formula untuk menampilkan preview
  const hasFormula = () => {
    return value && /\$[^$]+\$/.test(value);
  };

  // Hilangkan tag HTML untuk preview teks biasa
  const stripHtml = (html) => {
    const temp = document.createElement("div");
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || "";
  };

  const plainText = stripHtml(value || "");

  // Cek apakah editor kosong (hanya berisi <br> atau kosong)
  const isEmpty = !value || value === "<br>" || value === "";

  return (
    <div className="space-y-2">
      <div className="border-2 border-slate-200 rounded-xl overflow-hidden focus-within:border-blue-500 transition-colors relative">
        <div className="bg-slate-50 border-b border-slate-200 px-2 py-1.5 flex flex-wrap gap-1">
          <button type="button" onClick={() => execCommand("bold")} className="p-1.5 rounded hover:bg-slate-200 text-slate-600 font-bold" title="Bold"><span className="font-bold text-sm">B</span></button>
          <button type="button" onClick={() => execCommand("italic")} className="p-1.5 rounded hover:bg-slate-200 text-slate-600 italic" title="Italic"><span className="italic text-sm">I</span></button>
          <div className="w-px h-6 bg-slate-300 mx-1 self-center" />
          <button type="button" onClick={() => execCommand("insertOrderedList")} className="p-1.5 rounded hover:bg-slate-200 text-slate-600" title="Numbered List"><span className="text-sm">1. List</span></button>
          <button type="button" onClick={() => execCommand("insertUnorderedList")} className="p-1.5 rounded hover:bg-slate-200 text-slate-600" title="Bullet List"><span className="text-sm">• List</span></button>
          <div className="w-px h-6 bg-slate-300 mx-1 self-center" />
          <button type="button" onClick={insertFormula} className="p-1.5 rounded hover:bg-blue-100 text-blue-600 font-mono" title="Insert Formula"><span className="text-sm font-bold">∑ Formula</span></button>
        </div>
        
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className="w-full px-4 py-3 text-sm text-slate-800 focus:outline-none min-h-[120px] max-h-[300px] overflow-y-auto"
          style={{ lineHeight: "1.6" }}
        />
        
        {/* Placeholder hanya muncul saat kosong dan tidak fokus */}
        {isEmpty && !isFocused && (
          <div className="absolute text-slate-400 text-sm px-4 py-3 top-10 left-0 pointer-events-none">
            {placeholder}
          </div>
        )}
      </div>
      
      {/* Preview menggunakan MathText (sama seperti opsi jawaban) - hanya muncul jika ada formula */}
      {value && value.trim() !== "" && hasFormula() && (
        <div className="mt-3 p-4 bg-green-50 border border-green-200 rounded-xl">
          <p className="text-xs font-semibold text-green-700 mb-2 flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
            Preview Hasil Render:
          </p>
          <div className="text-sm text-slate-700 bg-white p-3 rounded-lg border border-green-100">
            <MathText text={plainText} />
          </div>
          <p className="text-xs text-green-600 mt-2 italic">✓ Formula matematika akan tampil seperti ini di halaman siswa</p>
        </div>
      )}
    </div>
  );
}

// ============================================================
// TAB INPUT SOAL (LENGKAP)
// ============================================================
function TabInputSoal({ scriptUrl, addToast, mapelList, asesmenList }) {
  mapelList = mapelList || DEFAULT_MAPEL;
  asesmenList = asesmenList || DEFAULT_ASESMEN;
  const [soal, setSoal] = useState("");
  const [gambar, setGambar] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [point, setPoint] = useState(10);
  const [mapel, setMapel] = useState(mapelList[0]);
  const [asesmen, setAsesmen] = useState(asesmenList[0]);
  const [jenisSoal, setJenisSoal] = useState("Pilihan Ganda");
  const [opsi, setOpsi] = useState(["", "", "", ""]);
  const [jawabanBenar, setJawabanBenar] = useState([]);
  const [jawabanReferensi, setJawabanReferensi] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGantiJenis = j => {
    setJenisSoal(j);
    if (j === "Benar/Salah Kompleks") setOpsi(["", "", ""]);
    else if (j === "Uraian/Esai") setOpsi([]);
    else setOpsi(["", "", "", ""]);
    setJawabanBenar([]);
    setJawabanReferensi("");
    if (j === "Uraian/Esai") setPoint(0);
    else setPoint(10);
  };

  const handleOpsiChange = (i, v) => { const a = [...opsi]; a[i] = v; setOpsi(a); };
  const handleAddOpsi = () => setOpsi([...opsi, ""]);
  const handleRemoveOpsi = i => { setOpsi(opsi.filter((_, idx) => idx !== i)); setJawabanBenar(jawabanBenar.filter(j => j !== opsi[i])); };
  const handleJawabanPG = v => setJawabanBenar([v]);
  const handleJawabanPGK = v => setJawabanBenar(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v]);
  const handleJawabanBS = (idx, val) => { const arr = [...(jawabanBenar.length === opsi.length ? jawabanBenar : opsi.map(() => ""))]; arr[idx] = val; setJawabanBenar(arr); };
  
  const handleOpsiPaste = (e, startIdx) => {
    const text = e.clipboardData.getData("text");
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length <= 1) return;
    e.preventDefault();
    const newOpsi = [...opsi];
    lines.forEach((line, i) => {
      const idx = startIdx + i;
      if (idx < newOpsi.length) newOpsi[idx] = line;
      else newOpsi.push(line);
    });
    setOpsi(newOpsi);
    addToast(`✅ ${lines.length} opsi di-paste sekaligus!`, "success");
  };

  const handleSubmit = async () => {
    if (!soal.trim()) return addToast("Soal tidak boleh kosong!", "error");
    
    if (jenisSoal !== "Uraian/Esai") {
      if (!point || isNaN(point) || point <= 0) return addToast("Point harus diisi dengan angka positif!", "error");
    }
    
    if (jenisSoal !== "Uraian/Esai") {
      if (opsi.filter(o => o.trim()).length < 2) return addToast("Minimal 2 opsi!", "error");
      if (jawabanBenar.length === 0) return addToast("Pilih jawaban benar!", "error");
    }
    
    const payload = {
      action: "tambahSoal",
      mapel, asesmen, soal, gambar, jenisSoal,
      opsi: jenisSoal === "Uraian/Esai" ? "[]" : JSON.stringify(opsi.filter(o => o.trim())),
      jawabanBenar: jenisSoal === "Uraian/Esai" ? "[]" : JSON.stringify(jawabanBenar),
      jawabanReferensi: jenisSoal === "Uraian/Esai" ? jawabanReferensi : "",
      point: jenisSoal === "Uraian/Esai" ? 0 : Number(point)
    };
    
    setLoading(true);
    try {
      const url = scriptUrl || APPS_SCRIPT_URL;
      const r = await fetch(url, { method: "POST", body: JSON.stringify(payload) });
      const d = await r.json();
      if (d.status === "success") {
        addToast("Soal berhasil disimpan! ✅", "success");
        setSoal("");
        setGambar("");
        setOpsi(["", "", "", ""]);
        setJawabanBenar([]);
        setJawabanReferensi("");
        setShowPreview(false);
        if (jenisSoal !== "Uraian/Esai") setPoint(10);
        else setPoint(0);
      } else addToast(d.message || "Gagal menyimpan", "error");
    } catch { addToast("Mode Demo: Belum terhubung ke Apps Script", "warning"); }
    finally { setLoading(false); }
  };

  const isMath = isMapelMath(mapel);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-black uppercase tracking-wide" style={{ color: "#003082" }}>Input Soal</h2>
        <p className="text-sm text-slate-500">Tambahkan soal ke bank soal. Gunakan toolbar untuk format teks dan rumus matematika.</p>
      </div>
      
      <div className="bg-white p-6 space-y-5" style={{ border: "1px solid #e2e8f0", borderTop: "3px solid #CC0000", borderRadius: "0" }}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Mata Pelajaran">
            <select value={mapel} onChange={e => setMapel(e.target.value)} className={inp}>
              {mapelList.map(m => <option key={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Jenis Asesmen">
            <select value={asesmen} onChange={e => setAsesmen(e.target.value)} className={inp}>
              {asesmenList.map(a => <option key={a}>{a}</option>)}
            </select>
          </Field>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <Field label="Jenis Soal">
            <select value={jenisSoal} onChange={e => handleGantiJenis(e.target.value)} className={inp}>
              {JENIS_SOAL_LENGKAP.map(j => <option key={j}>{j}</option>)}
            </select>
          </Field>
          <Field label="Point/Nilai">
            <input 
              type="number" 
              value={point} 
              onChange={e => setPoint(Number(e.target.value))} 
              min={jenisSoal === "Uraian/Esai" ? 0 : 1} 
              className={inp} 
              disabled={jenisSoal === "Uraian/Esai"}
            />
            {jenisSoal === "Uraian/Esai" && (
              <p className="text-xs text-amber-600 mt-1">⚠️ Point tidak digunakan untuk soal uraian, nilai ditentukan guru saat koreksi.</p>
            )}
          </Field>
        </div>
        
        <Field label="Pertanyaan">
          <RichTextEditor 
            value={soal} 
            onChange={setSoal} 
            placeholder="Tulis soal di sini... Gunakan toolbar untuk bold, list, atau formula $$rumus$$"
          />
        </Field>
        
        <Field label="URL Gambar (opsional)" hint="Google Drive atau URL langsung">
          <div className="flex gap-2">
            <input 
              type="url" 
              value={gambar} 
              onChange={e => { setGambar(e.target.value); setShowPreview(false); }} 
              placeholder="https://drive.google.com/file/d/..." 
              className={inp + " flex-1"} 
            />
            {gambar && <button onClick={() => setShowPreview(v => !v)} className={btn("slate")}>{showPreview ? "Tutup" : "👁 Preview"}</button>}
          </div>
          {showPreview && gambar && <div className="mt-2 overflow-hidden rounded-xl"><GambarSoal url={gambar} /></div>}
        </Field>
        
        {/* Opsi Jawaban - hanya untuk soal non-esai */}
        {jenisSoal !== "Uraian/Esai" && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs font-semibold text-slate-600">Opsi Jawaban</p>
                <p className="text-xs text-blue-500">💡 Ctrl+V di Opsi A untuk paste banyak sekaligus</p>
              </div>
              <button onClick={handleAddOpsi} className="text-xs px-3 py-1 font-medium" style={{ background: "#eff6ff", color: "#003082", borderRadius: "0", border: "1px solid #93c5fd" }}>+ Tambah Opsi</button>
            </div>
            <div className="space-y-2">
              {opsi.map((o, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="w-7 h-7 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-2" style={{ background: "#003082", color: "#fff", borderRadius: "0" }}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <div className="flex-1">
                    <MathInput 
                      value={o} 
                      onChange={e => handleOpsiChange(i, e.target.value)} 
                      onPaste={e => handleOpsiPaste(e, i)} 
                      rows={1} 
                      placeholder={`Opsi ${String.fromCharCode(65 + i)}`} 
                      showToolbar={isMath} 
                    />
                    {isMath && o && o.includes("$") && 
                      <div className="mt-0.5 px-2 py-1 bg-slate-50 rounded-lg text-xs"><MathText text={o} /></div>
                    }
                  </div>
                  {jenisSoal === "Pilihan Ganda" && 
                    <input type="radio" name="pg" checked={jawabanBenar[0] === o} onChange={() => handleJawabanPG(o)} className="w-4 h-4 mt-2.5" />
                  }
                  {jenisSoal === "Pilihan Ganda Kompleks" && 
                    <input type="checkbox" checked={jawabanBenar.includes(o)} onChange={() => handleJawabanPGK(o)} className="w-4 h-4 mt-2.5" />
                  }
                  {jenisSoal === "Benar/Salah Kompleks" && (
                    <div className="flex gap-1 flex-shrink-0 mt-1.5">
                      <button onClick={() => handleJawabanBS(i, "Benar")} className={`text-xs px-2 py-1 font-bold`} style={{ background: jawabanBenar[i] === "Benar" ? "#16a34a" : "#e2e8f0", color: jawabanBenar[i] === "Benar" ? "#fff" : "#475569", borderRadius: "0" }}>B</button>
                      <button onClick={() => handleJawabanBS(i, "Salah")} className={`text-xs px-2 py-1 font-bold`} style={{ background: jawabanBenar[i] === "Salah" ? "#CC0000" : "#e2e8f0", color: jawabanBenar[i] === "Salah" ? "#fff" : "#475569", borderRadius: "0" }}>S</button>
                    </div>
                  )}
                  {opsi.length > 2 && 
                    <button onClick={() => handleRemoveOpsi(i)} className="text-red-400 hover:text-red-600 text-xl mt-1.5">×</button>
                  }
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Jawaban referensi untuk esai */}
        {jenisSoal === "Uraian/Esai" && (
          <Field label="Kunci Jawaban Referensi (opsional)" hint="Membantu guru saat mengoreksi. Tidak ditampilkan ke siswa.">
            <textarea 
              value={jawabanReferensi} 
              onChange={e => setJawabanReferensi(e.target.value)} 
              rows={3} 
              placeholder="Tuliskan jawaban ideal/kata kunci sebagai referensi koreksi..." 
              className={inp + " resize-none"} 
            />
          </Field>
        )}
        
        <button onClick={handleSubmit} disabled={loading} className={btn("blue") + " w-full py-3 text-base"}>
          {loading ? "Menyimpan..." : "💾 Simpan Soal ke Spreadsheet"}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// REKAP HASIL UJIAN (dengan koreksi esai & bobot fleksibel)
// ============================================================
const mapelKodeMap = {
  "Bahasa Indonesia":"BINDO","Pendidikan Pancasila":"PPKN","IPAS":"IPAS",
  "Matematika":"MTK","Seni Rupa":"SENRUPA","Bahasa Madura":"BMADURA",
  "Pendidikan Agama Islam":"PAI","PJOK":"PJOK",
};
function getMapelKode(mapel) { return mapelKodeMap[mapel] || mapel.replace(/\s+/g,"").substring(0,8).toUpperCase(); }

function TabRekap({ scriptUrl, addToast, mapelList, asesmenList }) {
  mapelList = mapelList || DEFAULT_MAPEL;
  asesmenList = asesmenList || DEFAULT_ASESMEN;
  const [hasil, setHasil] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterMapel, setFilterMapel] = useState("Semua");
  const [filterAsesmen, setFilterAsesmen] = useState("Semua");
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);
  const [modalKoreksi, setModalKoreksi] = useState(null);
  const [skorPerSoal, setSkorPerSoal] = useState({});
  const [savingKoreksi, setSavingKoreksi] = useState(false);
  const [kkmData, setKkmData] = useState({});
  const [bobotObj, setBobotObj] = useState(80);
  const [bobotEsai, setBobotEsai] = useState(20);
  const [bobotLoading, setBobotLoading] = useState(false);
  const [bobotSaving, setBobotSaving] = useState(false);

  const loadKKM = async () => {
    const data = await fetchKKM(scriptUrl);
    setKkmData(data);
  };
 const loadBobot = async () => {
  const url = scriptUrl || APPS_SCRIPT_URL;
  if (url.includes("YOUR_APPS_SCRIPT_ID")) return;
  setBobotLoading(true);
  try {
    const res = await fetch(`${url}?action=getBobotNilai`);
    const data = await res.json();
    if (data.status === "success") {
      const bobotObjVal = Number(data.data.bobot_objektif) || 80;
      const bobotEsaiVal = Number(data.data.bobot_esai) || 20;
      setBobotObj(bobotObjVal);
      setBobotEsai(bobotEsaiVal);
    }
  } catch {} finally { setBobotLoading(false); }
};

const saveBobot = async () => {
  setBobotSaving(true);
  const url = scriptUrl || APPS_SCRIPT_URL;
  if (url.includes("YOUR_APPS_SCRIPT_ID")) {
    addToast("Demo: Bobot tersimpan lokal", "info");
    setBobotSaving(false);
    return;
  }
  try {
    const res = await fetch(url, { 
      method: "POST", 
      body: JSON.stringify({ 
        action: "simpanBobotNilai", 
        bobot_objektif: bobotObj, 
        bobot_esai: bobotEsai 
      }) 
    });
    const d = await res.json();
    if (d.status === "success") addToast("Bobot berhasil disimpan!", "success");
    else addToast("Gagal menyimpan bobot", "error");
  } catch { addToast("Gagal terhubung ke server", "error"); }
  setBobotSaving(false);
};

  useEffect(() => { loadKKM(); loadBobot(); }, []);

  const fetchHasil = async (targetMapel = "Semua") => {
    const url = scriptUrl || APPS_SCRIPT_URL;
    if (url.includes("YOUR_APPS_SCRIPT_ID")) { setHasil([]); return; }
    setLoading(true);
    try {
      if (targetMapel === "Semua") {
        const allData = [];
        await Promise.all(mapelList.map(async (m) => {
          const kode = getMapelKode(m);
          try { const r = await fetch(`${url}?action=getHasilPerMapel&kode=${encodeURIComponent(kode)}`); const d = await r.json(); if (d.status === "success" && d.data?.length > 0) allData.push(...d.data); } catch {}
        }));
        setHasil(allData);
      } else {
        const kode = getMapelKode(targetMapel);
        const r = await fetch(`${url}?action=getHasilPerMapel&kode=${encodeURIComponent(kode)}`);
        const d = await r.json();
        if (d.status === "success") setHasil(d.data || []);
        else setHasil([]);
      }
    } catch {} finally { setLoading(false); }
  };
  useEffect(() => { fetchHasil(); }, []);

  const handleFilterMapel = (m) => { setFilterMapel(m); fetchHasil(m); };

  const filtered = hasil.filter(h => {
    if (filterAsesmen !== "Semua" && h.asesmen !== filterAsesmen) return false;
    if (search && !h.nama?.toLowerCase().includes(search.toLowerCase()) && !h.nisn?.includes(search)) return false;
    return true;
  });

  const hitungNilaiAkhir = (h) => {
    const obj = Number(h.skorObjektif || 0);
    const esai = (h.skorEsai !== undefined && h.skorEsai !== "") ? Number(h.skorEsai) : null;
    const adaEsai = h.adaEsai === "TRUE" || h.adaEsai === true || (h.jawabanEsai && h.jawabanEsai !== "" && h.jawabanEsai !== "[]");
    if (!adaEsai) return obj;
    if (esai !== null) return Math.round(obj * (bobotObj/100) + esai * (bobotEsai/100));
    return obj;
  };

  const getKKMForMapel = (mapel) => {
    const kkm = kkmData[mapel];
    return kkm !== undefined && !isNaN(kkm) ? kkm : 75;
  };

  const handleExportXLSX = async () => {
    if (filtered.length === 0) return addToast("Tidak ada data untuk diekspor.", "warning");
    setExporting(true);
    try {
      if (!window.XLSX) await new Promise((res, rej) => { const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
      const wb = window.XLSX.utils.book_new();
      const mapelGroups = {};
      filtered.forEach(h => { const key = h.mapel || "Lainnya"; if (!mapelGroups[key]) mapelGroups[key] = []; mapelGroups[key].push(h); });
      Object.entries(mapelGroups).forEach(([mapelNama, rows]) => {
        const wsData = [["No","Waktu","NISN","Nama","Kelas","Asesmen","Skor Objektif","Skor Esai","Nilai Akhir","Keterangan"],
          ...rows.map((h, i) => { const nilaiAkhir = hitungNilaiAkhir(h); const kkm = getKKMForMapel(h.mapel); const ket = nilaiAkhir >= kkm ? "Tuntas" : "Belum Tuntas"; return [i+1, h.waktu||"", h.nisn||"", h.nama||"", h.noAbsen||"", h.asesmen||"", Number(h.skorObjektif||0), h.skorEsai !== undefined && h.skorEsai !== "" ? Number(h.skorEsai) : "-", nilaiAkhir, ket]; }),
          [], ["","","","","","Rata-rata","","", Math.round(rows.reduce((s, h) => s + hitungNilaiAkhir(h), 0) / rows.length)],
          ["","","","","","Nilai Tertinggi","","", Math.max(...rows.map(h => hitungNilaiAkhir(h)))],
          ["","","","","","Nilai Terendah","","", Math.min(...rows.map(h => hitungNilaiAkhir(h)))],
          ["","","","","","Jumlah Tuntas (≥ KKM)","","", rows.filter(h => hitungNilaiAkhir(h) >= getKKMForMapel(h.mapel)).length],
        ];
        const ws = window.XLSX.utils.aoa_to_sheet(wsData);
        ws["!cols"] = [{wch:5},{wch:18},{wch:14},{wch:25},{wch:10},{wch:16},{wch:14},{wch:10},{wch:12},{wch:14}];
        const sheetName = getMapelKode(mapelNama).substring(0,31);
        window.XLSX.utils.book_append_sheet(wb, ws, sheetName);
      });
      const wsGabungan = window.XLSX.utils.aoa_to_sheet([["No","Waktu","NISN","Nama","Kelas","Mapel","Asesmen","Skor Objektif","Skor Esai","Nilai Akhir","Keterangan"],
        ...filtered.map((h, i) => { const nilaiAkhir = hitungNilaiAkhir(h); const kkm = getKKMForMapel(h.mapel); const ket = nilaiAkhir >= kkm ? "Tuntas" : "Belum Tuntas"; return [i+1, h.waktu||"", h.nisn||"", h.nama||"", h.noAbsen||"", h.mapel||"", h.asesmen||"", Number(h.skorObjektif||0), h.skorEsai !== undefined && h.skorEsai !== "" ? Number(h.skorEsai) : "-", nilaiAkhir, ket]; })]);
      wsGabungan["!cols"] = [{wch:5},{wch:18},{wch:14},{wch:25},{wch:10},{wch:20},{wch:16},{wch:14},{wch:10},{wch:12},{wch:14}];
      window.XLSX.utils.book_append_sheet(wb, wsGabungan, "GABUNGAN");
      const tgl = new Date().toISOString().slice(0,10);
      window.XLSX.writeFile(wb, `Rekap_Hasil_Ujian_${tgl}.xlsx`);
      addToast(`✅ Export berhasil! ${filtered.length} data diekspor ke XLSX.`, "success");
    } catch (err) { addToast("Gagal export: " + err.message, "error"); } finally { setExporting(false); }
  };

  const handleSimpanKoreksi = async () => {
    if (!modalKoreksi) return;
    setSavingKoreksi(true);
    try {
      const url = scriptUrl || APPS_SCRIPT_URL;
      const totalEsai = Object.values(skorPerSoal).reduce((a,b) => a + (Number(b) || 0), 0);
      const jumlahEsai = Object.keys(skorPerSoal).length;
      const rerataSkorEsai = jumlahEsai > 0 ? Math.round(totalEsai / jumlahEsai) : 0;
      const r = await fetch(url, { method:"POST", body:JSON.stringify({ action:"simpanKoreksiEsai", nisn: modalKoreksi.nisn, mapel: modalKoreksi.mapel, asesmen: modalKoreksi.asesmen, waktu: modalKoreksi.waktu, skorEsai: rerataSkorEsai, detailSkorEsai: JSON.stringify(skorPerSoal) }) });
      const d = await r.json();
      if (d.status==="success") { addToast("Koreksi berhasil disimpan!", "success"); setModalKoreksi(null); setSkorPerSoal({}); fetchHasil(filterMapel); }
      else addToast(d.message||"Gagal","error");
    } catch { addToast("Gagal terhubung","error"); } finally { setSavingKoreksi(false); }
  };

  const asesmenTersedia = ["Semua", ...new Set(hasil.map(h=>h.asesmen).filter(Boolean))];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-black uppercase tracking-wide" style={{ color: "#003082" }}>Rekap Hasil Ujian</h2>
          <p className="text-sm text-slate-500">{filtered.length} data ditampilkan</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => fetchHasil(filterMapel)} className={btn("slate")}>🔄 Refresh</button>
          <button onClick={handleExportXLSX} disabled={exporting || filtered.length===0} className={btn("green") + " disabled:opacity-50"}>{exporting ? "Mengekspor..." : "📥 Export XLSX"}</button>
        </div>
      </div>

      {/* Bobot Settings */}
      <div className="bg-white p-4 flex flex-wrap items-end gap-4" style={{ border: "1px solid #e2e8f0", borderLeft: "4px solid #d97706", borderRadius: "0" }}>
        <div className="flex-1 min-w-[120px]">
          <label className="text-xs font-semibold text-slate-600 block mb-1">Bobot Nilai Objektif (%)</label>
          <input type="number" min={0} max={100} value={bobotObj} onChange={e => setBobotObj(Math.min(100, Math.max(0, Number(e.target.value))))} className={inp + " w-28"} />
        </div>
        <div className="flex-1 min-w-[120px]">
          <label className="text-xs font-semibold text-slate-600 block mb-1">Bobot Nilai Esai (%)</label>
          <input type="number" min={0} max={100} value={bobotEsai} onChange={e => setBobotEsai(Math.min(100, Math.max(0, Number(e.target.value))))} className={inp + " w-28"} />
        </div>
        <button onClick={saveBobot} disabled={bobotSaving} className={btn("blue") + " h-10"}>{bobotSaving ? "Menyimpan..." : "💾 Simpan Bobot"}</button>
        <p className="text-xs text-slate-400">* Bobot digunakan untuk menghitung nilai akhir jika ada esai. Total harus 100%.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Cari nama/NISN..." className={inp + " flex-1 min-w-48"} />
        <select value={filterMapel} onChange={e=>handleFilterMapel(e.target.value)} className={inp + " w-auto"}><option>Semua</option>{mapelList.map(m=><option key={m}>{m}</option>)}</select>
        <select value={filterAsesmen} onChange={e=>setFilterAsesmen(e.target.value)} className={inp + " w-auto"}>{asesmenTersedia.map(a=><option key={a}>{a}</option>)}</select>
      </div>
      {loading ? <div className="text-center py-10 text-slate-400"><div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-2" />Memuat data hasil ujian...</div>
      : filtered.length === 0 ? <div className="text-center py-10 text-slate-400">{hasil.length===0 ? "Belum ada hasil ujian." : "Tidak ada data yang cocok dengan filter."}</div>
      : <div className="overflow-x-auto" style={{ border: "1px solid #e2e8f0", borderRadius: "0" }}>
          <table className="w-full text-xs">
            <thead><tr style={{ background: "#003082" }} className="text-white"><th className="px-3 py-3 text-left">Waktu</th><th className="px-3 py-3 text-left">NISN</th><th className="px-3 py-3 text-left">Nama</th><th className="px-3 py-3 text-left">Mapel</th><th className="px-3 py-3 text-left">Asesmen</th><th className="px-3 py-3 text-center">Skor Obj.</th><th className="px-3 py-3 text-center">Skor Esai</th><th className="px-3 py-3 text-center">Nilai Akhir</th><th className="px-3 py-3 text-center">Keterangan</th><th className="px-3 py-3 text-center">Aksi</th></tr></thead>
            <tbody>{filtered.map((h, i) => {
              const nilaiAkhir = hitungNilaiAkhir(h);
              const sudahKoreksi = h.skorEsai !== undefined && h.skorEsai !== "";
              const adaEsai = h.adaEsai === "TRUE" || h.adaEsai === true || (h.jawabanEsai && h.jawabanEsai !== "" && h.jawabanEsai !== "[]");
              const kkm = getKKMForMapel(h.mapel);
              const keterangan = nilaiAkhir >= kkm ? "Tuntas" : "Belum Tuntas";
              return (
                <tr key={i} style={{ background: i%2===0 ? "#fff" : "#f8fafc" }}>
                  <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{h.waktu}</td>
                  <td className="px-3 py-2.5 font-mono">{h.nisn}</td>
                  <td className="px-3 py-2.5 font-medium">{h.nama}</td>
                  <td className="px-3 py-2.5">{h.mapel}</td>
                  <td className="px-3 py-2.5">{h.asesmen}</td>
                  <td className="px-3 py-2.5 text-center font-bold" style={{ color: "#003082" }}>{h.skorObjektif ?? "-"}</td>
                  <td className="px-3 py-2.5 text-center">{!adaEsai ? <span className="text-slate-300">—</span> : sudahKoreksi ? <span className="font-bold text-green-600">{h.skorEsai}</span> : <span className="font-bold" style={{ color: "#b45309" }}>Belum</span>}</td>
                  <td className="px-3 py-2.5 text-center"><span className="font-black text-sm" style={{ color: nilaiAkhir>=kkm ? "#15803d" : nilaiAkhir>=60 ? "#b45309" : "#CC0000" }}>{nilaiAkhir}</span></td>
                  <td className="px-3 py-2.5 text-center"><span className="px-2 py-0.5 text-xs font-bold" style={{ background: keterangan==="Tuntas" ? "#f0fdf4" : "#fef2f2", color: keterangan==="Tuntas" ? "#15803d" : "#CC0000", border: `1px solid ${keterangan==="Tuntas" ? "#86efac" : "#fca5a5"}`, borderRadius: "0" }}>{keterangan}</span></td>
                  <td className="px-3 py-2.5 text-center">{adaEsai && <button onClick={() => { setModalKoreksi(h); setSkorPerSoal({}); }} className="text-xs font-bold px-2 py-1" style={{ background: sudahKoreksi ? "#f0fdf4" : "#fff7ed", color: sudahKoreksi ? "#15803d" : "#b45309", borderRadius: "0", border: `1px solid ${sudahKoreksi ? "#86efac" : "#fcd34d"}` }}>{sudahKoreksi ? "✏️ Edit" : "📝 Koreksi"}</button>}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      }
      {modalKoreksi && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e=>{ if(e.target===e.currentTarget) setModalKoreksi(null); }}>
          <div className="bg-white shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" style={{ border: "2px solid #003082", borderRadius: "0" }}>
            <div className="sticky top-0 bg-white px-6 py-4 flex items-center justify-between" style={{ borderBottom: "3px solid #CC0000" }}>
              <div>
                <h3 className="font-black uppercase tracking-wide" style={{ color: "#003082" }}>📝 Koreksi Esai</h3>
                <p className="text-xs text-slate-500">{modalKoreksi.nama} — {modalKoreksi.mapel} / {modalKoreksi.asesmen}</p>
              </div>
              <button onClick={() => setModalKoreksi(null)} className="text-slate-400 hover:text-slate-600 text-2xl">×</button>
            </div>
            <div className="p-6 space-y-5">
              <div className="p-4" style={{ background: "#fff7ed", border: "1px solid #fcd34d", borderLeft: "4px solid #d97706", borderRadius: "0" }}>
                <p className="text-xs font-bold mb-2 uppercase tracking-wide" style={{ color: "#b45309" }}>Jawaban Esai Siswa</p>
                {(() => {
                  let jawabanEsaiList = [];
                  try { jawabanEsaiList = JSON.parse(modalKoreksi.jawabanEsai || "[]"); } catch(e) { jawabanEsaiList = []; }
                  if (jawabanEsaiList.length === 0) return <p className="text-xs" style={{ color: "#b45309" }}>Tidak ada jawaban esai.</p>;
                  return (
                    <div className="space-y-3">
                      {jawabanEsaiList.map((je, idx) => (
                        <div key={idx} className="bg-white p-3 space-y-2" style={{ border: "1px solid #fcd34d", borderRadius: "0" }}>
                          <p className="text-xs font-semibold text-slate-700">Soal {idx+1}: {je.soal}</p>
                          {je.referensi && <p className="text-xs text-slate-400 italic">Referensi: {je.referensi}</p>}
                          <p className="text-sm text-slate-800 p-2" style={{ background: "#fff7ed", borderRadius: "0" }}>{je.jawaban || "(tidak dijawab)"}</p>
                          <div className="flex items-center gap-3">
                            <label className="text-xs font-bold text-slate-600">Skor (0–100):</label>
                            <input type="number" min={0} max={100} value={skorPerSoal[idx]??""} onChange={e=>setSkorPerSoal(p=>({...p,[idx]:e.target.value}))} className="w-20 border-2 border-amber-300 px-2 py-1 text-center font-bold text-amber-800" style={{ borderRadius: "0" }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
              <div className="flex gap-3"><button onClick={()=>{setModalKoreksi(null);setSkorPerSoal({});}} className={btn("slate") + " flex-1"}>Batal</button><button onClick={handleSimpanKoreksi} disabled={savingKoreksi} className={btn("green") + " flex-1"}>{savingKoreksi ? "Menyimpan..." : "✅ Simpan Koreksi"}</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// PENGATURAN UJIAN (dengan foto guru)
// ============================================================
function TabPengaturan({ scriptUrl, onSaveScriptUrl, settings, onSaveSettings, addToast }) {
  const [logoInput, setLogoInput] = useState(settings.logoUrl||"");
  const [namaInput, setNamaInput] = useState(settings.namaSekolah||"");
  const [namaGuruInput, setNamaGuruInput] = useState(settings.namaGuru||"");
  const [nipGuruInput, setNipGuruInput] = useState(settings.nipGuru||"");
  const [kotaTTDInput, setKotaTTDInput] = useState(settings.kotaTTD||"");
  const [fotoGuruPreview, setFotoGuruPreview] = useState(settings.fotoGuru || "");
  const [fotoGuruInput, setFotoGuruInput] = useState(settings.fotoGuru || "");
  const [spreadsheetUrl, setSpreadsheetUrl] = useState(settings.spreadsheetUrl||"");
  const [durasiInput, setDurasiInput] = useState(settings.durasiMenit||60);
  const [savedSpreadsheetUrl, setSavedSpreadsheetUrl] = useState(settings.spreadsheetUrl||"");
  const [saving, setSaving] = useState(false);
  
  const jam = Math.floor(durasiInput/60); 
  const menit = Number(durasiInput)%60; 
  const durasiDisplay = jam>0?`${jam} jam ${menit>0?menit+" menit":""}`:`${menit} menit`;
  
  const getInitials = () => {
    const nama = namaGuruInput || settings.namaGuru || "Guru";
    return nama.split(" ").map(n => n[0]).join("").toUpperCase().slice(0,2);
  };

  const handleFotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.match(/image\/(jpeg|jpg|png)/)) {
      addToast("Hanya file JPG/PNG yang diperbolehkan!", "error");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      addToast("Ukuran file maksimal 2MB!", "error");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result;
      setFotoGuruPreview(base64String);
      setFotoGuruInput(base64String);
    };
    reader.readAsDataURL(file);
  };

  const handleHapusFoto = () => {
    setFotoGuruPreview("");
    setFotoGuruInput("");
  };

  const handleSave = async () => {
    const durasi = Number(durasiInput);
    if (!durasi||durasi<1||durasi>300) return addToast("Durasi harus 1–300 menit!","error");
    const newSettings = { 
      logoUrl:logoInput, 
      namaSekolah:namaInput, 
      namaGuru:namaGuruInput, 
      nipGuru:nipGuruInput, 
      kotaTTD:kotaTTDInput, 
      durasiMenit:durasi, 
      spreadsheetUrl,
      fotoGuru: fotoGuruInput
    };
    onSaveSettings(newSettings);
    setSavedSpreadsheetUrl(spreadsheetUrl);
    setSaving(true);
    const url = scriptUrl || APPS_SCRIPT_URL;
    if (url && !url.includes("YOUR_APPS_SCRIPT_ID")) {
      try {
        const r = await fetch(url, { method:"POST", body:JSON.stringify({ action:"simpanPengaturan", ...newSettings }) });
        const d = await r.json();
        if (d.status==="success") addToast("✅ Pengaturan disimpan ke Spreadsheet!","success");
        else addToast("Tersimpan lokal. Gagal sinkron: "+(d.message||""),"warning");
      } catch { addToast("Tersimpan lokal. Tidak bisa terhubung ke Apps Script.","warning"); }
    } else addToast("Pengaturan disimpan lokal.","info");
    setSaving(false);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-black uppercase tracking-wide" style={{ color: "#003082" }}>Pengaturan Ujian</h2>
        <p className="text-sm text-slate-500">Identitas sekolah, durasi, dan koneksi spreadsheet</p>
      </div>
      <div className="bg-white p-6 space-y-5" style={{ border: "1px solid #e2e8f0", borderTop: "3px solid #003082", borderRadius: "0" }}>
        {/* Logo Sekolah */}
        <Field label="URL Logo Sekolah" hint="💡 Google Drive: Upload → Bagikan → 'Siapa saja yang memiliki link' → Salin link">
          <input value={logoInput} onChange={e=>setLogoInput(e.target.value)} placeholder="https://drive.google.com/file/d/..." className={inp} />
          {logoInput && (
            <div className="mt-2 flex items-center gap-3">
              <div className="flex items-center justify-center p-2" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", minWidth: "64px" }}>
                <LogoSekolah url={logoInput} className="max-h-14 max-w-16 object-contain" />
              </div>
              <div className="text-xs text-slate-500">
                {isDriveUrl(logoInput) ? (extractDriveFileId(logoInput)?<p className="text-green-600">✓ File ID terdeteksi</p>:<p style={{ color: "#CC0000" }}>✗ Format URL Drive tidak dikenali</p>) : <p style={{ color: "#003082" }}>✓ URL gambar biasa</p>}
              </div>
            </div>
          )}
        </Field>
        
        {/* Nama Sekolah */}
        <Field label="Nama Sekolah"><input value={namaInput} onChange={e=>setNamaInput(e.target.value)} placeholder="SD Negeri ..." className={inp} /></Field>
        
        {/* Nama dan NIP Guru */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nama Guru" hint="Untuk kolom TTD PDF"><input value={namaGuruInput} onChange={e=>setNamaGuruInput(e.target.value)} placeholder="Nama lengkap guru" className={inp} /></Field>
          <Field label="NIP Guru"><input value={nipGuruInput} onChange={e=>setNipGuruInput(e.target.value)} placeholder="198XXXXXXXX" className={inp + " font-mono"} /></Field>
        </div>
        
        {/* Foto Guru - Upload File */}
        <Field label="Foto Guru" hint="Upload foto profil guru (format JPG/PNG, maks 2MB)">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-shrink-0">
              {fotoGuruPreview ? (
                <img src={fotoGuruPreview} alt="Preview Foto Guru" className="w-20 h-20 rounded-full object-cover shadow-md" style={{ border: "3px solid #CC0000" }} />
              ) : settings.fotoGuru ? (
                <img src={settings.fotoGuru} alt="Foto Guru" className="w-20 h-20 rounded-full object-cover shadow-md" style={{ border: "3px solid #CC0000" }} onError={(e) => { e.target.onerror = null; e.target.src = ""; }} />
              ) : (
                <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-md" style={{ background: "linear-gradient(135deg,#CC0000,#003082)" }}>
                  {getInitials()}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-[200px]">
              <input type="file" accept="image/jpeg,image/png,image/jpg" onChange={handleFotoUpload} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:border-0 file:text-sm file:font-semibold" style={{ "--file-bg": "#eff6ff", "--file-color": "#003082" }} />
              <p className="text-xs text-slate-400 mt-1">Maksimal 2MB, format JPG/PNG</p>
            </div>
            {(fotoGuruPreview || settings.fotoGuru) && (
              <button type="button" onClick={handleHapusFoto} className="text-sm px-3 py-1" style={{ color: "#CC0000", border: "1px solid #fca5a5", borderRadius: "0" }}>Hapus</button>
            )}
          </div>
        </Field>
        
        {/* Kota Tanda Tangan */}
        <Field label="Kota Penandatangan"><input value={kotaTTDInput} onChange={e=>setKotaTTDInput(e.target.value)} placeholder="Sumenep" className={inp} /></Field>
        
        {/* Durasi */}
        <div className="p-5 space-y-3" style={{ background: "#fff7ed", border: "1px solid #fcd34d", borderLeft: "4px solid #d97706", borderRadius: "0" }}>
          <div className="flex items-center gap-2"><span className="text-xl">⏱️</span><h4 className="font-bold text-sm" style={{ color: "#92400e" }}>Durasi Waktu Ujian</h4></div>
          <div className="flex items-center gap-3"><input type="number" value={durasiInput} onChange={e=>setDurasiInput(e.target.value)} min={1} max={300} className="w-24 border-2 px-3 py-3 text-center font-extrabold text-2xl focus:outline-none bg-white" style={{ borderColor: "#f59e0b", color: "#92400e", borderRadius: "0" }} /><div><p className="text-sm font-bold" style={{ color: "#92400e" }}>menit</p><p className="text-xs" style={{ color: "#b45309" }}>= {durasiDisplay}</p></div></div>
          <input type="range" min={10} max={180} step={5} value={durasiInput} onChange={e=>setDurasiInput(Number(e.target.value))} className="w-full accent-amber-500" />
          <div className="flex flex-wrap gap-2">{[{l:"30 mnt",v:30},{l:"45 mnt",v:45},{l:"1 jam",v:60},{l:"1.5 jam",v:90},{l:"2 jam",v:120}].map(({l,v})=>(<button key={v} onClick={()=>setDurasiInput(v)} className="text-xs px-3 py-2 font-bold" style={{ background: Number(durasiInput)===v ? "#d97706" : "#fff", color: Number(durasiInput)===v ? "#fff" : "#b45309", border: "1px solid #fcd34d", borderRadius: "0" }}>{l}</button>))}</div>
        </div>
        
        {/* Link Spreadsheet */}
        <Field label="Link Google Spreadsheet" hint="Link spreadsheet untuk tombol akses cepat (opsional)">
          <div className="flex gap-2"><input value={spreadsheetUrl} onChange={e=>setSpreadsheetUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..." className={inp + " flex-1 font-mono text-xs"} />{savedSpreadsheetUrl && <a href={savedSpreadsheetUrl} target="_blank" rel="noreferrer" className={btn("green")}>Buka ↗</a>}</div>
        </Field>
        
        <button onClick={handleSave} disabled={saving} className={btn("blue") + " w-full py-3 text-base"}>{saving ? "Menyimpan..." : "💾 Simpan Pengaturan"}</button>
        
        <div className="p-4 text-xs space-y-1" style={{ background: "#eff6ff", border: "1px solid #93c5fd", borderLeft: "4px solid #003082", borderRadius: "0" }}>
          <p className="font-bold uppercase tracking-wide" style={{ color: "#003082" }}>🔄 Sinkron Otomatis Antar Perangkat</p>
          <ol className="list-decimal list-inside space-y-1" style={{ color: "#1e40af" }}><li>Pengaturan disimpan ke sheet <strong>PENGATURAN</strong></li><li>Buka di HP/browser lain → otomatis termuat</li></ol>
          <p className="mt-2" style={{ color: "#b45309" }}>⚠️ Foto guru disimpan sebagai base64 di spreadsheet (ukuran besar). Untuk performa lebih baik, gunakan URL dari Google Drive.</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// GURU PANEL (sidebar)
// ============================================================
function GuruPanel({ addToast, onLogout, settings, onSaveSettings, scriptUrl, onSaveScriptUrl, mapelList, setMapelList, asesmenList, setAsesmenList }) {
  const [activePage, setActivePage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navItems = [
    { id:"dashboard", icon:"🏠", label:"Dashboard" }, { id:"siswa", icon:"👤", label:"Data Siswa" },
    { id:"mapel", icon:"📚", label:"Manajemen Mapel" }, { id:"soal", icon:"✏️", label:"Input Soal" },
    { id:"rekap", icon:"📊", label:"Rekap Hasil" }, { id:"pengaturan", icon:"⚙️", label:"Pengaturan Ujian" },
  ];
  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5" style={{ borderBottom: "1px solid #1e3a8a", background: "#002266" }}>
        <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: "#93c5fd" }}>Panel Guru</p>
        <p className="font-black text-base mt-0.5 text-white" style={{ fontFamily: "'Georgia', serif" }}>{settings.namaSekolah || "Portal Ujian"}</p>
        <div style={{ width: "40px", height: "3px", background: "#CC0000", marginTop: "8px" }} />
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">{navItems.map(n => (<button key={n.id} onClick={() => { setActivePage(n.id); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors text-left ${activePage===n.id ? "text-white" : "hover:text-white"}`} style={{ background: activePage===n.id ? "#CC0000" : "transparent", color: activePage===n.id ? "#fff" : "#93c5fd", borderRadius: "0", borderLeft: activePage===n.id ? "4px solid #fff" : "4px solid transparent" }}><span className="text-lg w-6 text-center">{n.icon}</span><span>{n.label}</span></button>))}</nav>
      <div className="px-3 py-4" style={{ borderTop: "1px solid #1e3a8a" }}><button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors" style={{ color: "#fca5a5", borderRadius: "0" }}><span className="text-lg">🚪</span><span>Keluar</span></button></div>
    </div>
  );
  const pageProps = { scriptUrl: scriptUrl||APPS_SCRIPT_URL, addToast, settings, onSaveSettings, onSaveScriptUrl, mapelList, setMapelList, asesmenList, setAsesmenList };
  return (
    <div className="min-h-screen flex" style={{ background: "#f1f5f9" }}>
      <aside className="hidden md:flex flex-col w-60 flex-shrink-0 fixed inset-y-0 left-0 z-30" style={{ background: "#003082" }}><SidebarContent /></aside>
      {sidebarOpen && (<div className="fixed inset-0 z-40 md:hidden" onClick={() => setSidebarOpen(false)}><div className="absolute inset-0 bg-black/60" /><aside className="absolute left-0 top-0 bottom-0 w-64 flex flex-col z-50" style={{ background: "#003082" }} onClick={e => e.stopPropagation()}><SidebarContent /></aside></div>)}
      <div className="flex-1 md:ml-60 flex flex-col min-h-screen">
        <header className="md:hidden text-white px-4 py-3 flex items-center gap-3 sticky top-0 z-20" style={{ background: "#CC0000" }}><button onClick={() => setSidebarOpen(true)} className="text-white/80 hover:text-white p-1"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg></button><span className="font-bold uppercase tracking-wide text-sm">{navItems.find(n=>n.id===activePage)?.label}</span></header>
        <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full">
          {activePage==="dashboard" && <TabDashboard onNav={setActivePage} addToast={addToast} settings={settings} />}
          {activePage==="siswa" && <TabSiswa {...pageProps} />}
          {activePage==="mapel" && <TabMapel {...pageProps} />}
          {activePage==="soal" && <TabInputSoal {...pageProps} />}
          {activePage==="rekap" && <TabRekap {...pageProps} />}
          {activePage==="pengaturan" && <TabPengaturan {...pageProps} onSaveScriptUrl={onSaveScriptUrl} />}
        </main>
      </div>
    </div>
  );
}

// ============================================================
// HALAMAN SISWA (login)
// ============================================================
function HalamanSiswa({ onMulaiUjian, onGuruMode, mapelList = DEFAULT_MAPEL, asesmenList = DEFAULT_ASESMEN, logoUrl }) {
  const [nisn, setNisn] = useState("");
  const [namaLookup, setNamaLookup] = useState("");
  const [kelasLookup, setKelasLookup] = useState("");
  const [lookupStatus, setLookupStatus] = useState("");
  const [mapel, setMapel] = useState(mapelList[0]);
  const [asesmen, setAsesmen] = useState(asesmenList[0]);
  const [token, setToken] = useState("");
  const [err, setErr] = useState("");
  const lookupTimer = useRef(null);

  const handleNisnChange = (val) => {
    setNisn(val);
    setNamaLookup(""); setKelasLookup(""); setLookupStatus("");
    clearTimeout(lookupTimer.current);
    if (val.trim().length < 4) return;
    lookupTimer.current = setTimeout(async () => {
      setLookupStatus("loading");
      try {
        const url = APPS_SCRIPT_URL;
        if (url.includes("YOUR_APPS_SCRIPT_ID")) {
          console.error("URL Apps Script belum diganti!");
          setLookupStatus("notfound");
          return;
        }
        const fetchUrl = `${url}?action=getSiswaByNISN&nisn=${encodeURIComponent(val.trim())}`;
        const response = await fetch(fetchUrl);
        const data = await response.json();
        if (data.status === "success" && data.data) {
          setNamaLookup(data.data.nama || "");
          setKelasLookup(data.data.kelas || "");
          setLookupStatus("found");
        } else {
          setLookupStatus("notfound");
        }
      } catch (error) {
        console.error("Fetch error:", error);
        setLookupStatus("notfound");
      }
    }, 600);
  };

  const handle = () => {
    setErr("");
    if (!nisn.trim()) return setErr("NISN harus diisi!");
    if (!namaLookup && lookupStatus !== "found") return setErr("NISN tidak ditemukan dalam database siswa. Hubungi guru.");
    if (!token.trim()) return setErr("Token harus diisi!");
    onMulaiUjian({ nama: namaLookup, nisn, noAbsen: kelasLookup, mapel, asesmen, token });
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="bg-white shadow-xl overflow-hidden" style={{ border: "2px solid #003082", borderRadius: "0" }}>
        <div className="p-6 text-white text-center" style={{ background: "linear-gradient(135deg, #CC0000 0%, #8B0000 100%)", borderBottom: "4px solid #003082" }}>
          <h2 className="text-xl font-black uppercase tracking-widest" style={{ fontFamily: "'Georgia', serif" }}>Asesmen Sumatif</h2>
          <p className="text-red-200 text-xs mt-1 uppercase tracking-[0.15em]">Masukkan NISN dan token ujian</p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest block mb-1" style={{ color: "#003082" }}>🎫 NISN</label>
            <input
              type="text"
              value={nisn}
              onChange={e => handleNisnChange(e.target.value)}
              placeholder="Masukkan NISN kamu..."
              className="w-full px-4 py-3 text-sm font-mono tracking-wider focus:outline-none"
              style={{ border: "2px solid #003082", borderRadius: "0" }}
            />
            {lookupStatus === "loading" && (
              <div className="mt-2 flex items-center gap-2 text-xs" style={{ color: "#CC0000" }}>
                <div className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#CC0000", borderTopColor: "transparent" }}></div>
                Mencari data siswa...
              </div>
            )}
            {lookupStatus === "found" && (
              <div className="mt-2 px-4 py-3" style={{ background: "#f0fdf4", border: "1px solid #16a34a", borderRadius: "0" }}>
                <p className="text-xs text-green-600 font-bold mb-0.5 uppercase">✓ Siswa ditemukan</p>
                <p className="text-sm font-extrabold text-green-800">{namaLookup}</p>
                {kelasLookup && <p className="text-xs text-green-600">Kelas: {kelasLookup}</p>}
              </div>
            )}
            {lookupStatus === "notfound" && nisn.trim().length >= 4 && (
              <div className="mt-2 px-4 py-3" style={{ background: "#fef2f2", border: "1px solid #CC0000", borderRadius: "0" }}>
                <p className="text-xs font-bold uppercase" style={{ color: "#CC0000" }}>✗ NISN tidak ditemukan</p>
                <p className="text-xs text-red-500">Pastikan NISN benar atau hubungi guru untuk didaftarkan.</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest block mb-1" style={{ color: "#003082" }}>📚 Mata Pelajaran</label>
              <select value={mapel} onChange={e => setMapel(e.target.value)} className="w-full px-3 py-3 text-sm focus:outline-none" style={{ border: "2px solid #003082", borderRadius: "0" }}>
                {mapelList.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest block mb-1" style={{ color: "#003082" }}>📋 Asesmen</label>
              <select value={asesmen} onChange={e => setAsesmen(e.target.value)} className="w-full px-3 py-3 text-sm focus:outline-none" style={{ border: "2px solid #003082", borderRadius: "0" }}>
                {asesmenList.map(a => <option key={a}>{a}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-widest block mb-1" style={{ color: "#003082" }}>🔑 Token Ujian</label>
            <input value={token} onChange={e => setToken(e.target.value.toUpperCase())} placeholder="Tanya gurumu..." className="w-full px-4 py-3 text-sm uppercase tracking-widest font-mono font-bold focus:outline-none" style={{ border: "2px solid #003082", borderRadius: "0", color: "#CC0000" }} />
          </div>

          {err && <div className="px-4 py-3 text-sm font-bold text-center uppercase" style={{ background: "#fef2f2", border: "1px solid #CC0000", color: "#CC0000", borderRadius: "0" }}>{err}</div>}

          <button onClick={handle} disabled={lookupStatus === "loading" || !nisn.trim()} className="w-full text-white font-black py-4 text-sm uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50" style={{ background: "linear-gradient(135deg, #CC0000, #990000)", borderRadius: "0", letterSpacing: "0.2em" }}>
            🚀 Mulai Ujian
          </button>
          <button onClick={onGuruMode} className="w-full text-xs py-2 transition-colors" style={{ color: "#003082" }}>
            Mode Guru 🔐
          </button>
          <p className="text-center text-xs text-slate-400 pt-2 border-t border-slate-100">
            Copyright &copy; 2026 Hairur Rahman
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Render HTML dengan dukungan KaTeX
// ============================================================
function RenderHTML({ html, className = "" }) {
  const containerRef = useRef(null);
  const [ready, setReady] = useState(!!window.katex);

  useEffect(() => {
    if (!window.katex) {
      loadKatex().then(() => setReady(true)).catch(() => setReady(false));
    }
  }, []);

  useEffect(() => {
    if (!ready || !containerRef.current || !html) return;
    
    const renderMathInElement = (element) => {
      if (!window.katex) return;
      const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            if (node.parentElement?.closest?.(".katex")) return NodeFilter.FILTER_REJECT;
            if (/\$[^$]+\$/.test(node.textContent)) return NodeFilter.FILTER_ACCEPT;
            return NodeFilter.FILTER_SKIP;
          }
        }
      );
      const nodesToReplace = [];
      while (walker.nextNode()) nodesToReplace.push(walker.currentNode);
      
      nodesToReplace.forEach(textNode => {
        const text = textNode.textContent;
        const regex = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
        let lastIndex = 0;
        const fragment = document.createDocumentFragment();
        let match;
        while ((match = regex.exec(text)) !== null) {
          if (match.index > lastIndex) {
            fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
          }
          const formula = match[1] || match[2];
          const isBlock = !!match[1];
          try {
            const span = document.createElement("span");
            span.innerHTML = window.katex.renderToString(formula, {
              displayMode: isBlock,
              throwOnError: false
            });
            fragment.appendChild(span);
          } catch (e) {
            fragment.appendChild(document.createTextNode(match[0]));
          }
          lastIndex = match.index + match[0].length;
        }
        if (lastIndex < text.length) {
          fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
        }
        textNode.parentNode.replaceChild(fragment, textNode);
      });
    };
    
    renderMathInElement(containerRef.current);
  }, [html, ready]);

  if (!html) return null;
  
  return (
    <div 
      ref={containerRef}
      className={`prose prose-sm max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// ============================================================
// HALAMAN UJIAN (HalamanUjian)
// ============================================================
function HalamanUjian({ siswa, scriptUrl, addToast, onSelesai, durasiMenit, namaGuru, nipGuru, kotaTTD, namaSekolah }) {
  const [soalList, setSoalList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [jawaban, setJawaban] = useState({});
  const [tabViolation, setTabViolation] = useState(0);
  const [diskualifikasi, setDiskualifikasi] = useState(false);
  const [diskualifikasiAlasan, setDiskualifikasiAlasan] = useState("tab");
  const durasiDetik = (Number(durasiMenit) || 60) * 60;
  const [waktu, setWaktu] = useState(durasiDetik);
  const [submitted, setSubmitted] = useState(false);
  const [hasilAkhir, setHasilAkhir] = useState(null);
  const timerRef = useRef(null);
  const MAX_VIOLATION = 3;

  const [showKonfirmasi, setShowKonfirmasi] = useState(true);
  const [ujianDimulai, setUjianDimulai] = useState(false);
  const violationCountRef = useRef(0);

  // Fetch soal dari server
  useEffect(() => {
    const fetchSoal = async () => {
      setLoading(true);
      const key = `${siswa.mapel}_${siswa.asesmen}`;
      try {
        const url = scriptUrl || APPS_SCRIPT_URL;
        const res = await fetch(`${url}?action=getSoal&mapel=${encodeURIComponent(siswa.mapel)}&asesmen=${encodeURIComponent(siswa.asesmen)}&token=${encodeURIComponent(siswa.token)}`);
        const data = await res.json();
        if (data.status === "success" && data.soal?.length > 0) setSoalList(data.soal);
        else throw new Error("no soal");
      } catch {
        const demo = DEMO_SOAL[key];
        if (!demo) { addToast("Soal tidak ditemukan.", "error"); setLoading(false); return; }
        if (siswa.token !== DEMO_TOKEN) { addToast("Token salah! Coba lagi.", "error"); setLoading(false); return; }
        setSoalList(demo);
        addToast("Mode Demo aktif.", "info");
      } finally { setLoading(false); }
    };
    fetchSoal();
  }, []);

  // Timer ujian
  useEffect(() => {
    if (!ujianDimulai || submitted || diskualifikasi) return;
    timerRef.current = setInterval(() => {
      setWaktu(t => {
        if (t <= 1) { clearInterval(timerRef.current); handleSubmit(true); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [ujianDimulai, submitted, diskualifikasi]);

  // === Wake Lock: layar tetap menyala selama ujian ===
  useEffect(() => {
    if (!ujianDimulai || submitted || diskualifikasi) return;
    let wakeLock = null;
    const requestWake = async () => {
      try {
        if ("wakeLock" in navigator) {
          wakeLock = await navigator.wakeLock.request("screen");
        }
      } catch (e) { /* browser tidak support, abaikan */ }
    };
    requestWake();
    const onVisChange = () => { if (!document.hidden && !wakeLock?.released) requestWake(); };
    document.addEventListener("visibilitychange", onVisChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisChange);
      if (wakeLock && !wakeLock.released) wakeLock.release().catch(() => {});
    };
  }, [ujianDimulai, submitted, diskualifikasi]);

  // === Deteksi pelanggaran: pindah tab, blur window, split screen ===
  useEffect(() => {
    if (!ujianDimulai) return;

    const triggerViolation = (alasan) => {
      if (submitted || diskualifikasi) return;
      violationCountRef.current += 1;
      const count = violationCountRef.current;
      setTabViolation(count);
      if (count >= MAX_VIOLATION) {
        setDiskualifikasiAlasan(alasan);
        setDiskualifikasi(true);
        clearInterval(timerRef.current);
        addToast("Sesi ujian diakhiri. Kamu telah diskualifikasi!", "error");
      } else {
        addToast(`⚠️ Peringatan ${count}/${MAX_VIOLATION}: ${
          alasan === "tab" ? "Jangan berpindah tab!" :
          alasan === "blur" ? "Jangan keluar dari halaman ujian!" :
          "Jangan menggunakan split screen!"
        }`, "warning");
      }
    };

    // 1. Pindah tab (visibilitychange)
    const onVisChange = () => {
      if (document.hidden) triggerViolation("tab");
    };
    document.addEventListener("visibilitychange", onVisChange);

    // 2. Keluar browser / minimize / split screen (window blur)
    const onBlur = () => {
      // Cek apakah window mengecil (split screen) dengan membandingkan ukuran
      const isSplit = window.innerWidth < window.screen.width * 0.75;
      triggerViolation(isSplit ? "split" : "blur");
    };
    window.addEventListener("blur", onBlur);

    // 3. Resize window kecil drastis = split screen
    let lastWidth = window.innerWidth;
    const onResize = () => {
      const current = window.innerWidth;
      if (current < lastWidth * 0.75) {
        triggerViolation("split");
      }
      lastWidth = current;
    };
    window.addEventListener("resize", onResize);

    return () => {
      document.removeEventListener("visibilitychange", onVisChange);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("resize", onResize);
    };
  }, [ujianDimulai, submitted, diskualifikasi]);


  const formatWaktu = s => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // Hitung nilai objektif
  const hitungNilai = () => {
    let totalPoint = 0, didapatPoint = 0;
    const detail = [];
    let adaEsai = false;
    soalList.forEach((s, idx) => {
      const pt = Number(s.point) || 0;
      totalPoint += pt;
      const jwb = jawaban[s.id];

      if (s.jenisSoal === "Uraian/Esai") {
        adaEsai = true;
        detail.push({ no: idx + 1, jenis: "Esai", dapat: 0, max: pt, ket: jwb ? "Dijawab (menunggu koreksi)" : "Tidak dijawab" });
        return;
      }

      const benar = JSON.parse(s.jawabanBenar || "[]");
      if (!jwb) {
        detail.push({ no: idx + 1, jenis: s.jenisSoal, dapat: 0, max: pt, ket: "Tidak dijawab" });
        return;
      }

      if (s.jenisSoal === "Pilihan Ganda") {
        const dapat = jwb[0] === benar[0] ? pt : 0;
        didapatPoint += dapat;
        detail.push({ no: idx + 1, jenis: "PG", dapat, max: pt, ket: dapat > 0 ? "Benar" : "Salah" });
      } else if (s.jenisSoal === "Pilihan Ganda Kompleks") {
        const opsiAll = JSON.parse(s.opsi || "[]");
        const jml = opsiAll.length;
        if (!jml) return;
        let skor = 0;
        opsiAll.forEach(o => { if (benar.includes(o) === jwb.includes(o)) skor++; });
        const dapat = Math.round((pt * skor / jml) * 100) / 100;
        didapatPoint += dapat;
        detail.push({ no: idx + 1, jenis: "PGK", dapat, max: pt, ket: `${skor}/${jml} opsi tepat` });
      } else {
        const jml = benar.length;
        if (!jml) return;
        let skor = 0;
        benar.forEach((jb, i) => { if (jwb[i] === jb) skor++; });
        const dapat = Math.round((pt * skor / jml) * 100) / 100;
        didapatPoint += dapat;
        detail.push({ no: idx + 1, jenis: "B/S", dapat, max: pt, ket: `${skor}/${jml} benar` });
      }
    });
    didapatPoint = Math.round(didapatPoint * 100) / 100;
    const totalObjektif = soalList.filter(s => s.jenisSoal !== "Uraian/Esai").reduce((a, s) => a + Number(s.point || 0), 0);
    const nilai = totalObjektif > 0 ? Math.round((didapatPoint / totalObjektif) * 100) : 0;
    return { totalPoint, didapatPoint, nilai, detail, adaEsai };
  };

  // Submit ujian
  const handleSubmit = async (autoSubmit = false) => {
    if (submitted) return;
    clearInterval(timerRef.current);
    const { nilai, didapatPoint, totalPoint, detail, adaEsai } = hitungNilai();
    setHasilAkhir({ nilai, didapatPoint, totalPoint, detail, adaEsai });
    setSubmitted(true);

    const jawabanEsaiList = soalList
      .filter(s => s.jenisSoal === "Uraian/Esai")
      .map((s) => ({ soal: s.soal, referensi: s.jawabanReferensi || "", jawaban: jawaban[s.id] || "" }));

    try {
      const url = scriptUrl || APPS_SCRIPT_URL;
      await fetch(url, {
        method: "POST",
        body: JSON.stringify({
          action: "simpanHasil",
          nama: siswa.nama, nisn: siswa.nisn, noAbsen: siswa.noAbsen,
          mapel: siswa.mapel, asesmen: siswa.asesmen,
          nilai, adaEsai,
          jawabanEsai: adaEsai ? JSON.stringify(jawabanEsaiList) : "",
          token: siswa.token,
          waktu: new Date().toLocaleString("id-ID")
        })
      });
    } catch { /* demo */ }
    if (!autoSubmit) addToast("Ujian berhasil dikumpulkan! 🎉", "success");
  };

  const soal = soalList[currentIdx];
  const opsiList = soal ? JSON.parse(soal.opsi || "[]") : [];
  const pctDone = soalList.length > 0 ? Math.round(((currentIdx + 1) / soalList.length) * 100) : 0;
  const [pdfLoading, setPdfLoading] = useState(false);

  const handleUnduhPDF = async () => {
    setPdfLoading(true);
    try {
      await unduhPDF({ siswa, hasilAkhir, soalList, jawabanSiswa: jawaban, namaGuru, nipGuru, kotaTTD, namaSekolah });
    } catch (e) {
      addToast("Gagal membuat PDF.", "error");
    } finally { setPdfLoading(false); }
  };

  // === JENDELA KONFIRMASI sebelum ujian ===
  if (showKonfirmasi) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
        <div className="bg-white w-full max-w-md shadow-2xl overflow-hidden" style={{ borderRadius: "0", border: "3px solid #CC0000" }}>
          <div className="text-white text-center py-6 px-6" style={{ background: "linear-gradient(135deg,#CC0000,#8B0000)", borderBottom: "4px solid #003082" }}>
            <div className="text-5xl mb-3">⚠️</div>
            <h2 className="text-xl font-black uppercase tracking-widest" style={{ fontFamily: "'Georgia', serif" }}>PERHATIAN PENTING</h2>
            <p className="text-red-200 text-xs mt-1 uppercase tracking-widest">Baca sebelum memulai ujian</p>
          </div>
          <div className="p-6 space-y-4">
            <div className="space-y-3 text-sm text-slate-700">
              <div className="flex gap-3 items-start p-3" style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderLeft: "4px solid #CC0000", borderRadius: "0" }}>
                <span className="text-lg flex-shrink-0">🚫</span>
                <p><strong className="text-red-700">Dilarang berpindah tab, keluar browser, atau menggunakan split screen</strong> selama ujian berlangsung. Setiap jenis pelanggaran diberi toleransi <strong>{MAX_VIOLATION} kali</strong> — setelah itu sesi ujian langsung diakhiri dan kamu dinyatakan diskualifikasi.</p>
              </div>
              <div className="flex gap-3 items-start p-3" style={{ background: "#eff6ff", border: "1px solid #93c5fd", borderLeft: "4px solid #003082", borderRadius: "0" }}>
                <span className="text-lg flex-shrink-0">📱</span>
                <p><strong className="text-blue-700">Layar perangkatmu akan dijaga tetap menyala</strong> selama ujian berlangsung secara otomatis oleh sistem.</p>
              </div>
              <div className="flex gap-3 items-start p-3" style={{ background: "#f0fdf4", border: "1px solid #86efac", borderLeft: "4px solid #16a34a", borderRadius: "0" }}>
                <span className="text-lg flex-shrink-0">✅</span>
                <p>Pastikan koneksi internet stabil, waktu cukup, dan kamu siap mengerjakan <strong>{siswa.mapel} — {siswa.asesmen}</strong> selama <strong>{durasiMenit} menit</strong>.</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 text-center">Dengan menekan "Mulai Ujian", kamu menyatakan siap dan memahami seluruh peraturan di atas.</p>
            <div className="flex gap-3 pt-1">
              <button onClick={onSelesai} className="flex-1 font-bold py-3 text-sm" style={{ background: "#e2e8f0", color: "#475569", borderRadius: "0" }}>← Kembali</button>
              <button onClick={() => { setShowKonfirmasi(false); setUjianDimulai(true); }} className="flex-1 text-white font-black py-3 text-sm uppercase tracking-widest" style={{ background: "linear-gradient(135deg,#003082,#001a4d)", borderRadius: "0", letterSpacing: "0.15em" }}>
                🚀 Mulai Ujian
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-slate-600 font-medium">Memuat soal...</p>
      </div>
    );
  }

  if (diskualifikasi) {
    const pesanAlasan = {
      tab: `Kamu terdeteksi berpindah ke tab atau aplikasi lain sebanyak ${MAX_VIOLATION} kali selama sesi ujian berlangsung. Tindakan ini melanggar tata tertib integritas ujian.`,
      blur: `Kamu terdeteksi keluar dari halaman ujian — misalnya meminimalkan browser atau beralih ke aplikasi lain — sebanyak ${MAX_VIOLATION} kali. Sistem secara otomatis mengakhiri sesimu.`,
      split: `Kamu terdeteksi menggunakan fitur split screen atau mengubah ukuran jendela browser secara signifikan sebanyak ${MAX_VIOLATION} kali. Hal ini tidak diperkenankan selama ujian berlangsung.`,
    };
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(160deg,#1a0000,#3d0000)" }}>
        <div className="bg-white w-full max-w-sm shadow-2xl overflow-hidden text-center" style={{ border: "3px solid #CC0000", borderRadius: "0" }}>
          <div className="py-8 px-6" style={{ background: "linear-gradient(135deg,#CC0000,#8B0000)", borderBottom: "4px solid #003082" }}>
            <div className="text-6xl mb-3">🚫</div>
            <h2 className="text-2xl font-black text-white uppercase tracking-widest" style={{ fontFamily: "'Georgia', serif" }}>Sesi Diakhiri</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="py-3 px-4" style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "0" }}>
              <p className="font-black text-lg" style={{ color: "#CC0000" }}>DISKUALIFIKASI</p>
              <p className="text-slate-600 text-sm mt-2 leading-relaxed">
                {pesanAlasan[diskualifikasiAlasan] || pesanAlasan.tab}
              </p>
            </div>
            <div className="text-xs text-slate-500 p-3 text-left" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "0" }}>
              <p className="font-bold text-slate-700 mb-1">📋 Hasil ujian ini tidak akan tersimpan.</p>
              <p>Hubungi guru kamu untuk informasi lebih lanjut mengenai tindak lanjut yang akan diberikan.</p>
            </div>
            <button onClick={onSelesai} className="w-full text-white font-bold py-3 text-sm uppercase tracking-widest" style={{ background: "#003082", borderRadius: "0" }}>← Kembali ke Beranda</button>
          </div>
        </div>
      </div>
    );
  }

  if (submitted && hasilAkhir) {
    return (
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="bg-white shadow-xl overflow-hidden" style={{ border: "2px solid #003082", borderRadius: "0" }}>
          <div style={{ background: hasilAkhir.nilai >= 75 ? "linear-gradient(135deg,#16a34a,#15803d)" : hasilAkhir.nilai >= 50 ? "linear-gradient(135deg,#d97706,#b45309)" : "linear-gradient(135deg,#CC0000,#8B0000)", padding: "32px 24px", textAlign: "center", borderBottom: "4px solid #003082" }}>
            <div className="text-6xl mb-3">{hasilAkhir.nilai >= 75 ? "🎉" : hasilAkhir.nilai >= 50 ? "👍" : "📚"}</div>
            <p className="text-white/80 text-sm font-medium uppercase tracking-widest">Nilai Kamu</p>
            <p className="text-7xl font-black text-white" style={{ fontFamily: "'Georgia', serif" }}>{hasilAkhir.nilai}</p>
          </div>
          <div className="p-6 space-y-4">
            <p className="font-black text-slate-800 text-lg text-center uppercase tracking-wide">{siswa.nama}</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { label: "Mapel", val: siswa.mapel },
                { label: "Asesmen", val: siswa.asesmen },
                { label: "Point", val: `${hasilAkhir.didapatPoint} / ${hasilAkhir.totalPoint}` },
                { label: "Jumlah Soal", val: `${soalList.length} soal` }
              ].map(s => (
                <div key={s.label} className="p-3" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "0" }}>
                  <p className="text-slate-500 text-xs uppercase tracking-wide">{s.label}</p>
                  <p className="font-bold text-slate-700 text-sm">{s.val}</p>
                </div>
              ))}
            </div>
            <div className="p-3" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "0" }}>
              <p className="text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">📊 Rincian Poin Per Soal</p>
              <div className="space-y-1">
                {hasilAkhir.detail.map(d => (
                  <div key={d.no} className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Soal {d.no} <span className="text-slate-400">({d.jenis})</span></span>
                    <span className="font-medium text-slate-700">{d.ket} → {d.dapat}/{d.max} poin</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-3 text-sm font-bold text-center" style={{ background: hasilAkhir.nilai >= 75 ? "#f0fdf4" : hasilAkhir.nilai >= 50 ? "#fff7ed" : "#fef2f2", color: hasilAkhir.nilai >= 75 ? "#15803d" : hasilAkhir.nilai >= 50 ? "#b45309" : "#CC0000", border: `1px solid ${hasilAkhir.nilai >= 75 ? "#86efac" : hasilAkhir.nilai >= 50 ? "#fcd34d" : "#fca5a5"}`, borderRadius: "0" }}>
              {hasilAkhir.nilai >= 75 ? "🌟 Luar biasa! Kamu berhasil!" : hasilAkhir.nilai >= 50 ? "👍 Cukup baik! Terus belajar ya!" : "📖 Jangan menyerah, belajar lebih giat!"}
            </div>
            {hasilAkhir.adaEsai && (
              <div className="p-3 text-xs text-center" style={{ background: "#eff6ff", border: "1px solid #93c5fd", color: "#003082", borderRadius: "0" }}>
                ✏️ <strong>Ada soal uraian</strong> — nilai akhir akan diperbarui setelah guru mengoreksi jawaban esaimu.
              </div>
            )}
            <button onClick={handleUnduhPDF} disabled={pdfLoading} className="w-full text-white font-bold py-3 transition-all shadow-md flex items-center justify-center gap-2 text-sm disabled:opacity-60" style={{ background: "#003082", borderRadius: "0" }}>
              {pdfLoading ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block"></span> Membuat PDF...</> : <>📥 Download PDF Hasil</>}
            </button>
            <button onClick={onSelesai} className="w-full font-bold py-3 transition-colors" style={{ background: "#e2e8f0", color: "#475569", borderRadius: "0" }}>← Kembali ke Beranda</button>
          </div>
        </div>
      </div>
    );
  }

  if (!soal) return <div className="text-center py-10 text-slate-500">Soal tidak tersedia</div>;

  return (
    <div className="max-w-2xl mx-auto px-3 py-4">
      {/* Header ujian */}
      <div className="flex items-center justify-between mb-3 bg-white shadow px-4 py-3" style={{ borderLeft: "4px solid #CC0000", borderRadius: "0" }}>
        <div>
          <p className="text-xs text-slate-500 font-medium">{siswa.mapel} • {siswa.asesmen}</p>
          <p className="text-sm font-bold text-slate-800">{siswa.nama}</p>
        </div>
        <div className="flex items-center gap-2">
          {tabViolation > 0 && <span className="text-xs px-2 py-1 font-bold" style={{ background: "#fff7ed", color: "#b45309", border: "1px solid #f59e0b" }}>⚠️ {tabViolation}/{MAX_VIOLATION}</span>}
          <div className={`font-mono font-extrabold text-lg px-3 py-1 ${waktu < 300 ? "animate-pulse" : ""}`} style={{ background: waktu < 300 ? "#fef2f2" : waktu < durasiDetik / 2 ? "#fff7ed" : "#eff6ff", color: waktu < 300 ? "#CC0000" : waktu < durasiDetik / 2 ? "#b45309" : "#003082", border: `2px solid ${waktu < 300 ? "#CC0000" : waktu < durasiDetik / 2 ? "#f59e0b" : "#003082"}`, borderRadius: "0" }}>
            ⏱ {formatWaktu(waktu)}
          </div>
        </div>
      </div>

      {/* Progress dan navigasi soal */}
      <div className="mb-4 bg-white shadow px-4 py-3" style={{ borderLeft: "4px solid #003082", borderRadius: "0" }}>
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>Soal {currentIdx + 1} dari {soalList.length}</span>
          <span>{pctDone}%</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2.5 mb-3">
          <div className="bg-red-700 h-2.5 transition-all duration-500" style={{ width: `${pctDone}%` }} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {soalList.map((s, i) => (
            <button key={i} onClick={() => setCurrentIdx(i)} className={`w-8 h-8 text-xs font-bold transition-colors ${i === currentIdx ? "text-white" : jawaban[s.id] ? "text-green-700 border border-green-300" : "text-slate-500"}`} style={{ background: i === currentIdx ? "#CC0000" : jawaban[s.id] ? "#dcfce7" : "#f1f5f9", borderRadius: "0" }}>
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Konten soal */}
      <div className="bg-white shadow-lg p-5 mb-4" style={{ borderTop: "3px solid #CC0000", borderRadius: "0" }}>
        <div className="flex items-start gap-3 mb-4">
          <span className="text-white text-xs font-bold px-2.5 py-1 flex-shrink-0" style={{ background: "#CC0000" }}>{currentIdx + 1}</span>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs px-2 py-0.5 font-bold uppercase tracking-wide" style={{ background: "#003082", color: "#fff", borderRadius: "0" }}>
                {soal.jenisSoal}
              </span>
              {soal.jenisSoal !== "Uraian/Esai" && (
                <span className="text-xs px-2 py-0.5 font-bold" style={{ background: "#fef9c3", color: "#854d0e", border: "1px solid #ca8a04", borderRadius: "0" }}>⭐ {soal.point} poin</span>
              )}
              {soal.jenisSoal === "Uraian/Esai" && (
                <span className="text-xs px-2 py-0.5 font-bold" style={{ background: "#fff7ed", color: "#9a3412", border: "1px solid #ea580c", borderRadius: "0" }}>✏️ Koreksi manual</span>
              )}
            </div>
            {/* Render soal dengan HTML (support bold, list, formula) */}
            <div className="text-slate-800 font-medium leading-relaxed prose prose-sm max-w-none">
              <RenderHTML html={soal.soal} />
            </div>
          </div>
        </div>

        {/* Gambar soal */}
        {soal.gambar && soal.gambar.trim() && (
          <div className="mb-4"><GambarSoal url={soal.gambar} alt="Gambar soal" /></div>
        )}

        {/* Pilihan Ganda */}
        {soal.jenisSoal === "Pilihan Ganda" && (
          <div className="space-y-2">
            {opsiList.map((o, i) => {
              const sel = jawaban[soal.id]?.[0] === o;
              return (
                <button key={i} onClick={() => setJawaban(p => ({ ...p, [soal.id]: [o] }))} className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all" style={{ border: sel ? "2px solid #CC0000" : "2px solid #d1d5db", background: sel ? "#fef2f2" : "#fff", borderRadius: "0" }}>
                  <span className="w-8 h-8 flex items-center justify-center text-sm font-extrabold flex-shrink-0" style={{ background: sel ? "#CC0000" : "#f1f5f9", color: sel ? "#fff" : "#475569", borderRadius: "0" }}>{String.fromCharCode(65 + i)}</span>
                  <span className="text-sm font-medium flex-1" style={{ color: sel ? "#9b1c1c" : "#1e293b" }}><MathText text={o} /></span>
                </button>
              );
            })}
          </div>
        )}

        {/* Pilihan Ganda Kompleks */}
        {soal.jenisSoal === "Pilihan Ganda Kompleks" && (
          <div className="space-y-2">
            <p className="text-xs font-bold mb-2 px-3 py-1.5" style={{ color: "#003082", background: "#eff6ff", border: "1px solid #93c5fd", borderRadius: "0" }}>✅ Pilih SEMUA jawaban yang benar — skor parsial per opsi</p>
            {opsiList.map((o, i) => {
              const sel = (jawaban[soal.id] || []).includes(o);
              return (
                <button key={i} onClick={() => setJawaban(p => {
                  const prev = p[soal.id] || [];
                  return { ...p, [soal.id]: prev.includes(o) ? prev.filter(x => x !== o) : [...prev, o] };
                })} className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all" style={{ border: sel ? "2px solid #003082" : "2px solid #d1d5db", background: sel ? "#eff6ff" : "#fff", borderRadius: "0" }}>
                  <input type="checkbox" checked={sel} onChange={() => { }} className="w-5 h-5 border-slate-300" />
                  <span className="text-sm font-medium flex-1"><MathText text={o} /></span>
                </button>
              );
            })}
          </div>
        )}

        {/* Benar/Salah Kompleks */}
        {soal.jenisSoal === "Benar/Salah Kompleks" && (
          <div className="space-y-3">
            <p className="text-xs font-bold mb-2 px-3 py-1.5" style={{ color: "#9a3412", background: "#fff7ed", border: "1px solid #fb923c", borderRadius: "0" }}>Tentukan Benar atau Salah — skor parsial per pernyataan</p>
            {opsiList.map((o, i) => {
              const val = (jawaban[soal.id] || [])[i];
              return (
                <div key={i} className="flex items-center gap-3 p-3" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "0" }}>
                  <span className="text-xs text-slate-500 font-bold w-5 flex-shrink-0">{i + 1}.</span>
                  <p className="flex-1 text-sm text-slate-700"><MathText text={o} /></p>
                  <div className="flex gap-2 flex-shrink-0">
                    {["Benar", "Salah"].map(v => (
                      <button key={v} onClick={() => setJawaban(p => {
                        const arr = [...(p[soal.id] || opsiList.map(() => ""))];
                        arr[i] = v;
                        return { ...p, [soal.id]: arr };
                      })} className="px-3 py-1.5 text-xs font-bold transition-colors" style={{ background: val === v ? (v === "Benar" ? "#16a34a" : "#CC0000") : "#e2e8f0", color: val === v ? "#fff" : "#475569", borderRadius: "0" }}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Uraian/Esai */}
        {soal.jenisSoal === "Uraian/Esai" && (
          <div className="space-y-3">
            <p className="text-xs font-bold px-3 py-1.5" style={{ color: "#003082", background: "#eff6ff", border: "1px solid #93c5fd", borderRadius: "0" }}>
              ✏️ Soal Uraian — Tulis jawaban kamu di bawah ini. Nilai ditentukan oleh guru.
            </p>
            <textarea
              value={jawaban[soal.id] || ""}
              onChange={e => setJawaban(p => ({ ...p, [soal.id]: e.target.value }))}
              rows={6}
              placeholder="Tulis jawabanmu di sini..."
              className="w-full px-4 py-3 text-sm text-slate-800 leading-relaxed resize-none focus:outline-none"
              style={{ border: "2px solid #003082", borderRadius: "0" }}
            />
            <div className="flex justify-between text-xs text-slate-400">
              <span>{(jawaban[soal.id] || "").length} karakter</span>
              <span className={jawaban[soal.id] ? "font-semibold" : ""} style={{ color: jawaban[soal.id] ? "#16a34a" : undefined }}>
                {jawaban[soal.id] ? "✓ Sudah dijawab" : "Belum dijawab"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Tombol navigasi */}
      <div className="flex gap-3">
        <button onClick={() => setCurrentIdx(i => Math.max(0, i - 1))} disabled={currentIdx === 0} className="flex-1 font-bold py-3 transition-colors disabled:opacity-30" style={{ background: "#e2e8f0", color: "#475569", borderRadius: "0" }}>
          ← Sebelumnya
        </button>
        {currentIdx < soalList.length - 1 ? (
          <button onClick={() => setCurrentIdx(i => i + 1)} className="flex-1 text-white font-bold py-3 transition-colors" style={{ background: "#003082", borderRadius: "0" }}>
            Berikutnya →
          </button>
        ) : (
          <button onClick={() => handleSubmit(false)} className="flex-1 text-white font-bold py-3 transition-all shadow-md" style={{ background: "#16a34a", borderRadius: "0" }}>
            🏁 Kumpulkan
          </button>
        )}
      </div>
      <p className="text-center text-xs text-slate-400 mt-3">Terjawab: {Object.keys(jawaban).length}/{soalList.length} soal</p>
    </div>
  );
}

// ============================================================
// APP UTAMA
// ============================================================
export default function App() {
  const { toasts, addToast } = useToast();
  const [mode, setMode] = useState("siswa");
  const [siswa, setSiswa] = useState(null);
  const [settings, setSettings] = useState(() => { try { return JSON.parse(localStorage.getItem("appSettings") || "{}"); } catch { return {}; } });
  const [scriptUrl, setScriptUrl] = useState(() => { try { return localStorage.getItem("scriptUrl") || ""; } catch { return ""; } });
  const [mapelList, setMapelList] = useState([...DEFAULT_MAPEL]);
  const [asesmenList, setAsesmenList] = useState([...DEFAULT_ASESMEN]);
  const handleSetMapelList = (list) => { setMapelList(list); try { localStorage.setItem("customMapel", JSON.stringify(list)); } catch {} };
  const handleSetAsesmenList = (list) => { setAsesmenList(list); try { localStorage.setItem("customAsesmen", JSON.stringify(list)); } catch {} };
  
  useEffect(() => {
    const url = (() => { try { return localStorage.getItem("scriptUrl") || ""; } catch { return ""; } })() || APPS_SCRIPT_URL;
    if (!url || url.includes("YOUR_APPS_SCRIPT_ID")) return;
    fetch(`${url}?action=getPengaturan`).then(r => r.json()).then(data => {
      if (data.status === "success" && data.data && Object.keys(data.data).length > 0) {
        const remote = data.data;
        const merged = { 
          logoUrl: remote.logoUrl || "", 
          namaSekolah: remote.namaSekolah || "", 
          namaGuru: remote.namaGuru || "", 
          nipGuru: remote.nipGuru || "", 
          kotaTTD: remote.kotaTTD || "", 
          durasiMenit: remote.durasiMenit ? Number(remote.durasiMenit) : 60, 
          spreadsheetUrl: remote.spreadsheetUrl || "",
          fotoGuru: remote.fotoGuru || ""
        };
        setSettings(merged); try { localStorage.setItem("appSettings", JSON.stringify(merged)); } catch {}
        try { localStorage.setItem("scriptUrl", url); } catch {}; setScriptUrl(url);
      }
    }).catch(()=>{});
    Promise.all([fetchMapelList(url), fetchAsesmenList(url)]).then(([mapels, asesmens]) => { setMapelList(mapels); setAsesmenList(asesmens); try { localStorage.setItem("customMapel", JSON.stringify(mapels)); } catch {}; try { localStorage.setItem("customAsesmen", JSON.stringify(asesmens)); } catch {}; }).catch(()=>{});
  }, []);
  
  const saveSettings = s => { setSettings(s); try { localStorage.setItem("appSettings", JSON.stringify(s)); } catch {} };
  const saveScriptUrl = u => { setScriptUrl(u); try { localStorage.setItem("scriptUrl", u); } catch {} };
  const handleMulaiUjian = async (data) => { setSiswa(data); setMode("ujian"); try { const el = document.documentElement; if (el.requestFullscreen) await el.requestFullscreen(); else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen(); } catch {} };
  const handleSelesaiUjian = async () => { setSiswa(null); setMode("siswa"); try { if (document.fullscreenElement || document.webkitFullscreenElement) { if (document.exitFullscreen) await document.exitFullscreen(); else if (document.webkitExitFullscreen) await document.webkitExitFullscreen(); } } catch {} };
  
  return (
    <div className="min-h-screen bg-gray-100">
      <Toast toasts={toasts} />
      {mode !== "guru" && mode !== "guruLogin" && <AppHeader logoUrl={settings.logoUrl} namaSekolah={settings.namaSekolah} />}
      <main className="pb-10">
        {mode === "siswa" && <HalamanSiswa onMulaiUjian={handleMulaiUjian} onGuruMode={() => setMode("guruLogin")} mapelList={mapelList} asesmenList={asesmenList} logoUrl={settings.logoUrl} />}
        {mode === "ujian" && siswa && <HalamanUjian siswa={siswa} scriptUrl={scriptUrl} addToast={addToast} onSelesai={handleSelesaiUjian} durasiMenit={settings.durasiMenit || 60} namaGuru={settings.namaGuru || ""} nipGuru={settings.nipGuru || ""} kotaTTD={settings.kotaTTD || ""} namaSekolah={settings.namaSekolah || ""} />}
        {mode === "guruLogin" && <GuruLogin onLogin={() => setMode("guru")} />}
        {mode === "guru" && <GuruPanel addToast={addToast} onLogout={() => setMode("siswa")} settings={settings} onSaveSettings={saveSettings} scriptUrl={scriptUrl} onSaveScriptUrl={saveScriptUrl} mapelList={mapelList} setMapelList={handleSetMapelList} asesmenList={asesmenList} setAsesmenList={handleSetAsesmenList} />}
      </main>
    </div>
  );
}