class GodpackIdentifier {
  constructor() {
    this.selectedPacks = new Set();
    this.serverUrl = "http://localhost:3000"; // Default server URL
    this.packCheckboxes = document.querySelectorAll('input[name="pack"]');
    this.startButton = document.getElementById("start-bot");
    this.stopButton = document.getElementById("stop-bot");
    this.statusIndicator = document.getElementById("bot-status-dot");
    this.statusText = document.getElementById("bot-status-text");
    this.filtersList = document.getElementById("active-filters");
    this.logsContainer = document.getElementById("bot-logs");

    // --- Initialize rolling image arrays ---
    this.joinedImages = [];
    this.skippedImages = [];
    this.rollingImageInterval = null;

    this.initializeElements();
    this.bindEvents();
    this.loadSettings();
    this.updateBotStatus();
    this.startRollingImagePolling(); // Start polling for rolling images
  }

  initializeElements() {
    // Pack selection
    this.packCheckboxes = document.querySelectorAll(
      '.pack-option input[type="checkbox"]'
    );
    this.selectAllBtn = document.getElementById("select-all");
    this.selectNoneBtn = document.getElementById("select-none");

    // Image input
    this.imageUrlInput = document.getElementById("image-url");
    this.imageFileInput = document.getElementById("image-file");
    this.loadImageBtn = document.getElementById("load-image");
    this.imagePreview = document.getElementById("image-preview");
    this.previewImg = document.getElementById("preview-img");

    // Results
    this.identifyBtn = document.getElementById("identify-cards");
    this.results = document.getElementById("results");
    this.loading = document.getElementById("loading");
    this.successResults = document.getElementById("success-results");
    this.errorResults = document.getElementById("error-results");
    this.cardsList = document.getElementById("cards-list");
    this.errorMessage = document.getElementById("error-message");

    // Configuration
    this.serverUrlInput = document.getElementById("server-url");
    this.autoIdentifyCheckbox = document.getElementById("auto-identify");
  }

