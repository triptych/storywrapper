// Export markdown processing function
export async function markdownToHtml(markdown) {
    if (!markdown) return ''; // Handle empty input gracefully

    try {
        // Use marked to convert markdown to HTML
        // marked already includes basic XSS protection
        return marked.parse(markdown);
    } catch (error) {
        console.error('Error converting markdown to HTML:', error);
        // Return fallback content instead of throwing
        return `<p class="error">Error rendering content. Please try again.</p>`;
    }
}

// Export additional utility functions
export function extractTableOfContents(html) {
    if (!html) return [];

    const div = document.createElement('div');
    div.innerHTML = html;
    const headers = Array.from(div.querySelectorAll('h1, h2, h3, h4, h5, h6'));

    return headers.map(header => ({
        level: parseInt(header.tagName[1]),
        text: header.textContent.trim(), // Trim whitespace
        id: header.id || generateSafeId(header.textContent) // Ensure ID exists
    }));
}

// Generate safe HTML IDs
function generateSafeId(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

export function getWordCount(markdown) {
    if (!markdown) return 0;

    // Remove code blocks
    const withoutCode = markdown.replace(/```[\s\S]*?```/g, '');

    // Remove inline code
    const withoutInlineCode = withoutCode.replace(/`.*?`/g, '');

    // Remove URLs
    const withoutUrls = withoutInlineCode.replace(/\[.*?\]\(.*?\)/g, '');

    // Remove HTML tags
    const withoutHtml = withoutUrls.replace(/<[^>]*>/g, '');

    // Count words, handling multiple spaces and special characters
    return withoutHtml
        .trim()
        .split(/[\s\n\r]+/)
        .filter(word => word.length > 0)
        .length;
}

export function estimateReadingTime(markdown) {
    if (!markdown) return 0;

    const wordsPerMinute = 200;
    const wordCount = getWordCount(markdown);

    // Account for code blocks (slower reading)
    const codeBlockCount = (markdown.match(/```[\s\S]*?```/g) || []).length;
    const codeBlockTime = codeBlockCount * 0.5; // Add 30 seconds per code block

    return Math.ceil(wordCount / wordsPerMinute + codeBlockTime);
}
