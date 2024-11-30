export class Preview {
    constructor({ element, storage }) {
        this.element = element;
        this.storage = storage;
        this.currentPage = 1;
        this.chaptersMap = new Map();
        this.announcer = this.createAnnouncer();
        this.boundHandleKeydown = this.handleKeydown.bind(this);
        this.boundHandleTouchStart = this.handleTouchStart.bind(this);
        this.boundHandleTouchEnd = this.handleTouchEnd.bind(this);
        this.touchStartX = 0;
        this.currentHTML = ''; // Store the current HTML content

        this.setupPreview();
        this.setupEventListeners();
    }

    createAnnouncer() {
        const announcer = document.createElement('div');
        announcer.className = 'sr-only preview-announcer';
        announcer.setAttribute('role', 'status');
        announcer.setAttribute('aria-live', 'polite');
        document.body.appendChild(announcer);
        return announcer;
    }

    setupPreview() {
        if (!this.element) return;

        // Add necessary ARIA attributes
        this.element.setAttribute('role', 'region');
        this.element.setAttribute('aria-label', 'Story preview');

        // Create navigation controls
        this.createNavigationControls();

        // Add copy and export buttons
        this.setupPreviewControls();
    }

    setupPreviewControls() {
        const previewControls = document.querySelector('.preview-controls');
        if (!previewControls) return;

        // Add copy button
        this.copyButton = document.createElement('button');
        this.copyButton.className = 'copy-button';
        this.copyButton.setAttribute('aria-label', 'Copy HTML to clipboard');
        this.copyButton.textContent = 'Copy HTML';
        this.copyButton.addEventListener('click', () => this.copyHTML());
        previewControls.appendChild(this.copyButton);

        // Add export button
        this.exportButton = document.createElement('button');
        this.exportButton.className = 'export-button';
        this.exportButton.setAttribute('aria-label', 'Export as HTML');
        this.exportButton.textContent = 'Export HTML';
        this.exportButton.addEventListener('click', () => this.exportHTML());
        previewControls.appendChild(this.exportButton);
    }

    setupEventListeners() {
        // Listen for content updates from editor
        window.addEventListener('preview-update', this.handlePreviewUpdate.bind(this));

        // Handle preview mode toggle
        const modeToggle = document.querySelector('.preview-mode-toggle');
        modeToggle?.addEventListener('click', () => this.togglePreviewMode());

        // Handle keyboard navigation
        document.addEventListener('keydown', this.boundHandleKeydown);

        // Handle touch events for mobile
        this.element.addEventListener('touchstart', this.boundHandleTouchStart, { passive: true });
        this.element.addEventListener('touchend', this.boundHandleTouchEnd, { passive: true });

        // Setup intersection observer
        this.setupIntersectionObserver();
    }

    handlePreviewUpdate(e) {
        // e.detail.html is now the resolved HTML string
        this.update(e.detail.html);
    }

    handleKeydown(e) {
        if (!this.isPreviewMode()) return;

        if (e.key === 'ArrowRight') {
            e.preventDefault();
            this.nextPage();
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            this.previousPage();
        }
    }

    handleTouchStart(e) {
        this.touchStartX = e.touches[0].clientX;
    }

    handleTouchEnd(e) {
        const touchEndX = e.changedTouches[0].clientX;
        const diff = this.touchStartX - touchEndX;

        if (Math.abs(diff) > 50) { // Minimum swipe distance
            if (diff > 0) {
                this.nextPage();
            } else {
                this.previousPage();
            }
        }
    }

    createNavigationControls() {
        const nav = document.createElement('nav');
        nav.className = 'preview-navigation';
        nav.setAttribute('aria-label', 'Chapter navigation');

        this.prevButton = document.createElement('button');
        this.prevButton.className = 'nav-button prev';
        this.prevButton.setAttribute('aria-label', 'Previous chapter');
        this.prevButton.addEventListener('click', () => this.previousPage());

        this.nextButton = document.createElement('button');
        this.nextButton.className = 'nav-button next';
        this.nextButton.setAttribute('aria-label', 'Next chapter');
        this.nextButton.addEventListener('click', () => this.nextPage());

        this.progressBar = document.createElement('div');
        this.progressBar.className = 'reading-progress';
        this.progressBar.setAttribute('role', 'progressbar');
        this.progressBar.setAttribute('aria-valuemin', '0');
        this.progressBar.setAttribute('aria-valuemax', '100');

        nav.appendChild(this.prevButton);
        nav.appendChild(this.progressBar);
        nav.appendChild(this.nextButton);

        this.element.parentNode.insertBefore(nav, this.element.nextSibling);
    }

    setupIntersectionObserver() {
        // Cleanup existing observer
        if (this.observer) {
            this.observer.disconnect();
        }

        const options = {
            root: this.element,
            threshold: [0, 0.25, 0.5, 0.75, 1]
        };

        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const progress = Math.round(entry.intersectionRatio * 100);
                    this.updateProgress(progress);
                }
            });
        }, options);

        // Observe all chapter elements
        this.chaptersMap.forEach(chapter => {
            const element = document.getElementById(chapter.id);
            if (element) {
                this.observer.observe(element);
            }
        });
    }

    async copyHTML() {
        try {
            const htmlContent = await this.generateExportHTML();
            await navigator.clipboard.writeText(htmlContent);
            this.announceToScreenReader('HTML copied to clipboard');
        } catch (error) {
            console.error('Error copying HTML:', error);
            this.announceToScreenReader('Error copying HTML to clipboard');
        }
    }

    async exportHTML() {
        try {
            this.announceToScreenReader('Preparing export...');
            const htmlContent = await this.generateExportHTML();
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `story-${timestamp}.html`;

            const { downloadFile } = await import('../utils/helpers.js');
            await downloadFile(htmlContent, filename, 'text/html');

            this.announceToScreenReader('Story exported successfully');
        } catch (error) {
            console.error('Error exporting HTML:', error);
            this.announceToScreenReader('Error exporting HTML file');
        }
    }

    generateExportHTML() {
        // Combine all CSS styles
        const css = `
            /* Variables */
            :root {
                /* Theme Colors */
                --color-primary-light: #ffffff;
                --color-secondary-light: #f5f5f5;
                --color-text-light: #333333;
                --color-accent-light: #0066cc;

                --color-primary-dark: #1a1a1a;
                --color-secondary-dark: #2d2d2d;
                --color-text-dark: #f0f0f0;
                --color-accent-dark: #66b3ff;

                /* Typography */
                --font-serif: 'Merriweather', serif;
                --font-sans: system-ui, -apple-system, sans-serif;
                --font-size-base: clamp(1rem, 1vw + 0.75rem, 1.25rem);
                --line-height-base: 1.6;

                /* Spacing */
                --spacing-unit: clamp(1rem, 2vw, 2rem);
                --content-width: min(65ch, 100% - 2rem);
            }

            /* Reset */
            *, *::before, *::after {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
            }

            html {
                font-size: 16px;
                scroll-behavior: smooth;
                height: 100%;
            }

            body {
                font-family: var(--font-sans);
                font-size: var(--font-size-base);
                line-height: var(--line-height-base);
                background-color: var(--color-primary-light);
                color: var(--color-text-light);
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
                max-width: var(--content-width);
                margin: 2rem auto;
                padding: 0 1rem;
            }

            /* List Styles */
            ul, ol {
                padding-left: 2rem;
                margin: 1rem 0;
            }

            ul ul, ul ol, ol ul, ol ol {
                margin: 0.5rem 0;
            }

            li {
                margin: 0.25rem 0;
            }

            /* Preview Content Styles */
            .preview-content {
                padding: 2rem;
                border-radius: 4px;
            }

            /* Dark Mode */
            @media (prefers-color-scheme: dark) {
                body {
                    background-color: var(--color-primary-dark);
                    color: var(--color-text-dark);
                }
            }

            /* Print Styles */
            @media print {
                body {
                    max-width: none;
                    margin: 0;
                    padding: 0;
                }
                .preview-content {
                    padding: 0;
                }
            }
        `;

        // Use the stored HTML content
        const content = this.currentHTML;
        const title = document.querySelector('h1')?.textContent || 'Exported Story';

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>${css}</style>
</head>
<body>
    <div class="preview-content">
        ${content}
    </div>
</body>
</html>`;
    }

    getFallbackStyles() {
        return `
            body {
                font-family: system-ui, -apple-system, sans-serif;
                line-height: 1.6;
                color: #333;
                background: #fff;
            }
            @media (prefers-color-scheme: dark) {
                body {
                    color: #eee;
                    background: #222;
                }
            }
        `;
    }

    update(html) {
        if (!html || !this.element) return;

        // Ensure we have a string, not a promise
        if (html instanceof Promise) {
            console.error('Received a promise instead of HTML string');
            return;
        }

        // Store the current HTML content
        this.currentHTML = html;

        // Set the HTML content directly
        this.element.innerHTML = html;

        // Find all headings in the current document
        const headings = this.element.querySelectorAll('h1, h2, h3, h4, h5, h6');

        // Clear existing chapters
        this.chaptersMap.clear();

        // Process chapters
        headings.forEach((heading, index) => {
            const chapter = {
                id: `chapter-${index}`,
                title: heading.textContent.trim(),
                element: heading.parentElement
            };

            // Add to chapters map
            this.chaptersMap.set(chapter.id, chapter);

            // Add necessary attributes
            heading.id = chapter.id;
            heading.setAttribute('tabindex', '-1');
        });

        // Update navigation state
        this.updateNavigationState();

        // Save current position
        this.savePosition();

        // Reset intersection observer with new content
        this.setupIntersectionObserver();

        // Announce update to screen readers
        this.announceToScreenReader('Preview updated');
    }

    togglePreviewMode() {
        const previewSection = document.querySelector('.preview-section');
        if (!previewSection) return;

        const wasFullscreen = previewSection.classList.contains('fullscreen');
        previewSection.classList.toggle('fullscreen');
        const isFullscreen = previewSection.classList.contains('fullscreen');

        // Only update if state actually changed
        if (wasFullscreen !== isFullscreen) {
            document.body.style.overflow = isFullscreen ? 'hidden' : '';

            // Update button text and ARIA labels
            const toggle = document.querySelector('.preview-mode-toggle');
            if (toggle) {
                toggle.textContent = isFullscreen ? 'Exit Preview' : 'Preview Mode';
                toggle.setAttribute('aria-label', isFullscreen ? 'Exit preview mode' : 'Enter preview mode');
                toggle.setAttribute('aria-pressed', isFullscreen);
            }

            this.announceToScreenReader(`${isFullscreen ? 'Entered' : 'Exited'} preview mode`);
        }
    }

    isPreviewMode() {
        return document.querySelector('.preview-section')?.classList.contains('fullscreen') || false;
    }

    nextPage() {
        if (this.currentPage < this.chaptersMap.size) {
            this.currentPage++;
            this.navigateToPage(this.currentPage);
        }
    }

    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.navigateToPage(this.currentPage);
        }
    }

    navigateToPage(pageNumber) {
        const chapter = Array.from(this.chaptersMap.values())[pageNumber - 1];
        if (!chapter) return;

        const element = document.getElementById(chapter.id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });

            // Update current page
            this.currentPage = pageNumber;

            // Update navigation state
            this.updateNavigationState();

            // Save position
            this.savePosition();

            // Announce page change
            this.announceToScreenReader(`Navigated to ${chapter.title}`);
        }
    }

    updateNavigationState() {
        if (!this.prevButton || !this.nextButton) return;

        const atStart = this.currentPage <= 1;
        const atEnd = this.currentPage >= this.chaptersMap.size;

        this.prevButton.disabled = atStart;
        this.nextButton.disabled = atEnd;

        this.prevButton.setAttribute('aria-disabled', atStart);
        this.nextButton.setAttribute('aria-disabled', atEnd);
    }

    updateProgress(progress) {
        if (!this.progressBar) return;

        this.progressBar.style.setProperty('--progress', `${progress}%`);
        this.progressBar.setAttribute('aria-valuenow', progress);

        // Save progress
        this.storage.set('reading-progress', {
            page: this.currentPage,
            progress
        }).catch(error => {
            console.error('Error saving reading progress:', error);
        });
    }

    async savePosition() {
        try {
            await this.storage.set('current-page', this.currentPage);
        } catch (error) {
            console.error('Error saving reading position:', error);
        }
    }

    announceToScreenReader(message) {
        if (!message || !this.announcer) return;

        // Clear any existing announcement
        this.announcer.textContent = '';

        // Use requestAnimationFrame to ensure the clear has taken effect
        requestAnimationFrame(() => {
            this.announcer.textContent = message;
        });
    }

    // Cleanup method to prevent memory leaks
    destroy() {
        // Disconnect intersection observer
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }

        // Remove event listeners
        document.removeEventListener('keydown', this.boundHandleKeydown);
        this.element?.removeEventListener('touchstart', this.boundHandleTouchStart);
        this.element?.removeEventListener('touchend', this.boundHandleTouchEnd);

        // Remove navigation elements
        this.prevButton?.remove();
        this.nextButton?.remove();
        this.progressBar?.remove();
        this.copyButton?.remove();
        this.exportButton?.remove();

        // Remove announcer
        this.announcer?.remove();

        // Clear references
        this.element = null;
        this.storage = null;
        this.chaptersMap.clear();
        this.prevButton = null;
        this.nextButton = null;
        this.progressBar = null;
        this.copyButton = null;
        this.exportButton = null;
        this.announcer = null;
    }
}
