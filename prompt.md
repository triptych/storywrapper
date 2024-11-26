# StoryWrapper

A modern, progressive web application for writing and publishing novels as self-contained websites.

## Core Features

### Writing Interface

- Markdown-based novel writing interface
- Real-time preview
- Chapter organization and management
- Auto-save functionality
- Word count and progress tracking
- Offline editing capabilities

### Generated Website Features

- Clean, responsive design using CSS Grid and Container Queries
- Light and dark mode toggle with smooth transitions
- Font selection (offering carefully curated readable fonts)
- Chapter navigation with skip links
- Page-by-page reading mode
- Bookmark system
- Progress tracking
- Smooth scroll animations
- Mobile-friendly interface with native-like gestures
- PWA installation support
- Offline reading capability

## Technical Requirements

### Progressive Web App Features

- Service Worker implementation for offline functionality
- Web App Manifest for native app-like experience
- Install prompts for add-to-homescreen
- Background sync for drafts and changes
- Push notifications for updates (optional)
- Share API integration for social sharing
- Native file system API integration where supported

### Frontend Architecture

- Implement using modern JavaScript best practices
- Utilize functional programming paradigms
- Employ arrow functions for cleaner syntax
- Build modular, reusable components
- Implement proper state management
- Support native browser features (share, file system API)

### Accessibility Requirements

- WCAG 2.1 Level AA compliance
- Proper heading hierarchy
- ARIA roles and landmarks
- Focus management system
- Skip navigation links
- Keyboard shortcuts with documentation
- Screen reader announcements
- High contrast mode support
- Motion reduction preferences
- Clear error messaging
- Form validation feedback
- Touch target sizing (minimum 44x44px)
- Visible focus indicators

### Responsive Design

- Mobile-first approach
- Container queries for component-level responsiveness
- Fluid typography using clamp()
- Responsive spacing using relative units
- Adaptive layouts with CSS Grid
- Touch-friendly interactions
- Device orientation handling
- Viewport-aware design
- Safe area insets for notched devices
- Responsive images with srcset and sizes

### Styling

- Use CSS Grid and Flexbox for responsive layouts
- Implement smooth transitions and animations
- Ensure consistent spacing and typography
- Support both light and dark themes
- Provide multiple font options optimized for reading
- Use CSS custom properties for theming
- Implement reduced motion alternatives
- Support system color scheme preferences
- Handle high contrast mode gracefully

### Markdown Processing

- Parse Markdown content into semantic HTML
- Support basic Markdown syntax
- Handle chapter breaks and sections
- Generate accessible table of contents
- Support internal linking between chapters
- Preserve heading hierarchy

### Export Functionality

- Generate self-contained static HTML file
- Bundle all necessary CSS and JavaScript
- Ensure no external dependencies
- Optimize for performance
- Maintain full functionality offline
- Generate PWA assets and manifest

### Reading Experience

- Implement smooth page transitions
- Save reading progress locally
- Support bookmarking system
- Provide chapter navigation
- Calculate and display reading progress
- Support system font preferences
- Honor reduced motion preferences
- Implement touch gestures for navigation
- Support offline reading

## Implementation Details

### JavaScript Architecture

```javascript
// Accessibility and PWA setup
const initializeApp = () => {
  registerServiceWorker();
  setupA11yFeatures();
  checkForAppInstall();
}

// Service Worker Registration
const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('ServiceWorker registered');
    } catch (err) {
      console.error('ServiceWorker registration failed:', err);
    }
  }
}

// Accessibility Features
const setupA11yFeatures = () => {
  setupFocusTrap();
  initializeScreenReaderAnnouncements();
  setupKeyboardShortcuts();
}

// Touch and Gesture Support
const setupGestures = () => {
  initializeSwipeNavigation();
  setupPinchZoom();
  handleTouchFeedback();
}

// Responsive Components
const initializeResponsiveFeatures = () => {
  setupContainerQueries();
  initializeFluidTypography();
  handleOrientationChange();
}

// Core Functionality
const processChapter = (markdown) => {
  // Transform markdown to semantic HTML
  // Handle chapter metadata
  // Generate navigation elements
  // Ensure proper heading hierarchy
}

const generateTableOfContents = (chapters) => {
  // Create structured, accessible TOC
  // Add navigation links
  // Include skip links
}

const handleThemeToggle = () => {
  // Toggle between light/dark modes
  // Update ARIA attributes
  // Save preference
  // Announce change to screen readers
}

const handleFontSelection = (font) => {
  // Update font family
  // Maintain minimum readable size
  // Save preference
  // Announce change
}

const saveProgress = (position) => {
  // Store reading position
  // Update progress indicators
  // Sync with service worker
}
```

