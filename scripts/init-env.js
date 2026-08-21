const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

const copies = [
  { from: ".env.example", to: ".env" },
  { from: ".env.example", to: "be/.env" },
  { from: "fe/.env.example", to: "fe/.env.local" },
];

for (const { from, to } of copies) {
  const source = path.join(root, from);
  const target = path.join(root, to);

  if (!fs.existsSync(source)) {
    console.error(`Missing template: ${from}`);
    process.exit(1);
  }

  if (fs.existsSync(target)) {
    console.log(`skip  ${to} (already exists)`);
    continue;
  }

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  console.log(`created ${to}`);
}

console.log("\nEdit .env files for your environment, then run: npm run docker:up");
