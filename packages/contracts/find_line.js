import * as fs from "fs";

const content = fs.readFileSync("src/@tanstack/react-query.gen.ts", "utf8");
const lines = content.split("\n");
lines.forEach((line, i) => {
  if (line.includes("publicPricingListPublicPlansOptions")) {
    console.log(`FOUND at line ${i + 1}: ${line}`);
  }
});