### CSS Structure

```css
:root {
  /* Theme variables */
  --bg-light: #ffffff;
  --bg-dark: #1a1a1a;
  --text-light: #333333;
  --text-dark: #f0f0f0;

  /* Ensure sufficient color contrast */
  --contrast-ratio: 4.5;

  /* Fluid typography */
  --fluid-min-width: 320;
  --fluid-max-width: 1200;
  --fluid-min-size: 16;
  --fluid-max-size: 20;
  --fluid-min-scale: 1.2;
  --fluid-max-scale: 1.333;

  /* Font variables */
  --font-serif: 'Merriweather', serif;
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-size-base: clamp(1rem, 1vw + 0.75rem, 1.25rem);

  /* Spacing and sizing */
  --content-width: min(65ch, 100% - 2rem);
  --spacing-unit: clamp(1rem, 2vw, 2rem);
  --touch-target: 44px;

  /* Safe area insets */
  --safe-area-inset-top: env(safe-area-inset-top, 0px);
  --safe-area-inset-bottom: env(safe-area-inset-bottom, 0px);
}

/* Container queries */
@container (min-width: 40em) {
  .story-content {
    font-size: var(--fluid-min-size);
    line-height: 1.6;
  }
}

/* Grid layout with safe areas */
.story-container {
  display: grid;
  grid-template-columns:
    minmax(var(--spacing-unit), 1fr)
    minmax(auto, var(--content-width))
    minmax(var(--spacing-unit), 1fr);
  gap: var(--spacing-unit);
  padding:
    calc(var(--spacing-unit) + var(--safe-area-inset-top))
    var(--spacing-unit)
    calc(var(--spacing-unit) + var(--safe-area-inset-bottom));
}

/* Accessible focus styles */
:focus-visible {
  outline: 3px solid var(--accent-color);
  outline-offset: 2px;
  border-radius: 2px;
}

/* Touch targets */
button,
.nav-link,
.interactive-element {
  min-width: var(--touch-target);
  min-height: var(--touch-target);
  padding: calc(var(--touch-target) / 4);
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* High contrast mode */
@media (forced-colors: active) {
  :root {
    --accent-color: CanvasText;
  }

  .interactive-element {
    border: 1px solid currentColor;
  }
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  :root {
    color-scheme: dark;
  }

  body {
    background-color: var(--bg-dark);
    color: var(--text-dark);
  }
}
```

## Export Process

1. Compile all chapters into a single document
2. Process Markdown into semantic HTML
3. Generate accessible navigation structure
4. Insert theme toggle functionality
5. Add font selection options
6. Implement bookmarking system
7. Bundle all CSS and JavaScript
8. Generate service worker and manifest
9. Create self-contained HTML file
10. Optimize for performance
11. Validate offline functionality
12. Test accessibility compliance

## Best Practices

- Use semantic HTML for better accessibility
- Implement progressive enhancement
- Optimize for performance
- Follow WCAG 2.1 Level AA guidelines
- Use proper meta tags and manifest
- Implement comprehensive error handling
- Add loading states and skeleton screens
- Cache user preferences and content
- Support keyboard and touch navigation
- Ensure responsive and adaptive design
- Test with screen readers
- Validate color contrast
- Support native sharing
- Enable offline functionality
- Handle device orientation changes
- Support system preferences

## Output Requirements

The generated website must:

- Work without any external dependencies
- Function as a Progressive Web App
- Be hostable on any static hosting platform
- Maintain all functionality offline
- Be responsive across all devices and orientations
- Load quickly and efficiently
- Preserve user preferences
- Handle errors gracefully
- Be accessible to all users
- Support native app-like features
- Honor system preferences
- Meet WCAG 2.1 Level AA standards
- Support touch and gesture interactions
- Provide clear feedback and announcements
- Work with assistive technologies

This web application emphasizes clean code, modern best practices, accessibility, and an excellent user experience across all devices and platforms.
