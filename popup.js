console.log("Popup script running...");

const GEMINI_API_KEY = "AIzaSyCGG63veC7HT6B60X6UMCtKSWIk8oJ4hD"; // Replace with your key
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent"; // Dummy endpoint, replace with real one

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Message received:", message);
  if (message.type === "formScore") {
    const scoreText = message.score === -1 ? "No forms found" : `Score: ${message.score}`;
    document.getElementById("score").innerText = scoreText;
    const warningsDiv = document.getElementById("warnings");
    warningsDiv.innerHTML = message.warnings.length
      ? message.warnings.map(w => `<p style="color: red; font-weight: bold;">${w}</p>`).join("")
      : "<p>Page looks safe!</p>";
  }
});

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  chrome.tabs.sendMessage(tabs[0].id, { type: "getFormScore" }, (response) => {
    console.log("Response from content script:", response);
    if (response) {
      const scoreText = response.score === -1 ? "No forms found" : `Score: ${response.score}`;
      document.getElementById("score").innerText = scoreText;
      const warningsDiv = document.getElementById("warnings");
      warningsDiv.innerHTML = response.warnings.length
        ? response.warnings.map(w => `<p style="color: red; font-weight: bold;">${w}</p>`).join("")
        : "<p>Page looks safe!</p>";
    }
  });
});

// Generate report using Gemini API
async function generateReport() {
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    const url = tabs[0].url;
    const payload = { text: url, task: "generate_safety_report", context: url };
    try {
      const response = await fetch(GEMINI_API_URL, {
        method: "POST",
        headers: { "Authorization": `Bearer ${GEMINI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      let report = "PhishNet Security Report\n\n";
      report += `URL: ${url}\n`;
      report += `Safety Score: ${result.score || "N/A"}\n`;
      report += "Warnings:\n";
      report += result.flags.length ? result.flags.map(w => `- ${w}`).join("\n") : "- No warnings found";
      report += "\n\nNote: This report is based on current page analysis.";
      document.getElementById("report").innerText = report;
    } catch (error) {
      console.error("Gemini API error:", error);
      document.getElementById("report").innerText = "Error generating report.";
    }
  });
}

document.getElementById("generateReport").addEventListener("click", generateReport);