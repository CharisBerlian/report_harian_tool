const express = require('express');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GoogleAIFileManager } = require('@google/generative-ai/server');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const os = require('os');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const publicDir = path.join(__dirname, 'public');

const MAX_UPLOAD_SIZE_BYTES = 4 * 1024 * 1024;

// Keep uploads in memory, then write them to the runtime temp directory only when needed.
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_UPLOAD_SIZE_BYTES }
});

app.use(express.static(publicDir));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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

function getGeminiClients() {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not set.');
    }

    return {
        genAI: new GoogleGenerativeAI(apiKey),
        fileManager: new GoogleAIFileManager(apiKey)
    };
}

function createTempUploadPath(originalname = 'material') {
    const safeFileName = path.basename(originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
    return path.join(os.tmpdir(), `${Date.now()}-${safeFileName}`);
}

app.get('/', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
});

app.post('/generate-report', upload.single('material'), async (req, res) => {
    let tempFilePath = null;
    let uploadedFileResponse = null;

    try {
        const { genAI, fileManager } = getGeminiClients();
        const file = req.file;
        const textInput = req.body.textInput;

        let promptContent = [SYSTEM_PROMPT];

        if (!file && (!textInput || textInput.trim() === '')) {
            return res.status(400).json({ error: 'Please provide either a lesson file or text material.' });
        }

        if (file) {
            tempFilePath = createTempUploadPath(file.originalname);
            fs.writeFileSync(tempFilePath, file.buffer);

            // Upload the file to Gemini
            uploadedFileResponse = await fileManager.uploadFile(tempFilePath, {
                mimeType: file.mimetype || 'application/octet-stream',
                displayName: file.originalname,
            });

            promptContent.push({
                fileData: {
                    fileUri: uploadedFileResponse.file.uri,
                    mimeType: uploadedFileResponse.file.mimeType
                }
            });
        }

        if (textInput && textInput.trim() !== '') {
            promptContent.push(`\nTambahan Konteks Materi:\n${textInput}`);
        } else {
            promptContent.push(`\nSilakan buatkan laporan berdasarkan materi pelajaran tersebut.`);
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
        const result = await model.generateContent(promptContent);

        const response = result.response;
        const markdown = response.text();

        res.json({ report: markdown });

    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({ error: error.message || 'Failed to generate report.' });
    } finally {
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
        }

        if (uploadedFileResponse) {
            try {
                const { fileManager } = getGeminiClients();
                await fileManager.deleteFile(uploadedFileResponse.file.name);
            } catch (cleanupError) {
                console.error('Failed to delete remote file from Gemini File Manager:', cleanupError);
            }
        }
    }
});

app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
            error: 'File terlalu besar. Ukuran maksimum upload di Vercel Hobby adalah sekitar 4 MB per request.'
        });
    }

    return next(error);
});

if (!process.env.VERCEL) {
    app.listen(port, () => {
        console.log(`Server is running on http://localhost:${port}`);
    });
}

module.exports = app;
