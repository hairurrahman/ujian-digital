import { useState, useEffect, useRef, useCallback } from "react";

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwGCqXtjCUeIT7sWIX5vjqefN_5S_aLt9syH8v82xuC4gTtzm7BRT8BJYFJTx_Pcufw7Q/exec";
const MAPEL_LIST = [
  "Bahasa Indonesia","Pendidikan Pancasila","IPAS","Matematika",
  "Seni Rupa","Bahasa Madura","Pendidikan Agama Islam","PJOK"
];
const ASESMEN_LIST = [
  "Sumatif 1","Sumatif 2","Sumatif 3","Sumatif 4",
  "Sumatif 5","Sumatif 6","Sumatif 7","Sumatif 8",
  "Asesmen Akhir Semester"
];
const JENIS_SOAL = ["Pilihan Ganda","Pilihan Ganda Kompleks","Benar/Salah Kompleks"];
const GURU_PASSWORD = "guru123";
const DEMO_TOKEN = "UJIAN2024";

// ============================================================
// KATEX — Render formula matematika
// Format: $...$ untuk inline, $$...$$ untuk block/display
// Contoh: $\frac{1}{2}$, $\sqrt{16}$, $2^3$, $\pi$
// ============================================================
let katexLoaded = false;
async function loadKatex() {
  if (katexLoaded || window.katex) { katexLoaded = true; return; }
  // Load CSS
  if (!document.getElementById("katex-css")) {
    const link = document.createElement("link");
    link.id = "katex-css";
    link.rel = "stylesheet";
    link.href = "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css";
    document.head.appendChild(link);
  }
  // Load JS
  await new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js";
    s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
  katexLoaded = true;
}

// Render teks dengan formula KaTeX inline ($...$) dan block ($$...$$)
// Teks biasa tetap dirender normal
function MathText({ text, className = "" }) {
  const ref = useRef(null);
  const [ready, setReady] = useState(!!window.katex);

  useEffect(() => {
    if (!window.katex) {
      loadKatex().then(() => setReady(true)).catch(() => setReady(false));
    }
  }, []);

  useEffect(() => {
    if (!ready || !ref.current || !text) return;
    const el = ref.current;
    // Ganti $$...$$ (block) dulu, lalu $...$ (inline)
    // Proses sebagai HTML string
    try {
      // Split berdasarkan $$ (block) dan $ (inline)
      const segments = [];
      let remaining = String(text);
      const pattern = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g;
      let lastIndex = 0;
      let match;
      while ((match = pattern.exec(remaining)) !== null) {
        if (match.index > lastIndex) {
          segments.push({ type: "text", content: remaining.slice(lastIndex, match.index) });
        }
        const raw = match[0];
        const isBlock = raw.startsWith("$$");
        const formula = isBlock ? raw.slice(2, -2).trim() : raw.slice(1, -1).trim();
        segments.push({ type: isBlock ? "block" : "inline", content: formula });
        lastIndex = match.index + raw.length;
      }
      if (lastIndex < remaining.length) {
        segments.push({ type: "text", content: remaining.slice(lastIndex) });
      }

      // Render ke HTML
      let html = "";
      segments.forEach(seg => {
        if (seg.type === "text") {
          html += seg.content.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
        } else {
          try {
            html += window.katex.renderToString(seg.content, {
              displayMode: seg.type === "block",
              throwOnError: false,
              output: "html",
            });
          } catch {
            html += `<span style="color:#dc2626;font-size:0.8em">[formula error]</span>`;
          }
        }
      });
      el.innerHTML = html;
    } catch {
      el.textContent = text;
    }
  }, [text, ready]);

  if (!text) return null;
  // Jika KaTeX belum siap atau tidak ada formula, render teks biasa
  if (!ready || !String(text).includes("$")) {
    return <span className={className}>{text}</span>;
  }
  return <span ref={ref} className={className} />;
}

// Cek apakah mapel adalah Matematika (untuk mengaktifkan toolbar math)
const isMapelMath = (mapel) => mapel === "Matematika";

// ── MathInput: textarea dengan toolbar simbol matematika ──
// Aktif saat mapel = Matematika. Klik simbol → sisipkan ke kursor teks
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
  { label:"∑", insert:"\\sum_{i=1}^{n}", title:"Sigma/Jumlah" },
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
    // Bungkus dengan $ jika belum ada formula di sekitar kursor
    // Sisipkan sebagai $formula$ jika posisi bukan di dalam $
    const before = value.slice(0, start);
    const after = value.slice(end);
    // Hitung jumlah $ sebelum kursor: jika ganjil, sudah di dalam formula
    const dollarsBefore = (before.match(/\$/g) || []).length;
    let newText;
    if (dollarsBefore % 2 === 1) {
      // Sudah dalam formula — sisipkan langsung
      newText = before + toInsert + after;
    } else {
      // Belum dalam formula — bungkus dengan $...$
      newText = before + "$" + toInsert + "$" + after;
    }
    onChange({ target: { value: newText } });
    // Kembalikan fokus dan posisi kursor
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
          className={`w-full border-2 border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none font-mono ${showToolbar ? "rounded-b-xl rounded-t-none" : "rounded-xl"}`}
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
          className={`w-full border-2 border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500 font-mono ${showToolbar ? "rounded-b-xl rounded-t-none" : "rounded-xl"}`}
        />
      )}
      {/* Preview formula real-time jika ada $ */}
      {showToolbar && value && value.includes("$") && (
        <div className="mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 leading-relaxed">
          <span className="text-xs text-slate-400 mr-2">Preview:</span>
          <MathText text={value} />
        </div>
      )}
    </div>
  );
}

// ── Default opsi berdasarkan jenis soal ──
const defaultOpsi = (jenis) => {
  if (jenis === "Benar/Salah Kompleks") return ["", "", ""];
  return ["", "", "", ""]; // PG & PGK default 4
};

// ── Demo soal ──
const DEMO_SOAL = {
  "Matematika_Sumatif 1": [
    { id:"1", soal:"Berapakah hasil dari 12 × 15?", gambar:"", jenisSoal:"Pilihan Ganda",
      opsi:JSON.stringify(["150","170","180","160"]), jawabanBenar:JSON.stringify(["180"]), point:10 },
    { id:"2", soal:"Manakah bilangan yang merupakan kelipatan 4? (pilih SEMUA yang benar)", gambar:"", jenisSoal:"Pilihan Ganda Kompleks",
      opsi:JSON.stringify(["12","15","20","22"]), jawabanBenar:JSON.stringify(["12","20"]), point:20 },
    { id:"3", soal:"Tentukan pernyataan berikut, Benar atau Salah?", gambar:"", jenisSoal:"Benar/Salah Kompleks",
      opsi:JSON.stringify(["5 × 5 = 25","3 × 8 = 21","7 + 9 = 16"]), jawabanBenar:JSON.stringify(["Benar","Salah","Benar"]), point:20 },
  ],
  "IPAS_Sumatif 1": [
    { id:"1", soal:"Apa yang dimaksud dengan fotosintesis?", gambar:"", jenisSoal:"Pilihan Ganda",
      opsi:JSON.stringify(["Proses pembuatan makanan pada tumbuhan dengan bantuan sinar matahari","Proses pernapasan pada hewan","Proses penyerapan air oleh akar","Proses penyerbukan pada bunga"]),
      jawabanBenar:JSON.stringify(["Proses pembuatan makanan pada tumbuhan dengan bantuan sinar matahari"]), point:10 },
  ],
};

// ── Utility Google Drive ──
function extractDriveFileId(url) {
  if (!url || typeof url !== "string") return null;
  url = url.trim();
  const m1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]{10,})/);
  if (m1) return m1[1];
  const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (m2) return m2[1];
  const m3 = url.match(/\/d\/([a-zA-Z0-9_-]{10,})/);
  if (m3) return m3[1];
  return null;
}
function isDriveUrl(url) {
  return url && (url.includes("drive.google.com") || url.includes("docs.google.com"));
}

// ── GambarSoal: Drive → iframe, URL biasa → img
// Tidak ada bingkai/border — tampil apa adanya ──
function GambarSoal({ url, alt = "Gambar soal" }) {
  if (!url || !url.trim()) return null;
  if (isDriveUrl(url)) {
    const fileId = extractDriveFileId(url);
    if (!fileId) return (
      <p className="text-xs text-red-500 text-center py-2">⚠️ Format link Google Drive tidak dikenali.</p>
    );
    return (
      <div className="relative w-full overflow-hidden" style={{ height:"220px" }}>
        <iframe
          src={`https://drive.google.com/file/d/${fileId}/preview`}
          title={alt}
          allow="autoplay"
          className="absolute inset-0 w-full h-full border-0"
          style={{ pointerEvents:"none" }}
        />
      </div>
    );
  }
  // URL gambar biasa — tampil tanpa bingkai apapun
  return (
    <img
      src={url}
      alt={alt}
      className="w-full max-h-60 object-contain"
      onError={e => {
        e.target.style.display = "none";
        const msg = document.createElement("p");
        msg.className = "text-xs text-red-500 text-center py-2";
        msg.textContent = "⚠️ Gambar tidak dapat dimuat.";
        e.target.parentNode.appendChild(msg);
      }}
    />
  );
}

