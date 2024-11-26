export class ThemeManager {
    constructor() {
        this.themes = {
            light: {
                '--bg-primary': '#ffffff',
                '--bg-secondary': '#f5f5f5',
                '--text-primary': '#333333',
                '--text-secondary': '#666666',
                '--accent-color': '#0066cc',
                '--border-color': '#e0e0e0',
                '--shadow-color': 'rgba(0, 0, 0, 0.1)',
                '--code-bg': '#f8f8f8'
            },
            dark: {
                '--bg-primary': '#1a1a1a',
                '--bg-secondary': '#2d2d2d',
                '--text-primary': '#f0f0f0',
                '--text-secondary': '#cccccc',
                '--accent-color': '#66b3ff',
                '--border-color': '#404040',
                '--shadow-color': 'rgba(0, 0, 0, 0.3)',
                '--code-bg': '#333333'
            }
        };

        this.setupTheme();
        this.setupEventListeners();
    }

    setupTheme() {
        // Check for saved theme preference
        const savedTheme = localStorage.getItem('theme');

        if (savedTheme) {
            this.setTheme(savedTheme);
        } else {
            // Use system preference
            this.setTheme('system');
        }
    }

    setupEventListeners() {
        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addListener((e) => {
            if (this.currentTheme === 'system') {
                this.applyTheme(e.matches ? 'dark' : 'light');
            }
        });
    }

    setTheme(theme) {
        this.currentTheme = theme;

        if (theme === 'system') {
            const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            this.applyTheme(isDark ? 'dark' : 'light');
        } else {
            this.applyTheme(theme);
        }

        // Save preference
        localStorage.setItem('theme', theme);

        // Update meta theme-color
        this.updateMetaThemeColor(theme);

        // Dispatch theme change event
        window.dispatchEvent(new CustomEvent('themechange', {
            detail: { theme }
        }));
    }

    applyTheme(theme) {
        const root = document.documentElement;
        const themeColors = this.themes[theme];

        // Apply theme variables
        Object.entries(themeColors).forEach(([property, value]) => {
            root.style.setProperty(property, value);
        });

        // Update color-scheme
        root.style.setProperty('color-scheme', theme);

        // Update data attribute for CSS selectors
        document.body.setAttribute('data-theme', theme);
    }

    updateMetaThemeColor(theme) {
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.content = theme === 'dark' ?
                this.themes.dark['--bg-primary'] :
                this.themes.light['--bg-primary'];
        }
    }

    toggle() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);

        // Announce theme change to screen readers
        this.announceThemeChange(newTheme);
    }

    getCurrentTheme() {
        return this.currentTheme;
    }

    announceThemeChange(theme) {
        const announcer = document.createElement('div');
        announcer.className = 'sr-only';
        announcer.setAttribute('role', 'status');
        announcer.setAttribute('aria-live', 'polite');
        announcer.textContent = `Theme changed to ${theme} mode`;

        document.body.appendChild(announcer);
        setTimeout(() => announcer.remove(), 1000);
    }
}
