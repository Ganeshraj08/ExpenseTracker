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
    const currentDate = new Date().toISOString();

    const prompt = `
You are an AI financial assistant that perfectly parses natural language into a structured JSON expense format.
The user's input: "${transcript}"

The user has the following existing valid categories:
${categories && categories.length > 0 ? categories.join("\\n") : "None provided"}

Instructions:
1. Extract ALL distinct transactions mentioned in the input. Return an ARRAY of objects.
2. For each transaction, extract the "amount" as a positive number. If not provided, guess 0.
3. Extract the "description" of what was purchased or earned in a few short words and format it.
4. Determine if this is an "expense" or "income" and set "type".
5. Determine the best matching category from the user's existing list. Output ONLY the perfectly matched parent and subcategory separated by a colon (e.g., "Food: Groceries").
   If no existing category matches, invent a broad parent and specific subcategory (e.g., "Hobbies: Crafting").
6. Provide a valid ISO 8601 date string for the transaction in "date", using exactly "${currentDate}" if no specific date is mentioned.
7. Determine if the user indicates this transaction is repeating/recurring (e.g. "daily", "every week", "monthly", "each morning"). Set a boolean "isRecurring".
8. If "isRecurring" is true, determine the strictly allowed "frequency". Choose ONLY from: "Daily", "Weekdays", "Weekly", "Monthly".

Response MUST be a raw JSON array string ONLY, do not wrap it in markdown or backticks.
Example output:
[
  {
    "amount": 25.50,
    "description": "Starbucks Coffee",
    "type": "expense",
    "category": "Food: Coffee/Snacks",
    "date": "${currentDate}",
    "isRecurring": true,
    "frequency": "Daily"
  }
]
`;

    try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // Clean up markdown block syntax
        const jsonString = responseText.replace(/```json\n?|```\n?/g, "").trim();
        const parsedData = JSON.parse(jsonString);

        // Ensure consistency by always returning an array
        const dataArray = Array.isArray(parsedData) ? parsedData : [parsedData];

        dataArray.forEach(item => {
            if (!item.date) {
                item.date = new Date().toISOString();
            }
        });

        return { data: dataArray };
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        throw new Error("Gemini API Error: " + (error.message || "Unknown error occurred"));
    }
}
