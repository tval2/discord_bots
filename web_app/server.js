const express = require("express");
const cors = require("cors");
const { spawn } = require("child_process");
const path = require("path");
const axios = require("axios");
const fs = require("fs").promises;
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const BotController = require("../bot_controller");

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize bot controller
const botController = new BotController();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Create temp directory if it doesn't exist
async function ensureTempDir() {
  const tempDir = path.join(__dirname, "temp");
  try {
    await fs.mkdir(tempDir, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }
}

// Download image from URL
async function downloadImage(imageUrl, localPath) {
  try {
    const response = await axios({
      method: "GET",
      url: imageUrl,
      responseType: "arraybuffer",
    });

    await fs.writeFile(localPath, response.data);
    return localPath;
  } catch (error) {
    throw new Error(`Failed to download image: ${error.message}`);
  }
}

// Call Python script for card identification
function identifyCards(imagePath, packName) {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, "..", "check_image.py");

    const pythonProcess = spawn("python3", [pythonScript, imagePath, packName]);

    let stdout = "";
    let stderr = "";

    pythonProcess.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Python script failed with code ${code}: ${stderr}`));
        return;
      }

      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (error) {
        reject(new Error(`Failed to parse Python output: ${error.message}`));
      }
    });

    pythonProcess.on("error", (error) => {
      reject(new Error(`Failed to start Python process: ${error.message}`));
    });
  });
}

// API endpoint for card identification
app.post("/identify", async (req, res) => {
  try {
    const { imageUrl, packName } = req.body;

    if (!imageUrl || !packName) {
      return res.status(400).json({
        success: false,
        error: "Missing imageUrl or packName",
      });
    }

    // Ensure temp directory exists
    await ensureTempDir();

    // Generate unique filename
    const timestamp = Date.now();
    const localPath = path.join(__dirname, "temp", `godpack_${timestamp}.webp`);

    try {
      // Download the image
      await downloadImage(imageUrl, localPath);

      // Identify the cards
      const result = await identifyCards(localPath, packName);

      // Clean up the downloaded file
      try {
        await fs.unlink(localPath);
      } catch (cleanupError) {
        console.warn("Failed to cleanup temporary file:", cleanupError.message);
      }

      res.json(result);
    } catch (error) {
      // Clean up on error
      try {
        await fs.unlink(localPath);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      throw error;
    }
  } catch (error) {
    console.error("Identification error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Bot control endpoints
app.post("/bot/start", async (req, res) => {
  try {
    const { selectedPacks } = req.body;

    if (
      !selectedPacks ||
      !Array.isArray(selectedPacks) ||
      selectedPacks.length === 0
    ) {
      return res.status(400).json({
        success: false,
        error: "No pack types selected",
      });
    }

    await botController.startBot(selectedPacks);

    res.json({
      success: true,
      message: "Bot started successfully",
      filters: botController.currentFilters,
    });
  } catch (error) {
    console.error("Bot start error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.post("/bot/stop", (req, res) => {
  try {
    botController.stopBot();
    res.json({
      success: true,
      message: "Bot stopped successfully",
    });
  } catch (error) {
    console.error("Bot stop error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.post("/bot/update-filters", async (req, res) => {
  try {
    const { selectedPacks } = req.body;

    if (
      !selectedPacks ||
      !Array.isArray(selectedPacks) ||
      selectedPacks.length === 0
    ) {
      return res.status(400).json({
        success: false,
        error: "No pack types selected",
      });
    }

    await botController.updateFilters(selectedPacks);

    res.json({
      success: true,
      message: "Filters updated successfully",
      filters: botController.currentFilters,
    });
  } catch (error) {
    console.error("Filter update error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.get("/bot/status", (req, res) => {
  const status = botController.getStatus();
  res.json({
    success: true,
    ...status,
  });
});

app.get("/bot/logs", (req, res) => {
  const count = parseInt(req.query.count) || 20;
  const logs = botController.getRecentLogs(count);
  res.json({
    success: true,
    logs: logs,
  });
});

app.get("/bot/environment", (req, res) => {
  const envCheck = botController.checkEnvironment();
  res.json({
    success: true,
    ...envCheck,
  });
});

// --- Rolling image endpoints ---
app.get("/api/rolling-images", (req, res) => {
  try {
    const joinedImages = botController.getJoinedImages();
    const skippedImages = botController.getSkippedImages();
    
    res.json({
      success: true,
      joined: joinedImages,
      skipped: skippedImages
    });
  } catch (error) {
    console.error("Rolling images error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Serve the main page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Start server
app.listen(PORT, () => {
  console.log(
    `🎴 Godpack Identifier Web App running on http://localhost:${PORT}`
  );
  console.log(`📡 API available at http://localhost:${PORT}/identify`);
  console.log(`🏥 Health check at http://localhost:${PORT}/health`);
});

// --- Periodic rolling image updates ---
setInterval(async () => {
  try {
    await botController.updateRollingImages();
  } catch (error) {
    console.warn('Failed to update rolling images:', error.message);
  }
}, 2000); // Check every 2 seconds

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down server...");
  process.exit(0);
});
