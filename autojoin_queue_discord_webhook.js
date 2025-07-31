// autojoin_queue_discord_webhook.js

/**
 * Auto‑join filtered Godpacks in a Discord channel, with notifications via a Discord webhook.
 * Uses Playwright to control Chrome with your profile.
 *
 * Usage:
 *   npm install playwright axios
 *   npx playwright install
 *   Set DISCORD_WEBHOOK_URL env var to your webhook endpoint
 *   node autojoin_queue_discord_webhook.js
 */

require("dotenv").config();
const { chromium } = require("playwright");
const axios = require("axios");
const { identifyGodpackCardsFromUrl } = require("./card_identifier");
const fs = require("fs").promises;
const path = require("path");

// --- Prevent sleep on Mac while running ---
if (process.platform === "darwin") {
  const { spawn } = require("child_process");
  const caffeinate = spawn("caffeinate", ["-dimsu", process.pid]);
  process.on("exit", () => caffeinate.kill());
}

// --- Timestamped log helper ---
function logWithTime(...args) {
  const ts = new Date().toLocaleTimeString();
  console.log(`[${ts}]`, ...args);
}

// --- Image tracking helper ---
async function trackImage(imageUrl, nickname, filterText, action) {
  try {
    const imageData = {
      url: imageUrl,
      nickname: nickname,
      filterText: filterText,
      timestamp: new Date().toISOString(),
      action: action, // 'joined' or 'skipped'
    };

    // Write to a temporary file that the controller can read
    const tempDir = path.join(__dirname, "web_app", "temp");
    await fs.mkdir(tempDir, { recursive: true });

    const filename = `image_${Date.now()}_${action}.json`;
    const filepath = path.join(tempDir, filename);

    await fs.writeFile(filepath, JSON.stringify(imageData, null, 2));

    // Clean up old files (keep only last 10)
    const files = await fs.readdir(tempDir);
    const imageFiles = files.filter(
      (f) => f.startsWith("image_") && f.endsWith(".json")
    );
    if (imageFiles.length > 10) {
      const sortedFiles = imageFiles.sort().slice(0, imageFiles.length - 10);
      for (const file of sortedFiles) {
        try {
          await fs.unlink(path.join(tempDir, file));
        } catch (err) {
          // Ignore cleanup errors
        }
      }
    }
  } catch (error) {
    logWithTime("⚠️ Failed to track image:", error.message);
  }
}

// --- Discord Webhook Setup ---
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

