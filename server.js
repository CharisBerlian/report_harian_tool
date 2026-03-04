const express = require('express');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Setup multer for memory storage (Vercel compatible)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(express.static('public'));
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_PROMPT = `Role: Anda adalah Asisten Akademik yang ahli dalam menyusun *Daily Report* (Laporan Harian) yang efisien dan profesional.
Tugas: Berdasarkan materi pelajaran yang saya unggah, buatkan laporan harian dengan mengikuti format dan batasan kalimat di bawah ini.
1. Format Header:
Tuliskan bagian ini dengan placeholder \`[ISI SENDIRI]\`:
Sekolah & Level : [ISI SENDIRI]
Kelas : [ISI SENDIRI]
Tanggal : [ISI SENDIRI]
Program : [ISI SENDIRI]
Materi : [ISI SENDIRI]
2. Panduan 🎯 Goals Materi:
Tuliskan 2-3 poin tujuan pembelajaran (1 kalimat per poin):
* Fokus pada pengenalan software, fungsi teknis spesifik, atau pemahaman konsep utama.

3. Panduan 📝 Activity Report (Maksimal 1 Kalimat Padat Per Poin):
Tuliskan 4-5 poin aktivitas konkret dengan aturan setiap poin wajib berupa 1 kalimat singkat:
* Deskripsikan penggunaan tool untuk membuat proyek.
* Sebutkan penambahan jumlah sprite, backdrop, atau efek visual secara langsung.
* Jelaskan logika coding atau teknik animasi yang dipelajari.
* Deskripsikan proses modifikasi atau presentasi hasil karya murid.
* Berikan satu kalimat ringkas tentang pencapaian kreativitas dan pemahaman murid.

4. Gaya Penulisan:
* Gunakan bahasa Indonesia yang lugas.
* Hindari kalimat yang bertele-tele; langsung pada aksi yang dilakukan murid.`;

app.post('/generate-report', upload.single('material'), async (req, res) => {
    try {
        const file = req.file;
        const textInput = req.body.textInput;

        let promptContent = [{ text: SYSTEM_PROMPT }];

        if (!file && (!textInput || textInput.trim() === '')) {
            return res.status(400).json({ error: 'Please provide either a lesson file or text material.' });
        }

        if (file) {
            // Send file buffer directly to Gemini via inlineData (no disk save needed)
            const inlineDataPart = {
                inlineData: {
                    data: file.buffer.toString("base64"),
                    mimeType: file.mimetype
                }
            };
            promptContent.push(inlineDataPart);
        }

        if (textInput && textInput.trim() !== '') {
            promptContent.push({ text: `\nTambahan Konteks Materi:\n${textInput}` });
        } else {
            promptContent.push({ text: `\nSilakan buatkan laporan berdasarkan materi pelajaran tersebut.` });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
        const result = await model.generateContent(promptContent);

        const response = result.response;
        const markdown = response.text();

        res.json({ report: markdown });

    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({ error: error.message || 'Failed to generate report.' });
    }
});

module.exports = app;

if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`Server is running on http://localhost:${port}`);
    });
}
