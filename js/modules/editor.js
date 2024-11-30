import { debounce } from '../utils/helpers.js';
import { markdownToHtml } from '../utils/markdown.js';

export class Editor {
    constructor({ element, storage }) {
        this.element = element;
        this.storage = storage;
        this.wordCount = document.querySelector('.word-count');
        this.saveStatus = document.querySelector('.save-status');
        this.autosaveDelay = 1000; // 1 second
        this.editorSection = document.querySelector('.editor-section');
        this.zenModeButton = document.querySelector('[aria-label="Toggle Zen mode"]');
        this.announcer = this.createAnnouncer();
        this.boundHandleEscape = this.handleEscape.bind(this);

        // Initialize editor immediately since CodeMirror is already loaded
        this.setupEditor();
        this.setupToolbar();
    }

    createAnnouncer() {
        const announcer = document.createElement('div');
        announcer.className = 'sr-only editor-announcer';
        announcer.setAttribute('role', 'status');
        announcer.setAttribute('aria-live', 'polite');
        document.body.appendChild(announcer);
        return announcer;
    }

    setupEditor() {
        // Initialize CodeMirror
        this.editor = CodeMirror(this.element, {
            mode: 'markdown',
            theme: 'default',
            lineNumbers: true,
            lineWrapping: true,
            autofocus: true,
            tabSize: 2,
            indentWithTabs: false,
            viewportMargin: Infinity,
            extraKeys: {
                'Enter': 'newlineAndIndentContinueMarkdownList',
                'Esc': () => {
                    if (this.editorSection.classList.contains('zen-mode')) {
                        this.toggleZenMode();
                    }
                }
            }
        });

        // Set up change handler with debounce
        this.debouncedHandleInput = debounce(() => {
            this.handleInput();
        }, this.autosaveDelay);

        this.editor.on('change', () => this.debouncedHandleInput());

        // Handle Escape key in Zen mode
        document.addEventListener('keydown', this.boundHandleEscape);
    }

    handleEscape(e) {
        if (e.key === 'Escape' && this.editorSection.classList.contains('zen-mode')) {
            this.toggleZenMode();
        }
    }

    setupToolbar() {
        const toolbar = document.querySelector('.editor-toolbar');
        if (!toolbar) return;

        // Store button references for cleanup
        this.toolbarButtons = {
            bold: toolbar.querySelector('[aria-label="Bold"]'),
            italic: toolbar.querySelector('[aria-label="Italic"]'),
            heading: toolbar.querySelector('[aria-label="Heading"]')
        };

        // Add event listeners
        this.toolbarButtons.bold?.addEventListener('click', () => this.wrapSelection('**'));
        this.toolbarButtons.italic?.addEventListener('click', () => this.wrapSelection('*'));
        this.toolbarButtons.heading?.addEventListener('click', () => this.wrapSelection('### ', ''));

        // Zen mode button
        this.zenModeButton?.addEventListener('click', () => this.toggleZenMode());
    }

    toggleZenMode() {
        const wasZenMode = this.editorSection.classList.contains('zen-mode');
        this.editorSection.classList.toggle('zen-mode');
        const isZenMode = this.editorSection.classList.contains('zen-mode');

        if (this.zenModeButton) {
            this.zenModeButton.setAttribute('aria-label', isZenMode ? 'Exit Zen mode' : 'Enter Zen mode');
            this.zenModeButton.setAttribute('aria-pressed', isZenMode);
        }

        // Only announce if state actually changed
        if (wasZenMode !== isZenMode) {
            this.announceToScreenReader(isZenMode ? 'Entered Zen mode' : 'Exited Zen mode');
        }

        // Focus the editor in Zen mode
        if (isZenMode) {
            this.editor.focus();
        }
    }

    announceToScreenReader(message) {
        if (!message) return;

        // Clear any existing announcement
        this.announcer.textContent = '';

        // Use requestAnimationFrame to ensure the clear has taken effect
        requestAnimationFrame(() => {
            this.announcer.textContent = message;
        });
    }

