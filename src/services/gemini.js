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

export async function parseReceiptImage(base64Image, mimeType, categories) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error("VITE_GEMINI_API_KEY is empty or undefined. Vite did not load your .env file.");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const currentDate = new Date().toISOString();

    const prompt = `
You are an AI financial assistant that accurately extracts transaction details from a receipt image into a structured JSON expense format.
The user has the following existing valid categories:
${categories && categories.length > 0 ? categories.join("\\n") : "None provided"}

Instructions:
1. Extract the main "amount" of the receipt (the Total). Return as a positive number.
2. Extract the "description" of what was purchased (e.g., store name like "Walmart" or "Amazon").
3. Set "type" to "expense".
4. Determine the best matching category from the user's existing list based on the items purchased. Output ONLY the perfectly matched parent and subcategory separated by a colon (e.g., "Food: Groceries").
   If no existing category matches, invent a broad parent and specific subcategory.
5. Provide a valid ISO 8601 date string for the transaction in "date", based on the date printed on the receipt. If no date is found, use exactly "${currentDate}".

Response MUST be a raw JSON string ONLY, representing a single object. Do not wrap it in markdown or backticks.
Example output:
{
  "amount": 42.50,
  "description": "Target Store",
  "type": "expense",
  "category": "Shopping: General",
  "date": "2026-02-05T12:00:00Z"
}
`;
    // Remove "data:image/jpeg;base64," if present
    const base64Data = base64Image.split(',')[1] || base64Image;

    const imageParts = [
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType || "image/jpeg"
        }
      }
    ];

    try {
        const result = await model.generateContent([prompt, ...imageParts]);
        const responseText = result.response.text();

        // Clean up markdown block syntax
        const jsonString = responseText.replace(/```json\n?|```\n?/g, "").trim();
        const parsedData = JSON.parse(jsonString);

        if (!parsedData.date) {
            parsedData.date = currentDate;
        }

        return parsedData;
    } catch (error) {
        console.error("Error calling Gemini API for vision:", error);
        throw new Error("Gemini API Error: " + (error.message || "Unknown error occurred"));
    }
}

export async function generateFinancialInsights(transactions, timeframe) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error("API key is empty processing stats.");
    }
    
    if (!transactions || transactions.length === 0) {
       return ["Not enough data in this timeframe to generate insights."];
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    
    const categories = {};
    transactions.forEach(t => {
       if (t.type === 'expense') {
          categories[t.category || 'Uncategorized'] = (categories[t.category || 'Uncategorized'] || 0) + parseFloat(t.amount || 0);
       }
    });

    const dataset = {
       timeframe,
       totalExpense,
       totalIncome,
       spendingByCategory: categories
    };

    const prompt = `
You are an expert AI financial advisor. Read the following spending summary for a user's ${timeframe} and provide exactly 3 short, actionable insights.
Focus on identifying trends, high burn categories, and simple budgeting advice.
Format your response STRICTLY as a JSON array of exactly 3 strings.

Summary Data:
${JSON.stringify(dataset, null, 2)}

Example output:
["You spent 40% of your budget on Food Delivery this week. Try meal prepping on Sunday to cut this down.", "Your income exceeded expenses by 20%!", "Transportation costs spiked by 15%. Carpooling might be worth exploring."]
`;

    try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const jsonString = responseText.replace(/```json\n?|```\n?/g, "").trim();
        const insights = JSON.parse(jsonString);
        return insights;
    } catch (error) {
        console.error("Error generating insights:", error);
        return ["AI Insight Generation failed. " + error.message];
    }
}
