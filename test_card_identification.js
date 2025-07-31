const { identifyGodpackCardsFromUrl } = require("./card_identifier");

async function testCardIdentification() {
  console.log("🧪 Testing card identification...");

  // Test with a sample image URL and set name
  const testImageUrl = "https://example.com/test-godpack.webp"; // Replace with actual test URL
  const testSetName = "genetic-apex";

  try {
    console.log(`Testing with set: ${testSetName}`);
    const result = await identifyGodpackCardsFromUrl(testImageUrl, testSetName);

    if (result.success) {
      console.log("✅ Card identification successful!");
      console.log(`Set Code: ${result.set_code}`);
      console.log("Identified Cards:");
      result.cards.forEach((card) => {
        console.log(`  ${card.position}. ${card.card_name}`);
      });
    } else {
      console.log("❌ Card identification failed:", result.error);
    }
  } catch (error) {
    console.log("❌ Test failed:", error.message);
  }
}

// Test the set name mapping
function testSetNameMapping() {
  console.log("\n🧪 Testing set name mapping...");

  const testSets = [
    "Genetic Apex",
    "Mythical Island",
    "Space-time Smackdown",
    "Triumphant Light",
    "Shining Revelry",
    "Celestial Guardians",
    "Extradimensional Crisis",
    "Eevee Grove",
    "Wisdom of Sea and Sky",
  ];

  testSets.forEach((setName) => {
    const { spawn } = require("child_process");
    const path = require("path");

    const pythonScript = path.join(__dirname, "check_image.py");
    const pythonProcess = spawn("python3", [
      pythonScript,
      "test.webp",
      setName,
    ]);

    pythonProcess.stdout.on("data", (data) => {
      try {
        const result = JSON.parse(data.toString());
        if (result.success) {
          console.log(`✅ "${setName}" -> ${result.set_code}`);
        } else {
          console.log(`❌ "${setName}" -> Error: ${result.error}`);
        }
      } catch (e) {
        // Ignore parsing errors for this test
      }
    });

    pythonProcess.stderr.on("data", (data) => {
      // Expected error since test.webp doesn't exist
    });
  });
}

// Run tests
if (require.main === module) {
  testSetNameMapping();
  // Uncomment the line below to test with actual image URL
  // testCardIdentification();
}
