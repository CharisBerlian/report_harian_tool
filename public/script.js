document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const filePreview = document.getElementById('file-preview');
    const fileNameDisplay = document.getElementById('file-name');
    const removeFileBtn = document.getElementById('remove-file');

    const form = document.getElementById('report-form');
    const generateBtn = document.getElementById('generate-btn');
    const btnText = document.querySelector('.btn-text');
    const loader = document.querySelector('.loader');

    const resultContainer = document.getElementById('result-container');
    const reportContent = document.getElementById('report-content');
    const copyBtn = document.getElementById('copy-btn');
    const errorMsg = document.getElementById('error-message');

    let currentFile = null;

    // --- Drag and Drop Logic ---
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
            handleFile(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    function handleFile(file) {
        currentFile = file;
        fileNameDisplay.textContent = file.name;
        dropZone.classList.add('hidden');
        filePreview.classList.remove('hidden');
    }

    removeFileBtn.addEventListener('click', () => {
        currentFile = null;
        fileInput.value = '';
        dropZone.classList.remove('hidden');
        filePreview.classList.add('hidden');
    });

    // --- Form Submission Logic ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const textInput = document.getElementById('text-input').value;

        if (!currentFile && !textInput.trim()) {
            showError("Silakan unggah file materi atau ketik tambahan konteks.");
            return;
        }

        // UI Loading State
        setLoading(true);
        hideError();
        resultContainer.classList.add('hidden');

        try {
            const formData = new FormData();
            if (currentFile) {
                formData.append('material', currentFile);
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

            // Render Markdown
            reportContent.innerHTML = marked.parse(data.report);
            resultContainer.classList.remove('hidden');

            // Scroll to result
            resultContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });

        } catch (error) {
            showError(error.message);
        } finally {
            setLoading(false);
        }
    });

    // --- Copy to Clipboard ---
    copyBtn.addEventListener('click', () => {
        const textToCopy = reportContent.innerText || reportContent.textContent;
        navigator.clipboard.writeText(textToCopy).then(() => {
            const originalIcon = copyBtn.innerHTML;
            // Show checkmark icon
            copyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#58a6ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
            setTimeout(() => {
                copyBtn.innerHTML = originalIcon;
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            showError('Gagal menyalin teks ke clipboard.');
        });
    });

    // --- Helpers ---
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
        // Auto hide after 5s
        setTimeout(hideError, 5000);
    }

    function hideError() {
        errorMsg.classList.add('hidden');
        errorMsg.textContent = '';
    }
});
