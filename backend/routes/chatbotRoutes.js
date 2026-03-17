const express = require("express");
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { analyzeUnifiedHealth } = require("../services/unifiedHealthEngine");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const modelCandidates = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest"];

async function askGemini(message) {
 let lastError;

 for (const modelName of modelCandidates) {
  try {
   const model = genAI.getGenerativeModel({ model: modelName });
   const result = await model.generateContent(message);
   const response = await result.response;
   const text = response.text();

   if (text && text.trim()) {
    return text;
   }
  } catch (error) {
   lastError = error;
  }
 }

 throw lastError || new Error("No Gemini model returned a response");
}

// CHAT ENDPOINT
router.post("/chat", async (req, res) => {
 try {
  const { message, healthData = {}, reportData = {}, heartRate, spo2 } = req.body;

  if (!message || message.trim() === "") {
   return res.status(400).json({ error: "Message is required" });
  }

  const analysis = analyzeUnifiedHealth({
   heartRate: heartRate || healthData.heartRate || [],
   spo2: spo2 || healthData.spo2 || [],
   reportData,
   question: message
  });

  const contextPrompt = [
   "You are a supportive healthcare monitoring assistant.",
   "Use the analysis context below to answer the user question.",
   "Do not prescribe medicines or dosages.",
   "If risk or alert severity is high, clearly advise urgent doctor consultation.",
   "Keep response concise and easy to understand.",
   "",
   `Question: ${message}`,
   "",
   "Analysis Context JSON:",
   JSON.stringify(analysis)
  ].join("\n");

  let text;
  try {
   text = await askGemini(contextPrompt);
  } catch (_) {
   // Graceful fallback when model/API is unavailable.
   text = analysis.chatbot.response;
  }

  res.json({
   reply: text,
   urgency: analysis.chatbot.urgency,
   suggestion: analysis.chatbot.suggestion,
   analysis
  });
 } catch (error) {
  console.error("Gemini API Error:", error.message);
  res.status(500).json({ error: error.message || "Failed to get response from chatbot" });
 }
});

module.exports = router;
