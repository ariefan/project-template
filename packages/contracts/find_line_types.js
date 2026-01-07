import * as fs from "fs";

const content = fs.readFileSync("src/types.gen.ts", "utf8");
const lines = content.split("\n");
lines.forEach((line, i) => {
  if (line.includes("PublicPricingListPublicPlansResponse")) {
    console.log(`FOUND at line ${i + 1}: ${line}`);
  }
});
