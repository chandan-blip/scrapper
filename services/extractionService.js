const puppeteer = require('puppeteer');
const path = require('path');
const ExtractionJob = require('../models/ExtractionJob');

const USER_DATA_DIR = path.join(__dirname, '..', 'chrome-data');

const MOBILE_VIEWPORT = {
  width: 360,
  height: 600,
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  isLandscape: false
};

const MOBILE_USER_AGENT = 'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

// Store active extractions to allow cancellation
const activeExtractions = new Map();

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function startExtraction(jobId) {
  let browser = null;

  try {
    const job = await ExtractionJob.findById(jobId);
    if (!job) {
      console.error('Job not found:', jobId);
      return;
    }

    job.status = 'running';
    job.startedAt = new Date();
    await job.save();

    console.log(`Starting extraction job: ${jobId}`);
    console.log(`Source: ${job.sourceUrl}`);
    console.log(`Type: ${job.sourceType}`);

    browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      userDataDir: USER_DATA_DIR,
      args: [
        `--window-size=${MOBILE_VIEWPORT.width + 100},${MOBILE_VIEWPORT.height + 150}`,
        '--window-position=100,50'
      ]
    });

    activeExtractions.set(jobId.toString(), { browser, cancelled: false });

    const page = await browser.newPage();
    await page.setViewport(MOBILE_VIEWPORT);
    await page.setUserAgent(MOBILE_USER_AGENT);

    console.log(`Opening URL: ${job.sourceUrl}`);
    await page.goto(job.sourceUrl, { waitUntil: 'networkidle2' });
    await sleep(3000);

    // Configure extraction based on source type
    let extractSelector, scrollConfig;

    switch (job.sourceType) {
      case 'followers':
        extractSelector = "main a span[dir='auto']";
        scrollConfig = {
          selector: 'html',
          scrollAmount: 500,
          iterations: job.config.iterations || 25,
          delay: job.config.delay || 1000,
          attribute: 'text'
        };
        break;

      case 'comments':
        extractSelector = "main a[role='link'][href^='/']";
        scrollConfig = {
          x: 105,
          y: 260,
          scrollAmount: job.config.scrollAmount || 1000,
          iterations: job.config.iterations || 25,
          delay: job.config.delay || 2000,
          attribute: 'href'
        };
        break;

      case 'likes':
        extractSelector = "main a span[dir='auto']";
        scrollConfig = {
          selector: 'html',
          scrollAmount: 500,
          iterations: job.config.iterations || 25,
          delay: job.config.delay || 1000,
          attribute: 'text'
        };
        break;

      default:
        extractSelector = "main a span[dir='auto']";
        scrollConfig = {
          selector: 'html',
          scrollAmount: 500,
          iterations: job.config.iterations || 25,
          delay: job.config.delay || 1000,
          attribute: 'text'
        };
    }

    const collectedData = new Set();

    for (let i = 0; i < scrollConfig.iterations; i++) {
      // Check if cancelled
      const extraction = activeExtractions.get(jobId.toString());
      if (extraction && extraction.cancelled) {
        console.log('Extraction cancelled');
        break;
      }

      // Extract current visible items
      const currentItems = await page.$$eval(extractSelector, (elements, attr) => {
        return elements.map(el => {
          if (attr === 'text') return el.textContent.trim();
          if (attr) return el.getAttribute(attr);
          return el.textContent.trim();
        });
      }, scrollConfig.attribute);

      currentItems.forEach(item => {
        if (item) {
          if (scrollConfig.attribute === 'href' && item.startsWith('/')) {
            const match = item.match(/^\/([a-zA-Z0-9._]+)\/$/);
            if (match) {
              collectedData.add(match[1]);
            }
          } else {
            collectedData.add(item);
          }
        }
      });

      console.log(`Scroll ${i + 1}/${scrollConfig.iterations} - Collected: ${collectedData.size} items`);

      // Update job with current count
      job.totalExtracted = collectedData.size;
      job.extractedUsernames = Array.from(collectedData);
      await job.save();

      // Scroll
      if (scrollConfig.x !== undefined && scrollConfig.y !== undefined) {
        await page.mouse.move(scrollConfig.x, scrollConfig.y);
        await page.mouse.wheel({ deltaY: scrollConfig.scrollAmount });
      } else {
        try {
          await page.$eval(scrollConfig.selector, (el, amount) => {
            el.scrollBy(0, amount);
          }, scrollConfig.scrollAmount);
        } catch (e) {
          await page.evaluate((amount) => {
            window.scrollBy(0, amount);
          }, scrollConfig.scrollAmount);
        }
      }

      await sleep(scrollConfig.delay);
    }

    // Final update
    job.extractedUsernames = Array.from(collectedData);
    job.totalExtracted = collectedData.size;
    job.status = 'completed';
    job.completedAt = new Date();
    await job.save();

    console.log(`Extraction completed. Total: ${collectedData.size} usernames`);

  } catch (error) {
    console.error('Extraction error:', error);
    const job = await ExtractionJob.findById(jobId);
    if (job) {
      job.status = 'failed';
      job.error = error.message;
      await job.save();
    }
  } finally {
    if (browser) {
      await browser.close();
    }
    activeExtractions.delete(jobId.toString());
  }
}

function cancelExtraction(jobId) {
  const extraction = activeExtractions.get(jobId.toString());
  if (extraction) {
    extraction.cancelled = true;
    if (extraction.browser) {
      extraction.browser.close().catch(console.error);
    }
  }
}

function getActiveExtractions() {
  return Array.from(activeExtractions.keys());
}

module.exports = {
  startExtraction,
  cancelExtraction,
  getActiveExtractions
};
