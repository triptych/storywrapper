import { debounce } from '../utils/helpers.js';
import { markdownToHtml } from '../utils/markdown.js';

export class Editor {
    constructor({ element, storage }) {
        this.element = element;
        this.storage = storage;
        this.wordCount = document.querySelector('.word-count');
        this.saveStatus = document.querySelector('.save-status');
        this.autosaveDelay = 1000; // 1 second

        this.setupEditor();
        this.setupToolbar();
    }

    setupEditor() {
        // Initialize editor event listeners
        this.element.addEventListener('input', debounce(() => {
            this.handleInput();
        }, this.autosaveDelay));

        // Handle paste events to clean up content
        this.element.addEventListener('paste', (e) => {
            e.preventDefault();
            const text = e.clipboardData.getData('text/plain');
            document.execCommand('insertText', false, text);
        });

        // Handle drag and drop
        this.element.addEventListener('drop', (e) => {
            e.preventDefault();
            const text = e.dataTransfer.getData('text/plain');
            this.element.value = text;
            this.handleInput();
        });

        // Setup auto-resize
        this.element.addEventListener('input', () => {
            this.autoResize();
        });

        // Initial auto-resize
        this.autoResize();
    }

    setupToolbar() {
        const toolbar = document.querySelector('.editor-toolbar');

        // Bold button
        toolbar.querySelector('[aria-label="Bold"]').addEventListener('click', () => {
            this.wrapSelection('**');
        });

        // Italic button
        toolbar.querySelector('[aria-label="Italic"]').addEventListener('click', () => {
            this.wrapSelection('*');
        });

        // Heading button
        toolbar.querySelector('[aria-label="Heading"]').addEventListener('click', () => {
            this.wrapSelection('### ', '');
        });
    }

    async handleInput() {
        const content = this.element.value;

        // Update word count
        this.updateWordCount(content);

        // Convert markdown to HTML for preview
        const html = await markdownToHtml(content);

        // Dispatch custom event for preview update
        window.dispatchEvent(new CustomEvent('preview-update', {
            detail: { html }
        }));

        // Save content
        this.save(content);
    }

    updateWordCount(content) {
        const words = content.trim().split(/\s+/).filter(word => word.length > 0);
        const count = words.length;
        this.wordCount.textContent = `${count} word${count !== 1 ? 's' : ''}`;
        this.wordCount.setAttribute('aria-label', `Word count: ${count}`);
    }

    wrapSelection(wrapper, endWrapper = wrapper) {
        const start = this.element.selectionStart;
        const end = this.element.selectionEnd;
        const selection = this.element.value.substring(start, end);
        const newText = `${wrapper}${selection}${endWrapper}`;

        // Insert the wrapped text
        document.execCommand('insertText', false, newText);

        // Update the preview
        this.handleInput();

        // Restore focus
        this.element.focus();
    }

    autoResize() {
        this.element.style.height = 'auto';
        this.element.style.height = `${this.element.scrollHeight}px`;
    }

    async save(content = this.element.value) {
        try {
            this.updateSaveStatus('Saving...');
            await this.storage.set('content', content);
            this.updateSaveStatus('All changes saved');
        } catch (error) {
            console.error('Error saving content:', error);
            this.updateSaveStatus('Error saving changes', true);
        }
    }

    updateSaveStatus(message, isError = false) {
        this.saveStatus.textContent = message;
        this.saveStatus.classList.toggle('error', isError);

        // Announce save status to screen readers
        if (isError) {
            this.saveStatus.setAttribute('role', 'alert');
        }
    }

    setContent(content) {
        this.element.value = content;
        this.handleInput();
    }

    getContent() {
        return this.element.value;
    }

    // Public method to get selected text
    getSelection() {
        return this.element.value.substring(
            this.element.selectionStart,
            this.element.selectionEnd
        );
    }

    // Public method to insert text at cursor position
    insertAtCursor(text) {
        const start = this.element.selectionStart;
        const end = this.element.selectionEnd;
        const before = this.element.value.substring(0, start);
        const after = this.element.value.substring(end);

        this.element.value = before + text + after;
        this.element.selectionStart = this.element.selectionEnd = start + text.length;

        this.handleInput();
    }
}
