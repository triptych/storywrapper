export class Preview {
    constructor({ element, storage }) {
        this.element = element;
        this.storage = storage;
        this.currentPage = 1;
        this.chaptersMap = new Map();

        this.setupPreview();
        this.setupEventListeners();
    }

    setupPreview() {
        // Add necessary ARIA attributes
        this.element.setAttribute('role', 'region');
        this.element.setAttribute('aria-label', 'Story preview');

        // Create navigation controls
        this.createNavigationControls();

        // Add copy and export buttons
        const previewControls = document.querySelector('.preview-controls');

        // Add copy button
        const copyButton = document.createElement('button');
        copyButton.className = 'copy-button';
        copyButton.setAttribute('aria-label', 'Copy HTML to clipboard');
        copyButton.textContent = 'Copy HTML';
        copyButton.addEventListener('click', () => this.copyHTML());
        previewControls.appendChild(copyButton);

        // Add export button
        const exportButton = document.createElement('button');
        exportButton.className = 'export-button';
        exportButton.setAttribute('aria-label', 'Export as HTML');
        exportButton.textContent = 'Export HTML';
        exportButton.addEventListener('click', () => this.exportHTML());
        previewControls.appendChild(exportButton);
    }

    async copyHTML() {
        try {
            // Get the preview content
            const content = this.element.innerHTML;
            const title = document.querySelector('h1')?.textContent || 'Exported Story';

            const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            max-width: 65ch;
            margin: 2rem auto;
            padding: 0 1rem;
            font-family: system-ui, -apple-system, sans-serif;
            line-height: 1.6;
        }
    </style>
</head>
<body>
    ${content}
</body>
</html>`;

            await navigator.clipboard.writeText(htmlTemplate);
            this.announceToScreenReader('HTML copied to clipboard');
        } catch (error) {
            console.error('Error copying HTML:', error);
            this.announceToScreenReader('Error copying HTML to clipboard');
        }
    }

    setupEventListeners() {
        // Listen for content updates from editor
        window.addEventListener('preview-update', (e) => {
            this.update(e.detail.html);
        });

        // Handle preview mode toggle
        const modeToggle = document.querySelector('.preview-mode-toggle');
        modeToggle?.addEventListener('click', () => this.togglePreviewMode());

        // Handle keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (this.isPreviewMode()) {
                if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    this.nextPage();
                } else if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    this.previousPage();
                }
            }
        });

        // Handle touch events for mobile
        let touchStartX = 0;
        this.element.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
        }, { passive: true });

        this.element.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].clientX;
            const diff = touchStartX - touchEndX;

            if (Math.abs(diff) > 50) { // Minimum swipe distance
                if (diff > 0) {
                    this.nextPage();
                } else {
                    this.previousPage();
                }
            }
        }, { passive: true });

        // Handle intersection observer for reading progress
        this.setupIntersectionObserver();
    }

    createNavigationControls() {
        const nav = document.createElement('nav');
        nav.className = 'preview-navigation';
        nav.setAttribute('aria-label', 'Chapter navigation');

        const prevButton = document.createElement('button');
        prevButton.className = 'nav-button prev';
        prevButton.setAttribute('aria-label', 'Previous chapter');
        prevButton.addEventListener('click', () => this.previousPage());

        const nextButton = document.createElement('button');
        nextButton.className = 'nav-button next';
        nextButton.setAttribute('aria-label', 'Next chapter');
        nextButton.addEventListener('click', () => this.nextPage());

        const progress = document.createElement('div');
        progress.className = 'reading-progress';
        progress.setAttribute('role', 'progressbar');
        progress.setAttribute('aria-valuemin', '0');
        progress.setAttribute('aria-valuemax', '100');

        nav.appendChild(prevButton);
        nav.appendChild(progress);
        nav.appendChild(nextButton);

        this.element.parentNode.insertBefore(nav, this.element.nextSibling);
        this.progressBar = progress;
    }

    setupIntersectionObserver() {
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
    }

    update(html) {
        // Parse the HTML content
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Process chapters
        this.processChapters(doc);

        // Update the preview content
        this.element.innerHTML = '';
        this.element.appendChild(doc.body);

        // Update navigation state
        this.updateNavigationState();

        // Save current position
        this.savePosition();

        // Announce update to screen readers
        this.announceUpdate();
    }

    processChapters(doc) {
        // Clear existing chapters
        this.chaptersMap.clear();

        // Find all headings
        const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');

        headings.forEach((heading, index) => {
            // Create chapter entry
            const chapter = {
                id: `chapter-${index}`,
                title: heading.textContent,
                element: heading.parentElement
            };

            // Add to chapters map
            this.chaptersMap.set(chapter.id, chapter);

            // Add necessary attributes
            heading.id = chapter.id;
            heading.setAttribute('tabindex', '-1');
        });
    }

    async exportHTML() {
        try {
            // Show loading state
            this.announceToScreenReader('Preparing export...');

            // Get the CSS content
            const cssLink = document.querySelector('link[href*="main.css"]');
            const cssPath = cssLink.getAttribute('href').split('?')[0]; // Remove cache-busting query
            const cssResponse = await fetch(cssPath);
            if (!cssResponse.ok) throw new Error('Failed to load CSS');
            const css = await cssResponse.text();

            // Get the preview content
            const content = this.element.innerHTML;
            const title = document.querySelector('h1')?.textContent || 'Exported Story';

            const htmlTemplate = `<!DOCTYPE html>
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
        }
        .preview-content {
            background-color: var(--color-secondary-light);
            padding: 2rem;
            border-radius: 4px;
        }
        @media (prefers-color-scheme: dark) {
            .preview-content {
                background-color: var(--color-secondary-dark);
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

            // Download the file
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `story-${timestamp}.html`;
            const { downloadFile } = await import('../utils/helpers.js');
            downloadFile(htmlTemplate, filename, 'text/html');

            // Announce success
            this.announceToScreenReader('Story exported successfully');
        } catch (error) {
            console.error('Error exporting HTML:', error);
            this.announceToScreenReader('Error exporting HTML file');
        }
    }

    togglePreviewMode() {
        const previewSection = document.querySelector('.preview-section');
        previewSection.classList.toggle('fullscreen');

        const isFullscreen = previewSection.classList.contains('fullscreen');
        document.body.style.overflow = isFullscreen ? 'hidden' : '';

        // Update button text and ARIA labels
        const toggle = document.querySelector('.preview-mode-toggle');
        toggle.textContent = isFullscreen ? 'Exit Preview' : 'Preview Mode';
        toggle.setAttribute('aria-label', isFullscreen ? 'Exit preview mode' : 'Enter preview mode');

        // Announce mode change
        this.announceToScreenReader(`${isFullscreen ? 'Entered' : 'Exited'} preview mode`);
    }

    isPreviewMode() {
        return document.querySelector('.preview-section').classList.contains('fullscreen');
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
        if (chapter) {
            const element = document.getElementById(chapter.id);
            element?.scrollIntoView({ behavior: 'smooth' });

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
        const prevButton = document.querySelector('.nav-button.prev');
        const nextButton = document.querySelector('.nav-button.next');

        prevButton.disabled = this.currentPage <= 1;
        nextButton.disabled = this.currentPage >= this.chaptersMap.size;

        // Update ARIA labels
        prevButton.setAttribute('aria-disabled', this.currentPage <= 1);
        nextButton.setAttribute('aria-disabled', this.currentPage >= this.chaptersMap.size);
    }

    updateProgress(progress) {
        if (this.progressBar) {
            this.progressBar.style.setProperty('--progress', `${progress}%`);
            this.progressBar.setAttribute('aria-valuenow', progress);

            // Save progress
            this.storage.set('reading-progress', {
                page: this.currentPage,
                progress
            });
        }
    }

    async savePosition() {
        try {
            await this.storage.set('current-page', this.currentPage);
        } catch (error) {
            console.error('Error saving reading position:', error);
        }
    }

    announceUpdate() {
        const announcer = document.createElement('div');
        announcer.className = 'sr-only';
        announcer.setAttribute('role', 'status');
        announcer.setAttribute('aria-live', 'polite');
        announcer.textContent = 'Preview updated';

        document.body.appendChild(announcer);
        setTimeout(() => announcer.remove(), 1000);
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
