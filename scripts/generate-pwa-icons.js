#!/usr/bin/env node

/**
 * PWA Icon Generation Script
 * 
 * This script helps generate the required PWA icons from a source SVG file.
 * You'll need to install sharp: npm install sharp
 * 
 * Usage: node scripts/generate-pwa-icons.js
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is available
let sharp;
try {
  sharp = require('sharp');
} catch (error) {
  console.error('Sharp is not installed. Please run: npm install sharp');
  process.exit(1);
}

const sourceIcon = path.join(__dirname, '../public/images/logo/9329651.png');
const outputDir = path.join(__dirname, '../public/images/logo');
const iconsDir = path.join(__dirname, '../public/images/icons');

// Icon sizes to generate
const iconSizes = [
  { size: 192, name: 'logo-192.png', purpose: 'any' },
  { size: 512, name: 'logo-512.png', purpose: 'any' },
  { size: 192, name: 'logo-maskable-192.png', purpose: 'maskable' },
  { size: 512, name: 'logo-maskable-512.png', purpose: 'maskable' },
  { size: 180, name: 'apple-touch-icon.png', purpose: 'any' }
];

// Shortcut icon sizes
const shortcutIcons = [
  { size: 96, name: 'dashboard-96.png' },
  { size: 96, name: 'tasks-96.png' },
  { size: 96, name: 'employees-96.png' }
];

async function generateIcons() {
  console.log('Generating PWA icons...');

  // Check if source icon exists
  if (!fs.existsSync(sourceIcon)) {
    console.error(`Source icon not found: ${sourceIcon}`);
    process.exit(1);
  }

  try {
    // Generate main PWA icons
    for (const icon of iconSizes) {
      const outputPath = path.join(outputDir, icon.name);
      
      let sharpInstance = sharp(sourceIcon)
        .resize(icon.size, icon.size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        });

      // For maskable icons, add padding
      if (icon.purpose === 'maskable') {
        const padding = Math.floor(icon.size * 0.1); // 10% padding
        sharpInstance = sharpInstance.extend({
          top: padding,
          bottom: padding,
          left: padding,
          right: padding,
          background: { r: 87, g: 80, b: 241, alpha: 1 } // Theme color background
        });
      }

      await sharpInstance.png().toFile(outputPath);
      console.log(`Generated: ${icon.name}`);
    }

    // Generate shortcut icons (using theme color background)
    for (const icon of shortcutIcons) {
      const outputPath = path.join(iconsDir, icon.name);
      
      await sharp(sourceIcon)
        .resize(icon.size, icon.size, {
          fit: 'contain',
          background: { r: 87, g: 80, b: 241, alpha: 1 }
        })
        .png()
        .toFile(outputPath);
      
      console.log(`Generated shortcut icon: ${icon.name}`);
    }

    console.log('✅ All PWA icons generated successfully!');
    
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

// Generate placeholder screenshots
async function generateScreenshots() {
  console.log('Generating placeholder screenshots...');
  
  const screenshotsDir = path.join(__dirname, '../public/images/screenshots');
  
  try {
    // Desktop screenshot (1280x720)
    await sharp({
      create: {
        width: 1280,
        height: 720,
        channels: 4,
        background: { r: 248, g: 250, b: 252, alpha: 1 }
      }
    })
    .composite([
      {
        input: Buffer.from(`
          <svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
            <rect width="1280" height="720" fill="#f8fafc"/>
            <rect x="40" y="40" width="1200" height="640" rx="12" fill="white" stroke="#e2e8f0" stroke-width="2"/>
            <rect x="60" y="60" width="200" height="600" fill="#5750f1" opacity="0.1"/>
            <text x="640" y="360" text-anchor="middle" font-family="Arial, sans-serif" font-size="48" fill="#334155">JPCO Dashboard</text>
            <text x="640" y="420" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#64748b">Desktop View</text>
          </svg>
        `),
        top: 0,
        left: 0
      }
    ])
    .png()
    .toFile(path.join(screenshotsDir, 'desktop-dashboard.png'));

    // Mobile screenshot (390x844)
    await sharp({
      create: {
        width: 390,
        height: 844,
        channels: 4,
        background: { r: 248, g: 250, b: 252, alpha: 1 }
      }
    })
    .composite([
      {
        input: Buffer.from(`
          <svg width="390" height="844" xmlns="http://www.w3.org/2000/svg">
            <rect width="390" height="844" fill="#f8fafc"/>
            <rect x="20" y="20" width="350" height="804" rx="12" fill="white" stroke="#e2e8f0" stroke-width="2"/>
            <rect x="30" y="30" width="330" height="60" fill="#5750f1"/>
            <text x="195" y="422" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#334155">JPCO Dashboard</text>
            <text x="195" y="460" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#64748b">Mobile View</text>
          </svg>
        `),
        top: 0,
        left: 0
      }
    ])
    .png()
    .toFile(path.join(screenshotsDir, 'mobile-dashboard.png'));

    console.log('✅ Placeholder screenshots generated!');
    
  } catch (error) {
    console.error('Error generating screenshots:', error);
  }
}

// Main execution
async function main() {
  await generateIcons();
  await generateScreenshots();
  
  console.log('\n📱 PWA Setup Complete!');
  console.log('\nNext steps:');
  console.log('1. Replace placeholder screenshots with actual app screenshots');
  console.log('2. Test PWA installation in Chrome/Edge');
  console.log('3. Verify offline functionality');
  console.log('4. Test on mobile devices');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { generateIcons, generateScreenshots };