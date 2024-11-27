// Markdown processing utility
class MarkdownProcessor {
    constructor() {
        this.rules = {
            // Headers
            h1: { pattern: /^# (.+)$/gm, replacement: '<h1>$1</h1>' },
            h2: { pattern: /^## (.+)$/gm, replacement: '<h2>$1</h2>' },
            h3: { pattern: /^### (.+)$/gm, replacement: '<h3>$1</h3>' },
            h4: { pattern: /^#### (.+)$/gm, replacement: '<h4>$1</h4>' },
            h5: { pattern: /^##### (.+)$/gm, replacement: '<h5>$1</h5>' },
            h6: { pattern: /^###### (.+)$/gm, replacement: '<h6>$1</h6>' },

            // Emphasis
            bold: { pattern: /\*\*(.+?)\*\*/g, replacement: '<strong>$1</strong>' },
            italic: { pattern: /\*(.+?)\*/g, replacement: '<em>$1</em>' },
            strikethrough: { pattern: /~~(.+?)~~/g, replacement: '<del>$1</del>' },

            // Lists
            unorderedList: {
                pattern: /^[*+-] (.+)$/gm,
                replacement: '<li>$1</li>',
                wrapper: { tag: 'ul', pattern: /(<li>.*?<\/li>(\n|$)+)+/g }
            },
            orderedList: {
                pattern: /^\d+\. (.+)$/gm,
                replacement: '<li>$1</li>',
                wrapper: { tag: 'ol', pattern: /(<li>.*?<\/li>(\n|$)+)+/g }
            },

            // Links and Images
            link: { pattern: /\[(.+?)\]\((.+?)\)/g, replacement: '<a href="$2">$1</a>' },
            image: { pattern: /!\[(.+?)\]\((.+?)\)/g, replacement: '<img src="$2" alt="$1">' },

            // Code
            inlineCode: { pattern: /`(.+?)`/g, replacement: '<code>$1</code>' },
            codeBlock: {
                pattern: /```([\s\S]*?)```/g,
                replacement: (match, code) => `<pre><code>${this.escapeHtml(code.trim())}</code></pre>`
            },

            // Blockquotes
            blockquote: {
                pattern: /^> (.+)$/gm,
                replacement: '<blockquote>$1</blockquote>'
            },

            // Horizontal Rules
            hr: { pattern: /^(?:---|\*\*\*|___)\s*$/gm, replacement: '<hr>' },

            // Paragraphs
            paragraph: {
                pattern: /^(?!<[a-z]|\s*$)(.+)\s*$/gm,
                replacement: '<p>$1</p>'
            }
        };
    }

    async process(markdown) {
        try {
            let html = markdown;

            // Process each rule
            for (const [name, rule] of Object.entries(this.rules)) {
                html = this.applyRule(html, rule);
            }

            // Clean up multiple newlines
            html = html.replace(/\n{2,}/g, '\n');

            return html;
        } catch (error) {
            console.error('Error processing markdown:', error);
            throw error;
        }
    }

    applyRule(text, rule) {
        if (rule.wrapper) {
            // Handle wrapped elements (like lists)
            text = text.replace(rule.pattern, rule.replacement);
            text = text.replace(
                rule.wrapper.pattern,
                match => `<${rule.wrapper.tag}>${match}</${rule.wrapper.tag}>`
            );
        } else {
            // Handle simple replacements
            text = text.replace(rule.pattern, rule.replacement);
        }
        return text;
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
        // Pre-process
        let text = markdown.trim();

        // Convert markdown to HTML
        const html = await processor.process(text);

        // Post-process
        return sanitizeAndEnhance(html);
    } catch (error) {
        console.error('Error converting markdown to HTML:', error);
        throw error;
    }
}

// Sanitize and enhance HTML
function sanitizeAndEnhance(html) {
    // Create a new DOMParser
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Add accessibility enhancements
    enhanceAccessibility(doc.body);

    // Add semantic structure
    enhanceSemantics(doc.body);

    // Return enhanced HTML
    return doc.body.innerHTML;
}

// Enhance accessibility
function enhanceAccessibility(element) {
    // Add ARIA roles where needed
    const roleMap = {
        blockquote: 'blockquote',
        pre: 'code',
        nav: 'navigation'
    };

    // Add roles and other accessibility attributes
    element.querySelectorAll('*').forEach(el => {
        const tagName = el.tagName.toLowerCase();

        if (roleMap[tagName]) {
            el.setAttribute('role', roleMap[tagName]);
        }

        // Make links more accessible
        if (tagName === 'a') {
            if (el.getAttribute('href')?.startsWith('http')) {
                el.setAttribute('rel', 'noopener noreferrer');
                el.setAttribute('target', '_blank');
                el.setAttribute('aria-label', `${el.textContent} (opens in new tab)`);
            }
        }

        // Make images more accessible
        if (tagName === 'img' && !el.getAttribute('alt')) {
            el.setAttribute('alt', '');
            el.setAttribute('role', 'presentation');
        }
    });
}

// Enhance semantic structure
function enhanceSemantics(element) {
    // Create a temporary container
    const tempContainer = document.createElement('div');

    // Get all headers
    const headers = Array.from(element.querySelectorAll('h1, h2, h3, h4, h5, h6'));

    // Process each header and its content
    headers.forEach((header, index) => {
        const article = document.createElement('article');
        const headerClone = header.cloneNode(true);
        article.appendChild(headerClone);

        // Get content until next header or end
        let currentNode = header.nextElementSibling;
        const nextHeader = headers[index + 1];

        while (currentNode && currentNode !== nextHeader) {
            const clone = currentNode.cloneNode(true);
            article.appendChild(clone);
            currentNode = currentNode.nextElementSibling;
        }

        tempContainer.appendChild(article);
    });

    // Clear original content and append enhanced structure
    element.innerHTML = tempContainer.innerHTML;
}

// Export additional utility functions
export function extractTableOfContents(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const headers = Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6'));

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
