class PopupManager {
    static async init() {
        // Initialize all components
        await Auth.init();
        
        // Only initialize other components if user is authenticated
        const token = await Auth.getToken();
        if (token) {
            await Resume.init();
            await CoverLetter.init();
        }

        // Setup error handling
        this.setupErrorHandling();
    }

    static setupErrorHandling() {
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            if (event.reason.message.includes('token')) {
                Auth.logout();
            }
        });

        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
        });
    }

    static showError(message) {
        console.error(message);
        alert(message);
    }
}

// Initialize the popup
document.addEventListener('DOMContentLoaded', () => {
    PopupManager.init();
}); 