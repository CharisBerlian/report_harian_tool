# Daily Report Generator 📝

Sebuah aplikasi berbasis web (lokal) yang menggunakan **Google Gemini 2.5 Flash Lite** untuk menyusun dan membuat *Daily Report* (Laporan Harian) secara otomatis berdasarkan materi pelajaran yang diunggah.

Aplikasi ini ditujukan bagi Asisten Akademik maupun Guru untuk membantu pembuatan laporan kegiatan belajar mengajar dengan cepat, efisien, dan menggunakan bahasa yang lugas.

### 🌟 Fitur Utama
- **Drag & Drop:** Unggah file (.pdf, .txt, .md, .png, .jpg, dll) secara instan.
- **Tambahan Konteks:** Fitur teks khusus untuk instruksi atau materi tambahan.
- **Sistem Prompt Bawaan:** Prompt bawaan yang ketat dan efisien untuk merangkum hasil belajar dengan Goals dan Activity Reports yang padat.
- **Smart Formatting:** Menyalin laporan yang diformat dalam Markdown langsung ke Clipboard.
- **Performa Cepat:** Ditenagai oleh `gemini-2.5-flash-lite`, salah satu model tercepat dari Google.
- **UI Premium:** Dibangun dengan Vanilla JS dan CSS Glassmorphism untuk estetika masa kini.

---

## 🚀 Cara Menjalankan Aplikasi

Aplikasi ini berjalan secara lokal menggunakan Node.js.

### 1. Persiapan Awal (Prerequisites)
Pastikan kamu sudah menginstal:
- [Node.js](https://nodejs.org/en/) (Disarankan versi LTS)
- API Key Gemini. Jika belum punya, dapatkan gratis di [Google AI Studio](https://aistudio.google.com/).

### 2. Instalasi
Clone repository ini dan masuk ke dalam foldernya:
```bash
git clone https://github.com/your-username/report_harian_tool.git
cd report_harian_tool
```

Instal semua dependensi yang diperlukan:
```bash
npm install
```

### 3. Konfigurasi API Key
Buat sebuah file bernama `.env` di **folder utama (root)** proyek ini.
Salin format di bawah ini dan masukkan API Key kamu:
```env
# Masukkan API Key Gemini kamu di bawah ini
GEMINI_API_KEY=AIxxxx_masukkan_api_key_kamu_di_sini_xxxx
```

### 4. Menjalankan Server
Jalankan perintah ini di terminal kamu:
```bash
npm start
```
*(Atau gunakan perintah: `node server.js`)*

Server akan berjalan dan menampilkan log:
`Server is running on http://localhost:3000`

### 5. Mulai Menggunakan
Buka browser favorit kamu, lalu akses:
➡️ **[http://localhost:3000](http://localhost:3000)**

Sekarang kamu bisa mulai melakukan _drag and drop_ file materi kamu untuk membuat Daily Report!

---

## 🛠️ Stack Teknologi
- **Backend:** Node.js, Express, Multer (File Handling)
- **AI Engine:** `@google/generative-ai` & `@google/generative-ai/server`
- **Frontend:** HTML5, CSS3, Vanilla JavaScript, Marked.js (Markdown Parser)
