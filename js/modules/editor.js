import { debounce } from '../utils/helpers.js';
import { markdownToHtml } from '../utils/markdown.js';

// Import CodeMirror from CDN to avoid module loading issues
const script1 = document.createElement('script');
script1.src = 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/6.65.7/codemirror.min.js';
document.head.appendChild(script1);

const script2 = document.createElement('script');
script2.src = 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/6.65.7/mode/markdown/markdown.min.js';
document.head.appendChild(script2);

export class Editor {
    constructor({ element, storage }) {
        this.element = element;
        this.storage = storage;
        this.wordCount = document.querySelector('.word-count');
        this.saveStatus = document.querySelector('.save-status');
        this.autosaveDelay = 1000; // 1 second
        this.editorSection = document.querySelector('.editor-section');
        this.zenModeButton = document.querySelector('[aria-label="Toggle Zen mode"]');

        // Wait for CodeMirror to load
        script1.onload = () => {
            script2.onload = () => {
                this.setupEditor();
                this.setupToolbar();
            };
        };
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
                'Enter': 'newlineAndIndentContinueMarkdownList'
            }
        });

        // Set up change handler
        this.editor.on('change', debounce(() => {
            this.handleInput();
        }, this.autosaveDelay));

        // Handle Escape key in Zen mode
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.editorSection.classList.contains('zen-mode')) {
                this.toggleZenMode();
            }
        });
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

        // Zen mode button
        if (this.zenModeButton) {
            this.zenModeButton.addEventListener('click', () => {
                this.toggleZenMode();
            });
        }
    }

    toggleZenMode() {
        this.editorSection.classList.toggle('zen-mode');
        const isZenMode = this.editorSection.classList.contains('zen-mode');

        if (this.zenModeButton) {
            this.zenModeButton.setAttribute('aria-label', isZenMode ? 'Exit Zen mode' : 'Toggle Zen mode');
        }

        // Announce to screen readers
        this.announceToScreenReader(isZenMode ? 'Entered Zen mode' : 'Exited Zen mode');

        // Focus the editor in Zen mode
        if (isZenMode) {
            this.editor.focus();
        }
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

    async handleInput() {
        const content = this.editor.getValue();

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
        const selection = this.editor.getSelection();
        const newText = `${wrapper}${selection}${endWrapper}`;
        this.editor.replaceSelection(newText);
        this.editor.focus();
    }

    async save(content) {
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
        this.editor.setValue(content);
    }

    getContent() {
        return this.editor.getValue();
    }

    // Public method to get selected text
    getSelection() {
        return this.editor.getSelection();
    }

    // Public method to insert text at cursor position
    insertAtCursor(text) {
        this.editor.replaceSelection(text);
    }
}
