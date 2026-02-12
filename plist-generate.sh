#!/usr/bin/env node

function generateCFBundleURLTypes(fullClientId) {
  if (!fullClientId || typeof fullClientId !== "string") {
    console.error("Error: Please provide a valid Google OAuth Client ID.");
    process.exit(1);
  }

  // Remove the '.apps.googleusercontent.com' suffix if present
  const clientId = fullClientId.replace(/\.apps\.googleusercontent\.com$/, "");

  const urlScheme = `com.googleusercontent.apps.${clientId}`;

  const xmlSnippet = `
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>${urlScheme}</string>
        </array>
    </dict>
</array>
`.trim();

  return xmlSnippet;
}

// Get full client ID from CLI argument
const fullClientId = process.argv[2];

if (!fullClientId) {
  console.error("Usage: node generatePlist.js <FULL_GOOGLE_CLIENT_ID>");
  process.exit(1);
}

// Output the XML snippet
console.log(`Add carefully into your Info.plist the following entry:${'\n'}${'\n'}${generateCFBundleURLTypes(fullClientId)}`);
