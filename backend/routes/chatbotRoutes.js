const express = require("express");
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");

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
  const { message } = req.body;

  if (!message || message.trim() === "") {
   return res.status(400).json({ error: "Message is required" });
  }

    const text = await askGemini(message);

  res.json({ reply: text });
 } catch (error) {
  console.error("Gemini API Error:", error.message);
  res.status(500).json({ error: error.message || "Failed to get response from chatbot" });
 }
});

module.exports = router;
