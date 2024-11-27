// Markdown processing utility
class MarkdownProcessor {
    constructor() {
        // Initialize reference map
        this.referenceMap = {};
    }

    async process(markdown) {
        try {
            let html = markdown;

            // Extract reference definitions first
            html = this.extractReferences(html);
            console.log('Reference map:', this.referenceMap);

            // Process each type of markdown element
            html = this.processReferences(html);
            html = this.processHeaders(html);
            html = this.processLists(html);
            html = this.processCodeBlocks(html);
            html = this.processBlockquotes(html);
            html = this.processEmphasis(html);
            html = this.processHorizontalRules(html);
            html = this.processAutoLinks(html);
            html = this.processParagraphs(html);

            return html.trim();
        } catch (error) {
            console.error('Error processing markdown:', error);
            throw error;
        }
    }

    extractReferences(text) {
        const refPattern = /^\[([^\]]+)\]:\s*(?:<([^>]+)>|(\S+))(?:\s+["'](.+?)["']|\s+\((.+?)\))?\s*$/gm;
        let match;

        while ((match = refPattern.exec(text)) !== null) {
            const [full, id, bracketUrl, plainUrl, quotedTitle, parenTitle] = match;
            const url = bracketUrl || plainUrl;
            const title = quotedTitle || parenTitle || '';
            this.referenceMap[id.toLowerCase()] = { url, title };
            console.log('Added reference:', { id: id.toLowerCase(), url, title });
        }

        return text.replace(refPattern, '');
    }

    processReferences(text) {
        // Process reference-style links
        text = text.replace(/\[([^\]]+)\](?:\[([^\]]*)\])?(?!\()/g, (match, text, id) => {
            const refId = (!id || id === '') ? text : id;
            const ref = this.referenceMap[refId.toLowerCase()];
            console.log('Processing reference:', { text, id, ref });

            if (ref) {
                const title = ref.title ? ` title="${ref.title}"` : '';
                return `<a href="${ref.url}"${title}>${text}</a>`;
            }
            return match;
        });

        // Process inline links
        text = text.replace(/\[([^\]]+)\]\(([^)]+?)(?:\s+"([^"]+)")?\)/g, (match, text, url, title) => {
            const titleAttr = title ? ` title="${title}"` : '';
            return `<a href="${url}"${titleAttr}>${text}</a>`;
        });

        return text;
    }

    processHeaders(text) {
        // ATX-style headers
        text = text.replace(/^(#{1,6})\s+(.+)$/gm, (match, hashes, content) => {
            const level = hashes.length;
            return `<h${level}>${content}</h${level}>`;
        });

        // Setext-style headers
        text = text.replace(/^(.+)\n=+$/gm, '<h1>$1</h1>');
        text = text.replace(/^(.+)\n-+$/gm, '<h2>$1</h2>');

        return text;
    }

    processLists(text) {
        // Unordered lists
        text = text.replace(/^[*+-]\s+(.+)$/gm, '<li>$1</li>');
        text = text.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

        // Ordered lists
        text = text.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
        text = text.replace(/(<li>.*<\/li>\n?)+/g, '<ol>$&</ol>');

        return text;
    }

    processCodeBlocks(text) {
        // Fenced code blocks
        text = text.replace(/```([\s\S]*?)```/g, (match, code) => {
            return `<pre><code>${this.escapeHtml(code.trim())}</code></pre>`;
        });

        // Indented code blocks
        text = text.replace(/(?:^( {4}|\t).*\n?)+/gm, (match) => {
            const code = match.replace(/^( {4}|\t)/gm, '');
            return `<pre><code>${this.escapeHtml(code.trim())}</code></pre>`;
        });

        // Inline code
        text = text.replace(/`([^`]+)`/g, (match, code) => {
            return `<code>${this.escapeHtml(code)}</code>`;
        });

        return text;
    }

    processBlockquotes(text) {
        return text.replace(/(^>.*\n?)+/gm, (match) => {
            const content = match.replace(/^>\s?/gm, '');
            return `<blockquote>${content}</blockquote>`;
        });
    }

    processEmphasis(text) {
        // Bold
        text = text.replace(/\*\*(.+?)\*\*|__(.+?)__/g, '<strong>$1$2</strong>');

        // Italic
        text = text.replace(/\*(.+?)\*|_(.+?)_/g, '<em>$1$2</em>');

        return text;
    }

    processHorizontalRules(text) {
        return text.replace(/^(?:---|\*\*\*|___)\s*$/gm, '<hr>');
    }

    processAutoLinks(text) {
        // URLs
        text = text.replace(/<(https?:\/\/[^>]+)>/g, '<a href="$1">$1</a>');

        // Email addresses
        text = text.replace(/<([^@>]+@[^>]+)>/g, (match, email) => {
            return `<a href="mailto:${email}">${email}</a>`;
        });

        return text;
    }

    processParagraphs(text) {
        return text.replace(/^(?!<(?:h[1-6]|ul|ol|li|blockquote|pre|hr))[^\n]+(?:\n(?!(?:<(?:h[1-6]|ul|ol|li|blockquote|pre|hr)|\n))[^\n]+)*/gm, '<p>$&</p>');
    }

    escapeHtml(text) {
        const escapeMap = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, char => escapeMap[char]);
    }
}

// Create singleton instance
const processor = new MarkdownProcessor();

// Export markdown processing function
export async function markdownToHtml(markdown) {
    try {
        return await processor.process(markdown);
    } catch (error) {
        console.error('Error converting markdown to HTML:', error);
        throw error;
    }
}

// Export additional utility functions
export function extractTableOfContents(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    const headers = Array.from(div.querySelectorAll('h1, h2, h3, h4, h5, h6'));

    return headers.map(header => ({
        level: parseInt(header.tagName[1]),
        text: header.textContent,
        id: header.id
    }));
}

export function getWordCount(markdown) {
    // Remove code blocks
    const withoutCode = markdown.replace(/```[\s\S]*?```/g, '');

    // Remove inline code
    const withoutInlineCode = withoutCode.replace(/`.*?`/g, '');

    // Remove URLs
    const withoutUrls = withoutInlineCode.replace(/\[.*?\]\(.*?\)/g, '');

    // Count words
    return withoutUrls.trim().split(/\s+/).length;
}

export function estimateReadingTime(markdown) {
    const wordsPerMinute = 200;
    const wordCount = getWordCount(markdown);
    return Math.ceil(wordCount / wordsPerMinute);
}
