const { spawn } = require("child_process");
const path = require("path");

/**
 * Identifies cards in a godpack image using the Python script
 * @param {string} imagePath - Path to the godpack image
 * @param {string} setName - Name of the card set (e.g., "genetic-apex", "space-time-smackdown")
 * @returns {Promise<Object>} - JSON result with identified cards
 */
function identifyGodpackCards(imagePath, setName) {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, "check_image.py");

    const pythonProcess = spawn("python3", [pythonScript, imagePath, setName]);

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

/**
 * Downloads an image from a URL and saves it locally
 * @param {string} imageUrl - URL of the image to download
 * @param {string} localPath - Local path to save the image
 * @returns {Promise<string>} - Path to the downloaded image
 */
async function downloadImage(imageUrl, localPath) {
  const axios = require("axios");
  const fs = require("fs").promises;

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

/**
 * Identifies cards in a godpack image from a URL
 * @param {string} imageUrl - URL of the godpack image
 * @param {string} setName - Name of the card set
 * @returns {Promise<Object>} - JSON result with identified cards
 */
async function identifyGodpackCardsFromUrl(imageUrl, setName) {
  const path = require("path");
  const fs = require("fs").promises;

  // Create temp directory if it doesn't exist
  const tempDir = path.join(__dirname, "temp");
  try {
    await fs.mkdir(tempDir, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }

  // Generate unique filename
  const timestamp = Date.now();
  const localPath = path.join(tempDir, `godpack_${timestamp}.webp`);

  try {
    // Download the image
    await downloadImage(imageUrl, localPath);

    // Identify the cards
    const result = await identifyGodpackCards(localPath, setName);

    // Clean up the downloaded file
    try {
      await fs.unlink(localPath);
    } catch (cleanupError) {
      console.warn("Failed to cleanup temporary file:", cleanupError.message);
    }

    return result;
  } catch (error) {
    // Clean up on error
    try {
      await fs.unlink(localPath);
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
    throw error;
  }
}

module.exports = {
  identifyGodpackCards,
  identifyGodpackCardsFromUrl,
  downloadImage,
};
