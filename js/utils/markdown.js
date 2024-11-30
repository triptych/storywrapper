// Export markdown processing function
export async function markdownToHtml(markdown) {
    try {
        return marked.parse(markdown);
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
