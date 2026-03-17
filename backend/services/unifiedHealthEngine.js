function clamp(value, min, max) {
 return Math.min(max, Math.max(min, value));
}

function avg(values) {
 if (!values.length) return 0;
 return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function toNumericArray(values) {
 return (Array.isArray(values) ? values : [])
  .map((v) => Number(v))
  .filter((v) => Number.isFinite(v));
}

function linearSlope(values) {
 const n = values.length;
 if (n < 2) return 0;

 const meanX = (n - 1) / 2;
 const meanY = avg(values);

 let num = 0;
 let den = 0;
 for (let i = 0; i < n; i += 1) {
  const dx = i - meanX;
  num += dx * (values[i] - meanY);
  den += dx * dx;
 }
 return den === 0 ? 0 : num / den;
}

function maxAbsJump(values) {
 let maxJump = 0;
 for (let i = 1; i < values.length; i += 1) {
  maxJump = Math.max(maxJump, Math.abs(values[i] - values[i - 1]));
 }
 return maxJump;
}

function hasConsecutiveDrop(values, minSteps, minTotalDrop) {
 if (values.length < minSteps + 1) return false;
 for (let i = 0; i <= values.length - (minSteps + 1); i += 1) {
  const window = values.slice(i, i + minSteps + 1);
  let monotonic = true;
  for (let j = 1; j < window.length; j += 1) {
   if (window[j] >= window[j - 1]) {
    monotonic = false;
    break;
   }
  }
  if (monotonic && window[0] - window[window.length - 1] >= minTotalDrop) {
   return true;
  }
 }
 return false;
}

function sigmoid(x) {
 return 1 / (1 + Math.exp(-x));
}

function buildRisk(heartRate, spo2) {
 const hr = toNumericArray(heartRate).slice(-50);
 const ox = toNumericArray(spo2).slice(-50);

 const latestHr = hr.length ? hr[hr.length - 1] : 0;
 const latestOx = ox.length ? ox[ox.length - 1] : 0;
 const hrSlope = linearSlope(hr);
 const oxSlope = linearSlope(ox);
 const hrJump = maxAbsJump(hr);
 const oxJump = maxAbsJump(ox);

 const hrAbnormalRatio = hr.length ? hr.filter((v) => v < 60 || v > 100).length / hr.length : 0;
 const oxAbnormalRatio = ox.length ? ox.filter((v) => v < 95).length / ox.length : 0;

 const hrSpike = hrJump >= 18;
 const oxDropTrend = hasConsecutiveDrop(ox, 3, 3) || oxSlope <= -0.45;

 let score = 0;
 score += clamp((hrSlope - 0.2) / 1.6, 0, 1) * 0.22;
 score += clamp((-oxSlope - 0.08) / 0.7, 0, 1) * 0.24;
 score += clamp((latestHr - 100) / 20, 0, 1) * 0.13;
 score += clamp((95 - latestOx) / 6, 0, 1) * 0.21;
 score += hrAbnormalRatio * 0.1;
 score += oxAbnormalRatio * 0.13;
 if (hrSpike) score += 0.07;
 if (oxDropTrend) score += 0.1;

 score = clamp(score, 0, 1);

 let riskLevel = "Low";
 if (score >= 0.7) {
  riskLevel = "High";
 } else if (score >= 0.4) {
  riskLevel = "Moderate";
 }

 const confidence = Number(clamp(0.45 + sigmoid((score - 0.5) * 5) * 0.5, 0, 1).toFixed(2));

 const reasons = [];
 if (hrSlope > 0.6) reasons.push("heart rate trend is increasing");
 if (oxSlope < -0.35) reasons.push("SpO2 trend is decreasing");
 if (latestOx && latestOx < 93) reasons.push("latest SpO2 is below healthy threshold");
 if (latestHr && latestHr > 105) reasons.push("latest heart rate is high");
 if (hrSpike) reasons.push("sudden heart rate spike detected");
 if (oxDropTrend) reasons.push("continuous oxygen drop pattern detected");

 const reason = reasons.length
  ? reasons.slice(0, 2).join(" and ")
  : "vitals are mostly stable within normal range";

 return {
  riskLevel,
  confidence,
  reason,
  metrics: {
   hrSlope: Number(hrSlope.toFixed(3)),
   spo2Slope: Number(oxSlope.toFixed(3)),
   hrJump,
   spo2Jump: oxJump,
   latestHr,
   latestSpo2: latestOx
  }
 };
}

function buildRecommendations(riskLevel) {
 if (riskLevel === "High") {
  return {
   diet: ["Prefer light, balanced meals with hydration", "Limit high-salt processed foods"],
   lifestyle: ["Avoid heavy exertion", "Prioritize rest and stress reduction"],
   precautions: ["Track vitals closely", "Keep emergency contacts ready", "Consult doctor promptly"]
  };
 }

 if (riskLevel === "Moderate") {
  return {
   diet: ["Increase fruits, vegetables, and whole grains", "Maintain good hydration"],
   lifestyle: ["Use moderate activity only", "Sleep on a fixed schedule"],
   precautions: ["Re-check vitals periodically", "Escalate if trends worsen"]
  };
 }

 return {
  diet: ["Maintain balanced meals", "Stay hydrated through the day"],
  lifestyle: ["Continue regular physical activity", "Keep consistent sleep and meal timing"],
  precautions: ["Continue routine monitoring"]
 };
}

function buildAlerts(risk, heartRate, spo2) {
 const hr = toNumericArray(heartRate);
 const ox = toNumericArray(spo2);

 const hrSpike = maxAbsJump(hr) >= 18;
 const oxygenDrop = hasConsecutiveDrop(ox, 3, 3);
 const trendRisk = risk.metrics.hrSlope > 0.6 || risk.metrics.spo2Slope < -0.35;

 if (risk.riskLevel === "High" || (oxygenDrop && trendRisk)) {
  return {
   alert: true,
   message: "Critical pattern: oxygen dropping with unstable trend.",
   severity: "High"
  };
 }

 if (hrSpike || oxygenDrop || risk.riskLevel === "Moderate") {
  return {
   alert: true,
   message: "Moderate trend anomaly detected. Continue close monitoring.",
   severity: "Moderate"
  };
 }

 return {
  alert: false,
  message: "No concerning trend-based anomaly detected.",
  severity: "Low"
 };
}

function buildMonitoring(riskLevel) {
 if (riskLevel === "High") {
  return { checkFrequency: "every 30 minutes", doctorConsult: true };
 }
 if (riskLevel === "Moderate") {
  return { checkFrequency: "every 2 hours", doctorConsult: false };
 }
 return { checkFrequency: "daily", doctorConsult: false };
}

function parseBP(bpValue) {
 if (!bpValue) return { systolic: null, diastolic: null };
 const parts = String(bpValue).split("/").map((v) => Number(v.trim()));
 if (parts.length !== 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) {
  return { systolic: null, diastolic: null };
 }
 return { systolic: parts[0], diastolic: parts[1] };
}

function buildReportAnalysis(reportData) {
 const data = reportData && typeof reportData === "object" ? reportData : {};
 const issues = [];

 const hemoglobin = Number(data.hemoglobin);
 const sugar = Number(data.sugar);
 const { systolic, diastolic } = parseBP(data.bp);

 if (Number.isFinite(hemoglobin)) {
  if (hemoglobin < 12) issues.push("Hemoglobin appears below expected range");
  if (hemoglobin > 17) issues.push("Hemoglobin appears above expected range");
 }

 if (Number.isFinite(systolic) && Number.isFinite(diastolic)) {
  if (systolic >= 130 || diastolic >= 85) {
   issues.push("Blood pressure is elevated");
  }
  if (systolic < 100 || diastolic < 65) {
   issues.push("Blood pressure appears lower than expected");
  }
 }

 if (Number.isFinite(sugar)) {
  if (sugar > 140) issues.push("Sugar appears above recommended range");
  if (sugar < 70) issues.push("Sugar appears below recommended range");
 }

 const summary = issues.length
  ? `Report review found ${issues.length} item(s): ${issues.join("; ")}.`
  : "Report values look generally stable based on provided fields.";

 return { issues, summary };
}

function buildPrediction(risk, heartRate, spo2) {
 const hrSlope = linearSlope(toNumericArray(heartRate));
 const oxSlope = linearSlope(toNumericArray(spo2));

 if (risk.riskLevel === "High" || oxSlope < -0.35 || hrSlope > 0.6) {
  return {
   prediction: "Heart rate likely to increase and oxygen trend may decline",
   timeFrame: "next 24 hours"
  };
 }

 if (risk.riskLevel === "Moderate") {
  return {
   prediction: "Vitals may fluctuate mildly; continue periodic checks",
   timeFrame: "next 24 hours"
  };
 }

 return {
  prediction: "Condition likely to remain stable",
  timeFrame: "next 24 hours"
 };
}

function buildChatbot({ question, risk, alerts, reportAnalysis, recommendations, monitoring }) {
 const q = String(question || "").toLowerCase();

 let urgency = "low";
 if (risk.riskLevel === "High" || alerts.severity === "High") urgency = "high";
 else if (risk.riskLevel === "Moderate" || alerts.severity === "Moderate") urgency = "medium";

 if (/(emergency|urgent|chest pain|faint|breathless|not breathing)/i.test(q)) {
  return {
   response: "This sounds urgent. Please seek immediate medical help and contact emergency services now.",
   urgency: "high",
   suggestion: "Call emergency support and inform your doctor immediately"
  };
 }

 if (q.includes("report") || q.includes("hemoglobin") || q.includes("sugar") || q.includes("bp")) {
  return {
   response: reportAnalysis.summary,
   urgency,
   suggestion: reportAnalysis.issues.length ? "Share this report with your doctor for review" : "Continue routine monitoring"
  };
 }

 if (q.includes("risk") || q.includes("safe") || q.includes("trend")) {
  return {
   response: `Current risk is ${risk.riskLevel} (confidence ${risk.confidence}). Main reason: ${risk.reason}.`,
   urgency,
   suggestion: monitoring.doctorConsult ? "Book a doctor consultation soon" : "Continue the recommended monitoring frequency"
  };
 }

 if (q.includes("recommend") || q.includes("diet") || q.includes("lifestyle")) {
  return {
   response: `Focus on: ${recommendations.lifestyle.join(", ")}. Also follow precautions: ${recommendations.precautions.join(", ")}.`,
   urgency,
   suggestion: monitoring.doctorConsult ? "Consult a doctor for a personalized plan" : "Keep tracking vitals consistently"
  };
 }

 return {
  response: `Your current risk looks ${risk.riskLevel.toLowerCase()}. ${alerts.message} Monitoring suggestion: ${monitoring.checkFrequency}.`,
  urgency,
  suggestion: monitoring.doctorConsult ? "Schedule a doctor consultation" : "Continue regular tracking"
 };
}

function analyzeUnifiedHealth(input = {}) {
 const heartRate = input.heartRate || [];
 const spo2 = input.spo2 || [];
 const reportData = input.reportData || {};
 const question = input.question || "";

 const risk = buildRisk(heartRate, spo2);
 const recommendations = buildRecommendations(risk.riskLevel);
 const alerts = buildAlerts(risk, heartRate, spo2);
 const monitoring = buildMonitoring(risk.riskLevel);
 const reportAnalysis = buildReportAnalysis(reportData);
 const prediction = buildPrediction(risk, heartRate, spo2);
 const chatbot = buildChatbot({ question, risk, alerts, reportAnalysis, recommendations, monitoring });

 return {
  risk: {
   riskLevel: risk.riskLevel,
   confidence: risk.confidence,
   reason: risk.reason
  },
  recommendations,
  alerts,
  monitoring,
  reportAnalysis,
  prediction,
  chatbot
 };
}

module.exports = {
 analyzeUnifiedHealth
};
