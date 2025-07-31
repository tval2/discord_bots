const { spawn } = require("child_process");
const path = require("path");

class BotController {
  constructor() {
    this.botProcess = null;
    this.isRunning = false;
    this.currentFilters = [];
    this.logs = [];
    // --- Image tracking for rolling image boxes ---
    this.joinedImages = [];
    this.skippedImages = [];
    this.maxImages = 5; // Keep last 5 images for each type
  }

  /**
   * Add image to joined images list
   * @param {string} imageUrl - URL of the joined pack image
   * @param {string} nickname - Pack nickname
   * @param {string} filterText - Filter text
   */
  addJoinedImage(imageUrl, nickname, filterText) {
    this.joinedImages.unshift({
      url: imageUrl,
      nickname: nickname,
      filterText: filterText,
      timestamp: new Date(),
    });

    // Keep only the last maxImages
    if (this.joinedImages.length > this.maxImages) {
      this.joinedImages = this.joinedImages.slice(0, this.maxImages);
    }
  }

  /**
   * Add image to skipped images list
   * @param {string} imageUrl - URL of the skipped pack image
   * @param {string} nickname - Pack nickname
   * @param {string} filterText - Filter text
   */
  addSkippedImage(imageUrl, nickname, filterText) {
    this.skippedImages.unshift({
      url: imageUrl,
      nickname: nickname,
      filterText: filterText,
      timestamp: new Date(),
    });

    // Keep only the last maxImages
    if (this.skippedImages.length > this.maxImages) {
      this.skippedImages = this.skippedImages.slice(0, this.maxImages);
    }
  }

  /**
   * Get joined images for rolling image box
   * @returns {Array} Array of joined image objects
   */
  getJoinedImages() {
    return this.joinedImages;
  }

  /**
   * Get skipped images for rolling image box
   * @returns {Array} Array of skipped image objects
   */
  getSkippedImages() {
    return this.skippedImages;
  }

  /**
   * Update rolling images from bot tracking files
   */
  async updateRollingImages() {
    try {
      const tempDir = path.join(__dirname, "web_app", "temp");
      const fs = require("fs").promises;

      // Check if temp directory exists
      try {
        await fs.access(tempDir);
      } catch (error) {
        return; // Directory doesn't exist yet
      }

      const files = await fs.readdir(tempDir);
      const imageFiles = files.filter(
        (f) => f.startsWith("image_") && f.endsWith(".json")
      );

      for (const file of imageFiles) {
        try {
          const filepath = path.join(tempDir, file);
          const content = await fs.readFile(filepath, "utf8");
          const imageData = JSON.parse(content);

          if (imageData.action === "joined") {
            this.addJoinedImage(
              imageData.url,
              imageData.nickname,
              imageData.filterText
            );
          } else if (imageData.action === "skipped") {
            this.addSkippedImage(
              imageData.url,
              imageData.nickname,
              imageData.filterText
            );
          }

          // Delete the file after processing
          await fs.unlink(filepath);
        } catch (error) {
          console.warn(`Failed to process image file ${file}:`, error.message);
        }
      }
    } catch (error) {
      console.warn("Failed to update rolling images:", error.message);
    }
  }

  /**
   * Convert pack names to Discord filter phrases
   * @param {Array} selectedPacks - Array of pack names from web app
   * @returns {Array} Discord filter phrases
   */
  convertPacksToFilters(selectedPacks) {
    const filters = [];

    selectedPacks.forEach((packName) => {
      // Convert pack names to Discord format
      // e.g., "genetic-apex" -> "@/genetic-apex"
      // e.g., "genetic-apex-premium" -> "@/genetic-apex-premium"
      filters.push(`@/${packName}`);
    });

    return filters;
  }

