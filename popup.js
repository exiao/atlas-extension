const messageInput = document.getElementById('message');
const queueDiv = document.getElementById('queue');

document.getElementById('add').onclick = async () => {
  const text = messageInput.value.trim();
  if (!text) return;

  await chrome.runtime.sendMessage({ action: 'add', text });
  messageInput.value = '';
  loadQueue();
};

document.getElementById('start').onclick = async () => {
  await chrome.runtime.sendMessage({ action: 'start' });
  setTimeout(loadQueue, 1000);
};

document.getElementById('clear').onclick = async () => {
  await chrome.runtime.sendMessage({ action: 'clear' });
  loadQueue();
};

async function loadQueue() {
  const { queue } = await chrome.runtime.sendMessage({ action: 'get' });

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
