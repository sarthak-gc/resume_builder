const p = require("puppeteer");
async function main() {
  const browser = await p.launch({
    headless: false,
  });
  const page = await browser.newPage();
  await page.goto("https://linkedin.com/in/sarthak-gc", {
    waitUntil: "networkidle2",
  });
  const dets = await page.evaluate(() => {
    alert("testing");
    return "x";
  });
  await browser.close();
  console.log(dets);
}

main();
