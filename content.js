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
