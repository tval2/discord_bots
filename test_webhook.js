const axios = require("axios");
require("dotenv").config();

const DISCORD_WEBHOOK_URL =
  process.env.DISCORD_WEBHOOK_URL || "<YOUR_DISCORD_WEBHOOK_URL>";

// Test with ONLY embed, no content at all
axios
  .post(DISCORD_WEBHOOK_URL, {
    embeds: [
      {
        image: {
          url: "https://cdn.discordapp.com/attachments/1372478920204746802/1398787245699502331/godpack.png?ex=6886a1a3&is=68855023&hm=a6864a7d919f0dfeb3e50068468f43252e46e8dc1c89a3a7bada376cc4c8128f&",
        },
      },
    ],
  })
  .then(() => console.log("✅ Webhook alert with embed sent successfully!"))
  .catch((err) => console.error("❌ Webhook failed:", err));

// Alternative: Simple approach with just the image URL in content
// Uncomment below to test this version instead:

/*
axios
  .post(DISCORD_WEBHOOK_URL, {
    content: "🚨 This is a test alert from Kaley's Discord bot!\n\nhttps://cdn.discordapp.com/attachments/1372478920204746802/1398787245699502331/godpack.png?ex=6886a1a3&is=68855023&hm=a6864a7d919f0dfeb3e50068468f43252e46e8dc1c89a3a7bada376cc4c8128f&"
  })
  .then(() => console.log("✅ Simple webhook alert sent successfully!"))
  .catch((err) => console.error("❌ Webhook failed:", err));
*/
