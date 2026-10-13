# Ayat-ayat Cinta 🕌

Web animasi interaktif bertema **Islami–Arab romantis (Kairo & Al-Azhar)**, terinspirasi novel *Ayat-ayat Cinta* karya Habiburrahman El Shirazy.
Berisi **14 babak** mini-game, SVG Arab buatan sendiri, GIF transparan, musik latar dengan fallback, dan dirancang **mobile-first**.

> 100% HTML + CSS + JS vanilla — **tanpa build step, tanpa framework**.

---

## ✨ Fitur

- **14 babak interaktif** — ketuk, geser, gosok, tahan tombol, susun cincin.
- **Visual**: langit malam Kairo, glassmorphism pearl–gold, konfeti kanvas, hujan partikel ambient, kaligrafi Arab animatif.
- **Audio**: musik latar (URL Archive.org → file lokal → synth Web Audio) + SFX chime/bell/shimmer/akad — semua bisa dimatikan dari pill musik.
- **Progres tersimpan** (`localStorage`) — bisa dilanjut, bisa di-reset dari finale.
- **Aksesibilitas**: touch target ≥48px, `prefers-reduced-motion`, safe-area, `aria-label` per babak.

---

## 🎬 14 Babak

| # | Judul | Interaksi pemain |
| :-- | :--- | :--- |
| 1 | Bismillah & Gerbang Masjid 🕌 | Ketuk gerbang 3× untuk membuka kisah |
| 2 | Mahasiswa di Al-Azhar 📚 | Ketuk 5 bintang ilmu yang melayang |
| 3 | Pertemuan di Kereta Kairo 🚃 | Geser rel hingga jendela bertemu jendela → ledakan bunga naik |
| 4 | Surat & Rahasia Noura 💌 | Ketuk segel lilin → kaligrafi Arab animatif + bulu pena melayang |
| 5 | Diary Maria 📖 | Gosok halaman untuk mengungkap kalimat rahasia |
| 6 | Menjaga Hati Nurul 💎 | Pilih permata kejujuran, kartu jawaban tampil |
| 7 | Perisai Noura 🛡️ | Tahan perisai 3 detik menahan hujan nada |
| 8 | Cincin Emas 💍 | Satukan dua bagian cincin → hati Arab berdenyut di lubang cincin |
| 9 | Akad Nikah 🕊️ | Tahan “Qabiltu” 2 detik → lonceng + konfeti |
| 10 | Ujian & Fitnah ⛓️ | Ketuk 6 titik cahaya di balik bilah penjara |
| 11 | Doa untuk Maria 🤲 | Tahan tombol doa 4 detik |
| 12 | Cahaya Syahadat Maria ✨ | Nyalakan 4 lentera hingga ruangan terang |
| 13 | Surat Romantis untukmu 🌙 | Ketuk amplop → Bismillah & salam lengkap di atas, lalu surat diketik pelan (~21 detik) |
| 14 | Ayat Cinta Abadi 🎆 | Bulan bersinar + konfeti + bunga naik + hati melayang + kartu penutup & doa |

---

## 🚀 Cara Menjalankan

```bash
# opsi 1: Python
python3 -m http.server 8000
# opsi 2: Node
npx serve .
```

Buka `http://localhost:8000` di browser (Chrome/Safari/HP).
Tanpa server pun bisa — cukup buka `index.html` langsung.

---

## 📁 Struktur

```
ayat-ayat-Cinta/
├── README.md
├── PLAN.md                     # Dokumen rencana awal proyek
├── index.html                  # 14 <section class="scene"> + SVG inline Arab
├── style.css                   # Palet, glassmorphism, keyframes, responsif
├── script.js                   # Scene engine + mini-game + audio fallback
└── assets/
    ├── dubai_dream_arabic.mp3  # Musik cadangan lokal (~3.9 MB)
    ├── gif-bismillah-glow.gif  # Babak 1
    ├── gif-kaligrafi-2-trans.gif # Babak 5 (latar hitam → transparan, 194 KB)
    ├── gif-cinta-hati.gif      # Babak 8 (di lubang cincin, 1.8 MB)
    ├── gif-lentera-2.gif       # Babak 9
    ├── gif-doa.gif             # Babak 11
    └── gif-masjid.gif          # Babak 14
```

---

## 🎨 Tema & Palet

| Nama | Hex | Peran |
| :--- | :--- | :--- |
| Malam Kairo | `#0a1128` | Latar langit malam |
| Gold Kaligrafi | `#d4af37` / `#f0c75e` | Judul, ornamen, sabit |
| Pearl Naskah | `#f6efdd` / `#fff8ea` | Kartu & teks |
| Rose Cinta | `#e0526a` | Aksen hati |

Font: *Aref Ruqaa* (judul), *Amiri* (Arab), *Caveat* (tangan), *Plus Jakarta Sans* (UI) — dimuat dari Google Fonts.

---

## 🔊 Audio

Fallback berurutan saat diputar pertama kali:

1. `https://archive.org/download/arabic-instrumental-song/Dubai%20Dream%20Arabic.mp3` (CORS OK)
2. `assets/dubai_dream_arabic.mp3`
3. Synth Web Audio bertema maqam (ringan, offline-friendly)

SFX (`sfxChime`, `sfxBell`, `sfxShimmer`, `sfxGate`, dll.) semuanya di-generate Web Audio — tanpa file suara.

---

## 🧰 Catatan Teknis

- **Kunci localStorage**: `ayat-ayat-cinta-scene` (babak aktif), `ayat-ayat-cinta-muted` (musik).
- **Engine**: `onSceneEnter(n)` memicu efek per babak; `initScene1…14` mengikat interaksi.
- **Animasi**: semuanya `transform`/`opacity` (GPU), plus kanvas untuk konfeti & partikel.
- **Verifikasi rutin**:
  ```bash
  node --check script.js                 # sintaks JS
  # cek keseimbangan tag HTML & kurung CSS (Python html.parser)
  ```
- **GIF transparan**: `gif-kaligrafi-2-trans.gif` dibuat dari GIF asli (latar hitam → alpha) memakai Pillow (`unpremultiply` + threshold) supaya menyatu dengan kartu krem.

---

## 📝 Riwayat Revisi Terakhir

- **Babak 3 & 4** — GIF diganti teks Arab animatif (`meet-text-3`, `kalli-text-4`) + ledakan bunga/lampion (`bloomBurst`).
- **Babak 5** — “Diari” → “Diary”; GIF dibuat transparan, `mix-blend-mode: screen` dihapus.
- **Babak 8** — SVG cincin diperbaiki (2 setengah lingkaran presisi, berlian–rubah), GIF pas di lubang cincin.
- **Babak 13** — Amplop dibuka lewat ketukan; **Bismillah & salam lengkap jadi header tetap** di isi surat; kecepatan mengetik diperlambat (1 huruf/42 ms + jeda paragraf & akhir kalimat ≈ 21 detik) dan bisa di-skip dengan sekali ketuk.
- **Babak 14 (Finale)** — diredesain: bulan + halo berdenyut + bintang twinkling, judul gradasi emas berkilau, kartu masuk bertahap (kutipan → garis emas → tanda tangan → doa Arab → kredit), konfeti + bunga naik + hati melayang + chime; **bar statistik “14 babak / ∞ doa / 1 hati” dihapus**.
