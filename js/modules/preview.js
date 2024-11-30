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

    handlePreviewUpdate = (e) => {
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
            const htmlContent = this.generateExportHTML();
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
            const htmlContent = this.generateExportHTML();
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

    async generateExportHTML() {
        // Get the CSS content
        const cssLink = document.querySelector('link[href*="main.css"]');
        const cssPath = cssLink?.getAttribute('href')?.split('?')[0]; // Remove cache-busting query
        let css = '';

        if (cssPath) {
            try {
                const cssResponse = await fetch(cssPath);
                if (cssResponse.ok) {
                    css = await cssResponse.text();
                }
            } catch (error) {
                console.warn('Failed to load CSS, using fallback styles');
                css = this.getFallbackStyles();
            }
        } else {
            css = this.getFallbackStyles();
        }

        const content = this.element.innerHTML;
        const title = document.querySelector('h1')?.textContent || 'Exported Story';

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        ${css}
        /* Export-specific styles */
        :root {
            --content-width: min(65ch, 100% - 2rem);
        }
        body {
            max-width: var(--content-width);
            margin: 2rem auto;
            padding: 0 1rem;
            font-family: system-ui, -apple-system, sans-serif;
            line-height: 1.6;
        }
        .preview-content {
            padding: 2rem;
            border-radius: 4px;
        }
        @media print {
            body {
                max-width: none;
                margin: 0;
                padding: 0;
            }
        }
    </style>
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
