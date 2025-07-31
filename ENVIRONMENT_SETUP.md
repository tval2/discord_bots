# 🔧 Environment Setup Guide

The Discord bot requires certain environment variables to function. You need to create a `.env` file in the project root.

## 📝 Required Environment Variables

Create a file called `.env` in the project root with the following content:

```bash
# Discord Bot Configuration

# Required: Discord channel URL where godpacks are posted
# Format: https://discord.com/channels/<GUILD_ID>/<CHANNEL_ID>
CHANNEL_URL=https://discord.com/channels/YOUR_GUILD_ID/YOUR_CHANNEL_ID

# Required: Discord webhook URL for notifications
# Get this from: Channel Settings -> Integrations -> Webhooks -> Create Webhook
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN

# Optional: Chrome executable path (macOS default shown)
# Windows: C:\Program Files\Google\Chrome\Application\chrome.exe
# Linux: /usr/bin/google-chrome
CHROME_PATH=/Applications/Google Chrome.app/Contents/MacOS/Google Chrome
```

## 🎯 How to Get These Values

### 1. CHANNEL_URL
1. Go to your Discord server
2. Navigate to the channel where godpacks are posted
3. Copy the URL from your browser
4. It should look like: `https://discord.com/channels/123456789/987654321`

### 2. DISCORD_WEBHOOK_URL
1. In your Discord server, go to **Channel Settings**
2. Click **Integrations**
3. Click **Webhooks**
4. Click **Create Webhook**
5. Give it a name (e.g., "Godpack Bot")
6. Copy the webhook URL
7. It should look like: `https://discord.com/api/webhooks/123456789/abcdef...`

### 3. CHROME_PATH (Optional)
- **macOS**: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
- **Windows**: `C:\Program Files\Google\Chrome\Application\chrome.exe`
- **Linux**: `/usr/bin/google-chrome`

## ✅ Verification

After creating the `.env` file, you can verify it's working by:

1. **Check environment status**:
   ```bash
   curl http://localhost:3000/bot/environment
   ```

2. **Expected response**:
   ```json
   {
     "success": true,
     "ready": true,
     "missing": [],
     "optional": []
   }
   ```

## 🚀 Next Steps

Once your `.env` file is set up:

1. **Refresh the web app** at http://localhost:3000
2. **Select pack types** you want to hunt for
3. **Click "Start Hunting"** - the bot should now work!

## 🔒 Security Note

- The `.env` file is already in `.gitignore` so it won't be committed to version control
- Keep your webhook URLs private
- Don't share your `.env` file with others

## 🆘 Troubleshooting

If you get "Environment not configured" errors:

1. **Check file location**: Make sure `.env` is in the project root (same folder as `autojoin_queue_discord_webhook.js`)
2. **Check file format**: No spaces around the `=` sign
3. **Restart server**: After creating `.env`, restart the web app server
4. **Verify URLs**: Make sure your Discord URLs are correct and accessible 