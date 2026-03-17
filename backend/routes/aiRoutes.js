const express = require("express");
const router = express.Router();

const { analyzeUnifiedHealth } = require("../services/unifiedHealthEngine");

router.post("/unified-analysis", (req, res) => {
 try {
  const result = analyzeUnifiedHealth(req.body || {});
  res.json(result);
 } catch (error) {
  res.status(500).json({ error: error.message });
 }
});

module.exports = router;
