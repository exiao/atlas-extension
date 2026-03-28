let queue = [];
let processing = false;
let queueReady = false;
const pendingMessages = [];

// Load queue on startup; reset any items stuck in 'sending' (service worker may
// have terminated mid-process, leaving them in a permanently stuck state).
// Message handlers are deferred until load completes to avoid a race where an
// incoming 'add' message gets lost when the storage callback overwrites queue.
chrome.storage.local.get(['queue'], (result) => {
  if (result.queue) {
    queue = result.queue.map((item) =>
      item.status === 'sending' ? { ...item, status: 'pending' } : item
    );
    saveQueue();
  }
  queueReady = true;
  // Drain any messages buffered during the load phase
  for (const { msg, respond } of pendingMessages) {
    handleMessage(msg, respond);
  }
  pendingMessages.length = 0;
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((msg, sender, respond) => {
  if (!queueReady) {
    // Buffer the message until the queue is loaded from storage
    pendingMessages.push({ msg, respond });
    return true;
  }
  handleMessage(msg, respond);
  return true;
});

function handleMessage(msg, respond) {
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
}

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
