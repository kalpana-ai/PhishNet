 // content.js
console.log("Content script running...");

// Function to calculate page safety score
function calculatePageSafetyScore() {
  let score = 100;
  const warnings = [];

  // Check if page uses HTTPS
  const isHTTPS = window.location.protocol === "https:";
  if (!isHTTPS) {
    score -= 40;
    warnings.push("Page is not using HTTPS!");
  }

  // Check for third-party scripts
  const scripts = document.getElementsByTagName("script");
  let thirdPartyScripts = 0;
  for (let script of scripts) {
    const src = script.src || "";
    if (src && !src.includes(window.location.hostname)) {
      thirdPartyScripts++;
    }
  }
  if (thirdPartyScripts > 3) {
    score -= 20;
    warnings.push("Multiple third-party scripts detected!");
  }

  // Check domain reputation (placeholder, can use Google Safe Browsing API)
  const domain = window.location.hostname;
  if (domain.includes("suspicious")) {
    score -= 30;
    warnings.push("Domain may be suspicious!");
  }

  return { score, warnings };
}

// Check for forms
const forms = document.getElementsByTagName("form");
console.log("Forms found:", forms.length);

if (forms.length === 0) {
  const pageSafety = calculatePageSafetyScore();
  chrome.runtime.sendMessage({
    type: "formScore",
    score: pageSafety.score,
    warnings: pageSafety.warnings.length ? pageSafety.warnings : ["No forms found, but page safety checked."]
  });
} else {
  for (let form of forms) {
    const action = form.action || "";
    const isHTTPS = action.startsWith("https://");
    const domain = action.split("/")[2] || window.location.hostname;

    let score = 100;
    if (!isHTTPS) score -= 50;
    if (!domain || domain.includes("suspicious")) score -= 30;
    if (form.method !== "post") score -= 20;

    console.log("Sending score for form:", score);
    chrome.runtime.sendMessage({
      type: "formScore",
      score: score,
      warnings: score < 70 ? ["Form may be unsafe!"] : []
    });

    const scoreDiv = document.createElement("div");
    scoreDiv.style.cssText = "position: absolute; background: #fff; padding: 5px; border: 1px solid #000;";
    scoreDiv.innerText = `Security Score: ${score}`;
    form.appendChild(scoreDiv);
  }
}

// Respond to popup requests
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "getFormScore") {
    const forms = document.getElementsByTagName("form");
    if (forms.length === 0) {
      const pageSafety = calculatePageSafetyScore();
      sendResponse({
        score: pageSafety.score,
        warnings: pageSafety.warnings.length ? pageSafety.warnings : ["No forms found, but page safety checked."]
      });
    } else {
      const form = forms[0];
      const action = form.action || "";
      const isHTTPS = action.startsWith("https://");
      const domain = action.split("/")[2] || window.location.hostname;

      let score = 100;
      if (!isHTTPS) score -= 50;
      if (!domain || domain.includes("suspicious")) score -= 30;
      if (form.method !== "post") score -= 20;

      sendResponse({
        score: score,
        warnings: score < 70 ? ["Form may be unsafe!"] : []
      });
    }
  }
  return true;
});