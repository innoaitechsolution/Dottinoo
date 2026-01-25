// Generate OG Image PNG (1200x630)
// Run: node generate-og-image.js
// Requires: npm install canvas (or use the HTML version)

const fs = require('fs');
const path = require('path');

// Simple approach: Create a minimal valid PNG using base64
// This is a 1x1 transparent PNG, we'll replace with proper generation

// For now, let's create a script that can be run with canvas library
// If canvas is not available, use the HTML version instead

try {
  const { createCanvas } = require('canvas');
  
  const canvas = createCanvas(1200, 630);
  const ctx = canvas.getContext('2d');
  
  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, 1200, 630);
  gradient.addColorStop(0, '#ECF4FC');
  gradient.addColorStop(1, '#93CEEE');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1200, 630);
  
  // Decorative circles
  ctx.fillStyle = 'rgba(144, 233, 213, 0.3)';
  ctx.beginPath();
  ctx.arc(1000, 100, 150, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = 'rgba(65, 150, 226, 0.2)';
  ctx.beginPath();
  ctx.arc(200, 500, 120, 0, Math.PI * 2);
  ctx.fill();
  
  // Logo circle
  ctx.fillStyle = '#2C6EAD';
  ctx.beginPath();
  ctx.arc(600, 235, 60, 0, Math.PI * 2);
  ctx.fill();
  
  // Logo "D" text
  ctx.fillStyle = 'white';
  ctx.font = 'bold 48px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('D', 600, 235);
  
  // Title
  ctx.fillStyle = '#133E6C';
  ctx.font = 'bold 64px Arial, sans-serif';
  ctx.fillText('Dottinoo', 600, 335);
  
  // Subtitle
  ctx.fillStyle = '#355A7F';
  ctx.font = '32px Arial, sans-serif';
  ctx.fillText('Inclusive Learning Platform', 600, 395);
  ctx.font = '28px Arial, sans-serif';
  ctx.fillText('for UK Classrooms', 600, 435);
  
  // Save PNG
  const buffer = canvas.toBuffer('image/png');
  const outputPath = path.join(__dirname, 'og-image.png');
  fs.writeFileSync(outputPath, buffer);
  console.log('✅ OG image generated successfully at:', outputPath);
} catch (error) {
  console.log('⚠️  Canvas library not available. Please use one of these options:');
  console.log('1. Install canvas: npm install canvas');
  console.log('2. Open generate-og-image.html in a browser and save the canvas as PNG');
  console.log('3. Use an online SVG to PNG converter with og-image.svg');
  process.exit(1);
}
