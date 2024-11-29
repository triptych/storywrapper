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

// Convert SVG to PNG with multiple sizes
async function convertToIco() {
    try {
        // First convert to PNG
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
