import sharp from 'sharp';
import fs from 'fs';

const icons = [
  { file: 'favicon-16.png', size: 16 },
  { file: 'favicon-32.png', size: 32 },
  { file: 'apple-touch-icon.png', size: 180 },
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  { file: 'icon-maskable-192.png', size: 192 },
  { file: 'icon-maskable-512.png', size: 512 },
];

async function main() {
  const svgBuffer = fs.readFileSync('public/favicon-new.svg');

  for (const { file, size } of icons) {
    await sharp(svgBuffer)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(`public/${file}`);
    console.log(`Generated ${file} (${size}x${size})`);
  }

  console.log('Done!');
}

main().catch(console.error);
