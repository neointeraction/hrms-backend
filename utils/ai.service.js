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
    model: "gemini-2.5-flash-preview-09-2025",
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

module.exports = {
  initializeAI,
  generateResponse,
};
