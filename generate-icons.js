import sharp from 'sharp';
import fs from 'fs';

const icons = [
  { file: 'favicon-16.png', size: 16, maskable: false },
  { file: 'favicon-32.png', size: 32, maskable: false },
  { file: 'apple-touch-icon.png', size: 180, maskable: false },
  { file: 'icon-192.png', size: 192, maskable: false },
  { file: 'icon-512.png', size: 512, maskable: false },
  { file: 'icon-maskable-192.png', size: 192, maskable: true },
  { file: 'icon-maskable-512.png', size: 512, maskable: true },
];

async function main() {
  const svgBuffer = fs.readFileSync('public/icons/favicon-new.svg');

  if (!fs.existsSync('public/icons')) fs.mkdirSync('public/icons', { recursive: true });

  for (const { file, size, maskable } of icons) {
    if (maskable) {
      const iconSize = Math.floor(size * 0.8);
      const padding = Math.floor((size - iconSize) / 2);
      
      await sharp({
        create: {
          width: size,
          height: size,
          channels: 4,
          background: { r: 79, g: 70, b: 229, alpha: 1 }
        }
      })
      .composite([{
        input: await sharp(svgBuffer)
          .resize(iconSize, iconSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .toBuffer(),
        top: padding,
        left: padding
      }])
      .png()
      .toFile(`public/icons/${file}`);
    } else {
      await sharp(svgBuffer)
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(`public/icons/${file}`);
    }
    console.log(`Generated public/icons/${file} (${size}x${size}${maskable ? ', maskable' : ''})`);
  }

  console.log('Done!');
}

main().catch(console.error);
