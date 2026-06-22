import sharp from 'sharp';
import fs from 'fs';

const icons = [
  { file: 'favicon-16.png', size: 16 },
  { file: 'favicon-32.png', size: 32 },
  { file: 'apple-touch-icon.png', size: 180 },
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
];

async function main() {
  const svgBuffer = fs.readFileSync('public/icons/favicon-new.svg');

  if (!fs.existsSync('public/icons')) fs.mkdirSync('public/icons', { recursive: true });

  for (const { file, size } of icons) {
    await sharp(svgBuffer)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(`public/icons/${file}`);
    console.log(`Generated public/icons/${file} (${size}x${size})`);
  }

  console.log('Done!');
}

main().catch(console.error);
