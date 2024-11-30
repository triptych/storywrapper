// Import modules
import { Editor } from './modules/editor.js';
import { Preview } from './modules/preview.js';
import { Settings } from './modules/settings.js';
import { ThemeManager } from './modules/theme.js';
import { StorageManager } from './modules/storage.js';
import { ServiceWorkerManager } from './modules/sw-manager.js';

class App {
    constructor() {
        this.modules = new Map();
        this.boundHandleVisibilityChange = this.handleVisibilityChange.bind(this);
        this.boundHandleBeforeUnload = this.handleBeforeUnload.bind(this);

        this.initializeModules();
        this.setupEventListeners();
        this.initializeServiceWorker();
    }

    async initializeModules() {
        try {
            // Show loading state
            this.toggleLoading(true);

            // Initialize core modules
            this.modules.set('storage', new StorageManager());
            this.modules.set('theme', new ThemeManager());

            const storage = this.modules.get('storage');
            const theme = this.modules.get('theme');

            this.modules.set('editor', new Editor({
                element: document.getElementById('markdown-editor'),
                storage
            }));

            this.modules.set('preview', new Preview({
                element: document.querySelector('.preview-content'),
                storage
            }));

            this.modules.set('settings', new Settings({
                element: document.getElementById('settings'),
                theme,
                storage
            }));

            // Load saved content and settings
            await this.loadSavedState();
        } catch (error) {
            console.error('Error initializing modules:', error);
            this.showError('Failed to initialize application');
        } finally {
            this.toggleLoading(false);
        }
    }

