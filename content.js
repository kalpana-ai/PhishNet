console.log("Content script running...");

let hasNotified = false;

const GEMINI_API_KEY = "AIzaSyCGG63veC7HT6B60X6UMCtKSWIk8oJ4hD"; // Replace with your key
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent"; // Dummy endpoint, replace with real one

// Function to analyze page safety using Gemini API
async function analyzePageSafety() {
  const pageContent = document.documentElement.outerHTML;
  const payload = { text: pageContent, task: "assess_page_safety", context: window.location.href };
  try {
    const response = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: { "Authorization": `Bearer ${GEMINI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (result.score < 70 && !hasNotified) {
      chrome.runtime.sendMessage({
        type: "showAlert",
        message: result.notification || `Unsafe Page Detected!\nScore: ${result.score}\nFlags: ${result.flags.join(", ")}`
      });
      hasNotified = true;
    }
    return { score: result.score, warnings: result.flags.length ? result.flags : ["No safety concerns detected."] };
  } catch (error) {
    console.error("Gemini API error:", error);
    return { score: 100, warnings: ["Error assessing page safety."] };
  }
}

// Function for Real-Time Web Content Check
async function analyzeWebContent() {
  const pageText = document.body.innerText || document.body.textContent;
  const screenshots = await chrome.tabs.captureVisibleTab(null, { format: "png" });
  const payload = {
    text: pageText.substring(0, 5000),
    image: screenshots,
    task: "detect_phishing_content",
    context: window.location.href
  };
  try {
    const response = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: { "Authorization": `Bearer ${GEMINI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (result.score < 70 || result.flags.includes("fake_domain") || result.flags.includes("urgency_cue")) {
      chrome.runtime.sendMessage({
        type: "showAlert",
        message: result.notification || `PhishNet Alert: Suspicious content detected!\nScore: ${result.score}\nFlags: ${result.flags.join(", ")}`
      });
    }
  } catch (error) {
    console.error("Gemini API error:", error);
  }
}

// Function for Deepfake Detection
async function detectDeepfakes() {
  const images = document.getElementsByTagName("img");
  for (let img of images) {
    const imageSrc = img.src;
    if (imageSrc.startsWith("http")) {
      const response = await fetch(imageSrc);
      const blob = await response.blob();
      const payload = {
        image: await blobToBase64(blob),
        task: "detect_deepfake"
      };
      try {
        const response = await fetch(GEMINI_API_URL, {
          method: "POST",
          headers: { "Authorization": `Bearer ${GEMINI_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (result.confidence > 0.7) {
          img.style.border = "3px solid red";
          img.title = `Warning: Possible deepfake (Confidence: ${result.confidence})`;
          chrome.runtime.sendMessage({
            type: "showAlert",
            message: result.notification || `PhishNet Warning: Deepfake image detected on ${window.location.href}!`
          });
        }
      } catch (error) {
        console.error("Deepfake detection error:", error);
      }
    }
  }
}

// Helper function to convert blob to base64
function blobToBase64(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.readAsDataURL(blob);
  });
}

// Function for Session Hijacking Prevention
function monitorSessionHijacking() {
  const cookies = document.cookie.split(';');
  let sessionToken = null;
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name.includes("session") || name.includes("token")) {
      sessionToken = value;
      break;
    }
  }
  if (sessionToken) {
    chrome.runtime.sendMessage({
      type: "checkHijacking",
      token: sessionToken,
      url: window.location.href
    });
  }
}

// Function for VPN Detection
async function detectVPN() {
  try {
    const response = await fetch("https://api.ipify.org?format=json");
    const data = await response.json();
    const payload = { text: data.ip, task: "detect_vpn" };
    const apiResponse = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: { "Authorization": `Bearer ${GEMINI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await apiResponse.json();
    if (result.flags.includes("no_vpn")) {
      chrome.runtime.sendMessage({
        type: "showAlert",
        message: result.notification || "PhishNet Warning: No VPN detected! Consider using a VPN."
      });
    }
  } catch (error) {
    console.error("VPN detection error:", error);
  }
}

// Function to analyze forms using Gemini API
async function analyzeForms() {
  const forms = document.getElementsByTagName("form");
  if (forms.length === 0) {
    return await analyzePageSafety();
  }
  const form = forms[0];
  const payload = { text: form.outerHTML, task: "assess_form_safety", context: window.location.href };
  try {
    const response = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: { "Authorization": `Bearer ${GEMINI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (result.score < 70 && !hasNotified) {
      chrome.runtime.sendMessage({
        type: "showAlert",
        message: result.notification || `Unsafe Form Detected!\nScore: ${result.score}\nFlags: ${result.flags.join(", ")}`
      });
      hasNotified = true;
    }
    return { score: result.score, warnings: result.flags.length ? result.flags : [] };
  } catch (error) {
    console.error("Gemini API error:", error);
    return { score: 100, warnings: ["Error assessing form safety."] };
  }
}

// Check on page load
window.addEventListener("load", async () => {
  const formAnalysis = await analyzeForms();
  chrome.runtime.sendMessage({
    type: "formScore",
    score: formAnalysis.score,
    warnings: formAnalysis.warnings.length ? formAnalysis.warnings : ["No safety concerns detected."]
  });

  analyzeWebContent();
  detectDeepfakes();
  monitorSessionHijacking();
  detectVPN();

  const observer = new MutationObserver(() => {
    analyzeWebContent();
    detectDeepfakes();
    monitorSessionHijacking();
  });
  observer.observe(document.body, { childList: true, subtree: true });
});

// Respond to popup requests
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.type === "getFormScore") {
    const formAnalysis = await analyzeForms();
    sendResponse({
      score: formAnalysis.score,
      warnings: formAnalysis.warnings.length ? formAnalysis.warnings : ["No safety concerns detected."]
    });
  }
  return true;
});

// Reset notification flag on page change
window.addEventListener("beforeunload", () => {
  hasNotified = false;
});