const puppeteer = require('puppeteer');
const jobs = require('./jobs.json');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  for (const job of jobs) {
    const page = await browser.newPage();
    await page.setViewport({ width: job.w, height: job.hpx, deviceScaleFactor: 1 });
    await page.goto(`file://${job.htmlPath}`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: job.out, fullPage: false });
    await page.close();
    console.log('rendered', job.out.split('/').pop());
  }

  await browser.close();
})();
