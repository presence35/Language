import sharp from 'sharp';
import fs from 'fs';

async function main() {
  const svgBuffer = fs.readFileSync('public/icon.svg');
  await sharp(svgBuffer).resize(192, 192).png().toFile('public/icon-192.png');
  await sharp(svgBuffer).resize(512, 512).png().toFile('public/icon-512.png');
  console.log('Icons generated');
}
main().catch(console.error);
