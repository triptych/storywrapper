// Markdown processing utility
class MarkdownProcessor {
    constructor() {
        this.rules = {
            // Headers (ATX-style)
            h1: { pattern: /^# (.+)$/gm, replacement: '<h1>$1</h1>' },
            h2: { pattern: /^## (.+)$/gm, replacement: '<h2>$1</h2>' },
            h3: { pattern: /^### (.+)$/gm, replacement: '<h3>$1</h3>' },
            h4: { pattern: /^#### (.+)$/gm, replacement: '<h4>$1</h4>' },
            h5: { pattern: /^##### (.+)$/gm, replacement: '<h5>$1</h5>' },
            h6: { pattern: /^###### (.+)$/gm, replacement: '<h6>$1</h6>' },

            // Headers (Setext-style)
            setextH1: {
                pattern: /^(.+)\n=+\n/gm,
                replacement: '<h1>$1</h1>\n'
            },
            setextH2: {
                pattern: /^(.+)\n-+\n/gm,
                replacement: '<h2>$1</h2>\n'
            },

            // Emphasis
            boldAsterisk: { pattern: /\*\*(.+?)\*\*/g, replacement: '<strong>$1</strong>' },
            boldUnderscore: { pattern: /__(.+?)__/g, replacement: '<strong>$1</strong>' },
            italicAsterisk: { pattern: /\*(?!\*)([^\s*].*?[^\s*])\*/g, replacement: '<em>$1</em>' },
            italicUnderscore: { pattern: /_(?!_)([^\s_].*?[^\s_])_/g, replacement: '<em>$1</em>' },
            strikethrough: { pattern: /~~(.+?)~~/g, replacement: '<del>$1</del>' },

            // Lists (with nesting support)
            unorderedList: {
                pattern: /^( *)[*+-] (.+)$/gm,
                replacement: (match, indent, content) => {
                    const level = Math.floor(indent.length / 2);
                    return `<li data-level="${level}">${content}</li>`;
                },
                wrapper: {
                    tag: 'ul',
                    pattern: /(<li[^>]*>.*?<\/li>(\n|$)+)+/g,
                    process: (match) => {
                        return this.processNestedLists(match, 'ul');
                    }
                }
            },
            orderedList: {
                pattern: /^( *)\d+\. (.+)$/gm,
                replacement: (match, indent, content) => {
                    const level = Math.floor(indent.length / 2);
                    return `<li data-level="${level}">${content}</li>`;
                },
                wrapper: {
                    tag: 'ol',
                    pattern: /(<li[^>]*>.*?<\/li>(\n|$)+)+/g,
                    process: (match) => {
                        return this.processNestedLists(match, 'ol');
                    }
                }
            },

            // Links and Images
            referenceLink: {
                pattern: /\[([^\]]+)\]\[([^\]]*)\]/g,
                replacement: (match, text, id) => {
                    const refs = this.referenceMap;
                    const ref = refs[id.toLowerCase()] || refs[text.toLowerCase()];
                    if (ref) {
                        const title = ref.title ? ` title="${ref.title}"` : '';
                        return `<a href="${ref.url}"${title}>${text}</a>`;
                    }
                    return match;
                }
            },
            inlineLink: {
                pattern: /\[([^\]]+)\]\(([^)]+?)(?:\s+"([^"]+)")?\)/g,
                replacement: (match, text, url, title) => {
                    const titleAttr = title ? ` title="${title}"` : '';
                    return `<a href="${url}"${titleAttr}>${text}</a>`;
                }
            },
            referenceImage: {
                pattern: /!\[([^\]]+)\]\[([^\]]*)\]/g,
                replacement: (match, alt, id) => {
                    const refs = this.referenceMap;
                    const ref = refs[id.toLowerCase()] || refs[alt.toLowerCase()];
                    if (ref) {
                        const title = ref.title ? ` title="${ref.title}"` : '';
                        return `<img src="${ref.url}" alt="${alt}"${title}>`;
                    }
                    return match;
                }
            },
            inlineImage: {
                pattern: /!\[([^\]]+)\]\(([^)]+?)(?:\s+"([^"]+)")?\)/g,
                replacement: (match, alt, url, title) => {
                    const titleAttr = title ? ` title="${title}"` : '';
                    return `<img src="${url}" alt="${alt}"${titleAttr}>`;
                }
            },
            autoLink: {
                pattern: /<((?:https?|ftp):\/\/[^\s>]+)>/g,
                replacement: '<a href="$1">$1</a>'
            },
            autoEmail: {
                pattern: /<([^@\s>]+@[^@\s>]+\.[^@\s>]+)>/g,
                replacement: (match, email) => {
                    // Encode email to help prevent harvesting
                    const encoded = email.split('').map(char => {
                        const rand = Math.random();
                        return rand > 0.5 ?
                            `&#x${char.charCodeAt(0).toString(16)};` :
                            `&#${char.charCodeAt(0)};`;
                    }).join('');
                    return `<a href="mailto:${email}">${encoded}</a>`;
                }
            },

