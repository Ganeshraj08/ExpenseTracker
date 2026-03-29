import { GoogleGenerativeAI } from "@google/generative-ai";

export async function parseTransactionNLP(transcript, categories) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    
    if (!apiKey) {
        throw new Error("VITE_GEMINI_API_KEY is empty or undefined. Vite did not load your .env file. YOU MUST kill the terminal running the server (Ctrl+C) and run `npm run dev` again.");
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);
    
    if (!transcript) {
        throw new Error("Missing transcript in request.");
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
You are an AI financial assistant that perfectly parses natural language into a structured JSON expense format.
The user's input: "${transcript}"

The user has the following existing valid categories:
${categories && categories.length > 0 ? categories.join("\\n") : "None provided"}

Instructions:
1. Extract the "amount" as a positive number. If not provided, guess 0.
2. Extract the "description" of what was purchased or earned in a few short words and format it.
3. Determine if this is an "expense" or "income" and set "type".
4. Determine the best matching category from the user's existing list, formatted EXACTLY as "Parent: Subcategory" if the user provided it like that. If it's completely new, invent a broad parent and specific subcategory, e.g. "Hobbies: Crafting".
5. Provide a valid ISO 8601 date string for the transaction in "date", assuming right now is the default.

Response MUST be a raw JSON object string ONLY, do not wrap it in markdown or backticks.
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
        
        // Clean up markdown block syntax
        const jsonString = responseText.replace(/```json\n?|```\n?/g, "").trim();
        const parsedData = JSON.parse(jsonString);
        
        if (!parsedData.date) {
            parsedData.date = new Date().toISOString();
        }
        
        return { data: parsedData };
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        throw new Error("Gemini API Error: " + (error.message || "Unknown error occurred"));
    }
}
