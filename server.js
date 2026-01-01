const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Load tasks from JS config
const config = require('./extract_comments_username_task.js');

const USER_DATA_DIR = path.join(__dirname, 'chrome-data');

// Mobile viewport settings (Samsung Galaxy S21)
const MOBILE_VIEWPORT = {
  width: 360,
  height: 600,
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  isLandscape: false
};

const MOBILE_USER_AGENT = 'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function executeTask(page, task, browser) {
  const delay = task.delay || 1000;

  switch (task.action) {
    case 'click':
      if (task.selector) {
        console.log(`Clicking on selector: ${task.selector}`);
        await page.click(task.selector);
      } else if (task.x !== undefined && task.y !== undefined) {
        console.log(`Clicking at coordinates: (${task.x}, ${task.y})`);
        await page.mouse.click(task.x, task.y);
      }
      await sleep(delay);
      break;

    case 'doubleclick':
      if (task.selector) {
        console.log(`Double-clicking on selector: ${task.selector}`);
        await page.click(task.selector, { clickCount: 2 });
      } else if (task.x !== undefined && task.y !== undefined) {
        console.log(`Double-clicking at coordinates: (${task.x}, ${task.y})`);
        await page.mouse.click(task.x, task.y, { clickCount: 2 });
      }
      await sleep(delay);
      break;

    case 'type':
      if (task.x !== undefined && task.y !== undefined) {
        console.log(`Clicking at (${task.x}, ${task.y}) and typing: "${task.text}"`);
        await page.mouse.click(task.x, task.y);
        await sleep(300);
      } else if (task.selector && task.selector !== 'html') {
        console.log(`Clicking on ${task.selector} and typing: "${task.text}"`);
        await page.click(task.selector);
        await sleep(300);
      } else {
        console.log(`Typing: "${task.text}"`);
      }
      await page.keyboard.type(task.text, { delay: task.typeDelay || 50 });
      await sleep(delay);
      break;

    case 'scroll':
      const iterations = task.iterations || 1;
      const scrollAmount = task.scrollAmount || 500;
      const direction = task.direction === 'up' ? -1 : 1;

      for (let i = 0; i < iterations; i++) {
        console.log(`Scroll ${i + 1}/${iterations}`);

        if (task.selector) {
          // Scroll inside a container
          await page.$eval(task.selector, (el, amount) => {
            el.scrollBy(0, amount);
          }, scrollAmount * direction);
        } else if (task.x !== undefined && task.y !== undefined) {
          // Move mouse to position and scroll
          await page.mouse.move(task.x, task.y);
          await page.mouse.wheel({ deltaY: scrollAmount * direction });
        } else {
          // Scroll the page
          await page.evaluate((amount) => {
            window.scrollBy(0, amount);
          }, scrollAmount * direction);
        }

        await sleep(delay);
      }
      break;

    case 'scrollAndCollect':
      // Scroll and collect data from elements that get removed (virtual scrolling)
      if (!task.selector || !task.extractSelector) {
        console.log('scrollAndCollect requires selector (scroll container) and extractSelector');
        break;
      }

      const collectIterations = task.iterations || 50;
      const collectScrollAmount = task.scrollAmount || 500;
      const collectedData = new Set();

      console.log(`Scrolling and collecting from: ${task.extractSelector}`);

      for (let i = 0; i < collectIterations; i++) {
        // Extract current visible items
        const currentItems = await page.$$eval(task.extractSelector, (elements, attr) => {
          return elements.map(el => {
            if (attr === 'text') return el.textContent.trim();
            if (attr) return el.getAttribute(attr);
            return el.textContent.trim();
          });
        }, task.attribute || 'text');

        currentItems.forEach(item => {
          if (item) {
            // If it's an href like /username/, extract just the username
            if (task.attribute === 'href' && item.startsWith('/')) {
              const match = item.match(/^\/([a-zA-Z0-9._]+)\/$/);
              if (match) {
                collectedData.add(match[1]);
              }
            } else {
              collectedData.add(item);
            }
          }
        });

        console.log(`Scroll ${i + 1}/${collectIterations} - Collected: ${collectedData.size} items`);

        // Scroll - prefer coordinates if provided
        if (task.x !== undefined && task.y !== undefined) {
          await page.mouse.move(task.x, task.y);
          await page.mouse.wheel({ deltaY: collectScrollAmount });
        } else {
          try {
            await page.$eval(task.selector, (el, amount) => {
              el.scrollBy(0, amount);
            }, collectScrollAmount);
          } catch (e) {
            // Fallback to window scroll
            await page.evaluate((amount) => {
              window.scrollBy(0, amount);
            }, collectScrollAmount);
          }
        }

        await sleep(delay);
      }

      const collectedArray = Array.from(collectedData);
      console.log(`\nTotal collected: ${collectedArray.length} items`);

      if (task.saveTo) {
        const collectOutputPath = path.join(__dirname, task.saveTo);

        if (task.saveTo.endsWith('.js')) {
          // Load existing users if file exists
          let existingUsers = [];
          if (fs.existsSync(collectOutputPath)) {
            try {
              delete require.cache[require.resolve(collectOutputPath)];
              existingUsers = require(collectOutputPath);
              if (!Array.isArray(existingUsers)) existingUsers = [];
            } catch (e) {
              existingUsers = [];
            }
          }

          // Merge and remove duplicates
          const allUsers = [...new Set([...existingUsers, ...collectedArray])];
          const jsContent = `const users = [\n${allUsers.map(item => `    "${item.replace(/"/g, '\\"')}"`).join(',\n')}\n];\n\nmodule.exports = users;`;
          fs.writeFileSync(collectOutputPath, jsContent);
          console.log(`Appended to: ${collectOutputPath} (Total: ${allUsers.length}, New: ${allUsers.length - existingUsers.length})`);
        } else {
          // JSON file - append
          let existingData = [];
          if (fs.existsSync(collectOutputPath)) {
            try {
              existingData = JSON.parse(fs.readFileSync(collectOutputPath, 'utf8'));
              if (!Array.isArray(existingData)) existingData = [];
            } catch (e) {
              existingData = [];
            }
          }
          const allData = [...new Set([...existingData, ...collectedArray])];
          fs.writeFileSync(collectOutputPath, JSON.stringify(allData, null, 2));
          console.log(`Appended to: ${collectOutputPath} (Total: ${allData.length}, New: ${allData.length - existingData.length})`);
        }
      }
      break;

    case 'hover':
      if (task.selector) {
        console.log(`Hovering on selector: ${task.selector}`);
        await page.hover(task.selector);
      } else if (task.x !== undefined && task.y !== undefined) {
        console.log(`Hovering at coordinates: (${task.x}, ${task.y})`);
        await page.mouse.move(task.x, task.y);
      }
      await sleep(delay);
      break;

    case 'wait':
      console.log(`Waiting for ${delay}ms`);
      await sleep(delay);
      break;

    case 'refresh':
      console.log('Refreshing page...');
      await page.reload({ waitUntil: 'networkidle2' });
      await sleep(delay);
      break;

    case 'close':
      console.log('Closing browser...');
      await browser.close();
      process.exit(0);
      break;

    case 'press':
      console.log(`Pressing key: ${task.key}`);
      await page.keyboard.press(task.key);
      await sleep(delay);
      break;

    case 'screenshot':
      const screenshotPath = task.path || `screenshot-${Date.now()}.png`;
      console.log(`Taking screenshot: ${screenshotPath}`);
      await page.screenshot({ path: screenshotPath, fullPage: task.fullPage || false });
      await sleep(delay);
      break;

    case 'extract':
      if (!task.selector) {
        console.log('Extract requires a selector');
        break;
      }
      console.log(`Extracting content from: ${task.selector}`);

      const extractedData = await page.$$eval(task.selector, (elements, attr) => {
        return elements.map(el => {
          if (attr === 'text') return el.textContent.trim();
          if (attr === 'html') return el.innerHTML;
          if (attr) return el.getAttribute(attr);
          return el.textContent.trim();
        });
      }, task.attribute || 'text');

      console.log(`Found ${extractedData.length} items:`);
      extractedData.forEach((item, i) => console.log(`  ${i + 1}. ${item}`));

      // Save to file if path specified
      if (task.saveTo) {
        const outputPath = path.join(__dirname, task.saveTo);
        if (task.saveTo.endsWith('.js')) {
          // Save as JS array
          const jsContent = `const users = [\n${extractedData.map(item => `    "${item.replace(/"/g, '\\"')}"`).join(',\n')}\n];\n\nmodule.exports = users;`;
          fs.writeFileSync(outputPath, jsContent);
        } else {
          fs.writeFileSync(outputPath, JSON.stringify(extractedData, null, 2));
        }
        console.log(`Saved to: ${outputPath}`);
      }

      await sleep(delay);
      break;

    case 'extractOne':
      if (!task.selector) {
        console.log('ExtractOne requires a selector');
        break;
      }
      console.log(`Extracting single element from: ${task.selector}`);

      const singleData = await page.$eval(task.selector, (el, attr) => {
        if (attr === 'text') return el.textContent.trim();
        if (attr === 'html') return el.innerHTML;
        if (attr) return el.getAttribute(attr);
        return el.textContent.trim();
      }, task.attribute || 'text');

      console.log(`Content: ${singleData}`);

      if (task.saveTo) {
        const singleOutputPath = path.join(__dirname, task.saveTo);
        fs.writeFileSync(singleOutputPath, JSON.stringify({ content: singleData }, null, 2));
        console.log(`Saved to: ${singleOutputPath}`);
      }

      await sleep(delay);
      break;

    default:
      console.log(`Unknown action: ${task.action}`);
  }
}

