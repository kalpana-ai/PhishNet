chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "formScore") {
      // Placeholder for API-based domain check (e.g., Google Safe Browsing)
      console.log("Received form score:", message.score);
    }
  });