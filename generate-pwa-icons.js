// Generate PWA icons - Run with: node generate-pwa-icons.js
const fs = require('fs');
const path = require('path');

// Simple SVG icon for Biglio
const createIcon = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#7c3aed;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#a855f7;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="url(#grad)"/>
  <text x="50%" y="50%" text-anchor="middle" dy="0.35em" 
        font-family="Arial, sans-serif" font-weight="bold" 
        font-size="${size * 0.35}" fill="white">B</text>
</svg>`;

// Create icons directory if it doesn't exist
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir);
}

// Generate icon sizes
const sizes = [192, 256, 384, 512];

sizes.forEach(size => {
  const svgContent = createIcon(size);
  const filename = `icon-${size}x${size}.svg`;
  const filepath = path.join(publicDir, filename);
  
  fs.writeFileSync(filepath, svgContent);
  console.log(`✅ Generated ${filename}`);
});

// Create a simple favicon.ico placeholder
const faviconSvg = createIcon(32);
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), faviconSvg);
console.log('✅ Generated favicon.svg');

console.log('\n🎉 PWA icons generated successfully!');
console.log('📝 Note: For production, replace these with high-quality PNG icons');
console.log('🔧 You can convert SVG to PNG using online tools or design software');
