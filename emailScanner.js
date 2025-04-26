console.log("Phishing Email Scanner running...");

const GEMINI_API_KEY = "AIzaSyCGG63veC7HT6B60X6UMCtKSWIk8oJ4hD"; // Replace with your key
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent"; // Dummy endpoint, replace with real one

// Function to scan email content using Gemini API
async function scanEmailContent() {
  setTimeout(async () => {
    const emailBodies = document.querySelectorAll('div[class*="a3s"], div[class*="ii gt"]');
    for (let body of emailBodies) {
      if (body.hasAttribute('data-phishnet-notified')) {
        continue;
      }
      const text = body.innerText || body.textContent;
      if (text) {
        const payload = { text: text, task: "detect_phishing_email", context: window.location.href };
        try {
          const response = await fetch(GEMINI_API_URL, {
            method: "POST",
            headers: { "Authorization": `Bearer ${GEMINI_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          const result = await response.json();
          if (result.score < 70 || result.flags.includes("phishing")) {
            body.style.backgroundColor = "yellow";
            body.style.padding = "2px";
            body.title = "Warning: Suspicious content detected!";
            const warningIcon = document.createElement("span");
            warningIcon.innerText = "⚠️";
            warningIcon.style.marginLeft = "5px";
            warningIcon.title = "This email may contain phishing content!";
            body.insertAdjacentElement('afterbegin', warningIcon);
            chrome.runtime.sendMessage({
              type: "showAlert",
              message: result.notification || "PhishNet Warning: Suspicious content detected in email!"
            });
            body.setAttribute('data-phishnet-notified', 'true');
          }
        } catch (error) {
          console.error("Gemini API error:", error);
        }
      }
    }
  }, 1000);
}

// Run scanner on page load and on dynamic content changes
window.addEventListener("load", scanEmailContent);

const observer = new MutationObserver(() => {
  scanEmailContent();
});
observer.observe(document.body, { childList: true, subtree: true });