            // Code
            inlineCode: {
                pattern: /(`+)([^`].*?)\1/g,
                replacement: (match, backticks, code) => {
                    return `<code>${this.escapeHtml(code.trim())}</code>`;
                }
            },
            codeBlock: {
                pattern: /```([\s\S]*?)```|(?:^(?: {4}|\t).*\n?)+/gm,
                replacement: (match) => {
                    let code = match.startsWith('```') ?
                        match.slice(3, -3) :
                        match.replace(/^(?: {4}|\t)/gm, '');
                    return `<pre><code>${this.escapeHtml(code.trim())}</code></pre>`;
                }
            },

            // Blockquotes (with nesting support)
            blockquote: {
                pattern: /(^>.*\n?)+/gm,
                replacement: (match) => {
                    let content = match.replace(/^>\s?/gm, '');
                    // Process nested blockquotes
                    while (content.match(/^>/m)) {
                        content = content.replace(/(^>.*\n?)+/gm, (m) => {
                            return `<blockquote>${m.replace(/^>\s?/gm, '')}</blockquote>`;
                        });
                    }
                    return `<blockquote>${content}</blockquote>`;
                }
            },

            // Horizontal Rules
            hr: { pattern: /^(?:---|\*\*\*|___)\s*$/gm, replacement: '<hr>' },

            // Paragraphs
            paragraph: {
                pattern: /^(?!<[a-z]|\s*$)(.+(?:\n.+)*)\n*/gm,
                replacement: '<p>$1</p>'
            }
        };

        // Initialize reference map
        this.referenceMap = {};
    }

    async process(markdown) {
        try {
            let html = markdown;

            // Process backslash escapes
            html = this.processBackslashEscapes(html);

            // Extract reference definitions
            html = this.extractReferences(html);

            // Process each rule
            for (const [name, rule] of Object.entries(this.rules)) {
                html = this.applyRule(html, rule);
            }

            // Clean up multiple newlines
            html = html.replace(/\n{2,}/g, '\n');

            // Process inline HTML
            html = this.processInlineHtml(html);

            return html;
        } catch (error) {
            console.error('Error processing markdown:', error);
            throw error;
        }
    }

    processBackslashEscapes(text) {
        const escapeChars = '\\`*_{}[]()#+-.!';
        return text.replace(new RegExp(`\\\\([${escapeChars}])`, 'g'), '$1');
    }

    extractReferences(text) {
        const refPattern = /^\[([^\]]+)\]:\s*(\S+)(?:\s+"([^"]+)")?\s*$/gm;
        return text.replace(refPattern, (match, id, url, title) => {
            this.referenceMap[id.toLowerCase()] = { url, title };
            return '';
        });
    }

    processNestedLists(match, tag) {
        const items = match.match(/<li[^>]*>.*?<\/li>/g) || [];
        const stack = [{ level: -1, content: [] }];

        items.forEach(item => {
            const levelMatch = item.match(/data-level="(\d+)"/);
            if (!levelMatch) return;

            const level = parseInt(levelMatch[1]);
            const cleanItem = item.replace(/\sdata-level="\d+"/, '');

            while (stack.length > 1 && stack[stack.length - 1].level >= level) {
                const list = stack.pop();
                stack[stack.length - 1].content.push(
                    `<${tag}>${list.content.join('')}</${tag}>`
                );
            }

            if (level > stack[stack.length - 1].level) {
                stack.push({ level, content: [cleanItem] });
            } else {
                stack[stack.length - 1].content.push(cleanItem);
            }
        });

        while (stack.length > 1) {
            const list = stack.pop();
            stack[stack.length - 1].content.push(
                `<${tag}>${list.content.join('')}</${tag}>`
            );
        }

        return stack[0].content.join('');
    }

    processInlineHtml(html) {
        // Preserve block-level HTML
        return html.replace(/<(\/?)(div|table|tr|td|th|pre|p|h[1-6]|ul|ol|li|blockquote|hr)[^>]*>/g,
            (match, slash, tag) => {
                return `<!--${match}-->`;
            })
            .replace(/<!--<(\/?)(div|table|tr|td|th|pre|p|h[1-6]|ul|ol|li|blockquote|hr)[^>]*>-->/g,
            (match, slash, tag) => {
                return match.slice(4, -3);
            });
    }

    applyRule(text, rule) {
        if (rule.wrapper) {
            // Handle wrapped elements (like lists)
            text = text.replace(rule.pattern, rule.replacement);
            text = text.replace(
                rule.wrapper.pattern,
                rule.wrapper.process || (match => `<${rule.wrapper.tag}>${match}</${rule.wrapper.tag}>`)
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
        return enhanceAccessibility(html);
    } catch (error) {
        console.error('Error converting markdown to HTML:', error);
        throw error;
    }
}

// Enhance accessibility
function enhanceAccessibility(html) {
    const div = document.createElement('div');
    div.innerHTML = html;

    // Add ARIA roles where needed
    const roleMap = {
        blockquote: 'blockquote',
        pre: 'code',
        nav: 'navigation'
    };

    // Add roles and other accessibility attributes
    div.querySelectorAll('*').forEach(el => {
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

    return div.innerHTML;
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
