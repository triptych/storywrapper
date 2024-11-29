// Import modules
import { Editor } from './modules/editor.js';
import { Preview } from './modules/preview.js';
import { Settings } from './modules/settings.js';
import { ThemeManager } from './modules/theme.js';
import { StorageManager } from './modules/storage.js';
import { ServiceWorkerManager } from './modules/sw-manager.js';

class App {
    constructor() {
        this.initializeModules();
        this.setupEventListeners();
        this.initializeServiceWorker();
    }

    async initializeModules() {
        // Initialize core modules
        this.storage = new StorageManager();
        this.theme = new ThemeManager();
        this.editor = new Editor({
            element: document.getElementById('markdown-editor'),
            storage: this.storage
        });
        this.preview = new Preview({
            element: document.querySelector('.preview-content'),
            storage: this.storage
        });
        this.settings = new Settings({
            element: document.getElementById('settings'),
            theme: this.theme,
            storage: this.storage
        });

        // Load saved content and settings
        await this.loadSavedState();
    }

    setupEventListeners() {
        // Settings toggle
        const settingsToggle = document.querySelector('.settings-toggle');
        settingsToggle?.addEventListener('click', () => {
            this.settings.toggle();
            settingsToggle.setAttribute('aria-expanded',
                settingsToggle.getAttribute('aria-expanded') === 'true' ? 'false' : 'true'
            );
        });

        // Navigation (excluding settings button)
        document.querySelectorAll('.nav-link:not(.settings-toggle)').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = e.target.getAttribute('href').substring(1);
                this.navigateToSection(targetId);
            });
        });

        // Menu toggle
        const menuToggle = document.querySelector('.menu-toggle');
        menuToggle?.addEventListener('click', () => this.toggleMenu());

        // Theme toggle
        const themeToggle = document.querySelector('.theme-toggle');
        themeToggle?.addEventListener('click', () => this.theme.toggle());

        // Font toggle
        const fontToggle = document.querySelector('.font-toggle');
        fontToggle?.addEventListener('click', () => this.toggleFont());

        // Handle keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcut(e));

        // Handle online/offline status
        window.addEventListener('online', () => this.updateConnectionStatus(true));
        window.addEventListener('offline', () => this.updateConnectionStatus(false));
    }

    async loadSavedState() {
        try {
            // Show loading state
            this.toggleLoading(true);

            // Load saved content
            const savedContent = await this.storage.get('content');
            if (savedContent) {
                this.editor.setContent(savedContent);
                this.preview.update(savedContent);
            }

            // Load saved settings
            const savedSettings = await this.storage.get('settings');
            if (savedSettings) {
                this.settings.applySettings(savedSettings);
            }
        } catch (error) {
            console.error('Error loading saved state:', error);
            this.showError('Failed to load saved content');
        } finally {
            this.toggleLoading(false);
        }
    }

    async initializeServiceWorker() {
        try {
            this.swManager = new ServiceWorkerManager();
            await this.swManager.register();
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    }

    navigateToSection(sectionId) {
        // Hide all sections
        document.querySelectorAll('section').forEach(section => {
            section.setAttribute('hidden', '');
        });

        // Show target section
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.removeAttribute('hidden');
            // Announce section change to screen readers
            this.announceToScreenReader(`Navigated to ${sectionId} section`);
        }
    }

    toggleMenu() {
        const menu = document.getElementById('main-menu');
        const menuToggle = document.querySelector('.menu-toggle');
        const isExpanded = menuToggle.getAttribute('aria-expanded') === 'true';

        menuToggle.setAttribute('aria-expanded', !isExpanded);
        menu.classList.toggle('active');
    }

    toggleFont() {
        const body = document.body;
        const currentFont = body.style.getPropertyValue('--font-family');
        const newFont = currentFont === 'var(--font-serif)' ? 'var(--font-sans)' : 'var(--font-serif)';

        body.style.setProperty('--font-family', newFont);
        this.storage.set('font-preference', newFont);
        this.announceToScreenReader(`Font changed to ${newFont === 'var(--font-serif)' ? 'serif' : 'sans-serif'}`);
    }

    handleKeyboardShortcut(e) {
        // Ctrl/Cmd + S to save
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            this.editor.save();
        }

        // Ctrl/Cmd + , to open settings
        if ((e.ctrlKey || e.metaKey) && e.key === ',') {
            e.preventDefault();
            this.settings.toggle();
            document.querySelector('.settings-toggle').setAttribute('aria-expanded',
                document.querySelector('.settings-toggle').getAttribute('aria-expanded') === 'true' ? 'false' : 'true'
            );
        }

        // Esc to close modals/panels
        if (e.key === 'Escape') {
            this.settings.close();
            document.querySelector('.settings-toggle').setAttribute('aria-expanded', 'false');
        }
    }

    updateConnectionStatus(isOnline) {
        const statusElement = document.querySelector('.connection-status');
        statusElement.textContent = isOnline ? 'Online' : 'Offline';
        statusElement.classList.toggle('offline', !isOnline);

        this.announceToScreenReader(`You are now ${isOnline ? 'online' : 'offline'}`);
    }

    toggleLoading(show) {
        const loadingOverlay = document.querySelector('.loading-overlay');
        if (show) {
            loadingOverlay.removeAttribute('hidden');
            loadingOverlay.setAttribute('aria-hidden', 'false');
        } else {
            loadingOverlay.setAttribute('hidden', '');
            loadingOverlay.setAttribute('aria-hidden', 'true');
        }
    }

    showError(message) {
        // Create error element
        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.setAttribute('role', 'alert');
        errorElement.textContent = message;

        // Add to DOM
        document.body.appendChild(errorElement);

        // Remove after delay
        setTimeout(() => {
            errorElement.remove();
        }, 5000);
    }

    announceToScreenReader(message) {
        const announcer = document.createElement('div');
        announcer.className = 'sr-only';
        announcer.setAttribute('role', 'status');
        announcer.setAttribute('aria-live', 'polite');
        announcer.textContent = message;

        document.body.appendChild(announcer);
        setTimeout(() => announcer.remove(), 1000);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