async function run() {
  let browser = null;

  try {
    console.log('Starting browser...');

    browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      userDataDir: USER_DATA_DIR,
      args: [
        `--window-size=${MOBILE_VIEWPORT.width + 100},${MOBILE_VIEWPORT.height + 150}`,
        '--window-position=100,50'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport(MOBILE_VIEWPORT);
    await page.setUserAgent(MOBILE_USER_AGENT);

    // Check if loop mode is enabled
    if (config.loop) {
      // Load users from users.js
      const usersPath = path.join(__dirname, 'users.js');
      let users = [];
      if (fs.existsSync(usersPath)) {
        delete require.cache[require.resolve(usersPath)];
        users = require(usersPath);
      }

      if (!Array.isArray(users) || users.length === 0) {
        console.log('No users found in users.js');
        return;
      }

      console.log(`Loop mode: Processing ${users.length} users...\n`);

      for (let u = 0; u < users.length; u++) {
        const user = users[u];
        const url = config.url.endsWith('/') ? config.url + user : config.url + '/' + user;

        console.log(`\n========== User ${u + 1}/${users.length}: ${user} ==========`);
        console.log(`Opening URL: ${url}`);

        await page.goto(url, { waitUntil: 'networkidle2' });
        await sleep(2000);

        // Execute tasks for this user
        for (let i = 0; i < config.tasks.length; i++) {
          const task = config.tasks[i];
          console.log(`\n--- Task ${i + 1}/${config.tasks.length}: ${task.action} ---`);
          await executeTask(page, task, browser);
        }

        console.log(`\nCompleted tasks for user: ${user}`);
      }

      console.log('\n========== All users processed! ==========');
    } else {
      // Normal single URL mode
      console.log(`Opening URL: ${config.url}`);
      await page.goto(config.url, { waitUntil: 'networkidle2' });
      await sleep(2000);

      // Execute tasks
      console.log(`Executing ${config.tasks.length} tasks...`);

      for (let i = 0; i < config.tasks.length; i++) {
        const task = config.tasks[i];
        console.log(`\n--- Task ${i + 1}/${config.tasks.length}: ${task.action} ---`);
        await executeTask(page, task, browser);
      }

      console.log('\nAll tasks completed!');
    }

    console.log('Browser will stay open. Press Ctrl+C to close.');
    await new Promise(() => {});

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

run();
