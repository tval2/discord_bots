# Discord Godpack Auto‑Join Bot

This script automatically detects and clicks the "Join" button on Godpack announcements in a Discord channel and sends a notification via a Discord webhook.

---

## 🚀 Features

- **Auto‑click** the green **Join** button for new Godpack messages
- **Phrase filtering**: only join when specific mentions appear
- **Discord webhook** notifications with pack details and image link
- **Card identification**: automatically identifies cards in godpack images using AI
- **Persistent Chrome session**: log in once, bot reuses your Discord cookies

---

## 📦 Requirements

- **Node.js** (v14+)
- **Python** (v3.7+)
- **Google Chrome** installed (macOS default path or adjust)
- **Discord channel URL** where Godpack posts appear
- **Discord webhook URL** for notifications

---

## 🛠️ Installation

1. **Clone or download** the repository.
2. Open a terminal in the project folder.
3. Install dependencies:

   ```bash
   npm install playwright axios dotenv
   npx playwright install
   pip install -r requirements.txt
   ```

---

## ⚙️ Configuration

1. **Environment Variables**

   Create a `.env` file in the project root with:

   ```text
   DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/…/…
   ```

2. **Script Constants** (if you prefer inline config)

   - `USER_DATA_DIR`: folder to store Chrome profile (`./discord-user-data`)
   - `CHROME_PATH`: path to your Chrome executable

     - macOS default: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`

   - `CHANNEL_URL`: full Discord URL: `https://discord.com/channels/<GUILD_ID>/<CHANNEL_ID>`
   - `FILTER_PHRASES`: array of mention strings to filter (empty = no filter)
   - `POLL_INTERVAL_MS`: time (ms) between channel scans
   - `COOLDOWN_MS`: wait (ms) after clicking before next scan

3. **Discord Webhook Setup**

   - In your Discord server, go to **Channel Settings ➡ Integrations ➡ Webhooks**
   - **Create** a new webhook and copy its URL
   - Paste into your `.env`

---

## 💻 Usage

```bash
node autojoin_queue_discord_webhook.js
```

1. The script will launch Chrome, navigate to your Discord channel, and wait for new Godpack announcements.
2. When a new pack appears and matches any `FILTER_PHRASES`, the bot clicks **Join**, then sends a webhook notification.
3. If an image URL is available, the bot will automatically identify the cards in the godpack and include them in the notification.
4. A 15 s cooldown prevents duplicate clicks.

### Testing Card Identification

You can test the card identification feature separately:

```bash
node test_card_identification.js
```

---

## ⚙️ Tips & Troubleshooting

- **First‑time login**: The Chrome window will open in non‑headless mode. Log in to Discord manually if needed. Your session will be saved.
- **Filter debugging**: The script logs the exact text it tests against your filters—adjust your `FILTER_PHRASES` accordingly.
- **Webhook errors**: Ensure `DISCORD_WEBHOOK_URL` is correct. Test with the included `test-webhook.js` snippet.
- **Card identification**: Make sure Python and the required packages are installed. The script supports all major card sets.
- **Dependencies**: If Discord’s UI changes, you may need to update the CSS selectors in the script.

---

## 📝 License & Disclaimer

Use this tool responsibly and only in servers where automation is permitted. This bot interacts with Discord’s web interface—it may break if Discord updates their UI. No warranty is provided.

## .gitignore files

.env
discord-user-data
discord-session
workspace.code-workspace
discord-session.json

---

_Happy god‑packing!_