  /**
   * Start the Discord bot with specified pack filters
   * @param {Array} selectedPacks - Array of pack names
   * @returns {Promise} - Promise that resolves when bot starts
   */
  async startBot(selectedPacks) {
    if (this.isRunning) {
      throw new Error("Bot is already running");
    }

    // Check required environment variables
    if (!process.env.CHANNEL_URL) {
      throw new Error("CHANNEL_URL environment variable is required");
    }
    if (!process.env.DISCORD_WEBHOOK_URL) {
      throw new Error("DISCORD_WEBHOOK_URL environment variable is required");
    }

    this.currentFilters = this.convertPacksToFilters(selectedPacks);

    if (this.currentFilters.length === 0) {
      throw new Error("No pack types selected");
    }

    return new Promise(async (resolve, reject) => {
      try {
        // Write initial filters to file
        const fs = require("fs");
        const tempDir = path.join(__dirname, "web_app", "temp");
        await fs.promises.mkdir(tempDir, { recursive: true });

        const filterPath = path.join(tempDir, "current_filters.json");
        await fs.promises.writeFile(
          filterPath,
          JSON.stringify(
            {
              filters: this.currentFilters,
              timestamp: new Date().toISOString(),
            },
            null,
            2
          )
        );

        // Start the bot process with the original script
        this.botProcess = spawn(
          "node",
          [path.join(__dirname, "autojoin_queue_discord_webhook.js")],
          {
            stdio: ["pipe", "pipe", "pipe"],
            env: {
              ...process.env,
              // Ensure critical environment variables are set
              CHANNEL_URL: process.env.CHANNEL_URL,
              DISCORD_WEBHOOK_URL: process.env.DISCORD_WEBHOOK_URL,
              CHROME_PATH: process.env.CHROME_PATH,
            },
          }
        );

        this.isRunning = true;
        this.logs = [];

        // Handle bot output
        this.botProcess.stdout.on("data", (data) => {
          const log = data.toString().trim();
          this.logs.push({ timestamp: new Date(), type: "info", message: log });
          console.log(`[BOT] ${log}`);
        });

        this.botProcess.stderr.on("data", (data) => {
          const log = data.toString().trim();
          this.logs.push({
            timestamp: new Date(),
            type: "error",
            message: log,
          });
          console.error(`[BOT ERROR] ${log}`);
        });

        this.botProcess.on("close", (code) => {
          this.isRunning = false;
          this.botProcess = null;

          this.logs.push({
            timestamp: new Date(),
            type: "info",
            message: `Bot stopped with code ${code}`,
          });
        });

        this.botProcess.on("error", (error) => {
          this.isRunning = false;
          this.botProcess = null;
          reject(error);
        });

        // Wait a moment to see if bot starts successfully
        setTimeout(() => {
          if (this.isRunning) {
            resolve();
          }
        }, 2000);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop the Discord bot
   */
  stopBot() {
    if (this.botProcess && this.isRunning) {
      this.botProcess.kill("SIGINT");
      this.isRunning = false;
      this.botProcess = null;
    }
  }

  /**
   * Get current bot status
   * @returns {Object} Bot status information
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      currentFilters: this.currentFilters,
      logs: this.logs.slice(-50), // Last 50 logs
      uptime: this.isRunning
        ? Date.now() - (this.logs[0]?.timestamp || Date.now())
        : 0,
    };
  }

  /**
   * Get recent logs
   * @param {number} count - Number of logs to return
   * @returns {Array} Recent logs
   */
  getRecentLogs(count = 20) {
    return this.logs.slice(-count);
  }

  /**
   * Update filters while bot is running
   * @param {Array} selectedPacks - Array of selected pack names
   */
  async updateFilters(selectedPacks) {
    if (!this.isRunning) {
      throw new Error("Bot is not running");
    }

    const newFilters = this.convertPacksToFilters(selectedPacks);

    if (newFilters.length === 0) {
      throw new Error("No pack types selected");
    }

    // Update current filters
    this.currentFilters = newFilters;

    // Write filters to file for the bot to read
    try {
      const fs = require("fs");
      const tempDir = path.join(__dirname, "web_app", "temp");
      await fs.promises.mkdir(tempDir, { recursive: true });

      const filterPath = path.join(tempDir, "current_filters.json");
      await fs.promises.writeFile(
        filterPath,
        JSON.stringify(
          {
            filters: newFilters,
            timestamp: new Date().toISOString(),
          },
          null,
          2
        )
      );

      // Send signal to bot to reload filters
      if (this.botProcess) {
        this.botProcess.kill("SIGUSR2");

        // Log the filter update
        this.logs.push({
          timestamp: new Date(),
          type: "info",
          message: `Filters updated: ${newFilters.join(", ")}`,
        });
      }
    } catch (error) {
      throw new Error(`Failed to update filters: ${error.message}`);
    }
  }

  /**
   * Check if environment is properly configured
   * @returns {Object} Environment check results
   */
  checkEnvironment() {
    const required = ["CHANNEL_URL", "DISCORD_WEBHOOK_URL"];
    const optional = ["CHROME_PATH"];

    const results = {
      ready: true,
      missing: [],
      optional: [],
    };

    required.forEach((varName) => {
      if (!process.env[varName]) {
        results.ready = false;
        results.missing.push(varName);
      }
    });

    optional.forEach((varName) => {
      if (!process.env[varName]) {
        results.optional.push(varName);
      }
    });

    return results;
  }
}

module.exports = BotController;
