class Resume {
    static isDownloading = false;
    static isInitialized = false;

    static async init() {
        try {
            // Always check resume status on init, even if already initialized
            await this.checkResumeStatus();
            
            // Only set up event listeners once
            if (!this.isInitialized) {
                this.setupEventListeners();
                this.isInitialized = true;
            }
        } catch (error) {
            console.error('Failed to initialize Resume:', error);
            this.showError('Failed to initialize. Please refresh the page.');
        }
    }

    static showError(message) {
        const errorElement = document.getElementById('resume-error');
        const successElement = document.getElementById('resume-success');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('show');
            successElement?.classList.remove('show');
            setTimeout(() => {
                errorElement.classList.remove('show');
            }, 5000);
        }
    }

    static showSuccess(message) {
        const successElement = document.getElementById('resume-success');
        const errorElement = document.getElementById('resume-error');
        if (successElement) {
            successElement.textContent = message;
            successElement.classList.add('show');
            errorElement?.classList.remove('show');
            setTimeout(() => {
                successElement.classList.remove('show');
            }, 5000);
        }
    }

    static clearMessages() {
        const errorElement = document.getElementById('resume-error');
        const successElement = document.getElementById('resume-success');
        errorElement?.classList.remove('show');
        successElement?.classList.remove('show');
        if (errorElement) errorElement.textContent = '';
        if (successElement) successElement.textContent = '';
    }

    static updateResumeUI(filename) {
        this.clearMessages();
        const filenameElement = document.getElementById('resume-filename');
        const downloadButton = document.getElementById('download-resume');
        const deleteButton = document.getElementById('delete-resume');
        const generateButton = document.getElementById('generate-cover-letter');

        if (filename) {
            filenameElement.textContent = filename;
            downloadButton.disabled = false;
            deleteButton.disabled = false;
            generateButton.disabled = false;
        } else {
            filenameElement.textContent = 'No resume uploaded';
            downloadButton.disabled = true;
            deleteButton.disabled = true;
            generateButton.disabled = true;
        }
    }

    static async uploadResume(file) {
        try {
            this.clearMessages();
            const token = await Auth.getToken();
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${API_URL}/resume/upload`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`
                    // Don't set Content-Type header for FormData
                },
                body: formData
            });

            let data;
            try {
                data = await response.json();
            } catch (e) {
                throw new Error('Invalid response from server');
            }
            
            if (!response.ok) {
                throw new Error(data.message || 'Failed to upload resume');
            }

            await this.checkResumeStatus();
            return true;
        } catch (error) {
            console.error('Failed to upload resume:', error);
            this.showError(error.message || 'Failed to upload resume. Please try again.');
            return false;
        }
    }

    static async downloadResume() {
        if (this.isDownloading) {
            return;
        }

        try {
            this.isDownloading = true;
            const downloadButton = document.getElementById('download-resume');
            downloadButton.disabled = true;

            this.clearMessages();
            const token = await Auth.getToken();
            const response = await fetch(`${API_URL}/resume/download`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to download resume');
            }

            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            
            const downloadLink = document.createElement('a');
            downloadLink.style.display = 'none';
            downloadLink.href = blobUrl;
            downloadLink.download = 'resume.pdf';
            document.body.appendChild(downloadLink);
            downloadLink.click();
            
            setTimeout(() => {
                document.body.removeChild(downloadLink);
                window.URL.revokeObjectURL(blobUrl);
            }, 100);

            this.showSuccess('Resume downloaded successfully!');
        } catch (error) {
            console.error('Failed to download resume:', error);
            this.showError(error.message || 'Failed to download resume. Please try again.');
        } finally {
            this.isDownloading = false;
            const downloadButton = document.getElementById('download-resume');
            downloadButton.disabled = false;
        }
    }

    static async deleteResume() {
        const deleteButton = document.getElementById('delete-resume');
        try {
            deleteButton.disabled = true;
            this.clearMessages();
            
            const token = await Auth.getToken();
            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await fetch(`${API_URL}/resume/delete`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            let data;
            try {
                data = await response.json();
            } catch (e) {
                throw new Error('Invalid response from server');
            }
            
            if (!response.ok) {
                throw new Error(data.message || 'Failed to delete resume');
            }

            // Only update UI after successful deletion
            this.updateResumeUI(null);
            this.showSuccess('Resume deleted successfully');
        } catch (error) {
            console.error('Failed to delete resume:', error);
            this.showError(error.message || 'Failed to delete resume. Please try again.');
            // Re-check status to ensure UI is in sync
            await this.checkResumeStatus();
        } finally {
            deleteButton.disabled = false;
        }
    }

    static async checkResumeStatus() {
        try {
            const token = await Auth.getToken();
            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await fetch(`${API_URL}/resume/status`, {
                method: 'GET',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            let data;
            try {
                data = await response.json();
            } catch (e) {
                throw new Error('Invalid response from server');
            }
            
            if (!response.ok) {
                throw new Error(data.message || 'Failed to check resume status');
            }

            // Only update UI if we got a valid response and filename exists
            if (data && typeof data.filename === 'string' && data.filename) {
                this.updateResumeUI(data.filename);
            } else {
                // If no filename or null/undefined/empty, treat as no resume
                this.updateResumeUI(null);
            }
        } catch (error) {
            console.error('Failed to check resume status:', error);
            this.showError(error.message || 'Failed to check resume status. Please try again.');
            // Reset UI state when there's an error
            this.updateResumeUI(null);
        }
    }

    static setupEventListeners() {
        const uploadButton = document.getElementById('upload-resume');
        const fileInput = document.getElementById('resume-file');
        const downloadButton = document.getElementById('download-resume');
        const deleteButton = document.getElementById('delete-resume');

        uploadButton?.addEventListener('click', () => {
            fileInput?.click();
        });

        fileInput?.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                if (file.type === 'application/pdf') {
                    await this.uploadResume(file);
                } else {
                    this.showError('Please select a PDF file');
                }
            }
            if (fileInput) fileInput.value = '';
        });

        downloadButton?.addEventListener('click', () => {
            this.downloadResume();
        });

        deleteButton?.addEventListener('click', () => {
            this.deleteResume();
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    Resume.init();
}); 