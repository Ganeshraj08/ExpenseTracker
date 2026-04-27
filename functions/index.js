const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Define a secret parameter for the Gemini API Key
const geminiApiKey = defineSecret("GEMINI_API_KEY");

exports.parseTransactionNLP = onCall({
  secrets: [geminiApiKey],
  cors: true
}, async (request) => {
  const { transcript, categories } = request.data;
  
  if (!transcript) {
    throw new HttpsError("invalid-argument", "Missing transcript in request");
  }

  const apiKey = geminiApiKey.value();
  if (!apiKey) {
    throw new HttpsError("failed-precondition", "GEMINI_API_KEY secret is not configured in Firebase");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  // Using gemini-1.5-flash which is fast and optimal for text parsing
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
You are an AI financial assistant that perfectly parses natural language into a structured JSON expense format.
The user's input: "${transcript}"

The user has the following existing valid categories:
${categories ? categories.join(", ") : "None provided"}

Instructions:
1. Extract the "amount" as a number. If not provided, guess 0.
2. Extract the "description" of what was purchased or earned in a few short words.
3. Determine if this is an "expense" or "income" and set "type".
4. Determine the best matching category from the user's existing list, formatted EXACTLY as "Parent: Subcategory" if the user provided it like that. If it's completely new, invent a broad parent and specific subcategory, e.g. "Hobbies: Crafting".
5. Provide a valid ISO 8601 date string for the transaction in "date", assuming right now is the default.

Response MUST be a raw JSON object string ONLY, do not wrap in markdown or backticks.
Example output:
{
  "amount": 25.50,
  "description": "Starbucks Coffee",
  "type": "expense",
  "category": "Food: Coffee/Snacks",
  "date": "2023-10-27T10:00:00.000Z"
}
`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Clean up potential markdown formatting from the LLM
    const jsonString = responseText.replace(/```json\n?|```\n?/g, "").trim();
    const parsedData = JSON.parse(jsonString);
    
    // Safety fallback for date
    if (!parsedData.date) {
        parsedData.date = new Date().toISOString();
    }
    
    return parsedData;
  } catch (error) {
    console.error("Error calling Gemini API or parsing response:", error);
    throw new HttpsError("internal", "Failed to parse the transaction using AI.");
  }
});
