 // popup.js
console.log("Popup script running...");
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Message received:", message);
  if (message.type === "formScore") {
    const scoreText = message.score === -1 ? "No forms found" : `Score: ${message.score}`;
    document.getElementById("score").innerText = scoreText;
    const warningsDiv = document.getElementById("warnings");
    warningsDiv.innerHTML = message.warnings.length
      ? message.warnings.map(w => `<p>${w}</p>`).join("")
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
        ? response.warnings.map(w => `<p>${w}</p>`).join("")
        : "<p>Page looks safe!</p>";
    }
  });
});