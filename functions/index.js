// Import necessary modules
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");

// Initialize the Firebase Admin SDK
admin.initializeApp();

/**
 * A callable Cloud Function to proxy requests to an external LLM API.
 */
exports.askAI = functions.https.onCall(async (data, context) => {
  // 1. Security Check: Ensure the user is authenticated.
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated.",
    );
  }

  // 2. Argument Validation: Ensure a 'prompt' was provided in the request body.
  const userPrompt = data.prompt;
  if (typeof userPrompt !== "string" || userPrompt.trim() === "") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "The function must be called with a non-empty 'prompt' string.",
    );
  }

  // 3. Configuration Check: Read API key and endpoint from environment variables.
  // These must be configured in the Firebase environment, e.g., using the Firebase CLI:
  // firebase functions:config:set llm.api_key="YOUR_API_KEY"
  // firebase functions:config:set llm.api_endpoint="https://api.example.com/v1/completions"
  const apiKey = functions.config().llm.api_key;
  const apiEndpoint = functions.config().llm.api_endpoint;

  if (!apiKey || !apiEndpoint) {
    console.error("LLM API key or endpoint is not configured in Firebase environment variables.");
    throw new functions.https.HttpsError(
      "failed-precondition",
      "The AI service is not configured on the server.",
    );
  }

  // 4. Call the External LLM API
  try {
    // The Gemini API uses a different header and body structure.
    const response = await fetch(`${apiEndpoint}?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: userPrompt,
              },
            ],
          },
        ],
      }),
    });

    // Check if the network request itself was successful
    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Error from LLM API: ${response.status} ${response.statusText}`, errorBody);
        throw new functions.https.HttpsError(
            "internal",
            `The external AI service responded with an error: ${response.status}`,
        );
    }

    const responseData = await response.json();

    // 5. Return the Result
    // The path to the result for Gemini API is different.
    const aiResult = responseData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (typeof aiResult !== "string") {
        console.error("Unexpected response format from LLM API:", responseData);
        throw new functions.https.HttpsError("internal", "Received an unexpected format from the AI service.");
    }

    return { result: aiResult };

  } catch (error) {
    // Log the detailed error on the server
    console.error("Error calling LLM API:", error);

    // If it's already an HttpsError, rethrow it
    if (error instanceof functions.https.HttpsError) {
        throw error;
    }

    // For generic errors (e.g., network issues), throw a standard internal error
    throw new functions.https.HttpsError(
      "internal",
      "An unexpected error occurred while trying to contact the AI service.",
    );
  }
});