// ── LogoSekolah: tampilkan logo dari URL manapun ──
// Fallback berantai: thumbnail → uc?export=view → emoji
function LogoSekolah({ url, className = "" }) {
  const [errCount, setErrCount] = useState(0);
  useEffect(() => { setErrCount(0); }, [url]);

  if (!url || !url.trim() || errCount >= 3) {
    return <span className="text-4xl select-none">🏫</span>;
  }

  let src = url.trim();
  if (isDriveUrl(url)) {
    const fileId = extractDriveFileId(url);
    if (!fileId) return <span className="text-4xl select-none">🏫</span>;
    if (errCount === 0) {
      src = `https://drive.google.com/thumbnail?id=${fileId}&sz=w200-h200`;
    } else if (errCount === 1) {
      src = `https://drive.google.com/uc?export=view&id=${fileId}`;
    } else {
      // Terakhir: coba lekukan lain — embed thumbnail tanpa crossOrigin
      src = `https://lh3.googleusercontent.com/d/${fileId}=w200-h200`;
    }
  }

  return (
    <img
      src={src}
      alt="Logo sekolah"
      className={className}
      referrerPolicy="no-referrer"
      onError={() => setErrCount(c => c + 1)}
    />
  );
}

// ── Generate PDF langsung download menggunakan jsPDF (CDN) ──
// Menyertakan review soal yang dijawab tidak sempurna (tanpa kunci jawaban)
// ── unduhPDF: generate PDF langsung download via jsPDF ──
// Menampilkan review soal + opsi salah ditandai jelas. Tanpa kunci jawaban.
async function unduhPDF({ siswa, hasilAkhir, soalList, jawabanSiswa, namaGuru, nipGuru, kotaTTD, namaSekolah }) {
  if (!window.jspdf) {
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const tgl = new Date().toLocaleDateString("id-ID", { day:"numeric", month:"long", year:"numeric" });
  const W = 210; const margin = 18; const colW = W - margin * 2;
  let y = margin;

  const checkY = (need = 10) => {
    if (y + need > 280) { doc.addPage(); y = margin; }
  };

  const wrappedText = (text, x, yy, maxW, lineH = 5) => {
    const lines = doc.splitTextToSize(String(text), maxW);
    lines.forEach((l, i) => doc.text(l, x, yy + i * lineH));
    return lines.length * lineH;
  };

  // ── HEADER BIRU ──
  doc.setFillColor(30, 58, 138);
  doc.rect(0, 0, W, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(14);
  doc.text("LAPORAN HASIL ASESMEN", W / 2, 11, { align: "center" });
  doc.setFontSize(10); doc.setFont("helvetica", "normal");
  doc.text(namaSekolah || "Portal Ujian Digital", W / 2, 18, { align: "center" });
  doc.setFontSize(8);
  doc.text("Aplikasi Web Asesmen — Copyright © 2026 Hairur Rahman", W / 2, 24, { align: "center" });
  y = 36;

  // ── DATA SISWA ──
  doc.setTextColor(30, 30, 30);
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y - 5, colW, 7, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(10);
  doc.text("DATA SISWA", margin + 2, y);
  y += 6;
  const dataRows = [
    ["Nama", siswa.nama], ["NISN", siswa.nisn], ["No. Absen", siswa.noAbsen],
    ["Mata Pelajaran", siswa.mapel], ["Jenis Asesmen", siswa.asesmen], ["Tanggal", tgl],
  ];
  doc.setFontSize(9.5);
  dataRows.forEach(([k, v]) => {
    checkY(7);
    doc.setFont("helvetica", "bold"); doc.text(k, margin + 2, y);
    doc.setFont("helvetica", "normal"); doc.text(`: ${v}`, margin + 38, y);
    y += 6;
  });
  y += 4;

  // ── NILAI AKHIR ──
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

  // ── RINCIAN POIN PER SOAL ──
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

  // ── REVIEW SOAL YANG TIDAK SEMPURNA ──
  // Tampilkan semua opsi + tandai mana yang salah (jawaban siswa yang keliru)
  // Tidak menampilkan kunci jawaban
  const soalSalah = soalList.filter((s, idx) => {
    const d = hasilAkhir.detail[idx];
    return d && d.dapat < d.max;
  });

  if (soalSalah.length > 0) {
    checkY(16);
    doc.setFillColor(254,243,199);
    doc.rect(margin, y-5, colW, 8, "F");
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

      // Header soal — kotak abu muda
      doc.setFillColor(241,245,249);
      doc.rect(margin, y-5, colW, 7, "F");
      doc.setFont("helvetica","bold"); doc.setFontSize(9); doc.setTextColor(30,30,30);
      doc.text(`Soal ${idxAsli+1}   [${s.jenisSoal}]   Poin kamu: ${d.dapat} / ${d.max}`, margin+2, y);
      y += 5.5;

      // Teks soal
      doc.setFont("helvetica","normal"); doc.setFontSize(8.5); doc.setTextColor(40,40,40);
      const soalLines = doc.splitTextToSize(s.soal, colW - 4);
      soalLines.forEach(l => { checkY(5); doc.text(l, margin+3, y); y += 4.8; });
      y += 2;

      if (s.jenisSoal === "Pilihan Ganda") {
        // Tampilkan semua opsi, tandai jawaban siswa sebagai salah (karena soal ini masuk review)
        opsiArr.forEach((opsi, oi) => {
          checkY(7);
          const dipilihSiswa = jwbSiswa[0] === opsi;
          // Jawaban siswa yang salah → [X] merah
          // Opsi lain → titik abu
          if (dipilihSiswa) {
            doc.setFillColor(254,226,226); // merah muda
            const oH = doc.splitTextToSize(`${String.fromCharCode(65+oi)}. ${opsi}`, colW-14).length * 5 + 3;
            doc.rect(margin+2, y-4, colW-4, oH, "F");
            doc.setTextColor(185,28,28);
            doc.setFont("helvetica","bold");
            doc.text("[X]", margin+4, y);
          } else {
            doc.setTextColor(100,100,100);
            doc.setFont("helvetica","normal");
            doc.text("[ ]", margin+4, y);
          }
          doc.setFont("helvetica", dipilihSiswa ? "bold" : "normal");
          doc.setTextColor(dipilihSiswa ? 185 : 60, dipilihSiswa ? 28 : 60, dipilihSiswa ? 28 : 60);
          const labelH = wrappedText(`${String.fromCharCode(65+oi)}. ${opsi}`, margin+12, y, colW-16, 5);
          y += Math.max(labelH, 5) + 1;
        });
        // Keterangan tanpa kunci
        checkY(6);
        doc.setTextColor(146,64,14); doc.setFont("helvetica","italic"); doc.setFontSize(7.5);
        doc.text("* Opsi bertanda [X] adalah jawaban kamu yang tidak tepat. Pelajari kembali materi ini.", margin+3, y);
        y += 5;

      } else if (s.jenisSoal === "Pilihan Ganda Kompleks") {
        // Tampilkan semua opsi. Tandai:
        //   dipilih siswa = tampilkan [v] atau [X] tergantung apakah seharusnya dipilih
        //   tidak dipilih siswa tapi seharusnya dipilih = tampilkan [!] (terlewat)
        //   tidak dipilih & tidak perlu dipilih = [ ]
        opsiArr.forEach((opsi, oi) => {
          checkY(7);
          const dipilihSiswa = jwbSiswa.includes(opsi);
          const harusBenar = benarArr.includes(opsi);
          const opsiTepat = dipilihSiswa === harusBenar;

          let simbol, bgColor, textColor, fontStyle;
          if (dipilihSiswa && harusBenar) {
            // Dipilih & benar → [v] hijau
            simbol = "[v]"; bgColor = [220,252,231]; textColor = [21,128,61]; fontStyle = "normal";
          } else if (dipilihSiswa && !harusBenar) {
            // Dipilih tapi harusnya tidak → [X] merah = salah pilih
            simbol = "[X]"; bgColor = [254,226,226]; textColor = [185,28,28]; fontStyle = "bold";
          } else if (!dipilihSiswa && harusBenar) {
            // Tidak dipilih padahal harusnya → [!] oranye = terlewat
            simbol = "[!]"; bgColor = [255,237,213]; textColor = [154,52,18]; fontStyle = "bold";
          } else {
            // Tidak dipilih & tidak perlu → [ ] abu
            simbol = "[ ]"; bgColor = null; textColor = [100,100,100]; fontStyle = "normal";
          }

          if (bgColor) {
            const oH = doc.splitTextToSize(`${String.fromCharCode(65+oi)}. ${opsi}`, colW-14).length * 5 + 3;
            doc.setFillColor(...bgColor);
            doc.rect(margin+2, y-4, colW-4, oH, "F");
          }
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
        // B/S Kompleks: tampilkan pernyataan + jawaban siswa. Tandai yang salah.
        opsiArr.forEach((opsi, oi) => {
          checkY(8);
          const jwbSiswaItem = jwbSiswa[oi] || null;
          const jwbBenar = benarArr[oi];
          const tepat = jwbSiswaItem === jwbBenar;

          if (!tepat) {
            doc.setFillColor(254,226,226);
            const oH = doc.splitTextToSize(`${oi+1}. ${opsi}`, colW-30).length * 5 + 3;
            doc.rect(margin+2, y-4, colW-4, oH, "F");
          }

          doc.setFont("helvetica","normal"); doc.setFontSize(8.5);
          doc.setTextColor(40,40,40);
          const pH = wrappedText(`${oi+1}. ${opsi}`, margin+4, y, colW-30, 5);

          // Kolom kanan: jawaban siswa + status
          const jwbLabel = jwbSiswaItem || "(tidak dijawab)";
          const statusLabel = tepat ? "[v]" : "[X]";
          doc.setFont("helvetica","bold");
          doc.setTextColor(tepat ? 21 : 185, tepat ? 128 : 28, tepat ? 61 : 28);
          doc.text(`${statusLabel} ${jwbLabel}`, W - margin - 2, y, { align:"right" });
          doc.setFont("helvetica","normal");
          y += Math.max(pH, 6) + 1;
        });
        checkY(6);
        doc.setTextColor(146,64,14); doc.setFont("helvetica","italic"); doc.setFontSize(7.5);
        doc.text("* [X] = jawaban kamu tidak tepat, [v] = tepat", margin+3, y);
        y += 5;
      }

      // Garis pemisah antar soal
      checkY(5);
      doc.setDrawColor(200,200,200); doc.setLineWidth(0.2);
      doc.line(margin, y, W-margin, y);
      y += 6;
    });
  }

  // ── TANDA TANGAN ──
  checkY(40);
  doc.setTextColor(30,30,30);
  const ttdX = W - margin - 50;
  doc.setFont("helvetica","normal"); doc.setFontSize(9);
  // Kota + tanggal
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
  if (nipGuru) {
    y += 5;
    doc.setFont("helvetica","normal"); doc.setFontSize(8.5);
    doc.text(`NIP. ${nipGuru}`, ttdX, y, { align:"center" });
  }

  // Footer
  checkY(8);
  doc.setFont("helvetica","italic"); doc.setFontSize(7.5); doc.setTextColor(150,150,150);
  doc.text("Dokumen ini digenerate otomatis oleh Aplikasi Web Asesmen", W/2, 290, { align:"center" });

  // ── SIMPAN — nama file tanpa nama siswa ──
  const mapelKode = siswa.mapel.replace(/\s+/g,"_");
  const asesmenKode = siswa.asesmen.replace(/\s+/g,"_");
  const tanggalKode = new Date().toISOString().slice(0,10);
  doc.save(`Laporan_${mapelKode}_${asesmenKode}_${tanggalKode}.pdf`);
}

// ── Toast ──
const toastColors = { success:"#22c55e", error:"#ef4444", warning:"#f59e0b", info:"#3b82f6" };
function Toast({ toasts }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-xs w-full">
      {toasts.map(t => (
        <div key={t.id} className="rounded-xl shadow-lg px-4 py-3 text-white text-sm font-medium flex items-start gap-3"
          style={{ backgroundColor: toastColors[t.type] || toastColors.info }}>
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

// ── Header ── warna putih/netral agar logo warna apapun tetap terlihat jelas
function AppHeader({ logoUrl, namaSekolah }) {
  return (
    <header className="bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-4xl mx-auto px-4 py-3 flex flex-col items-center gap-1">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 flex items-center justify-center" style={{ minWidth:"52px" }}>
            {logoUrl ? (
              <LogoSekolah url={logoUrl} className="max-h-14 max-w-20 object-contain" />
            ) : (
              <span className="text-4xl">🏫</span>
            )}
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Aplikasi Web Asesmen</p>
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-800 leading-tight">Portal Ujian Digital</h1>
            {namaSekolah && <p className="text-sm text-slate-500 font-medium mt-0.5">{namaSekolah}</p>}
          </div>
        </div>
      </div>
    </header>
  );
}

// ── Login Guru ──
function GuruLogin({ onLogin }) {
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState("");
  const handle = () => {
    if (pwd === GURU_PASSWORD) { onLogin(); setErr(""); }
    else setErr("Password salah!");
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center">
        <div className="text-5xl mb-3">🔐</div>
        <h2 className="text-2xl font-bold text-slate-800 mb-1">Mode Guru</h2>
        <p className="text-slate-500 text-sm mb-5">Masukkan password untuk masuk</p>
        <input type="password" value={pwd} onChange={e => setPwd(e.target.value)}
          onKeyDown={e => e.key==="Enter" && handle()} placeholder="Password guru..."
          className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-blue-500 mb-3" />
        {err && <p className="text-red-500 text-sm mb-3">{err}</p>}
        <button onClick={handle} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors">
          Masuk
        </button>
      </div>
    </div>
  );
}

// ============================================================
// PANEL GURU
// ============================================================
function GuruPanel({ addToast, onLogout, settings, onSaveSettings, scriptUrl, onSaveScriptUrl }) {
  const [activeTab, setActiveTab] = useState("soal");

  // Form soal
  const [soal, setSoal] = useState("");
  const [gambar, setGambar] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [point, setPoint] = useState(10);
  const [mapel, setMapel] = useState(MAPEL_LIST[0]);
  const [asesmen, setAsesmen] = useState(ASESMEN_LIST[0]);
  const [jenisSoal, setJenisSoal] = useState(JENIS_SOAL[0]);
  const [opsi, setOpsi] = useState(defaultOpsi(JENIS_SOAL[0]));
  const [jawabanBenar, setJawabanBenar] = useState([]);
  const [loading, setLoading] = useState(false);

  // Token
  const [tokenMapel, setTokenMapel] = useState(MAPEL_LIST[0]);
  const [tokenAsesmen, setTokenAsesmen] = useState(ASESMEN_LIST[0]);
  const [tokenValue, setTokenValue] = useState("");

  // Pengaturan
  const [logoInput, setLogoInput] = useState(settings.logoUrl || "");
  const [namaInput, setNamaInput] = useState(settings.namaSekolah || "");
  const [namaGuruInput, setNamaGuruInput] = useState(settings.namaGuru || "");
  const [nipGuruInput, setNipGuruInput] = useState(settings.nipGuru || "");
  const [kotaTTDInput, setKotaTTDInput] = useState(settings.kotaTTD || "");
  const [urlInput, setUrlInput] = useState(scriptUrl || "");
  const [spreadsheetUrl, setSpreadsheetUrl] = useState(settings.spreadsheetUrl || "");
  const [durasiInput, setDurasiInput] = useState(settings.durasiMenit || 60);
  const [savedSpreadsheetUrl, setSavedSpreadsheetUrl] = useState(settings.spreadsheetUrl || "");

  // ── Ganti jenis soal: reset opsi ke default count + reset jawaban ──
  const handleGantiJenis = (jenis) => {
    setJenisSoal(jenis);
    setOpsi(defaultOpsi(jenis));
    setJawabanBenar([]);
  };

  const handleAddOpsi = () => setOpsi([...opsi, ""]);
  const handleOpsiChange = (i, v) => { const a = [...opsi]; a[i] = v; setOpsi(a); };
  const handleRemoveOpsi = (i) => {
    setOpsi(opsi.filter((_, idx) => idx !== i));
    setJawabanBenar(jawabanBenar.filter(j => j !== opsi[i]));
  };
  const handleJawabanPG = (v) => setJawabanBenar([v]);
  const handleJawabanPGK = (v) => setJawabanBenar(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v]);
  const handleJawabanBS = (idx, val) => {
    const arr = [...(jawabanBenar.length === opsi.length ? jawabanBenar : opsi.map(() => ""))];
    arr[idx] = val;
    setJawabanBenar(arr);
  };

  // ── Auto-paste vertikal: paste teks multiline ke opsi ──
  const handleOpsiPaste = (e, startIdx) => {
    const text = e.clipboardData.getData("text");
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length <= 1) return; // biarkan paste biasa
    e.preventDefault();
    const newOpsi = [...opsi];
    lines.forEach((line, i) => {
      const idx = startIdx + i;
      if (idx < newOpsi.length) {
        newOpsi[idx] = line;
      } else {
        newOpsi.push(line);
      }
    });
    setOpsi(newOpsi);
    addToast(`✅ ${lines.length} opsi berhasil di-paste sekaligus!`, "success");
  };

  const handleSubmitSoal = async () => {
    if (!soal.trim()) return addToast("Soal tidak boleh kosong!", "error");
    if (!point || isNaN(point)) return addToast("Point harus berupa angka!", "error");
    const filledOpsi = opsi.filter(o => o.trim());
    if (filledOpsi.length < 2) return addToast("Minimal 2 opsi jawaban!", "error");
    if (jawabanBenar.length === 0) return addToast("Pilih jawaban yang benar!", "error");
    const payload = { action:"tambahSoal", mapel, asesmen, soal, gambar, jenisSoal,
      opsi:JSON.stringify(filledOpsi), jawabanBenar:JSON.stringify(jawabanBenar), point:Number(point) };
    setLoading(true);
    try {
      const url = scriptUrl || APPS_SCRIPT_URL;
      const res = await fetch(url, { method:"POST", body:JSON.stringify(payload) });
      const data = await res.json();
      if (data.status === "success") {
        addToast("Soal berhasil disimpan! ✅", "success");
        setSoal(""); setGambar(""); setOpsi(defaultOpsi(jenisSoal)); setJawabanBenar([]); setShowPreview(false);
      } else addToast(data.message || "Gagal menyimpan soal.", "error");
    } catch { addToast("Mode Demo: Belum terhubung ke Apps Script.", "warning"); }
    finally { setLoading(false); }
  };

  const handleSaveToken = async () => {
    if (!tokenValue.trim()) return addToast("Isi token terlebih dahulu!", "error");
    try {
      const url = scriptUrl || APPS_SCRIPT_URL;
      await fetch(url, { method:"POST", body:JSON.stringify({ action:"simpanToken", mapel:tokenMapel, asesmen:tokenAsesmen, token:tokenValue }) });
      addToast(`Token "${tokenValue}" disimpan!`, "success");
    } catch { addToast(`Demo: Token "${tokenValue}" (belum terhubung ke server)`, "warning"); }
  };

  const handleSavePengaturan = async () => {
    const durasi = Number(durasiInput);
    if (!durasi || durasi < 1 || durasi > 300) return addToast("Durasi harus antara 1–300 menit!", "error");

    const newSettings = {
      logoUrl: logoInput, namaSekolah: namaInput, namaGuru: namaGuruInput,
      nipGuru: nipGuruInput, kotaTTD: kotaTTDInput, durasiMenit: durasi, spreadsheetUrl,
    };

    // Simpan ke localStorage dulu (instant, offline-capable)
    onSaveSettings(newSettings);
    onSaveScriptUrl(urlInput);
    setSavedSpreadsheetUrl(spreadsheetUrl);

    // Push ke Spreadsheet — pakai URL input, atau localStorage, atau konstanta hardcode
    const url = urlInput || scriptUrl || APPS_SCRIPT_URL;
    if (url && !url.includes("YOUR_APPS_SCRIPT_ID")) {
      try {
        const res = await fetch(url, {
          method: "POST",
          body: JSON.stringify({ action: "simpanPengaturan", ...newSettings }),
        });
        const data = await res.json();
        if (data.status === "success") {
          addToast("✅ Pengaturan disimpan ke Spreadsheet — sinkron di semua perangkat!", "success");
        } else {
          addToast("Tersimpan lokal. Gagal sinkron ke Spreadsheet: " + (data.message || ""), "warning");
        }
      } catch {
        addToast("Tersimpan lokal. Tidak bisa terhubung ke Apps Script.", "warning");
      }
    } else {
      addToast("Pengaturan disimpan lokal. Isi URL Apps Script untuk sinkron antar perangkat.", "info");
    }
  };

  const jam = Math.floor(durasiInput / 60);
  const menit = Number(durasiInput) % 60;
  const durasiDisplay = jam > 0 ? `${jam} jam ${menit > 0 ? menit + " menit" : ""}` : `${menit} menit`;

  const tabs = [
    { id:"soal", label:"📝 Input Soal" },
    { id:"token", label:"🔑 Token" },
    { id:"pengaturan", label:"⚙️ Pengaturan" },
    { id:"panduan", label:"📖 Panduan" },
  ];

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white px-4 py-4 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-lg">🏫 Panel Guru</h2>
          <p className="text-slate-400 text-xs">Kelola soal & pengaturan</p>
        </div>
        <button onClick={onLogout} className="bg-red-500 hover:bg-red-600 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors">
          Keluar
        </button>
      </div>
      <div className="overflow-x-auto">
        <div className="flex border-b border-slate-200 bg-white min-w-max">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors ${activeTab===t.id ? "border-b-2 border-blue-600 text-blue-600 bg-blue-50" : "text-slate-600 hover:bg-slate-50"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4">

        {/* ── TAB SOAL ── */}
        {activeTab === "soal" && (
          <div className="bg-white rounded-2xl shadow p-6 space-y-5">
            <h3 className="font-bold text-slate-800 text-lg">Tambah Soal Baru</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Mata Pelajaran</label>
                <select value={mapel} onChange={e => setMapel(e.target.value)} className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                  {MAPEL_LIST.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Jenis Asesmen</label>
                <select value={asesmen} onChange={e => setAsesmen(e.target.value)} className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                  {ASESMEN_LIST.map(a => <option key={a}>{a}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Jenis Soal</label>
                {/* Ganti jenis → reset opsi ke jumlah default */}
                <select value={jenisSoal} onChange={e => handleGantiJenis(e.target.value)} className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                  {JENIS_SOAL.map(j => <option key={j}>{j}</option>)}
                </select>
                <p className="text-xs text-slate-400 mt-1">
                  {jenisSoal === "Benar/Salah Kompleks" ? "↳ Otomatis 3 opsi" : "↳ Otomatis 4 opsi"}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Point/Nilai</label>
                <input type="number" value={point} onChange={e => setPoint(e.target.value)} min={1}
                  className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Pertanyaan {isMapelMath(mapel) && <span className="text-blue-500 ml-1">∑ Formula matematika aktif</span>}
              </label>
              <MathInput
                value={soal}
                onChange={e => setSoal(e.target.value)}
                rows={4}
                placeholder={isMapelMath(mapel) ? "Tulis soal... Contoh: Hitung $\\frac{3}{4} + \\frac{1}{2}$" : "Tulis soal di sini..."}
                showToolbar={isMapelMath(mapel)}
              />
            </div>

            {/* URL Gambar */}
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">URL Gambar (opsional)</label>
              <div className="flex gap-2">
                <input type="url" value={gambar} onChange={e => { setGambar(e.target.value); setShowPreview(false); }}
                  placeholder="https://drive.google.com/file/d/... atau URL gambar"
                  className="flex-1 border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                {gambar && (
                  <button onClick={() => setShowPreview(v => !v)}
                    className="bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-bold px-3 rounded-xl whitespace-nowrap transition-colors">
                    {showPreview ? "Tutup" : "👁 Preview"}
                  </button>
                )}
              </div>
              {showPreview && gambar && (
                <div className="mt-2 overflow-hidden rounded-xl">
                  <GambarSoal url={gambar} alt="Preview soal" />
                </div>
              )}
            </div>

            {/* Opsi Jawaban */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Opsi Jawaban</label>
                  <p className="text-xs text-blue-500 font-medium mt-0.5">
                    💡 Tip: Ctrl+V pada kotak opsi untuk paste banyak opsi sekaligus (tiap baris = 1 opsi)
                  </p>
                </div>
                <button onClick={handleAddOpsi} className="text-xs bg-blue-100 text-blue-600 px-3 py-1 rounded-lg hover:bg-blue-200 font-medium flex-shrink-0">
                  + Tambah Opsi
                </button>
              </div>
              <div className="space-y-2">
                {opsi.map((o, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-2">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <div className="flex-1">
                      <MathInput
                        value={o}
                        onChange={e => handleOpsiChange(i, e.target.value)}
                        onPaste={e => handleOpsiPaste(e, i)}
                        rows={1}
                        placeholder={`Opsi ${String.fromCharCode(65 + i)}${isMapelMath(mapel) ? " — bisa pakai $formula$" : " — paste teks vertikal di sini"}`}
                        showToolbar={false}
                      />
                      {/* Preview formula opsi jika ada $ */}
                      {isMapelMath(mapel) && o && o.includes("$") && (
                        <div className="mt-0.5 px-2 py-1 bg-slate-50 rounded-lg text-xs text-slate-600">
                          <MathText text={o} />
                        </div>
                      )}
                    </div>
                    {jenisSoal === "Pilihan Ganda" && (
                      <input type="radio" name="pg" checked={jawabanBenar[0]===o} onChange={() => handleJawabanPG(o)} className="w-4 h-4 mt-2.5" title="Jawaban benar" />
                    )}
                    {jenisSoal === "Pilihan Ganda Kompleks" && (
                      <input type="checkbox" checked={jawabanBenar.includes(o)} onChange={() => handleJawabanPGK(o)} className="w-4 h-4 mt-2.5" title="Jawaban benar" />
                    )}
                    {jenisSoal === "Benar/Salah Kompleks" && (
                      <div className="flex gap-1 flex-shrink-0 mt-1.5">
                        <button onClick={() => handleJawabanBS(i, "Benar")} className={`text-xs px-2 py-1 rounded-lg font-bold ${jawabanBenar[i]==="Benar" ? "bg-green-500 text-white" : "bg-slate-100 text-slate-600"}`}>B</button>
                        <button onClick={() => handleJawabanBS(i, "Salah")} className={`text-xs px-2 py-1 rounded-lg font-bold ${jawabanBenar[i]==="Salah" ? "bg-red-500 text-white" : "bg-slate-100 text-slate-600"}`}>S</button>
                      </div>
                    )}
                    {opsi.length > 2 && (
                      <button onClick={() => handleRemoveOpsi(i)} className="text-red-400 hover:text-red-600 text-xl leading-none mt-1.5">×</button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-2">
                {jenisSoal==="Pilihan Ganda" && "○ Klik lingkaran untuk 1 jawaban benar"}
                {jenisSoal==="Pilihan Ganda Kompleks" && "☑ Centang untuk ≥2 jawaban benar — skor parsial per opsi"}
                {jenisSoal==="Benar/Salah Kompleks" && "Klik B/S tiap pernyataan — skor parsial per pernyataan"}
              </p>
            </div>

            <button onClick={handleSubmitSoal} disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 text-sm">
              {loading ? "Menyimpan..." : "💾 Simpan Soal ke Spreadsheet"}
            </button>
          </div>
        )}

        {/* ── TAB TOKEN ── */}
        {activeTab === "token" && (
          <div className="bg-white rounded-2xl shadow p-6 space-y-5">
            <h3 className="font-bold text-slate-800 text-lg">Kelola Token Ujian</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
              <p className="font-semibold mb-1">ℹ️ Cara Kerja Token</p>
              <p>Token digunakan siswa untuk membuka ujian. Buat token berbeda tiap mapel & asesmen.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Mata Pelajaran</label>
                <select value={tokenMapel} onChange={e => setTokenMapel(e.target.value)} className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                  {MAPEL_LIST.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Asesmen</label>
                <select value={tokenAsesmen} onChange={e => setTokenAsesmen(e.target.value)} className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                  {ASESMEN_LIST.map(a => <option key={a}>{a}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Token</label>
              <input value={tokenValue} onChange={e => setTokenValue(e.target.value.toUpperCase())} placeholder="Contoh: MTK2024"
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 uppercase tracking-widest font-mono" />
            </div>
            <button onClick={handleSaveToken} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-colors text-sm">
              🔑 Simpan Token
            </button>
            <div className="border-t pt-4">
              <p className="text-xs font-semibold text-slate-600 mb-2">Token Demo:</p>
              <div className="bg-slate-100 rounded-xl p-3 font-mono text-sm text-slate-700 space-y-1">
                <p>Matematika / Sumatif 1 → <strong className="text-blue-600">UJIAN2024</strong></p>
                <p>IPAS / Sumatif 1 → <strong className="text-blue-600">UJIAN2024</strong></p>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB PENGATURAN ── */}
        {activeTab === "pengaturan" && (
          <div className="bg-white rounded-2xl shadow p-6 space-y-5">
            <h3 className="font-bold text-slate-800 text-lg">Pengaturan Aplikasi</h3>

            {/* Logo */}
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">URL Logo Sekolah</label>
              <input value={logoInput} onChange={e => setLogoInput(e.target.value)}
                placeholder="https://drive.google.com/file/d/... atau URL gambar"
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
              <p className="text-xs text-slate-400 mt-1">💡 Drive: Upload → Bagikan → "Siapa saja yang memiliki link" → Salin link</p>
              {logoInput && (
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex items-center justify-center bg-slate-50 border border-slate-200 rounded-lg p-2" style={{ minWidth:"64px" }}>
                    <LogoSekolah url={logoInput} className="max-h-14 max-w-16 object-contain" />
                  </div>
                  <div className="text-xs text-slate-500 space-y-1">
                    <p className="font-semibold text-slate-700">Preview Logo</p>
                    {isDriveUrl(logoInput) ? (
                      extractDriveFileId(logoInput)
                        ? <p className="text-green-600">✓ File ID terdeteksi</p>
                        : <p className="text-red-500">✗ Format URL Drive tidak dikenali</p>
                    ) : <p className="text-blue-600">✓ URL gambar biasa</p>}
                  </div>
                </div>
              )}
            </div>

            {/* Nama Sekolah */}
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Nama Sekolah</label>
              <input value={namaInput} onChange={e => setNamaInput(e.target.value)} placeholder="SD Negeri ..."
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
            </div>

            {/* Nama Guru ← BARU */}
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Nama Guru</label>
              <input value={namaGuruInput} onChange={e => setNamaGuruInput(e.target.value)} placeholder="Nama lengkap guru..."
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
              <p className="text-xs text-slate-400 mt-1">Muncul di kolom tanda tangan PDF hasil ujian.</p>
            </div>

            {/* NIP & Kota TTD — dalam satu baris */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">NIP Guru</label>
                <input value={nipGuruInput} onChange={e => setNipGuruInput(e.target.value)} placeholder="198XXXXXXXX"
                  className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 font-mono" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Kota Penandatangan</label>
                <input value={kotaTTDInput} onChange={e => setKotaTTDInput(e.target.value)} placeholder="Sumenep"
                  className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
              </div>
            </div>
            <p className="text-xs text-slate-400 -mt-3">NIP & Kota muncul di kolom tanda tangan PDF: "Sumenep, 29 Maret 2026 / NIP. 198..."</p>

            {/* Durasi */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">⏱️</span>
                <div>
                  <h4 className="font-bold text-amber-900 text-sm">Durasi Waktu Ujian</h4>
                  <p className="text-xs text-amber-700 mt-0.5">Timer otomatis mengumpulkan jawaban saat waktu habis</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input type="number" value={durasiInput} onChange={e => setDurasiInput(e.target.value)} min={1} max={300}
                  className="w-24 border-2 border-amber-300 focus:border-amber-500 rounded-xl px-3 py-3 text-center font-extrabold text-2xl text-amber-800 focus:outline-none bg-white" />
                <div>
                  <p className="text-sm font-bold text-amber-800">menit</p>
                  <p className="text-xs text-amber-600 mt-0.5">= {durasiDisplay}</p>
                </div>
              </div>
              <input type="range" min={10} max={180} step={5} value={durasiInput}
                onChange={e => setDurasiInput(Number(e.target.value))} className="w-full accent-amber-500" />
              <div className="flex flex-wrap gap-2">
                {[{label:"30 mnt",val:30},{label:"45 mnt",val:45},{label:"1 jam",val:60},{label:"1,5 jam",val:90},{label:"2 jam",val:120}].map(({ label, val }) => (
                  <button key={val} onClick={() => setDurasiInput(val)}
                    className={`text-xs px-4 py-2 rounded-xl font-bold transition-all ${Number(durasiInput)===val ? "bg-amber-500 text-white shadow-md" : "bg-white text-amber-700 border border-amber-300 hover:bg-amber-100"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Apps Script URL */}
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">URL Google Apps Script</label>
              <input value={urlInput} onChange={e => setUrlInput(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 font-mono text-xs" />
              <p className="text-xs text-slate-400 mt-1">URL deployment Apps Script Web App.</p>
            </div>

            {/* Link Spreadsheet ← BARU */}
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Link Google Spreadsheet</label>
              <input value={spreadsheetUrl} onChange={e => setSpreadsheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 font-mono text-xs" />
              <p className="text-xs text-slate-400 mt-1">Link spreadsheet untuk melihat data soal & hasil ujian.</p>
              {/* Tombol buka spreadsheet — hanya muncul setelah disimpan */}
              {savedSpreadsheetUrl && (
                <a href={savedSpreadsheetUrl} target="_blank" rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-2 bg-green-100 hover:bg-green-200 text-green-700 text-xs font-bold px-4 py-2 rounded-xl transition-colors">
                  <span>📊</span> Buka Google Spreadsheet ↗
                </a>
              )}
            </div>

            <button onClick={handleSavePengaturan}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors text-sm">
              💾 Simpan Pengaturan
            </button>

            {/* Tampilkan tombol setelah simpan */}
            {savedSpreadsheetUrl && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center justify-between">
                <p className="text-xs text-green-700 font-medium">✅ Spreadsheet terhubung</p>
                <a href={savedSpreadsheetUrl} target="_blank" rel="noreferrer"
                  className="bg-green-500 hover:bg-green-600 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors">
                  Buka ↗
                </a>
              </div>
            )}

            {/* Info: settings tersimpan di Spreadsheet, otomatis sinkron antar perangkat */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
              <p className="text-xs font-bold text-blue-800">🔄 Cara Kerja Sinkron Otomatis</p>
              <ol className="text-xs text-blue-700 leading-relaxed list-decimal list-inside space-y-1">
                <li>Isi URL Apps Script di atas → klik <strong>Simpan Pengaturan</strong></li>
                <li>Pengaturan tersimpan ke sheet <strong>PENGATURAN</strong> di Spreadsheet</li>
                <li>Buka aplikasi di HP/browser lain → logo & nama sekolah otomatis muncul</li>
              </ol>
              <div className="bg-blue-100 rounded-lg px-3 py-2 mt-1">
                <p className="text-xs font-bold text-blue-900 mb-1">⚡ Agar sinkron tanpa perlu isi URL dulu:</p>
                <p className="text-xs text-blue-800 leading-relaxed">
                  Di file <code className="bg-white px-1 rounded">src/App.jsx</code> baris pertama, ganti:
                </p>
                <code className="block text-xs bg-white rounded px-2 py-1 mt-1 text-slate-700 break-all">
                  const APPS_SCRIPT_URL = "https://script.google.com/macros/s/<strong>ISI_ID_KAMU</strong>/exec";
                </code>
                <p className="text-xs text-blue-700 mt-1">Lalu <code className="bg-white px-1 rounded">npm run deploy</code> ulang. Setelah itu semua perangkat langsung sinkron tanpa perlu isi apapun.</p>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB PANDUAN ── */}
        {activeTab === "panduan" && (
          <div className="bg-white rounded-2xl shadow p-6 space-y-4 text-sm text-slate-700">
            <h3 className="font-bold text-slate-800 text-lg">📖 Panduan Penggunaan</h3>

            {/* Panduan Input Soal */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="font-semibold text-blue-800 mb-3">📝 Cara Input Soal</p>
              <ol className="list-decimal list-inside space-y-2 text-blue-700 text-xs leading-relaxed">
                <li>Pilih <strong>Mata Pelajaran</strong> dan <strong>Asesmen</strong> yang sesuai</li>
                <li>Pilih <strong>Jenis Soal</strong>:
                  <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                    <li><strong>Pilihan Ganda (PG)</strong> → otomatis muncul 4 opsi, pilih 1 jawaban benar dengan radio button ○</li>
                    <li><strong>Pilihan Ganda Kompleks (PGK)</strong> → otomatis muncul 4 opsi, centang ≥2 jawaban benar ☑</li>
                    <li><strong>Benar/Salah Kompleks</strong> → otomatis muncul 3 opsi, klik B/S untuk tiap pernyataan</li>
                  </ul>
                </li>
                <li>Isi <strong>Point/Nilai</strong> untuk bobot soal tersebut</li>
                <li>Ketik pertanyaan di kotak <strong>Pertanyaan</strong></li>
                <li>Isi opsi jawaban. Bisa klik <strong>+ Tambah Opsi</strong> jika perlu lebih banyak</li>
                <li>
                  <strong>Auto-Paste Vertikal</strong>: Salin teks opsi dari Word/PDF yang berjejer ke bawah, lalu tekan <kbd className="bg-blue-100 px-1.5 py-0.5 rounded font-mono">Ctrl+V</kbd> di kotak Opsi A — semua baris otomatis tersebar ke opsi berikutnya!
                </li>
                <li>Tandai jawaban yang benar, lalu klik <strong>💾 Simpan Soal</strong></li>
              </ol>
            </div>

            {/* Panduan PDF */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
              <p className="font-semibold text-indigo-800 mb-2">📄 Fitur Download PDF Hasil</p>
              <ul className="list-disc list-inside space-y-1 text-indigo-700 text-xs leading-relaxed">
                <li>Setelah siswa menyelesaikan ujian, halaman hasil menampilkan nilai & rincian poin</li>
                <li>Klik tombol <strong>📥 Download PDF</strong> untuk mencetak laporan</li>
                <li>PDF berisi: identitas siswa, nilai akhir, rincian poin per soal, dan kolom tanda tangan guru</li>
                <li>Nama guru di kolom TTD diambil dari pengaturan <strong>Nama Guru</strong></li>
                <li>Atur nama guru di tab <strong>Pengaturan</strong> sebelum ujian dimulai</li>
              </ul>
            </div>

            {/* Penilaian parsial */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <p className="font-semibold text-purple-800 mb-2">🧮 Sistem Penilaian Parsial</p>
              <div className="text-xs text-purple-700 space-y-2 leading-relaxed">
                <div className="bg-purple-100 rounded-lg p-2">
                  <p className="font-bold">PG (Pilihan Ganda):</p>
                  <p>Benar semua = poin penuh | Salah = 0 poin</p>
                </div>
                <div className="bg-purple-100 rounded-lg p-2">
                  <p className="font-bold">PGK (Pilihan Ganda Kompleks):</p>
                  <p>Tiap opsi dihitung. Opsi benar yang dipilih ✅ dan opsi salah yang tidak dipilih ✅ = poin.</p>
                  <p className="font-mono mt-1">Skor = (opsi tepat / total opsi) × point soal</p>
                </div>
                <div className="bg-purple-100 rounded-lg p-2">
                  <p className="font-bold">B/S Kompleks (Benar/Salah):</p>
                  <p>Tiap pernyataan dihitung secara terpisah.</p>
                  <p className="font-mono mt-1">Skor = (pernyataan benar / total pernyataan) × point soal</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// HALAMAN SISWA
// ============================================================
function HalamanSiswa({ onMulaiUjian, onGuruMode }) {
  const [nama, setNama] = useState("");
  const [nisn, setNisn] = useState("");
  const [noAbsen, setNoAbsen] = useState("");
  const [mapel, setMapel] = useState(MAPEL_LIST[0]);
  const [asesmen, setAsesmen] = useState(ASESMEN_LIST[0]);
  const [token, setToken] = useState("");
  const [err, setErr] = useState("");

  const handle = () => {
    setErr("");
    if (!nama.trim()) return setErr("Nama harus diisi!");
    if (!nisn.trim()) return setErr("NISN harus diisi!");
    if (!noAbsen.trim()) return setErr("No Absen harus diisi!");
    if (!token.trim()) return setErr("Token harus diisi!");
    onMulaiUjian({ nama, nisn, noAbsen, mapel, asesmen, token });
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white text-center">
          <div className="text-5xl mb-2">📝</div>
          <h2 className="text-xl font-extrabold">Asesmen Sumatif</h2>
          <p className="text-blue-200 text-sm mt-1">Isi data diri dengan benar</p>
        </div>
        <div className="p-6 space-y-4">
          {[
            { label:"Nama Lengkap", value:nama, set:setNama, placeholder:"Nama kamu...", type:"text", icon:"👤" },
            { label:"NISN", value:nisn, set:setNisn, placeholder:"Nomor Induk Siswa...", type:"text", icon:"🎫" },
            { label:"No Absen", value:noAbsen, set:setNoAbsen, placeholder:"Nomor absen...", type:"number", icon:"🔢" },
          ].map(f => (
            <div key={f.label}>
              <label className="text-xs font-bold text-slate-600 block mb-1">{f.icon} {f.label}</label>
              <input type={f.type} value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500" />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">📚 Mata Pelajaran</label>
              <select value={mapel} onChange={e => setMapel(e.target.value)} className="w-full border-2 border-slate-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-blue-500">
                {MAPEL_LIST.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">📋 Asesmen</label>
              <select value={asesmen} onChange={e => setAsesmen(e.target.value)} className="w-full border-2 border-slate-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-blue-500">
                {ASESMEN_LIST.map(a => <option key={a}>{a}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">🔑 Token Ujian</label>
            <input value={token} onChange={e => setToken(e.target.value.toUpperCase())} placeholder="Tanya gurumu..."
              className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 uppercase tracking-widest font-mono font-bold text-blue-700" />
          </div>
          {err && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm font-medium text-center">{err}</div>}
          <button onClick={handle} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold py-4 rounded-2xl text-base transition-all shadow-lg active:scale-95">
            🚀 Mulai Ujian
          </button>
          <button onClick={onGuruMode} className="w-full text-slate-400 hover:text-slate-600 text-xs py-2 transition-colors">
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
// HALAMAN UJIAN
// ============================================================
function HalamanUjian({ siswa, scriptUrl, addToast, onSelesai, durasiMenit, namaGuru, nipGuru, kotaTTD, namaSekolah }) {
  const [soalList, setSoalList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [jawaban, setJawaban] = useState({});
  const [tabViolation, setTabViolation] = useState(0);
  const [diskualifikasi, setDiskualifikasi] = useState(false);
  const durasiDetik = (Number(durasiMenit) || 60) * 60;
  const [waktu, setWaktu] = useState(durasiDetik);
  const [submitted, setSubmitted] = useState(false);
  const [hasilAkhir, setHasilAkhir] = useState(null);
  const timerRef = useRef(null);
  const MAX_VIOLATION = 3;

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

  useEffect(() => {
    if (submitted || diskualifikasi) return;
    timerRef.current = setInterval(() => {
      setWaktu(t => {
        if (t <= 1) { clearInterval(timerRef.current); handleSubmit(true); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [submitted, diskualifikasi]);

  useEffect(() => {
    const onVisChange = () => {
      if (document.hidden && !submitted && !diskualifikasi) {
        setTabViolation(v => {
          const next = v + 1;
          if (next >= MAX_VIOLATION) {
            setDiskualifikasi(true);
            clearInterval(timerRef.current);
            addToast("Kamu telah diskualifikasi!", "error");
          } else {
            addToast(`⚠️ Peringatan ${next}/${MAX_VIOLATION}: Jangan pindah tab!`, "warning");
          }
          return next;
        });
      }
    };
    document.addEventListener("visibilitychange", onVisChange);
    return () => document.removeEventListener("visibilitychange", onVisChange);
  }, [submitted, diskualifikasi]);

  const formatWaktu = s => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  const hitungNilai = () => {
    let totalPoint = 0, didapatPoint = 0;
    const detail = [];
    soalList.forEach((s, idx) => {
      const pt = Number(s.point) || 0;
      totalPoint += pt;
      const benar = JSON.parse(s.jawabanBenar || "[]");
      const jwb = jawaban[s.id];
      if (!jwb) { detail.push({ no:idx+1, jenis:s.jenisSoal, dapat:0, max:pt, ket:"Tidak dijawab" }); return; }
      if (s.jenisSoal === "Pilihan Ganda") {
        const dapat = jwb[0]===benar[0] ? pt : 0;
        didapatPoint += dapat;
        detail.push({ no:idx+1, jenis:"PG", dapat, max:pt, ket:dapat>0?"Benar":"Salah" });
      } else if (s.jenisSoal === "Pilihan Ganda Kompleks") {
        const opsiAll = JSON.parse(s.opsi || "[]");
        const jml = opsiAll.length;
        if (!jml) return;
        let skor = 0;
        opsiAll.forEach(o => { if (benar.includes(o) === jwb.includes(o)) skor++; });
        const dapat = Math.round((pt * skor / jml) * 100) / 100;
        didapatPoint += dapat;
        detail.push({ no:idx+1, jenis:"PGK", dapat, max:pt, ket:`${skor}/${jml} opsi tepat` });
      } else {
        const jml = benar.length;
        if (!jml) return;
        let skor = 0;
        benar.forEach((jb, i) => { if (jwb[i]===jb) skor++; });
        const dapat = Math.round((pt * skor / jml) * 100) / 100;
        didapatPoint += dapat;
        detail.push({ no:idx+1, jenis:"B/S", dapat, max:pt, ket:`${skor}/${jml} benar` });
      }
    });
    didapatPoint = Math.round(didapatPoint * 100) / 100;
    const nilai = totalPoint > 0 ? Math.round((didapatPoint / totalPoint) * 100) : 0;
    return { totalPoint, didapatPoint, nilai, detail };
  };

  const handleSubmit = async (autoSubmit = false) => {
    if (submitted) return;
    clearInterval(timerRef.current);
    const { nilai, didapatPoint, totalPoint, detail } = hitungNilai();
    setHasilAkhir({ nilai, didapatPoint, totalPoint, detail });
    setSubmitted(true);
    try {
      const url = scriptUrl || APPS_SCRIPT_URL;
      await fetch(url, { method:"POST", body:JSON.stringify({
        action:"simpanHasil", nama:siswa.nama, nisn:siswa.nisn, noAbsen:siswa.noAbsen,
        mapel:siswa.mapel, asesmen:siswa.asesmen, nilai, token:siswa.token,
        waktu:new Date().toLocaleString("id-ID"),
      })});
    } catch { /* demo */ }
    if (!autoSubmit) addToast("Ujian berhasil dikumpulkan! 🎉", "success");
  };

  const soal = soalList[currentIdx];
  const opsiList = soal ? JSON.parse(soal.opsi || "[]") : [];
  const pctDone = soalList.length > 0 ? Math.round(((currentIdx+1)/soalList.length)*100) : 0;

  const [pdfLoading, setPdfLoading] = useState(false);

  const handleUnduhPDF = async () => {
    setPdfLoading(true);
    try {
      await unduhPDF({ siswa, hasilAkhir, soalList, jawabanSiswa: jawaban, namaGuru, nipGuru, kotaTTD, namaSekolah });
    } catch (e) {
      addToast("Gagal membuat PDF. Coba lagi.", "error");
    } finally { setPdfLoading(false); }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      <p className="text-slate-600 font-medium">Memuat soal...</p>
    </div>
  );

  if (diskualifikasi) return (
    <div className="max-w-sm mx-auto px-4 py-10 text-center">
      <div className="text-6xl mb-4">🚫</div>
      <h2 className="text-2xl font-extrabold text-red-600 mb-2">Diskualifikasi</h2>
      <p className="text-slate-600 mb-6">Kamu berpindah tab sebanyak {tabViolation} kali.</p>
      <button onClick={onSelesai} className="bg-red-500 hover:bg-red-600 text-white font-bold px-6 py-3 rounded-xl">Kembali ke Beranda</button>
    </div>
  );

  if (submitted && hasilAkhir) return (
    <div className="max-w-md mx-auto px-4 py-8">
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
        <div className={`p-8 text-center ${hasilAkhir.nilai>=75?"bg-gradient-to-br from-green-500 to-emerald-600":hasilAkhir.nilai>=50?"bg-gradient-to-br from-amber-400 to-orange-500":"bg-gradient-to-br from-red-500 to-rose-600"}`}>
          <div className="text-6xl mb-3">{hasilAkhir.nilai>=75?"🎉":hasilAkhir.nilai>=50?"👍":"📚"}</div>
          <p className="text-white/80 text-sm font-medium">Nilai Kamu</p>
          <p className="text-7xl font-extrabold text-white">{hasilAkhir.nilai}</p>
        </div>
        <div className="p-6 space-y-4">
          <p className="font-bold text-slate-800 text-lg text-center">{siswa.nama}</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { label:"Mapel", val:siswa.mapel },
              { label:"Asesmen", val:siswa.asesmen },
              { label:"Point", val:`${hasilAkhir.didapatPoint} / ${hasilAkhir.totalPoint}` },
              { label:"Jumlah Soal", val:`${soalList.length} soal` },
            ].map(s => (
              <div key={s.label} className="bg-slate-50 rounded-xl p-3">
                <p className="text-slate-500 text-xs">{s.label}</p>
                <p className="font-bold text-slate-700 text-sm">{s.val}</p>
              </div>
            ))}
          </div>
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-xs font-bold text-slate-600 mb-2">📊 Rincian Poin Per Soal</p>
            <div className="space-y-1">
              {hasilAkhir.detail.map(d => (
                <div key={d.no} className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Soal {d.no} <span className="text-slate-400">({d.jenis})</span></span>
                  <span className="font-medium text-slate-700">{d.ket} → {d.dapat}/{d.max} poin</span>
                </div>
              ))}
            </div>
          </div>
          <div className={`rounded-xl p-3 text-sm font-medium text-center ${hasilAkhir.nilai>=75?"bg-green-50 text-green-700":hasilAkhir.nilai>=50?"bg-amber-50 text-amber-700":"bg-red-50 text-red-600"}`}>
            {hasilAkhir.nilai>=75?"🌟 Luar biasa! Kamu berhasil!":hasilAkhir.nilai>=50?"👍 Cukup baik! Terus belajar ya!":"📖 Jangan menyerah, belajar lebih giat!"}
          </div>

          {/* ── TOMBOL DOWNLOAD PDF ── */}
          <button
            onClick={handleUnduhPDF}
            disabled={pdfLoading}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-sm disabled:opacity-60">
            {pdfLoading ? (
              <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block"></span> Membuat PDF...</>
            ) : (
              <>📥 Download PDF Hasil</>
            )}
          </button>

          <button onClick={onSelesai} className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-3 rounded-xl transition-colors">
            ← Kembali ke Beranda
          </button>
        </div>
      </div>
    </div>
  );

  if (!soal) return <div className="text-center py-10 text-slate-500">Soal tidak tersedia</div>;

  return (
    <div className="max-w-2xl mx-auto px-3 py-4">
      <div className="flex items-center justify-between mb-3 bg-white rounded-2xl shadow px-4 py-3">
        <div>
          <p className="text-xs text-slate-500 font-medium">{siswa.mapel} • {siswa.asesmen}</p>
          <p className="text-sm font-bold text-slate-800">{siswa.nama}</p>
        </div>
        <div className="flex items-center gap-2">
          {tabViolation > 0 && <span className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded-lg font-bold">⚠️ {tabViolation}/{MAX_VIOLATION}</span>}
          <div className={`font-mono font-extrabold text-lg px-3 py-1 rounded-xl ${waktu<300?"bg-red-100 text-red-600 animate-pulse":waktu<durasiDetik/2?"bg-amber-100 text-amber-700":"bg-blue-100 text-blue-700"}`}>
            ⏱ {formatWaktu(waktu)}
          </div>
        </div>
      </div>

      <div className="mb-4 bg-white rounded-2xl shadow px-4 py-3">
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>Soal {currentIdx+1} dari {soalList.length}</span>
          <span>{pctDone}%</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2.5 mb-3">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2.5 rounded-full transition-all duration-500" style={{ width:`${pctDone}%` }} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {soalList.map((s, i) => (
            <button key={i} onClick={() => setCurrentIdx(i)}
              className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${i===currentIdx?"bg-blue-600 text-white":jawaban[s.id]?"bg-green-100 text-green-700 border border-green-300":"bg-slate-100 text-slate-500"}`}>
              {i+1}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-5 mb-4">
        <div className="flex items-start gap-3 mb-4">
          <span className="bg-blue-600 text-white text-xs font-bold px-2.5 py-1 rounded-lg flex-shrink-0">{currentIdx+1}</span>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${soal.jenisSoal==="Pilihan Ganda"?"bg-blue-100 text-blue-700":soal.jenisSoal==="Pilihan Ganda Kompleks"?"bg-purple-100 text-purple-700":"bg-orange-100 text-orange-700"}`}>
                {soal.jenisSoal}
              </span>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">⭐ {soal.point} poin</span>
            </div>
            <p className="text-slate-800 font-medium leading-relaxed">
              <MathText text={soal.soal} />
            </p>
          </div>
        </div>
        {soal.gambar && soal.gambar.trim() && (
          <div className="mb-4"><GambarSoal url={soal.gambar} alt="Gambar soal" /></div>
        )}

        {soal.jenisSoal === "Pilihan Ganda" && (
          <div className="space-y-2">
            {opsiList.map((o, i) => {
              const sel = jawaban[soal.id]?.[0] === o;
              return (
                <button key={i} onClick={() => setJawaban(p => ({ ...p, [soal.id]:[o] }))}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${sel?"border-blue-500 bg-blue-50 text-blue-800":"border-slate-200 hover:border-blue-300 hover:bg-blue-50/50"}`}>
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-extrabold flex-shrink-0 ${sel?"bg-blue-600 text-white":"bg-slate-100 text-slate-600"}`}>{String.fromCharCode(65+i)}</span>
                  <span className="text-sm font-medium flex-1"><MathText text={o} /></span>
                </button>
              );
            })}
          </div>
        )}

        {soal.jenisSoal === "Pilihan Ganda Kompleks" && (
          <div className="space-y-2">
            <p className="text-xs text-purple-600 font-semibold mb-2 bg-purple-50 px-3 py-1.5 rounded-lg">✅ Pilih SEMUA jawaban yang benar — skor parsial per opsi</p>
            {opsiList.map((o, i) => {
              const sel = (jawaban[soal.id] || []).includes(o);
              return (
                <button key={i} onClick={() => setJawaban(p => {
                  const prev = p[soal.id] || [];
                  return { ...p, [soal.id]:prev.includes(o)?prev.filter(x=>x!==o):[...prev,o] };
                })}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${sel?"border-purple-500 bg-purple-50 text-purple-800":"border-slate-200 hover:border-purple-300"}`}>
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${sel?"bg-purple-600 text-white":"bg-slate-100 text-slate-500"}`}>{sel?"✓":String.fromCharCode(65+i)}</span>
                  <span className="text-sm font-medium flex-1"><MathText text={o} /></span>
                </button>
              );
            })}
          </div>
        )}

        {soal.jenisSoal === "Benar/Salah Kompleks" && (
          <div className="space-y-3">
            <p className="text-xs text-orange-600 font-semibold mb-2 bg-orange-50 px-3 py-1.5 rounded-lg">Tentukan Benar atau Salah — skor parsial per pernyataan</p>
            {opsiList.map((o, i) => {
              const val = (jawaban[soal.id] || [])[i];
              return (
                <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-500 font-bold w-5 flex-shrink-0">{i+1}.</span>
                  <p className="flex-1 text-sm text-slate-700"><MathText text={o} /></p>
                  <div className="flex gap-2 flex-shrink-0">
                    {["Benar","Salah"].map(v => (
                      <button key={v} onClick={() => setJawaban(p => {
                        const arr = [...(p[soal.id] || opsiList.map(()=>""))]; arr[i] = v;
                        return { ...p, [soal.id]:arr };
                      })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${val===v?(v==="Benar"?"bg-green-500 text-white":"bg-red-500 text-white"):"bg-slate-200 text-slate-600"}`}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button onClick={() => setCurrentIdx(i => Math.max(0, i-1))} disabled={currentIdx===0}
          className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-3 rounded-xl transition-colors disabled:opacity-30">
          ← Sebelumnya
        </button>
        {currentIdx < soalList.length-1 ? (
          <button onClick={() => setCurrentIdx(i => i+1)}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors">
            Berikutnya →
          </button>
        ) : (
          <button onClick={() => handleSubmit(false)}
            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-3 rounded-xl transition-all shadow-md">
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

  // Settings: baca dari localStorage sebagai nilai awal (cache)
  const [settings, setSettings] = useState(() => {
    try { return JSON.parse(localStorage.getItem("appSettings") || "{}"); } catch { return {}; }
  });
  const [scriptUrl, setScriptUrl] = useState(() => {
    try { return localStorage.getItem("scriptUrl") || ""; } catch { return ""; }
  });

  // ── Fetch settings dari Spreadsheet saat pertama buka ──
  // Prioritas URL: localStorage (jika sudah diisi guru) → APPS_SCRIPT_URL (hardcode)
  // Di perangkat baru yang belum pernah buka app ini, APPS_SCRIPT_URL langsung dipakai
  useEffect(() => {
    const url = (() => {
      try { return localStorage.getItem("scriptUrl") || ""; } catch { return ""; }
    })() || APPS_SCRIPT_URL;

    // Skip jika masih placeholder belum diganti
    if (!url || url.includes("YOUR_APPS_SCRIPT_ID")) return;

    fetch(`${url}?action=getPengaturan`)
      .then(r => r.json())
      .then(data => {
        if (data.status === "success" && data.data && Object.keys(data.data).length > 0) {
          const remote = data.data;
          const merged = {
            logoUrl       : remote.logoUrl         || "",
            namaSekolah   : remote.namaSekolah     || "",
            namaGuru      : remote.namaGuru        || "",
            nipGuru       : remote.nipGuru         || "",
            kotaTTD       : remote.kotaTTD         || "",
            durasiMenit   : remote.durasiMenit ? Number(remote.durasiMenit) : 60,
            spreadsheetUrl: remote.spreadsheetUrl  || "",
          };
          setSettings(merged);
          // Simpan ke localStorage sebagai cache
          try { localStorage.setItem("appSettings", JSON.stringify(merged)); } catch {}
          // Simpan juga scriptUrl ke localStorage agar offline tetap tersedia
          try { localStorage.setItem("scriptUrl", url); } catch {}
          setScriptUrl(url);
        }
      })
      .catch(() => {
        // Offline atau error jaringan → tetap pakai cache localStorage, tidak masalah
      });
  }, []); // sekali saat mount

  const saveSettings = s => {
    setSettings(s);
    try { localStorage.setItem("appSettings", JSON.stringify(s)); } catch {}
  };
  const saveScriptUrl = u => {
    setScriptUrl(u);
    try { localStorage.setItem("scriptUrl", u); } catch {}
  };

  // Fullscreen saat ujian dimulai
  const handleMulaiUjian = async (data) => {
    setSiswa(data);
    setMode("ujian");
    try {
      const el = document.documentElement;
      if (el.requestFullscreen) await el.requestFullscreen();
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
      else if (el.mozRequestFullScreen) await el.mozRequestFullScreen();
    } catch { /* fullscreen ditolak browser → lanjutkan ujian biasa */ }
  };

  // Keluar fullscreen saat ujian selesai
  const handleSelesaiUjian = async () => {
    setSiswa(null);
    setMode("siswa");
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if (document.webkitExitFullscreen) await document.webkitExitFullscreen();
      }
    } catch {}
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Toast toasts={toasts} />
      {mode !== "guru" && mode !== "guruLogin" && (
        <AppHeader logoUrl={settings.logoUrl} namaSekolah={settings.namaSekolah} />
      )}
      <main className="pb-10">
        {mode === "siswa" && (
          <HalamanSiswa
            onMulaiUjian={handleMulaiUjian}
            onGuruMode={() => setMode("guruLogin")}
          />
        )}
        {mode === "ujian" && siswa && (
          <HalamanUjian
            siswa={siswa}
            scriptUrl={scriptUrl}
            addToast={addToast}
            onSelesai={handleSelesaiUjian}
            durasiMenit={settings.durasiMenit || 60}
            namaGuru={settings.namaGuru || ""}
            nipGuru={settings.nipGuru || ""}
            kotaTTD={settings.kotaTTD || ""}
            namaSekolah={settings.namaSekolah || ""}
          />
        )}
        {mode === "guruLogin" && <GuruLogin onLogin={() => setMode("guru")} />}
        {mode === "guru" && (
          <GuruPanel
            addToast={addToast}
            onLogout={() => setMode("siswa")}
            settings={settings}
            onSaveSettings={saveSettings}
            scriptUrl={scriptUrl}
            onSaveScriptUrl={saveScriptUrl}
          />
        )}
      </main>
    </div>
  );
}