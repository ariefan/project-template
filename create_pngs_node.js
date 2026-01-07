const fs = require("node:fs");
const path = require("node:path");

const publicDir = path.join(process.cwd(), "apps/web/public/branding");
const pngBuffer = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64"
);

const files = [
  "logo/logo-default.png",
  "logo/logo-dark.png",
  "logo/logo-light.png",
  "favicon/favicon-16x16.png",
];

for (const file of files) {
  const filePath = path.join(publicDir, file);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, pngBuffer);
  console.log(`Created ${filePath}`);
}
