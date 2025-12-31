# Puppeteer Automation Tool

A Node.js + Puppeteer tool to automate browser tasks like clicking, scrolling, typing, etc.

## Setup

```bash
npm install
```

## Usage

1. Edit `tasks.js` (or your task file) to define your actions
2. Run: `npm start`

## Configuration (server.js)

```javascript
// Viewport settings
const MOBILE_VIEWPORT = {
  width: 360,
  height: 600,
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  isLandscape: false
};

// User agent
const MOBILE_USER_AGENT = 'Mozilla/5.0 (Linux; Android 13; SM-G991B) ...';
```

## Task File Format

```javascript
module.exports = {
  url: "https://example.com",
  tasks: [
    { action: "click", x: 100, y: 200, delay: 1000 },
    { action: "scroll", x: 200, y: 300, scrollAmount: 500, iterations: 5, delay: 2000 }
  ]
};
```

---

## Available Actions

### 1. CLICK
Click at coordinates or CSS selector.
```javascript
{ action: "click", x: 500, y: 300, delay: 1000 }
{ action: "click", selector: "button.submit", delay: 1000 }
```

### 2. DOUBLECLICK
Double click at coordinates or selector.
```javascript
{ action: "doubleclick", x: 500, y: 300, delay: 1000 }
{ action: "doubleclick", selector: ".item", delay: 1000 }
```

### 3. TYPE
Click at position/selector and type text.
```javascript
{ action: "type", x: 500, y: 300, text: "Hello", delay: 1000 }
{ action: "type", selector: "input.search", text: "Hello", typeDelay: 50, delay: 1000 }
```

### 4. SCROLL
Scroll at position, inside a container, or the whole page.
```javascript
// Scroll at coordinates
{ action: "scroll", x: 500, y: 400, scrollAmount: 500, direction: "down", iterations: 5, delay: 2000 }

// Scroll inside a container
{ action: "scroll", selector: ".comments", scrollAmount: 300, direction: "down", iterations: 3, delay: 1000 }

// Scroll the page
{ action: "scroll", scrollAmount: 500, direction: "up", iterations: 2, delay: 1000 }
```

### 5. HOVER
Move mouse to position or element.
```javascript
{ action: "hover", x: 500, y: 300, delay: 1000 }
{ action: "hover", selector: ".menu-item", delay: 1000 }
```

### 6. WAIT
Pause execution for specified time.
```javascript
{ action: "wait", delay: 3000 }
```

### 7. REFRESH
Refresh/reload the current page.
```javascript
{ action: "refresh", delay: 2000 }
```

### 8. CLOSE
Close the browser and exit.
```javascript
{ action: "close" }
```

### 9. PRESS
Press a keyboard key.
```javascript
{ action: "press", key: "Enter", delay: 1000 }
{ action: "press", key: "Tab", delay: 500 }
{ action: "press", key: "Escape", delay: 500 }
```

**Available keys:** Enter, Tab, Escape, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Backspace, Delete, Space, etc.

### 8. SCREENSHOT
Take a screenshot.
```javascript
{ action: "screenshot", path: "my-screenshot.png", delay: 500 }
{ action: "screenshot", path: "full-page.png", fullPage: true, delay: 500 }
```

### 9. EXTRACT
Extract content from all matching elements.
```javascript
// Get text content from all matching elements
{ action: "extract", selector: ".username", delay: 500 }

// Get specific attribute (href, src, etc.)
{ action: "extract", selector: "a.profile-link", attribute: "href", delay: 500 }

// Get HTML content
{ action: "extract", selector: ".post", attribute: "html", delay: 500 }

// Save results to JSON file
{ action: "extract", selector: ".comment", saveTo: "comments.json", delay: 500 }
```

### 10. EXTRACTONE
Extract content from first matching element only.
```javascript
// Get text from single element
{ action: "extractOne", selector: "h1.title", delay: 500 }

// Get attribute from single element
{ action: "extractOne", selector: "img.avatar", attribute: "src", delay: 500 }

// Save to file
{ action: "extractOne", selector: ".bio", saveTo: "bio.json", delay: 500 }
```

---

## Parameters Reference

| Parameter | Description | Default |
|-----------|-------------|---------|
| `x`, `y` | Screen coordinates (pixels) | - |
| `selector` | CSS selector (e.g., `.class`, `#id`, `button[type='submit']`) | - |
| `delay` | Wait time after action (ms) | 1000 |
| `text` | Text to type | - |
| `typeDelay` | Delay between keystrokes (ms) | 50 |
| `scrollAmount` | Pixels to scroll | 500 |
| `direction` | `"up"` or `"down"` | `"down"` |
| `iterations` | Number of scroll repeats | 1 |
| `key` | Keyboard key name | - |
| `path` | Screenshot file path | - |
| `fullPage` | Capture full page (true/false) | false |
| `attribute` | What to extract: `text`, `html`, or any attribute (`href`, `src`, etc.) | `text` |
| `saveTo` | JSON file path to save extracted data | - |

---

## Notes

- Browser session data is saved in `chrome-data/` folder (login persists between runs)
- Press `Ctrl+C` to close the browser when done
