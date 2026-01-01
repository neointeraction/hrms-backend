const { GoogleGenerativeAI } = require("@google/generative-ai");

let genAI;
let model;

const initializeAI = () => {
  if (!process.env.GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY is not set. AI features will be disabled.");
    return;
  }
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
  });
};

const generateResponse = async (context, question) => {
  if (!model) initializeAI();
  if (!model) throw new Error("AI Service is not initialized");

  const prompt = `
You are an intelligent HR Assistant for a company. Your goal is to answer employee questions accurately based ONLY on the provided policy document context.

Context:
${context}

Question:
${question}

Instructions:
1. Answer the question specifically based on the context provided.
2. If the answer is not found in the context, strictly say "I cannot find information regarding this in the current policy document. Please consult HR directly."
3. Be polite, professional, and concise.
4. Do not make up information.
`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
};

const axios = require("axios");

// --- Agent Mode (REST API Bypass) ---
const runAgent = async (message, toolsSchema = []) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const payload = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text:
              "You are a helpful HR Assistant. USE TOOLS if needed. Query: " +
              message,
          },
        ],
      },
    ],
    tools: [
      {
        function_declarations: toolsSchema, // Note: snake_case for REST API
      },
    ],
  };

  try {
    const response = await axios.post(url, payload);
    const candidate = response.data.candidates?.[0];

    // Log for debug
    console.log("Gemini REST Response:", JSON.stringify(candidate, null, 2));

    if (!candidate) return { type: "text", text: "No response from AI." };

    const part = candidate.content?.parts?.[0];
    if (part?.functionCall) {
      return {
        type: "function_call",
        calls: [
          {
            name: part.functionCall.name,
            args: part.functionCall.args,
          },
        ],
      };
    }

    return { type: "text", text: part?.text || "No text." };
  } catch (err) {
    console.error("Gemini REST API Error:", err.response?.data || err.message);
    return { type: "text", text: "Error communicating with AI service." };
  }
};

module.exports = {
  initializeAI,
  generateResponse,
  runAgent,
};