  bindEvents() {
    // Pack selection events
    this.packCheckboxes.forEach((checkbox) => {
      checkbox.addEventListener("change", (e) => {
        if (e.target.checked) {
          this.selectedPacks.add(e.target.value);
          // If regular pack, auto-check premium
          if (!e.target.value.endsWith("-premium")) {
            const premiumValue = e.target.value + "-premium";
            this.packCheckboxes.forEach((cb) => {
              if (cb.value === premiumValue && !cb.checked) {
                cb.checked = true;
                this.selectedPacks.add(cb.value);
              }
            });
          }
        } else {
          this.selectedPacks.delete(e.target.value);
        }
        this.saveSettings();

        // Update bot filters if running
        this.updateBotFilters();
      });
    });

    this.selectAllBtn.addEventListener("click", () => {
      this.packCheckboxes.forEach((checkbox) => {
        checkbox.checked = true;
        this.selectedPacks.add(checkbox.value);
      });
      this.saveSettings();
      this.updateBotFilters();
    });

    this.selectNoneBtn.addEventListener("click", () => {
      this.packCheckboxes.forEach((checkbox) => {
        checkbox.checked = false;
        this.selectedPacks.delete(checkbox.value);
      });
      this.saveSettings();
      this.updateBotFilters();
    });

    // Image input events
    this.loadImageBtn.addEventListener("click", () => this.loadImageFromUrl());
    this.imageFileInput.addEventListener("change", (e) =>
      this.handleFileUpload(e)
    );
    this.imageUrlInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.loadImageFromUrl();
    });

    // Identification events
    this.identifyBtn.addEventListener("click", () => this.identifyCards());

    // Bot control events
    this.startBotBtn = document.getElementById("start-bot");
    this.stopBotBtn = document.getElementById("stop-bot");
    this.botStatusDot = document.getElementById("bot-status-dot");
    this.botStatusText = document.getElementById("bot-status-text");
    this.activeFilters = document.getElementById("active-filters");
    this.botUptime = document.getElementById("bot-uptime");
    this.botLogs = document.getElementById("bot-logs");

    this.startBotBtn.addEventListener("click", () => this.startBot());
    this.stopBotBtn.addEventListener("click", () => this.stopBot());

    // Configuration events
    this.serverUrlInput.addEventListener("change", () => {
      this.serverUrl = this.serverUrlInput.value;
      this.saveSettings();
    });

    this.autoIdentifyCheckbox.addEventListener("change", () => {
      this.saveSettings();
    });

    // Clear image buttons
    const clearJoinedBtn = document.getElementById("clear-joined-images");
    const clearSkippedBtn = document.getElementById("clear-skipped-images");

    if (clearJoinedBtn) {
      clearJoinedBtn.addEventListener("click", () => {
        this.joinedImages = [];
        this.renderJoinedImages();
      });
    }

    if (clearSkippedBtn) {
      clearSkippedBtn.addEventListener("click", () => {
        this.skippedImages = [];
        this.renderSkippedImages();
      });
    }

    // Start polling for bot status
    this.startBotStatusPolling();
  }

  async loadImageFromUrl() {
    const url = this.imageUrlInput.value.trim();
    if (!url) {
      this.showError("Please enter an image URL");
      return;
    }

    try {
      this.showLoading("Loading image...");
      await this.loadImage(url);
      this.hideLoading();

      if (this.autoIdentifyCheckbox.checked) {
        this.identifyCards();
      }
    } catch (error) {
      this.hideLoading();
      this.showError(`Failed to load image: ${error.message}`);
    }
  }

  handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      this.currentImage = e.target.result;
      this.previewImg.src = this.currentImage;
      this.imagePreview.classList.remove("hidden");
      this.identifyBtn.disabled = false;

      if (this.autoIdentifyCheckbox.checked) {
        this.identifyCards();
      }
    };
    reader.readAsDataURL(file);
  }

  async loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        this.currentImage = url;
        this.previewImg.src = url;
        this.imagePreview.classList.remove("hidden");
        this.identifyBtn.disabled = false;
        resolve();
      };

      img.onerror = () => {
        reject(new Error("Failed to load image"));
      };

      img.src = url;
    });
  }

  async identifyCards() {
    if (!this.currentImage) {
      this.showError("Please load an image first");
      return;
    }

    if (this.selectedPacks.size === 0) {
      this.showError("Please select at least one pack type");
      return;
    }

    this.showLoading("Identifying cards...");
    this.hideResults();

    try {
      // Try each selected pack until one works
      for (const packName of this.selectedPacks) {
        try {
          const result = await this.callIdentificationAPI(
            this.currentImage,
            packName
          );
          if (result.success) {
            this.showSuccessResults(result);
            return;
          }
        } catch (error) {
          console.log(`Failed with pack ${packName}:`, error.message);
          continue;
        }
      }

      // If we get here, no pack worked
      this.showError("Could not identify cards with any selected pack type");
    } catch (error) {
      this.showError(`Identification failed: ${error.message}`);
    } finally {
      this.hideLoading();
    }
  }

  async callIdentificationAPI(imageUrl, packName) {
    const response = await fetch(`${this.serverUrl}/identify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        imageUrl: imageUrl,
        packName: packName,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  showSuccessResults(result) {
    this.successResults.classList.remove("hidden");
    this.errorResults.classList.add("hidden");

    // Update set info
    const setInfo = this.successResults.querySelector(".set-info");
    setInfo.querySelector(".set-name").textContent = this.getPackDisplayName(
      result.set_name
    );
    setInfo.querySelector(".set-code").textContent = result.set_code;

    // Update cards list
    this.cardsList.innerHTML = "";
    result.cards.forEach((card) => {
      const cardElement = document.createElement("div");
      cardElement.className = "card-item";
      cardElement.innerHTML = `
                <div class="card-position">${card.position}</div>
                <div class="card-name">${card.card_name}</div>
            `;
      this.cardsList.appendChild(cardElement);
    });

    this.results.classList.remove("hidden");
  }

  showError(message) {
    this.errorResults.classList.remove("hidden");
    this.successResults.classList.add("hidden");
    this.errorMessage.textContent = message;
    this.results.classList.remove("hidden");
  }

  showLoading(message) {
    this.loading.querySelector("p").textContent = message;
    this.loading.classList.remove("hidden");
  }

  hideLoading() {
    this.loading.classList.add("hidden");
  }

  hideResults() {
    this.results.classList.add("hidden");
  }

  getPackDisplayName(packName) {
    const displayNames = {
      "genetic-apex": "Genetic Apex",
      "genetic-apex-premium": "Genetic Apex Premium",
      "mythical-island": "Mythical Island",
      "mythical-island-premium": "Mythical Island Premium",
      "space-time-smackdown": "Space-time Smackdown",
      "space-time-smackdown-premium": "Space-time Smackdown Premium",
      "triumphant-light": "Triumphant Light",
      "triumphant-light-premium": "Triumphant Light Premium",
      "shining-revelry": "Shining Revelry",
      "shining-revelry-premium": "Shining Revelry Premium",
      "celestial-guardians": "Celestial Guardians",
      "celestial-guardians-premium": "Celestial Guardians Premium",
      "extradimensional-crisis": "Extradimensional Crisis",
      "extradimensional-crisis-premium": "Extradimensional Crisis Premium",
      "eevee-grove": "Eevee Grove",
      "eevee-grove-premium": "Eevee Grove Premium",
      "wisdom-of-sea-and-sky": "Wisdom of Sea and Sky",
      "wisdom-of-sea-and-sky-premium": "Wisdom of Sea and Sky Premium",
    };
    return displayNames[packName] || packName;
  }

  saveSettings() {
    const settings = {
      selectedPacks: Array.from(this.selectedPacks),
      serverUrl: this.serverUrl,
      autoIdentify: this.autoIdentifyCheckbox.checked,
    };
    localStorage.setItem("godpackSettings", JSON.stringify(settings));
  }

  async startBot() {
    if (this.selectedPacks.size === 0) {
      this.showError("Please select at least one pack type to hunt for");
      return;
    }

    try {
      this.startBotBtn.disabled = true;
      this.startBotBtn.textContent = "Starting...";

      // First check environment
      const envResponse = await fetch(`${this.serverUrl}/bot/environment`);
      const envResult = await envResponse.json();

      if (!envResult.ready) {
        this.showBotError(
          `Environment not configured. Missing: ${envResult.missing.join(", ")}`
        );
        return;
      }

      const response = await fetch(`${this.serverUrl}/bot/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          selectedPacks: Array.from(this.selectedPacks),
        }),
      });

      const result = await response.json();

      if (result.success) {
        this.updateBotStatus(true);
        this.showBotSuccess(
          `Bot started successfully! Hunting for: ${result.filters.join(", ")}`
        );
      } else {
        this.showBotError(`Failed to start bot: ${result.error}`);
      }
    } catch (error) {
      this.showBotError(`Bot start error: ${error.message}`);
    } finally {
      this.startBotBtn.disabled = false;
      this.startBotBtn.textContent = "Start Hunting";
    }
  }

  async stopBot() {
    try {
      this.stopBotBtn.disabled = true;
      this.stopBotBtn.textContent = "Stopping...";

      const response = await fetch(`${this.serverUrl}/bot/stop`, {
        method: "POST",
      });

      const result = await response.json();

      if (result.success) {
        this.updateBotStatus(false);
        this.showBotSuccess("Bot stopped successfully");
      } else {
        this.showBotError(`Failed to stop bot: ${result.error}`);
      }
    } catch (error) {
      this.showBotError(`Bot stop error: ${error.message}`);
    } finally {
      this.stopBotBtn.disabled = false;
      this.stopBotBtn.textContent = "Stop Bot";
    }
  }

  async updateBotFilters() {
    try {
      const response = await fetch(`${this.serverUrl}/bot/update-filters`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          selectedPacks: Array.from(this.selectedPacks),
        }),
      });

      if (!response.ok) {
        // Don't show error if bot is not running
        if (response.status !== 400) {
          console.warn(`Filter update failed: ${response.status}`);
        }
        return;
      }

      const result = await response.json();
      console.log("Filters updated:", result.filters);
    } catch (error) {
      // Don't show error if bot is not running
      console.warn(
        "Filter update failed (bot may not be running):",
        error.message
      );
    }
  }

  async updateBotStatus() {
    try {
      const response = await fetch("/bot/status");
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          this.updateStatusDisplay(data);
          this.updateFiltersDisplay(data.currentFilters);
          this.updateLogsDisplay(data.logs);
        }
      }
    } catch (error) {
      console.error("Failed to update bot status:", error);
    }
  }

  updateStatusDisplay(status) {
    if (status.isRunning) {
      this.statusIndicator.classList.add("running");
      this.statusText.textContent = "Running";
      this.startButton.disabled = true;
      this.stopButton.disabled = false;
    } else {
      this.statusIndicator.classList.remove("running");
      this.statusText.textContent = "Stopped";
      this.startButton.disabled = false;
      this.stopButton.disabled = true;
    }
  }

  updateFiltersDisplay(filters) {
    if (this.filtersList) {
      this.filtersList.textContent =
        filters.length > 0 ? filters.join(", ") : "No filters set";
    }
  }

  updateLogsDisplay(logs) {
    if (this.logsContainer) {
      if (logs && logs.length > 0) {
        this.logsContainer.innerHTML = logs
          .map((log) => {
            const timestamp = new Date(log.timestamp).toLocaleTimeString();
            const className =
              log.type === "error"
                ? "error"
                : log.type === "warning"
                ? "warning"
                : "info";
            return `<div class="log-entry ${className}">[${timestamp}] ${log.message}</div>`;
          })
          .join("");
        this.logsContainer.scrollTop = this.logsContainer.scrollHeight;
      } else {
        this.logsContainer.innerHTML =
          '<div class="no-logs">No logs available</div>';
      }
    }
  }

  showBotSuccess(message) {
    // You could add a toast notification here
    console.log(`✅ ${message}`);
  }

  showBotError(message) {
    // You could add a toast notification here
    console.error(`❌ ${message}`);
  }

  startBotStatusPolling() {
    // Update status every 2 seconds
    setInterval(() => {
      this.updateBotStatus();
    }, 2000);
  }

  loadSettings() {
    const saved = localStorage.getItem("godpackSettings");
    if (saved) {
      const settings = JSON.parse(saved);

      // Load selected packs
      this.selectedPacks = new Set(settings.selectedPacks || ["genetic-apex"]);
      this.packCheckboxes.forEach((checkbox) => {
        checkbox.checked = this.selectedPacks.has(checkbox.value);
      });

      // Load server URL
      if (settings.serverUrl) {
        this.serverUrl = settings.serverUrl;
        this.serverUrlInput.value = this.serverUrl;
      }

      // Load auto-identify setting
      if (settings.autoIdentify !== undefined) {
        this.autoIdentifyCheckbox.checked = settings.autoIdentify;
      }
    }
  }

  // --- Rolling image boxes for joined/skipped packs ---
  updateJoinedImages(imageUrl) {
    // This method is called when a new joined image is received
    this.joinedImages.unshift(imageUrl);
    if (this.joinedImages.length > 5) {
      this.joinedImages = this.joinedImages.slice(0, 5);
    }
    this.renderJoinedImages();
  }

  updateSkippedImages(imageUrl) {
    // This method is called when a new skipped image is received
    this.skippedImages.unshift(imageUrl);
    if (this.skippedImages.length > 5) {
      this.skippedImages = this.skippedImages.slice(0, 5);
    }
    this.renderSkippedImages();
  }

  renderJoinedImages() {
    const container = document.getElementById("joined-images");
    if (!container) return;

    container.innerHTML = "";

    if (this.joinedImages.length === 0) {
      container.innerHTML =
        '<span style="color: #718096; font-style: italic;">No joined packs yet</span>';
      return;
    }

    this.joinedImages.forEach((imageData) => {
      const imgWrapper = document.createElement("div");
      imgWrapper.style.position = "relative";
      imgWrapper.style.display = "inline-block";

      const img = document.createElement("img");
      img.src = imageData.url;
      img.alt = `Joined: ${imageData.nickname}`;
      img.className = "joined-img";

      // Add click handler to open image in new tab
      img.addEventListener("click", () => {
        window.open(imageData.url, "_blank");
      });

      // Add tooltip with timestamp
      const tooltip = document.createElement("div");
      tooltip.className = "image-tooltip";
      const timestamp = new Date(imageData.timestamp).toLocaleString();
      tooltip.textContent = `${imageData.nickname} - ${timestamp}`;

      imgWrapper.appendChild(img);
      imgWrapper.appendChild(tooltip);
      container.appendChild(imgWrapper);
    });
  }

  renderSkippedImages() {
    const container = document.getElementById("skipped-images");
    if (!container) return;

    container.innerHTML = "";

    if (this.skippedImages.length === 0) {
      container.innerHTML =
        '<span style="color: #718096; font-style: italic;">No skipped packs yet</span>';
      return;
    }

    this.skippedImages.forEach((imageData) => {
      const imgWrapper = document.createElement("div");
      imgWrapper.style.position = "relative";
      imgWrapper.style.display = "inline-block";

      const img = document.createElement("img");
      img.src = imageData.url;
      img.alt = `Skipped: ${imageData.nickname}`;
      img.className = "skipped-img";

      // Add click handler to open image in new tab
      img.addEventListener("click", () => {
        window.open(imageData.url, "_blank");
      });

      // Add tooltip with timestamp
      const tooltip = document.createElement("div");
      tooltip.className = "image-tooltip";
      const timestamp = new Date(imageData.timestamp).toLocaleString();
      tooltip.textContent = `${imageData.nickname} - ${timestamp}`;

      imgWrapper.appendChild(img);
      imgWrapper.appendChild(tooltip);
      container.appendChild(imgWrapper);
    });
  }

  // --- Polling for rolling images ---
  startRollingImagePolling() {
    this.rollingImageInterval = setInterval(async () => {
      try {
        const response = await fetch("/api/rolling-images");
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            this.joinedImages = data.joined || [];
            this.skippedImages = data.skipped || [];

            // Auto-cleanup images older than 20 minutes
            const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000);
            this.joinedImages = this.joinedImages.filter(
              (img) => new Date(img.timestamp) > twentyMinutesAgo
            );
            this.skippedImages = this.skippedImages.filter(
              (img) => new Date(img.timestamp) > twentyMinutesAgo
            );

            this.renderJoinedImages();
            this.renderSkippedImages();
          }
        }
      } catch (error) {
        console.warn("Failed to fetch rolling images:", error);
      }
    }, 3000); // Poll every 3 seconds
  }

  stopRollingImagePolling() {
    if (this.rollingImageInterval) {
      clearInterval(this.rollingImageInterval);
      this.rollingImageInterval = null;
    }
  }
}

// Initialize the app when the page loads
document.addEventListener("DOMContentLoaded", () => {
  new GodpackIdentifier();
});
