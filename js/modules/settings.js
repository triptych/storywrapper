export class Settings {
    constructor({ element, theme, storage }) {
        this.element = element;
        this.theme = theme;
        this.storage = storage;
        this.form = this.element.querySelector('.settings-form');

        this.defaultSettings = {
            theme: 'system',
            font: 'serif',
            reduceMotion: false,
            highContrast: false,
            fontSize: '16px',
            lineHeight: '1.6',
            wordSpacing: 'normal',
            textAlign: 'left'
        };

        this.setupSettings();
        this.setupEventListeners();
    }

    setupSettings() {
        // Add ARIA attributes
        this.element.setAttribute('role', 'dialog');
        this.element.setAttribute('aria-label', 'Settings panel');

        // Setup close button
        this.setupCloseButton();

        // Add additional form controls
        this.addAccessibilityControls();

        // Load saved settings
        this.loadSettings();
    }

    setupCloseButton() {
        // Instead of creating a new button, find the existing one
        const closeButton = this.element.querySelector('.close-settings');
        if (closeButton) {
            closeButton.addEventListener('click', () => this.close());
        }
    }

    addAccessibilityControls() {
        const accessibilityFieldset = document.createElement('fieldset');
        accessibilityFieldset.innerHTML = `
            <legend>Reading Preferences</legend>
            <div class="form-group">
                <label for="font-size">Font Size</label>
                <select id="font-size" name="fontSize">
                    <option value="14px">Small</option>
                    <option value="16px">Medium</option>
                    <option value="18px">Large</option>
                    <option value="20px">Extra Large</option>
                </select>
            </div>
            <div class="form-group">
                <label for="line-height">Line Height</label>
                <select id="line-height" name="lineHeight">
                    <option value="1.4">Compact</option>
                    <option value="1.6">Normal</option>
                    <option value="1.8">Relaxed</option>
                    <option value="2">Spacious</option>
                </select>
            </div>
            <div class="form-group">
                <label for="word-spacing">Word Spacing</label>
                <select id="word-spacing" name="wordSpacing">
                    <option value="normal">Normal</option>
                    <option value="0.05em">Slight</option>
                    <option value="0.1em">Medium</option>
                    <option value="0.15em">Wide</option>
                </select>
            </div>
            <div class="form-group">
                <label for="text-align">Text Alignment</label>
                <select id="text-align" name="textAlign">
                    <option value="left">Left</option>
                    <option value="justify">Justified</option>
                </select>
            </div>
        `;

        this.form.appendChild(accessibilityFieldset);
    }

    setupEventListeners() {
        // Form change events
        this.form.addEventListener('change', (e) => {
            const setting = e.target.name;
            const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;

            this.updateSetting(setting, value);
        });

        // Handle keyboard events
        this.element.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.close();
            }
        });

        // Trap focus within settings panel when open
        this.setupFocusTrap();
    }

    setupFocusTrap() {
        const focusableElements = this.element.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];

        this.element.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    if (document.activeElement === firstFocusable) {
                        e.preventDefault();
                        lastFocusable.focus();
                    }
                } else {
                    if (document.activeElement === lastFocusable) {
                        e.preventDefault();
                        firstFocusable.focus();
                    }
                }
            }
        });
    }

    async loadSettings() {
        try {
            const savedSettings = await this.storage.get('settings') || {};
            const settings = { ...this.defaultSettings, ...savedSettings };

            // Apply saved settings to form
            Object.entries(settings).forEach(([key, value]) => {
                const input = this.form.querySelector(`[name="${key}"]`);
                if (input) {
                    if (input.type === 'checkbox') {
                        input.checked = value;
                    } else {
                        input.value = value;
                    }
                }
            });

            // Apply settings to UI
            this.applySettings(settings);

        } catch (error) {
            console.error('Error loading settings:', error);
            this.showError('Failed to load settings');
        }
    }

    async updateSetting(setting, value) {
        try {
            // Get current settings
            const currentSettings = await this.storage.get('settings') || {};

            // Update setting
            const newSettings = {
                ...currentSettings,
                [setting]: value
            };

            // Save settings
            await this.storage.set('settings', newSettings);

            // Apply setting
            this.applySettings({ [setting]: value });

            // Announce change
            this.announceSettingChange(setting, value);

        } catch (error) {
            console.error('Error updating setting:', error);
            this.showError('Failed to update setting');
        }
    }

    applySettings(settings) {
        Object.entries(settings).forEach(([setting, value]) => {
            switch (setting) {
                case 'theme':
                    this.theme.setTheme(value);
                    break;
                case 'reduceMotion':
                    document.documentElement.style.setProperty(
                        '--transition-speed',
                        value ? '0.001s' : '0.3s'
                    );
                    break;
                case 'highContrast':
                    document.documentElement.classList.toggle('high-contrast', value);
                    break;
                case 'fontSize':
                case 'lineHeight':
                case 'wordSpacing':
                case 'textAlign':
                    document.documentElement.style.setProperty(
                        `--${this.kebabCase(setting)}`,
                        value
                    );
                    break;
            }
        });
    }

    toggle() {
        const isHidden = this.element.hasAttribute('hidden');

        if (isHidden) {
            this.open();
        } else {
            this.close();
        }
    }

    open() {
        // Show settings panel
        this.element.removeAttribute('hidden');
        this.element.setAttribute('aria-hidden', 'false');

        // Save active element to restore focus later
        this.previouslyFocused = document.activeElement;

        // Focus first focusable element
        const firstFocusable = this.element.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        firstFocusable?.focus();

        // Announce to screen readers
        this.announceToScreenReader('Settings panel opened');
    }

    close() {
        // Hide settings panel
        this.element.setAttribute('hidden', '');
        this.element.setAttribute('aria-hidden', 'true');

        // Restore focus
        this.previouslyFocused?.focus();

        // Announce to screen readers
        this.announceToScreenReader('Settings panel closed');
    }

    showError(message) {
        const error = document.createElement('div');
        error.className = 'settings-error';
        error.setAttribute('role', 'alert');
        error.textContent = message;

        this.element.insertBefore(error, this.form);

        setTimeout(() => error.remove(), 5000);
    }

    announceSettingChange(setting, value) {
        let message = `${this.humanize(setting)} set to ${value}`;

        if (typeof value === 'boolean') {
            message = `${this.humanize(setting)} ${value ? 'enabled' : 'disabled'}`;
        }

        this.announceToScreenReader(message);
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

    // Utility methods
    kebabCase(str) {
        return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
    }

    humanize(str) {
        return str
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }
}
