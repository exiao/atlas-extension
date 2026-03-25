const messageInput = document.getElementById('message');
const queueDiv = document.getElementById('queue');

document.getElementById('add').onclick = async () => {
  const text = messageInput.value.trim();
  if (!text) return;

  try {
    await chrome.runtime.sendMessage({ action: 'add', text });
    messageInput.value = '';
    loadQueue();
  } catch (err) {
    console.error('Failed to send message to background:', err);
  }
};

document.getElementById('start').onclick = async () => {
  try {
    await chrome.runtime.sendMessage({ action: 'start' });
    setTimeout(loadQueue, 1000);
  } catch (err) {
    console.error('Failed to send start to background:', err);
  }
};

document.getElementById('clear').onclick = async () => {
  try {
    await chrome.runtime.sendMessage({ action: 'clear' });
    loadQueue();
  } catch (err) {
    console.error('Failed to send clear to background:', err);
  }
};

async function loadQueue() {
  let response;
  try {
    response = await chrome.runtime.sendMessage({ action: 'get' });
  } catch (err) {
    console.error('Failed to load queue from background:', err);
    return;
  }
  const { queue } = response;

  queueDiv.innerHTML = queue.length === 0
    ? '<p style="color: #999;">Queue is empty</p>'
    : queue.map(item => `
        <div class="queue-item ${item.status}">
          <div>${item.text.substring(0, 100)}${item.text.length > 100 ? '...' : ''}</div>
          <div class="status">${item.status}${item.error ? ': ' + item.error : ''}</div>
        </div>
      `).join('');
}

loadQueue();
setInterval(loadQueue, 2000);
