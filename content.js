// Listen for messages from background to send to Atlas
chrome.runtime.onMessage.addListener((msg, sender, respond) => {
  if (msg.action === 'send') {
    sendMessage(msg.text).then(respond);
    return true;
  }
  if (msg.action === 'check') {
    respond({ ready: isReady() });
  }
});

function sendMessage(text) {
  return new Promise((resolve) => {
    // Wait for Atlas to be ready (not streaming) before attempting to send
    waitForReady().then((ready) => {
      if (!ready) {
        resolve({ success: false, error: 'Atlas not ready (timed out waiting for submit button)' });
        return;
      }

      const input = document.querySelector('textarea[placeholder*="Message"], textarea');
      const button = document.querySelector('button[type="submit"], button[aria-label*="Send"]');

      if (!input || !button) {
        resolve({ success: false, error: 'UI elements not found' });
        return;
      }

      input.value = text;
      input.dispatchEvent(new Event('input', { bubbles: true }));

      setTimeout(() => {
        button.click();

        // Wait for response to complete
        waitForResponse().then(() => {
          resolve({ success: true });
        });
      }, 100);
    });
  });
}

// Poll for Atlas to be ready (submit button available, no streaming)
// Retries up to ~5 seconds with 200ms intervals
function waitForReady() {
  return new Promise((resolve) => {
    let attempts = 0;
    const maxAttempts = 25; // 25 * 200ms = 5s
    const check = () => {
      if (isReady()) {
        resolve(true);
        return;
      }
      attempts++;
      if (attempts >= maxAttempts) {
        resolve(false);
        return;
      }
      setTimeout(check, 200);
    };
    check();
  });
}

function isReady() {
  // Check if Atlas is processing (look for stop button or streaming indicator)
  const stopBtn = document.querySelector('button[aria-label*="Stop"]');
  return !stopBtn;
}

function waitForResponse() {
  return new Promise((resolve) => {
    let checks = 0;
    const interval = setInterval(() => {
      checks++;
      if (isReady() || checks > 120) { // max 60s wait
        clearInterval(interval);
        setTimeout(resolve, 1000); // 1s cooldown
      }
    }, 500);
  });
}