    setupEventListeners() {
        // Settings toggle
        const settingsToggle = document.querySelector('.settings-toggle');
        if (settingsToggle) {
            this.boundToggleSettings = () => {
                const settings = this.modules.get('settings');
                settings?.toggle();
                settingsToggle.setAttribute('aria-expanded',
                    settingsToggle.getAttribute('aria-expanded') === 'true' ? 'false' : 'true'
                );
            };
            settingsToggle.addEventListener('click', this.boundToggleSettings);
        }

        // Navigation
        document.querySelectorAll('.nav-link:not(.settings-toggle)').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = e.target.getAttribute('href')?.substring(1);
                if (targetId) this.navigateToSection(targetId);
            });
        });

        // Menu toggle
        const menuToggle = document.querySelector('.menu-toggle');
        if (menuToggle) {
            this.boundToggleMenu = () => this.toggleMenu();
            menuToggle.addEventListener('click', this.boundToggleMenu);
        }

        // Theme toggle
        const themeToggle = document.querySelector('.theme-toggle');
        if (themeToggle) {
            this.boundToggleTheme = () => this.modules.get('theme')?.toggle();
            themeToggle.addEventListener('click', this.boundToggleTheme);
        }

        // Font toggle
        const fontToggle = document.querySelector('.font-toggle');
        if (fontToggle) {
            this.boundToggleFont = () => this.toggleFont();
            fontToggle.addEventListener('click', this.boundToggleFont);
        }

        // Global keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyboardShortcut.bind(this));

        // Handle online/offline status
        window.addEventListener('online', () => this.updateConnectionStatus(true));
        window.addEventListener('offline', () => this.updateConnectionStatus(false));

        // Handle page visibility
        document.addEventListener('visibilitychange', this.boundHandleVisibilityChange);

        // Handle before unload
        window.addEventListener('beforeunload', this.boundHandleBeforeUnload);
    }

    async loadSavedState() {
        const storage = this.modules.get('storage');
        const editor = this.modules.get('editor');
        const preview = this.modules.get('preview');
        const settings = this.modules.get('settings');

        try {
            // Load saved content
            const savedContent = await storage?.get('content');
            if (savedContent) {
                editor?.setContent(savedContent);
                preview?.update(savedContent);
            }

            // Load saved settings
            const savedSettings = await storage?.get('settings');
            if (savedSettings) {
                settings?.applySettings(savedSettings);
            }
        } catch (error) {
            console.error('Error loading saved state:', error);
            this.showError('Failed to load saved content');
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
            this.announceToScreenReader(`Navigated to ${sectionId} section`);
        }
    }

    toggleMenu() {
        const menu = document.getElementById('main-menu');
        const menuToggle = document.querySelector('.menu-toggle');
        if (!menu || !menuToggle) return;

        const isExpanded = menuToggle.getAttribute('aria-expanded') === 'true';
        menuToggle.setAttribute('aria-expanded', !isExpanded);
        menu.classList.toggle('active');
    }

    toggleFont() {
        const body = document.body;
        const currentFont = body.style.getPropertyValue('--font-family');
        const newFont = currentFont === 'var(--font-serif)' ? 'var(--font-sans)' : 'var(--font-serif)';

        body.style.setProperty('--font-family', newFont);
        this.modules.get('storage')?.set('font-preference', newFont);
        this.announceToScreenReader(`Font changed to ${newFont === 'var(--font-serif)' ? 'serif' : 'sans-serif'}`);
    }

    handleKeyboardShortcut(e) {
        // Ctrl/Cmd + S to save
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            this.modules.get('editor')?.save();
        }

        // Ctrl/Cmd + , to open settings
        if ((e.ctrlKey || e.metaKey) && e.key === ',') {
            e.preventDefault();
            this.modules.get('settings')?.toggle();
            const settingsToggle = document.querySelector('.settings-toggle');
            if (settingsToggle) {
                settingsToggle.setAttribute('aria-expanded',
                    settingsToggle.getAttribute('aria-expanded') === 'true' ? 'false' : 'true'
                );
            }
        }

        // Esc to close modals/panels
        if (e.key === 'Escape') {
            this.modules.get('settings')?.close();
            const settingsToggle = document.querySelector('.settings-toggle');
            if (settingsToggle) {
                settingsToggle.setAttribute('aria-expanded', 'false');
            }
        }
    }

    handleVisibilityChange() {
        if (document.hidden) {
            // Save state when page becomes hidden
            this.modules.get('editor')?.save();
        }
    }

    handleBeforeUnload(e) {
        // Save state before unload
        this.modules.get('editor')?.save();

        // Show warning if there are unsaved changes
        if (this.modules.get('editor')?.hasUnsavedChanges()) {
            e.preventDefault();
            e.returnValue = '';
        }
    }

    updateConnectionStatus(isOnline) {
        const statusElement = document.querySelector('.connection-status');
        if (!statusElement) return;

        statusElement.textContent = isOnline ? 'Online' : 'Offline';
        statusElement.classList.toggle('offline', !isOnline);
        this.announceToScreenReader(`You are now ${isOnline ? 'online' : 'offline'}`);
    }

    toggleLoading(show) {
        const loadingOverlay = document.querySelector('.loading-overlay');
        if (!loadingOverlay) return;

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
        if (!message) return;

        const announcer = document.createElement('div');
        announcer.className = 'sr-only';
        announcer.setAttribute('role', 'status');
        announcer.setAttribute('aria-live', 'polite');
        announcer.textContent = message;

        document.body.appendChild(announcer);
        setTimeout(() => announcer.remove(), 1000);
    }

    // Cleanup method
    destroy() {
        // Remove event listeners
        document.removeEventListener('visibilitychange', this.boundHandleVisibilityChange);
        window.removeEventListener('beforeunload', this.boundHandleBeforeUnload);

        const settingsToggle = document.querySelector('.settings-toggle');
        if (settingsToggle && this.boundToggleSettings) {
            settingsToggle.removeEventListener('click', this.boundToggleSettings);
        }

        const menuToggle = document.querySelector('.menu-toggle');
        if (menuToggle && this.boundToggleMenu) {
            menuToggle.removeEventListener('click', this.boundToggleMenu);
        }

        const themeToggle = document.querySelector('.theme-toggle');
        if (themeToggle && this.boundToggleTheme) {
            themeToggle.removeEventListener('click', this.boundToggleTheme);
        }

        const fontToggle = document.querySelector('.font-toggle');
        if (fontToggle && this.boundToggleFont) {
            fontToggle.removeEventListener('click', this.boundToggleFont);
        }

        // Cleanup modules
        for (const [_, module] of this.modules) {
            if (module && typeof module.destroy === 'function') {
                module.destroy();
            }
        }

        // Clear modules map
        this.modules.clear();

        // Cleanup service worker
        if (this.swManager && typeof this.swManager.destroy === 'function') {
            this.swManager.destroy();
        }
    }
}

// Initialize app when DOM is ready
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new App();
});

// Cleanup on page unload
window.addEventListener('unload', () => {
    if (app) {
        app.destroy();
        app = null;
    }
});