    async handleInput() {
        const content = this.editor.getValue();

        // Update word count
        this.updateWordCount(content);

        try {
            // Convert markdown to HTML for preview
            const html = await markdownToHtml(content);

            // Dispatch custom event with resolved HTML
            const previewEvent = new CustomEvent('preview-update', {
                detail: { html: html }  // Pass the resolved HTML, not the promise
            });
            window.dispatchEvent(previewEvent);

            // Save content
            await this.save(content);
        } catch (error) {
            console.error('Error handling input:', error);
            this.updateSaveStatus('Error processing content', true);
        }
    }

    updateWordCount(content) {
        if (!this.wordCount) return;

        const words = content.trim().split(/\s+/).filter(word => word.length > 0);
        const count = words.length;
        this.wordCount.textContent = `${count} word${count !== 1 ? 's' : ''}`;
        this.wordCount.setAttribute('aria-label', `Word count: ${count}`);
    }

    wrapSelection(wrapper, endWrapper = wrapper) {
        const selection = this.editor.getSelection();
        if (!selection && !endWrapper) {
            // If no selection and no endWrapper (like for headings), insert at cursor
            const cursor = this.editor.getCursor();
            this.editor.replaceRange(wrapper, cursor);
            this.editor.setCursor(cursor.line, cursor.ch + wrapper.length);
        } else {
            const newText = `${wrapper}${selection}${endWrapper}`;
            this.editor.replaceSelection(newText);
            if (!selection) {
                // Place cursor between wrapper tags if no selection
                const cursor = this.editor.getCursor();
                this.editor.setCursor(cursor.line, cursor.ch - endWrapper.length);
            }
        }
        this.editor.focus();
    }

    async save(content) {
        if (this.saveInProgress) return;

        this.saveInProgress = true;
        try {
            this.updateSaveStatus('Saving...');
            await this.storage.set('content', content);
            this.updateSaveStatus('All changes saved');
        } catch (error) {
            console.error('Error saving content:', error);
            this.updateSaveStatus('Error saving changes', true);
        } finally {
            this.saveInProgress = false;
        }
    }

    updateSaveStatus(message, isError = false) {
        if (!this.saveStatus) return;

        this.saveStatus.textContent = message;
        this.saveStatus.classList.toggle('error', isError);

        if (isError) {
            this.saveStatus.setAttribute('role', 'alert');
            this.announceToScreenReader(message);
        } else {
            this.saveStatus.removeAttribute('role');
        }
    }

    setContent(content) {
        if (typeof content !== 'string') {
            console.error('Invalid content type provided to editor');
            return;
        }
        this.editor.setValue(content);
        // Trigger initial preview update
        this.handleInput();
    }

    getContent() {
        return this.editor.getValue();
    }

    getSelection() {
        return this.editor.getSelection();
    }

    insertAtCursor(text) {
        if (typeof text !== 'string') {
            console.error('Invalid text type provided for insertion');
            return;
        }
        this.editor.replaceSelection(text);
    }

    hasUnsavedChanges() {
        return this.editor.getValue() !== this.lastSavedContent;
    }

    // Cleanup method to prevent memory leaks
    destroy() {
        // Remove event listeners
        document.removeEventListener('keydown', this.boundHandleEscape);

        // Clear debounced handler
        if (this.debouncedHandleInput.cancel) {
            this.debouncedHandleInput.cancel();
        }

        // Remove the announcer
        this.announcer.remove();

        // Clean up CodeMirror instance
        if (this.editor) {
            this.editor.toTextArea();
        }

        // Clear references
        this.editor = null;
        this.element = null;
        this.storage = null;
        this.wordCount = null;
        this.saveStatus = null;
        this.editorSection = null;
        this.zenModeButton = null;
        this.toolbarButtons = null;
    }
}
