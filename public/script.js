document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const filePreview = document.getElementById('file-preview');
    const fileSummary = document.getElementById('file-summary');
    const fileList = document.getElementById('file-list');
    const removeFileBtn = document.getElementById('remove-file');
    const pasteClipboardBtn = document.getElementById('paste-clipboard-btn');

    const form = document.getElementById('report-form');
    const generateBtn = document.getElementById('generate-btn');
    const btnText = generateBtn.querySelector('.btn-text');
    const loader = document.querySelector('.loader');

    const resultContainer = document.getElementById('result-container');
    const reportContent = document.getElementById('report-content');
    const copyBtn = document.getElementById('copy-btn');
    const errorMsg = document.getElementById('error-message');

    const MAX_TOTAL_UPLOAD_SIZE_BYTES = 4 * 1024 * 1024;
    const MAX_FILE_COUNT = 6;
    const clipboardMimeMap = {
        'application/pdf': '.pdf',
        'image/png': '.png',
        'image/jpeg': '.jpg',
        'image/jpg': '.jpg',
        'image/webp': '.webp',
        'image/gif': '.gif',
        'image/bmp': '.bmp'
    };

    let currentFiles = [];

    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            addFiles(Array.from(e.dataTransfer.files));
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            addFiles(Array.from(e.target.files));
            fileInput.value = '';
        }
    });

    document.addEventListener('paste', (e) => {
        const clipboardFiles = getPastedClipboardFiles(e);
        if (clipboardFiles.length === 0) {
            return;
        }

        e.preventDefault();
        hideError();
        addFiles(clipboardFiles);
    });

    pasteClipboardBtn.addEventListener('click', async () => {
        hideError();

        try {
            const clipboardFiles = await readClipboardFiles();
            addFiles(clipboardFiles);
        } catch (error) {
            showError(error.message);
        }
    });

    removeFileBtn.addEventListener('click', () => {
        currentFiles = [];
        fileInput.value = '';
        renderSelectedFiles();
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const textInput = document.getElementById('text-input').value;

        if (currentFiles.length === 0 && !textInput.trim()) {
            showError('Silakan unggah file materi atau ketik tambahan konteks.');
            return;
        }

        setLoading(true);
        hideError();
        resultContainer.classList.add('hidden');

        try {
            const formData = new FormData();
            for (const file of currentFiles) {
                formData.append('material', file);
            }

            if (textInput.trim()) {
                formData.append('textInput', textInput);
            }

            const response = await fetch('/generate-report', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Terjadi kesalahan saat memproses laporan.');
            }

            reportContent.innerHTML = marked.parse(data.report);
            resultContainer.classList.remove('hidden');
            resultContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (error) {
            showError(error.message);
        } finally {
            setLoading(false);
        }
    });

    copyBtn.addEventListener('click', () => {
        const textToCopy = reportContent.innerText || reportContent.textContent;
        navigator.clipboard.writeText(textToCopy).then(() => {
            const originalIcon = copyBtn.innerHTML;
            copyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#58a6ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
            setTimeout(() => {
                copyBtn.innerHTML = originalIcon;
            }, 2000);
        }).catch((err) => {
            console.error('Failed to copy text: ', err);
            showError('Gagal menyalin teks ke clipboard.');
        });
    });

    function addFiles(files) {
        const normalizedFiles = files
            .filter(Boolean)
            .map((file) => normalizeClipboardFile(file))
            .filter((file) => file.size > 0);

        if (normalizedFiles.length === 0) {
            showError('Tidak ada file yang bisa ditambahkan dari clipboard.');
            return;
        }

        const nextFiles = [...currentFiles];

        for (const file of normalizedFiles) {
            if (nextFiles.length >= MAX_FILE_COUNT) {
                showError(`Maksimal ${MAX_FILE_COUNT} file per laporan.`);
                break;
            }

            if (isDuplicateFile(file, nextFiles)) {
                continue;
            }

            nextFiles.push(file);
        }

        const totalBytes = getTotalFileSize(nextFiles);
        if (totalBytes > MAX_TOTAL_UPLOAD_SIZE_BYTES) {
            showError('Total ukuran file melebihi 4 MB. Kurangi jumlah atau ukuran gambar.');
            return;
        }

        currentFiles = nextFiles;
        renderSelectedFiles();
    }

    function renderSelectedFiles() {
        if (currentFiles.length === 0) {
            fileList.innerHTML = '';
            dropZone.classList.remove('hidden');
            filePreview.classList.add('hidden');
            return;
        }

        const totalSizeLabel = formatFileSize(getTotalFileSize(currentFiles));
        fileSummary.textContent = `${currentFiles.length} file dipilih (${totalSizeLabel})`;
        fileList.innerHTML = currentFiles
            .map((file) => `<li>${escapeHtml(file.name)} <span>(${formatFileSize(file.size)})</span></li>`)
            .join('');

        dropZone.classList.add('hidden');
        filePreview.classList.remove('hidden');
    }

    function getPastedClipboardFiles(event) {
        const items = Array.from(event.clipboardData?.items || []);

        return items
            .filter((item) => item.kind === 'file' && isClipboardSupportedType(item.type))
            .map((item) => item.getAsFile())
            .filter(Boolean)
            .map((file) => normalizeClipboardFile(file));
    }

    async function readClipboardFiles() {
        if (!navigator.clipboard?.read) {
            throw new Error('Browser ini belum mendukung baca file dari clipboard. Gunakan Ctrl+V di area halaman ini.');
        }

        const clipboardItems = await navigator.clipboard.read();
        const files = [];

        for (const item of clipboardItems) {
            const supportedTypes = item.types.filter((type) => isClipboardSupportedType(type));
            if (supportedTypes.length === 0) {
                continue;
            }

            const preferredType = pickPreferredClipboardType(supportedTypes);
            const blob = await item.getType(preferredType);
            files.push(normalizeClipboardFile(blob));
        }

        if (files.length === 0) {
            throw new Error('Clipboard tidak berisi gambar atau PDF yang didukung.');
        }

        return files;
    }

    function pickPreferredClipboardType(types) {
        return types.find((type) => type.startsWith('image/')) || types[0];
    }

    function isClipboardSupportedType(type) {
        return Boolean(clipboardMimeMap[type]);
    }

    function normalizeClipboardFile(blobOrFile) {
        const mimeType = blobOrFile.type || 'application/octet-stream';
        const existingName = typeof blobOrFile.name === 'string' ? blobOrFile.name.trim() : '';
        const extension = clipboardMimeMap[mimeType] || '';
        const fallbackName = `clipboard-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${extension}`;

        if (blobOrFile instanceof File && existingName) {
            return blobOrFile;
        }

        return new File([blobOrFile], existingName || fallbackName, {
            type: mimeType,
            lastModified: Date.now()
        });
    }

    function isDuplicateFile(candidate, files) {
        return files.some((file) =>
            file.name === candidate.name &&
            file.size === candidate.size &&
            file.lastModified === candidate.lastModified
        );
    }

    function getTotalFileSize(files) {
        return files.reduce((total, file) => total + file.size, 0);
    }

    function formatFileSize(bytes) {
        if (bytes < 1024) {
            return `${bytes} B`;
        }

        if (bytes < 1024 * 1024) {
            return `${(bytes / 1024).toFixed(1)} KB`;
        }

        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }

    function escapeHtml(value) {
        return value
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#39;');
    }

    function setLoading(isLoading) {
        generateBtn.disabled = isLoading;
        if (isLoading) {
            btnText.classList.add('hidden');
            loader.classList.remove('hidden');
        } else {
            btnText.classList.remove('hidden');
            loader.classList.add('hidden');
        }
    }

    function showError(message) {
        errorMsg.textContent = message;
        errorMsg.classList.remove('hidden');
        setTimeout(hideError, 5000);
    }

    function hideError() {
        errorMsg.classList.add('hidden');
        errorMsg.textContent = '';
    }
});
