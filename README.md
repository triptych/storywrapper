# Story Wrapper

An Electron-based desktop application wrapper for the markdown editor web app. This application provides native desktop features like:

- Native file system integration
- Standard application menus
- Keyboard shortcuts
- Cross-platform compatibility

## Features

- Open markdown files (Ctrl/Cmd + O)
- Save markdown files (Ctrl/Cmd + S)
- Standard text editing operations (cut, copy, paste, undo, redo)
- Window management (zoom, fullscreen)
- Development tools for debugging

## Development

### Prerequisites

- Node.js and npm installed on your system

### Running the Application

1. Install dependencies:

```bash
npm install
```

2. Start the application:

```bash
npm start
```

## Building Windows Executable

### Icon Preparation

The Windows executable requires an ICO format icon. Here's how to convert SVG to ICO:

1. Install required packages:

```bash
npm install sharp png-to-ico
```

2. Create a conversion script (convert-icon.js):

```javascript
const sharp = require('sharp');
const pngToIco = require('png-to-ico');
const path = require('path');
const fs = require('fs');

const inputPath = path.join(__dirname, 'icons', 'icon-512x512.svg');
const pngPath = path.join(__dirname, 'build', 'icon.png');
const outputPath = path.join(__dirname, 'build', 'icon.ico');

// Ensure build directory exists
if (!fs.existsSync('build')) {
    fs.mkdirSync('build');
}

async function convertToIco() {
    try {
        // First convert to SVG to PNG
        await sharp(inputPath)
            .resize(256, 256)
            .png()
            .toFile(pngPath);

        // Then convert PNG to ICO
        const buf = await pngToIco([pngPath]);
        fs.writeFileSync(outputPath, buf);

        console.log('Icon converted successfully!');
    } catch (err) {
        console.error('Error converting icon:', err);
    }
}

convertToIco();
```

3. Run the conversion script:

```bash
node convert-icon.js
```

### Build Configuration

Configure package.json with the following build settings to avoid permission issues and ensure proper icon usage:

```json
{
  "build": {
    "appId": "com.storywrapper.app",
    "win": {
      "target": "portable",
      "icon": "build/icon.ico"
    },
    "asar": true,
    "forceCodeSigning": false
  },
  "scripts": {
    "build": "electron-builder --win portable --config.win.signAndEditExecutable=false"
  }
}
```

Key points in the configuration:

- Use `portable` target to avoid installation/permission issues
- Disable code signing with `forceCodeSigning: false`
- Use `--config.win.signAndEditExecutable=false` in build command
- Specify the ICO file path in the `win.icon` setting

### Building the Executable

1. Install electron-builder:

```bash
npm install electron-builder --save-dev
```

2. Run the build command:

```bash
npm run build
```

The executable will be created in the `dist` directory as `storywrapper 1.0.0.exe`.

### Creating a Release

1. Create a zip file of the executable:

```powershell
# Using PowerShell
Compress-Archive -Path "dist/storywrapper 1.0.0.exe" -DestinationPath "dist/storywrapper-1.0.0-win-x64.zip"
```

2. Using GitHub CLI to create a release:
   - First, install GitHub CLI and authenticate:

   ```bash
   # Install GitHub CLI from: https://cli.github.com/
   gh auth login  # Follow the interactive prompts
   ```

   - Create the release with the zip file:

   ```powershell
   # Using PowerShell
   & 'C:\Program Files\GitHub CLI\gh.exe' release create v1.0.0 --title 'Story Wrapper v1.0.0' --notes 'Initial Windows release of Story Wrapper' './dist/storywrapper-1.0.0-win-x64.zip#Windows Portable Executable'
   ```

   Alternatively, you can create a release manually through the GitHub web interface:
   1. Go to your GitHub repository
   2. Click on "Releases" in the right sidebar
   3. Click "Create a new release"
   4. Set the tag version, title, and description
   5. Upload the zip file
   6. Click "Publish release"

### Troubleshooting

- If you encounter symbolic link errors, use the portable target and disable code signing
- If icon conversion fails with sharp alone, use the png-to-ico package as an intermediate step
- Make sure the build directory exists before running the icon conversion
- The final ICO file should be placed in the build directory as specified in the package.json

## Keyboard Shortcuts

- `Ctrl/Cmd + O`: Open file
- `Ctrl/Cmd + S`: Save file
- `Ctrl/Cmd + Z`: Undo
- `Ctrl/Cmd + Y`: Redo
- `Ctrl/Cmd + X`: Cut
- `Ctrl/Cmd + C`: Copy
- `Ctrl/Cmd + V`: Paste
