const puppeteer = require('puppeteer');
const express = require('express');
const app = express();
app.use(express.json());

app.post('/screenshot', async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'shell',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    // Set user agent to avoid bot blockers
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });

    const metadata = await page.evaluate(() => {
      const getMeta = (prop) => {
        return document.querySelector(`meta[property="${prop}"]`)?.content || 
               document.querySelector(`meta[name="${prop}"]`)?.content;
      };
      
      const getFavicon = () => {
        const icon = document.querySelector('link[rel="icon"]') || 
                     document.querySelector('link[rel="shortcut icon"]') ||
                     document.querySelector('link[rel="apple-touch-icon"]');
        return icon?.href;
      };

      return {
        title: getMeta('og:title') || document.title,
        description: getMeta('og:description') || getMeta('description') || '',
        favicon: getFavicon() || ''
      };
    });

    const screenshot = await page.screenshot({
      type: 'png',
      fullPage: false,
      encoding: 'base64'
    });

    res.json({ screenshot, metadata });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

app.listen(3001, () => console.log('Puppeteer service on :3001'));
