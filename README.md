# ⚡ QuickDrop Tools — Cross-Device Cloud Clipboard

Aplikasi web pribadi & lightweight tool untuk transfer file, copy-paste teks, dan gambar instan lintas perangkat (Laptop Mac ↔ HP iOS / Android) **meskipun berada di jaringan yang berbeda (beda Wi-Fi / paket data seluler)**.

Dibuat khusus untuk mengatasi keterbatasan AirDrop yang sering diblokir kebijakan kantor (MDM) serta mempermudah perpindahan data tanpa harus login WhatsApp Web berulang kali.

🌐 **Live Web Demo:** [https://quick-drop-gahasa.netlify.app](https://quick-drop-gahasa.netlify.app)

---

## ✨ Fitur Utama

- ⚡ **Realtime WebSockets (0.1s Sync):** Menggunakan Supabase Realtime Pub/Sub. Begitu kamu klik kirim di HP, pesan langsung muncul di Mac seketika tanpa perlu refresh browser.
- 📋 **1-Click Copy Teks:** Tombol cepat untuk langsung menyalin teks yang dikirim ke clipboard sistem operasi.
- 📸 **Direct Copy Image to Clipboard:** Bukan hanya tombol download biasa, terdapat tombol khusus **Copy Image** yang langsung memasukkan gambar ke clipboard macOS (Canvas PNG + `ClipboardItem`), sehingga kamu bisa langsung tekan `Cmd + V` di aplikasi lain (Word, Figma, email, Slack) tanpa perlu mencari file download.
- 📁 **Multi-File & Multi-Image Upload:** Bisa memilih dan mengunggah banyak file/foto sekaligus secara berurutan dengan indikator progres dan grid thumbnail preview.
- 💾 **Realtime Storage Meter & Safe Limits:** Menampilkan kapasitas penyimpanan aktif (1 GB limit Supabase Free Tier) dengan progress bar dan peringatan otomatis jika kapasitas mencapai 80% (warning) atau 95% (kritis).
- ↩️ **Undo / Batal Hapus (5 Detik):** Dilengkapi timer penundaan penghapusan 5 detik dengan tombol **Batal ↩️** pada toast notifikasi, mencegah data terhapus permanen jika tombol hapus atau *Bersihkan Semua* tidak sengaja terpencet.
- 🔒 **P2P One-Time Tunnel (Anti-DLP):** Skrip macOS Spotlight runner (`Quick Share.app`) menggunakan Cloudflare Tunnel terenkripsi HTTP/2 untuk mentransfer file PDF langsung dari Mac ke HP tanpa proses form upload yang terdeteksi sensor DLP.

---

## 🛠️ Tech Stack & Arsitektur

- **Frontend:** Vanilla JavaScript (ES6+), HTML5, Modern CSS (Glassmorphism, Dark UI, Mobile-responsive)
- **Database & Realtime:** [Supabase](https://supabase.com) (PostgreSQL Database + Realtime WebSockets)
- **File Storage:** Supabase Storage (Bucket: `drop-files`)
- **Hosting & Serverless:** [Netlify](https://netlify.com)

---

## 🚀 Panduan Setup & Instalasi Sendiri

### 1. Setup Supabase
1. Buat project baru di [Supabase Dashboard](https://supabase.com/dashboard).
2. Buka menu **SQL Editor**, lalu jalankan query yang ada di file [`supabase_schema.sql`](supabase_schema.sql):
   - Membuat tabel `public.drops`.
   - Mengaktifkan Row Level Security (RLS) dan publication realtime.
   - Membuat storage bucket `drop-files` dengan izin public read/write.
3. Buka **Project Settings** > **API**, lalu catat:
   - `Project URL`
   - `anon / public key`

### 2. Konfigurasi Client
Buka file `config.js` dan sesuaikan kredensial Supabase kamu:
```javascript
window.DEFAULT_CONFIG = {
    supabaseUrl: "https://your-project.supabase.co",
    supabaseAnonKey: "your-anon-key"
};
```

### 3. Deploy ke Netlify
Kamu bisa deploy via Netlify CLI atau import repositori ini langsung di dashboard Netlify:
```bash
# Menggunakan Netlify CLI
npm install
npx netlify-cli deploy --prod --dir=.
```

---

## 📱 Cara Penggunaan

1. Buka URL web app di browser laptop dan smartphone kamu.
2. **Kirim Teks:** Ketik atau paste teks di kolom input, tekan `Cmd + Enter` atau klik **🚀 Kirim Drop**. Di perangkat lain, klik tombol **📋 Copy Teks**.
3. **Kirim Gambar / File:** Drag & drop file atau pilih dari galeri. Di laptop, klik **📸 Copy Image** untuk langsung `Cmd + V` di aplikasi tujuan.
4. **Hapus Riwayat:** Klik ikon tempat sampah `🗑️` untuk menghapus per-item, atau klik **Bersihkan Semua**. Jika tidak sengaja terpencet, segera tekan tombol **Batal ↩️** di pojok kanan bawah dalam 5 detik.

---

## 📄 Lisensi
[MIT License](LICENSE)
