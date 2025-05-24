class CoverLetter {
    static isDownloading = false;

    static async init() {
        this.setupEventListeners();
        await this.getCurrentTabUrl();
    }

    static async getCurrentTabUrl() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab?.url) {
                document.getElementById('job-url').value = tab.url;
                // Enable generate button if we have a URL
                document.getElementById('generate-cover-letter').disabled = false;
            }
        } catch (error) {
            console.error('Failed to get current tab URL:', error);
        }
    }

    static showError(message) {
        const errorElement = document.getElementById('cover-letter-error');
        const successElement = document.getElementById('cover-letter-success');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('show');
            successElement.classList.remove('show');
            setTimeout(() => {
                errorElement.classList.remove('show');
            }, 5000);
        }
    }

    static showSuccess(message) {
        const successElement = document.getElementById('cover-letter-success');
        const errorElement = document.getElementById('cover-letter-error');
        if (successElement) {
            successElement.textContent = message;
            successElement.classList.add('show');
            errorElement.classList.remove('show');
            setTimeout(() => {
                successElement.classList.remove('show');
            }, 5000);
        }
    }

    static clearMessages() {
        const errorElement = document.getElementById('cover-letter-error');
        const successElement = document.getElementById('cover-letter-success');
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.classList.remove('show');
        }
        if (successElement) {
            successElement.textContent = '';
            successElement.classList.remove('show');
        }
    }

    static updateInputVisibility(useUrl) {
        const urlInput = document.getElementById('url-input');
        const descriptionInput = document.getElementById('description-input');
        const generateButton = document.getElementById('generate-cover-letter');

        if (useUrl) {
            urlInput.classList.remove('hidden');
            descriptionInput.classList.add('hidden');
            // Enable button if URL exists
            generateButton.disabled = !document.getElementById('job-url').value;
        } else {
            urlInput.classList.add('hidden');
            descriptionInput.classList.remove('hidden');
            // Enable button if description exists
            generateButton.disabled = !document.getElementById('job-description').value.trim();
        }
    }

    static async generateCoverLetter() {
        const generateButton = document.getElementById('generate-cover-letter');
        const downloadButton = document.getElementById('download-cover-letter');
        
        try {
            this.clearMessages();
            const token = await Auth.getToken();
            const useUrl = document.getElementById('use-url-toggle').checked;
            
            let requestData = {};
            if (useUrl) {
                const jobUrl = document.getElementById('job-url').value;
                if (!jobUrl) {
                    throw new Error('Please provide a job posting URL');
                }
                requestData = { link: jobUrl };
            } else {
                const jobDescription = document.getElementById('job-description').value.trim();
                if (!jobDescription) {
                    throw new Error('Please provide a job description');
                }
                requestData = { job_description: jobDescription };
            }

            generateButton.disabled = true;
            generateButton.textContent = 'Generating...';
            downloadButton.disabled = true;

            const response = await fetch(`${API_URL}/coverletter/generate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to generate cover letter');
            }

            downloadButton.disabled = false;
            this.showSuccess('Cover letter generated successfully! Click Download to save it.');
        } catch (error) {
            console.error('Failed to generate cover letter:', error);
            this.showError(error.message || 'Failed to generate cover letter. Please try again.');
            downloadButton.disabled = true;
        } finally {
            generateButton.disabled = false;
            generateButton.textContent = 'Generate Cover Letter';
        }
    }

    static async downloadCoverLetter() {
        // Prevent multiple downloads
        if (this.isDownloading) {
            return;
        }

        try {
            this.isDownloading = true;
            const downloadButton = document.getElementById('download-cover-letter');
            downloadButton.disabled = true;

            this.clearMessages();
            const token = await Auth.getToken();
            const response = await fetch(`${API_URL}/coverletter/download`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to download cover letter');
            }

            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            
            const downloadLink = document.createElement('a');
            downloadLink.style.display = 'none';
            downloadLink.href = blobUrl;
            downloadLink.download = 'cover_letter.docx';
            document.body.appendChild(downloadLink);
            downloadLink.click();
            
            // Clean up
            setTimeout(() => {
                document.body.removeChild(downloadLink);
                window.URL.revokeObjectURL(blobUrl);
            }, 100);

            this.showSuccess('Cover letter downloaded successfully!');
        } catch (error) {
            console.error('Failed to download cover letter:', error);
            this.showError(error.message || 'Failed to download cover letter. Please try again.');
        } finally {
            this.isDownloading = false;
            const downloadButton = document.getElementById('download-cover-letter');
            downloadButton.disabled = false;
        }
    }

    static setupEventListeners() {
        const generateButton = document.getElementById('generate-cover-letter');
        const downloadButton = document.getElementById('download-cover-letter');
        const toggleSwitch = document.getElementById('use-url-toggle');
        const jobDescriptionInput = document.getElementById('job-description');

        toggleSwitch.addEventListener('change', (e) => {
            this.updateInputVisibility(e.target.checked);
        });

        jobDescriptionInput.addEventListener('input', (e) => {
            generateButton.disabled = !e.target.value.trim();
        });

        generateButton.addEventListener('click', async () => {
            await this.generateCoverLetter();
        });

        downloadButton.addEventListener('click', async () => {
            await this.downloadCoverLetter();
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    CoverLetter.init();
}); 