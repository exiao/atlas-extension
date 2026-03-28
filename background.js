let queue = [];
let processing = false;

// Load queue on startup; reset any items stuck in 'sending' (service worker may
// have terminated mid-process, leaving them in a permanently stuck state).
chrome.storage.local.get(['queue'], (result) => {
  if (result.queue) {
    queue = result.queue.map((item) =>
      item.status === 'sending' ? { ...item, status: 'pending' } : item
    );
    saveQueue();
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((msg, sender, respond) => {
  if (msg.action === 'add') {
    queue.push({ id: Date.now(), text: msg.text, status: 'pending' });
    saveQueue();
    respond({ queue });
  }
  if (msg.action === 'get') {
    respond({ queue, processing });
  }
  if (msg.action === 'start') {
    processQueue();
    respond({ started: true });
  }
  if (msg.action === 'clear') {
    queue = [];
    saveQueue();
    respond({ queue });
  }
  return true;
});

async function processQueue() {
  if (processing || queue.length === 0) return;
  processing = true;

  const tabs = await chrome.tabs.query({ url: 'https://atlas.openai.com/*' });
  if (tabs.length === 0) {
    processing = false;
    return;
  }

  const tab = tabs[0];

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    if (item.status !== 'pending') continue;

    item.status = 'sending';
    saveQueue();

    try {
      const result = await chrome.tabs.sendMessage(tab.id, {
        action: 'send',
        text: item.text
      });

      if (result.success) {
        item.status = 'sent';
      } else {
        item.status = 'failed';
        item.error = result.error;
      }
    } catch (err) {
      item.status = 'failed';
      item.error = err.message;
    }

    saveQueue();
  }

  processing = false;
}

function saveQueue() {
  chrome.storage.local.set({ queue });
}
