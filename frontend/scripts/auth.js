// const API_URL = 'http://127.0.0.1:5000';
const API_URL = 'https://coverlettergen.onrender.com'

class Auth {
    static async init() {
        const token = await this.getToken();
        if (token) {
            try {
                const response = await fetch(`${API_URL}/protected`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    await this.showMainView();
                    return true;
                }
            } catch (error) {
                console.error('Auth check failed:', error);
            }
        }
        this.showView('login-view');
        return false;
    }

    static async login(email, password) {
        try {
            this.clearError('login');
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Invalid email or password');
            }

            await this.setToken(data.access_token);
            await this.showMainView();
            return true;
        } catch (error) {
            console.error('Login error:', error);
            this.showError('login', error.message || 'Failed to login. Please try again.');
            return false;
        }
    }

    static async signup(email, password) {
        try {
            this.clearError('signup');
            const response = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Failed to create account');
            }

            await this.setToken(data.access_token);
            await this.showMainView();
            return true;
        } catch (error) {
            console.error('Signup error:', error);
            this.showError('signup', error.message || 'Failed to create account. Please try again.');
            return false;
        }
    }

    static async logout() {
        await this.clearToken();
        this.showView('login-view');
    }

    static async getToken() {
        const result = await chrome.storage.local.get(['token']);
        return result.token;
    }

    static async setToken(token) {
        await chrome.storage.local.set({ token });
    }

    static async clearToken() {
        await chrome.storage.local.remove(['token']);
    }

    static showView(viewId) {
        this.clearError('login');
        this.clearError('signup');
        document.querySelectorAll('.view').forEach(view => {
            view.classList.add('hidden');
        });
        document.getElementById(viewId).classList.remove('hidden');
    }

    static showError(viewId, message) {
        const errorElement = document.getElementById(`${viewId}-error`);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('show');
            setTimeout(() => {
                errorElement.classList.remove('show');
            }, 5000);
        }
    }

    static clearError(viewId) {
        const errorElement = document.getElementById(`${viewId}-error`);
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.classList.remove('show');
        }
    }

    static async showMainView() {
        this.showView('main-view');
        // Initialize Resume and CoverLetter components
        await Resume.init();
        await CoverLetter.init();
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    Auth.init();

    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        await Auth.login(email, password);
    });

    document.getElementById('signup-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        await Auth.signup(email, password);
    });

    document.getElementById('logout').addEventListener('click', () => {
        Auth.logout();
    });

    document.getElementById('show-signup').addEventListener('click', (e) => {
        e.preventDefault();
        Auth.showView('signup-view');
    });

    document.getElementById('show-login').addEventListener('click', (e) => {
        e.preventDefault();
        Auth.showView('login-view');
    });
}); 