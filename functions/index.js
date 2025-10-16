// Import necessary modules
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");
const { URL } = require("url");

// Initialize the Firebase Admin SDK
admin.initializeApp();

const BUCKET_NAME = `${process.env.GCLOUD_PROJECT}.appspot.com`;

/**
 * Extracts the file path from a Firebase Storage URL.
 * @param {string} url The Firebase Storage URL.
 * @return {string|null} The decoded file path or null if the URL is invalid.
 */
function getPathFromUrl(url) {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname !== "firebasestorage.googleapis.com") {
      return null;
    }
    // Path format is /v0/b/bucket-name/o/path%2Fto%2Ffile.jpg
    const path = parsedUrl.pathname.split("/o/")[1];
    return path ? decodeURIComponent(path) : null;
  } catch (e) {
    console.error("Invalid URL:", e);
    return null;
  }
}

/**
 * A callable Cloud Function to proxy requests to the Google Gemini API.
 * This function supports both text and image inputs for multi-turn conversations.
 */
exports.askAI = functions.https.onCall(async (data, context) => {
  // 1. Security Check: Ensure the user is authenticated.
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated.",
    );
  }

  // 2. Argument Validation: Ensure a 'history' array was provided.
  const history = data.history;
  if (!Array.isArray(history) || history.length === 0) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "The function must be called with a non-empty 'history' array.",
    );
  }

  // 3. Configuration Check: Read API key and endpoint from environment variables.
  const apiKey = functions.config().llm.api_key;
  const apiEndpoint = functions.config().llm.api_endpoint;

  if (!apiKey || !apiEndpoint) {
    console.error("LLM API key or endpoint is not configured.");
    throw new functions.https.HttpsError(
      "failed-precondition",
      "The AI service is not configured on the server.",
    );
  }

  // 4. Build the request payload for the Gemini API
  try {
    const contents = [];
    for (const message of history) {
      const role = message.user._id === "AI" ? "model" : "user";
      const parts = [];

      // Add text part if it exists
      if (message.text) {
        parts.push({ text: message.text });
      }

      // Add image part if it exists
      if (message.image) {
        const filePath = getPathFromUrl(message.image);
        if (filePath) {
            const bucket = admin.storage().bucket(BUCKET_NAME);
            const file = bucket.file(filePath);
            const [fileBuffer] = await file.download();
            parts.push({
                inline_data: {
                    mime_type: "image/jpeg", // Assuming jpeg, adjust if needed
                    data: fileBuffer.toString("base64"),
                },
            });
        }
      }

      // Add the content object for this message turn
      if(parts.length > 0) {
        contents.push({ role, parts });
      }
    }

    // The Gemini API requires contents to be reversed for chat history
    const reversedContents = contents.reverse();

    // 5. Call the External LLM API
    const response = await fetch(`${apiEndpoint}?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // The structure for Gemini Pro Vision is slightly different
        // It expects a flat array of content objects
        contents: reversedContents,
      }),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Error from LLM API: ${response.status} ${response.statusText}`, errorBody);
        throw new functions.https.HttpsError("internal", `AI service error: ${response.status}`);
    }

    const responseData = await response.json();

    // 6. Return the Result
    const aiResult = responseData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (typeof aiResult !== "string") {
        console.error("Unexpected response format from LLM API:", JSON.stringify(responseData, null, 2));
        throw new functions.https.HttpsError("internal", "Unexpected format from AI service.");
    }

    return { result: aiResult };

  } catch (error) {
    console.error("Error processing AI request:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError("internal", "An error occurred while contacting the AI service.");
  }
});