(async () => {
  // --- Configuration ---
  const USER_DATA_DIR = "./discord-user-data";
  const CHROME_PATH = process.env.CHROME_PATH;
  const CHANNEL_URL = process.env.CHANNEL_URL;
  const POLL_INTERVAL_MS = 3000;
  const COOLDOWN_MS = 15000;
  // --- Filter phrases (empty => no filtering) ---
  let FILTER_PHRASES = [];

  // --- Function to load filters from file ---
  function loadFilters() {
    try {
      const fs = require("fs");
      const filterPath = path.join(
        __dirname,
        "web_app",
        "temp",
        "current_filters.json"
      );
      if (fs.existsSync(filterPath)) {
        const filterData = JSON.parse(fs.readFileSync(filterPath, "utf8"));
        FILTER_PHRASES = filterData.filters || [];
        logWithTime(`🔄 Filters reloaded: ${FILTER_PHRASES.join(", ")}`);
      }
    } catch (error) {
      logWithTime(`⚠️ Failed to load filters: ${error.message}`);
    }
  }

  // --- Load initial filters ---
  loadFilters();

  // --- Signal handling for filter updates ---
  process.on("SIGUSR2", () => {
    logWithTime("🔄 Received filter update signal - reloading filters...");
    loadFilters();
  });

  // --- Launch Chrome with persistent session ---
  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    executablePath: CHROME_PATH,
    args: ["--start-maximized"],
  });
  const page = await context.newPage();

  // --- Navigate to Discord channel ---
  logWithTime(`➡️ Navigating to ${CHANNEL_URL}`);
  await page.goto(CHANNEL_URL);
  await page.waitForLoadState("networkidle");
  logWithTime("✅ Channel loaded");

  // --- Helper: Scroll to bottom ---
  async function scrollToBottom() {
    await page.evaluate(() => {
      const s = document.querySelector(
        '[class*="scrollerInner-"], [class*="scroller-"], .scroller'
      );
      if (s) s.scrollTop = s.scrollHeight;
    });
  }

  // --- Helper: Extract visible Godpack IDs ---
  async function getVisibleGodpackIDs() {
    await scrollToBottom();
    const locator = page.locator(
      '[class*="messageListItem"]:has(button:has-text("Join"))'
    );
    const count = await locator.count();
    const ids = [];
    for (let i = 0; i < count; i++) {
      const msg = locator.nth(i);
      const field = msg.locator(".embedFieldValue__623de").first();
      if (await field.count()) {
        const raw = (await field.innerText()).trim();
        const m = raw.match(
          /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
        );
        if (m) ids.push(m[0]);
      }
    }
    return ids;
  }

  // --- Initial skip ---
  logWithTime("⌛ Settling initial messages...");
  await page.waitForTimeout(POLL_INTERVAL_MS);
  const seenIDs = new Set(await getVisibleGodpackIDs());
  logWithTime(`🚫 Skipped ${seenIDs.size} existing godpacks`);

  // --- Main polling loop ---
  while (true) {
    await page.waitForTimeout(POLL_INTERVAL_MS);
    const currentIDs = await getVisibleGodpackIDs();
    const newIDs = currentIDs.filter((id) => !seenIDs.has(id));
    if (!newIDs.length) {
      logWithTime("💤 No new godpacks");
      continue;
    }

    const targetID = newIDs[newIDs.length - 1];
    seenIDs.add(targetID);

    // --- Extract message text & correct image URL ---
    const { messageText, imageUrl } = await page.evaluate((id) => {
      for (const msg of document.querySelectorAll(
        '[class*="messageListItem"]'
      )) {
        if (msg.innerText.includes(id)) {
          const text = msg.innerText;
          const link = msg.querySelector("a.originalLink_af017a");
          const imgHref = link ? link.href : null;
          return { messageText: text, imageUrl: imgHref };
        }
      }
      return { messageText: "", imageUrl: null };
    }, targetID);

    // --- Extract nickname and filter_use_text ---
    let nickname = "";
    let filter_use_text = "";
    // Nickname: after "Nickname:" and before "Join"
    const nickMatch = messageText.match(/Nickname:\s*([\w-]+)/);
    if (nickMatch) {
      nickname = nickMatch[1];
    } else {
      // fallback: try to extract from trimmedText logic
      let trimmedText = messageText.split("Join")[0];
      if (trimmedText.includes("Nickname:")) {
        nickname = trimmedText.split("Nickname:").pop().trim();
      } else {
        nickname = trimmedText.trim();
      }
    }
    // filter_use_text: text before "New Godpack"
    const filterMatch = messageText.split("New Godpack")[0].trim();
    filter_use_text = filterMatch
      .replace(/\n/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // --- Filter check ---
    const passes =
      FILTER_PHRASES.length === 0 ||
      FILTER_PHRASES.some((fp) => messageText.includes(fp));

    if (!passes) {
      // Skipped due to filter
      logWithTime(`➖ Skipped: ${nickname} [${filter_use_text}]`);
      // Optionally: send skipped image to webapp API for rolling image box
      await trackImage(imageUrl, nickname, filter_use_text, "skipped");
      continue;
    }

    // --- Click Join via evaluate (reliable) ---
    const clicked = await page.evaluate((id) => {
      for (const msg of document.querySelectorAll(
        '[class*="messageListItem"]'
      )) {
        if (msg.innerText.includes(id)) {
          const btn = Array.from(msg.querySelectorAll("button")).find(
            (b) => b.textContent.trim() === "Join"
          );
          if (btn) {
            btn.click();
            return true;
          }
        }
      }
      return false;
    }, targetID);

    if (clicked) {
      // Joined successfully
      logWithTime(`✅ Joined: ${nickname} [${filter_use_text}]`);
      // Optionally: send joined image to webapp API for rolling image box
      await trackImage(imageUrl, nickname, filter_use_text, "joined");
      // --- Identify cards if image URL is available ---
      let cardInfo = "";
      if (imageUrl) {
        try {
          // Extract set name from filter phrases or message text
          let detectedSet = null;
          for (const phrase of FILTER_PHRASES) {
            if (messageText.includes(phrase)) {
              detectedSet = phrase.replace("@/", "").replace("-premium", "");
              break;
            }
          }
          if (detectedSet) {
            const cardResult = await identifyGodpackCardsFromUrl(
              imageUrl,
              detectedSet
            );
            if (cardResult.success) {
              cardInfo = "\n\n**Identified Cards:**\n";
              cardResult.cards.forEach((card) => {
                cardInfo += `${card.position}. ${card.card_name}\n`;
              });
              logWithTime("✅ Cards identified successfully");
            } else {
              logWithTime("⚠️ Card identification failed:", cardResult.error);
            }
          }
        } catch (err) {
          logWithTime("❌ Card identification error:", err.message);
        }
      }
      // --- Send notification via Discord webhook ---
      try {
        await axios.post(DISCORD_WEBHOOK_URL, {
          content:
            `Joined Godpack: ${nickname} [${filter_use_text}]` +
            (imageUrl ? `\n${imageUrl}` : "") +
            cardInfo,
        });
        logWithTime("📩 Webhook notification sent");
      } catch (err) {
        logWithTime("❌ Webhook error:", err);
      }
    } else {
      // Tried to join but failed
      logWithTime(`❌ Join click failed for ${nickname} [${filter_use_text}]`);
    }

    logWithTime(`⏱ Cooling down ${COOLDOWN_MS / 1000}s`);
    await page.waitForTimeout(COOLDOWN_MS);
  }
})();
