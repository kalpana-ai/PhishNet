const GEMINI_API_KEY = "AIzaSyCGG63veC7HT6B60X6UMCtKSWIk8oJ4hDE"; // Replace with your key
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key="; // Dummy endpoint, replace with real one

// Store IP-session mappings
const sessionIPs = new Map();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "showAlert") {
    console.log("Showing alert:", message.message);
    chrome.notifications.create({
      type: "basic",
      iconUrl: "phishing.png",
      title: "PhishNet Alert",
      message: message.message,
      priority: 2
    });
  }
  if (message.type === "checkHijacking") {
    const { token, url } = message;
    chrome.runtime.sendMessage({ type: "getIP" }, async (ipResponse) => {
      const prevIP = sessionIPs.get(token) || null;
      const payload = {
        token: token,
        ipHistory: prevIP ? [prevIP, ipResponse.ip] : [ipResponse.ip],
        task: "detect_session_hijacking",
        context: url
      };
      try {
        const response = await fetch(GEMINI_API_URL, {
          method: "POST",
          headers: { "Authorization": `Bearer ${GEMINI_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (result.flags.includes("hijacking_detected")) {
          chrome.runtime.sendMessage({
            type: "showAlert",
            message: result.notification || `PhishNet Warning: Possible session hijacking detected on ${url}!`
          });
        }
        sessionIPs.set(token, ipResponse.ip);
      } catch (error) {
        console.error("Gemini API error:", error);
      }
    });
  }
});

chrome.webRequest.onBeforeRequest.addListener(
  async (details) => {
    const url = details.url;
    const payload = { text: url, task: "detect_phishing_url", context: url };
    try {
      const response = await fetch(GEMINI_API_URL, {
        method: "POST",
        headers: { "Authorization": `Bearer ${GEMINI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (result.score < 70 || result.flags.includes("malicious")) {
        chrome.notifications.create({
          type: "basic",
          iconUrl: "phishing.png",
          title: "PhishNet Warning",
          message: result.notification || `Danger: ${url} may be a phishing site! (Score: ${result.score})`,
          priority: 2
        });
      }
    } catch (error) {
      console.error("Gemini API error:", error);
    }
  },
  { urls: ["<all_urls>"] },
  ["blocking"]
);

// Get public IP for hijacking and VPN detection
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "getIP") {
    fetch("https://api.ipify.org?format=json")
      .then(response => response.json())
      .then(data => sendResponse({ ip: data.ip }))
      .catch(error => console.error("IP fetch error:", error));
    return true; // Async response
  }
});