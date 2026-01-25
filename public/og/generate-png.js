// Generate minimal valid PNG (1200x630) using pure Node.js
const fs = require('fs');
const zlib = require('zlib');
const crypto = require('crypto');

function createPNG(width, height, backgroundColor = [236, 244, 252]) {
  // PNG signature
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  // Create IHDR chunk
  const ihdrData = Buffer.allocUnsafe(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type (RGB)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  
  const ihdrCRC = crc32(Buffer.concat([Buffer.from('IHDR'), ihdrData]));
  const ihdrChunk = Buffer.concat([
    Buffer.from([0, 0, 0, 13]), // length
    Buffer.from('IHDR'),
    ihdrData,
    Buffer.from([
      (ihdrCRC >>> 24) & 0xFF,
      (ihdrCRC >>> 16) & 0xFF,
      (ihdrCRC >>> 8) & 0xFF,
      ihdrCRC & 0xFF
    ])
  ]);
  
  // Create pixel data (RGB, 3 bytes per pixel + 1 filter byte per row)
  const rowSize = width * 3 + 1;
  const imageData = Buffer.alloc(height * rowSize);
  
  for (let y = 0; y < height; y++) {
    const rowStart = y * rowSize;
    imageData[rowStart] = 0; // filter byte (none)
    
    // Create gradient background
    const gradientFactor = y / height;
    const r = Math.floor(236 + (147 - 236) * gradientFactor);
    const g = Math.floor(244 + (206 - 244) * gradientFactor);
    const b = 252;
    
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowStart + 1 + x * 3;
      imageData[pixelOffset] = r;
      imageData[pixelOffset + 1] = g;
      imageData[pixelOffset + 2] = b;
    }
  }
  
  // Add decorative elements (circles)
  // Top right circle (aqua)
  drawCircle(imageData, width, height, 1000, 100, 150, [144, 233, 213], 0.3);
  // Bottom left circle (blue)
  drawCircle(imageData, width, height, 200, 500, 120, [65, 150, 226], 0.2);
  // Center logo circle
  drawCircle(imageData, width, height, 600, 235, 60, [44, 110, 173], 1.0);
  
  // Add text "D" in logo circle (white)
  drawText(imageData, width, height, 'D', 600, 235, 48, [255, 255, 255], true);
  
  // Compress image data
  const compressed = zlib.deflateSync(imageData);
  const idatCRC = crc32(Buffer.concat([Buffer.from('IDAT'), compressed]));
  const idatChunk = Buffer.concat([
    Buffer.from([
      (compressed.length >>> 24) & 0xFF,
      (compressed.length >>> 16) & 0xFF,
      (compressed.length >>> 8) & 0xFF,
      compressed.length & 0xFF
    ]),
    Buffer.from('IDAT'),
    compressed,
    Buffer.from([
      (idatCRC >>> 24) & 0xFF,
      (idatCRC >>> 16) & 0xFF,
      (idatCRC >>> 8) & 0xFF,
      idatCRC & 0xFF
    ])
  ]);
  
  // IEND chunk
  const iendCRC = crc32(Buffer.from('IEND'));
  const iendChunk = Buffer.concat([
    Buffer.from([0, 0, 0, 0]),
    Buffer.from('IEND'),
    Buffer.from([
      (iendCRC >>> 24) & 0xFF,
      (iendCRC >>> 16) & 0xFF,
      (iendCRC >>> 8) & 0xFF,
      iendCRC & 0xFF
    ])
  ]);
  
  // Combine all chunks
  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function crc32(buffer) {
  let crc = 0xFFFFFFFF;
  const table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  for (let i = 0; i < buffer.length; i++) {
    crc = table[(crc ^ buffer[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function drawCircle(imageData, width, height, cx, cy, radius, color, opacity) {
  const rowSize = width * 3 + 1;
  for (let y = Math.max(0, cy - radius); y < Math.min(height, cy + radius); y++) {
    for (let x = Math.max(0, cx - radius); x < Math.min(width, cx + radius); x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= radius * radius) {
        const rowStart = y * rowSize;
        const pixelOffset = rowStart + 1 + x * 3;
        const r = Math.floor(color[0] * opacity + imageData[pixelOffset] * (1 - opacity));
        const g = Math.floor(color[1] * opacity + imageData[pixelOffset + 1] * (1 - opacity));
        const b = Math.floor(color[2] * opacity + imageData[pixelOffset + 2] * (1 - opacity));
        imageData[pixelOffset] = r;
        imageData[pixelOffset + 1] = g;
        imageData[pixelOffset + 2] = b;
      }
    }
  }
}

function drawText(imageData, width, height, text, x, y, fontSize, color, bold = false) {
  // Simple bitmap font rendering (basic ASCII)
  // This is a simplified approach - for production, use a proper font rendering library
  const charWidth = Math.floor(fontSize * 0.6);
  const charHeight = fontSize;
  const rowSize = width * 3 + 1;
  
  // Draw simple block letters (very basic)
  // For "D" in logo circle
  if (text === 'D' && fontSize >= 40) {
    const startX = x - charWidth / 2;
    const startY = y - charHeight / 2;
    const thickness = Math.floor(fontSize / 8);
    // Vertical line
    for (let py = startY; py < startY + charHeight; py++) {
      for (let px = startX; px < startX + thickness; px++) {
        if (px >= 0 && px < width && py >= 0 && py < height) {
          const rowStart = py * rowSize;
          const pixelOffset = rowStart + 1 + px * 3;
          imageData[pixelOffset] = color[0];
          imageData[pixelOffset + 1] = color[1];
          imageData[pixelOffset + 2] = color[2];
        }
      }
    }
    // Top horizontal
    for (let px = startX; px < startX + charWidth; px++) {
      for (let py = startY; py < startY + thickness; py++) {
        if (px >= 0 && px < width && py >= 0 && py < height) {
          const rowStart = py * rowSize;
          const pixelOffset = rowStart + 1 + px * 3;
          imageData[pixelOffset] = color[0];
          imageData[pixelOffset + 1] = color[1];
          imageData[pixelOffset + 2] = color[2];
        }
      }
    }
    // Bottom horizontal
    for (let px = startX; px < startX + charWidth; px++) {
      for (let py = startY + charHeight - thickness; py < startY + charHeight; py++) {
        if (px >= 0 && px < width && py >= 0 && py < height) {
          const rowStart = py * rowSize;
          const pixelOffset = rowStart + 1 + px * 3;
          imageData[pixelOffset] = color[0];
          imageData[pixelOffset + 1] = color[1];
          imageData[pixelOffset + 2] = color[2];
        }
      }
    }
    // Right curve (simplified)
    for (let py = startY + thickness; py < startY + charHeight - thickness; py++) {
      const curveX = startX + charWidth - thickness;
      if (curveX >= 0 && curveX < width && py >= 0 && py < height) {
        const rowStart = py * rowSize;
        const pixelOffset = rowStart + 1 + curveX * 3;
        imageData[pixelOffset] = color[0];
        imageData[pixelOffset + 1] = color[1];
        imageData[pixelOffset + 2] = color[2];
      }
    }
  }
}

// Generate PNG
const pngBuffer = createPNG(1200, 630);
const outputPath = require('path').join(__dirname, 'og-image.png');
fs.writeFileSync(outputPath, pngBuffer);
console.log(`✅ OG image generated: ${outputPath} (${pngBuffer.length} bytes)`);
console.log('Note: Text overlay can be added using design tools or the HTML generator.');
