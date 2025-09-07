(() => {
  const joinSection = document.getElementById('join-section');
  const chatSection = document.getElementById('chat-section');
  const joinForm = document.getElementById('join-form');
  const usernameInput = document.getElementById('username-input');
  const joinError = document.getElementById('join-error');
  const currentUsernameEl = document.getElementById('current-username');
  const messagesList = document.getElementById('messages-list');
  const messageForm = document.getElementById('message-form');
  const messageInput = document.getElementById('message-input');
  const chatError = document.getElementById('chat-error');
  const refreshBtn = document.getElementById('refresh-btn');
  const summarizeBtn = document.getElementById('summarize-btn');
  const summaryResult = document.getElementById('summary-result');
  const summaryContent = document.getElementById('summary-content');

  let session = null;

  function setView(isJoined) {
    joinSection.style.display = isJoined ? 'none' : '';
    chatSection.style.display = isJoined ? '' : 'none';
  }

  function renderMessageItem(message, isOwn) {
    const li = document.createElement('li');
    li.className = 'list-group-item message-item';
    li.dataset.messageId = message.id;
    li.innerHTML = `
      <div class="d-flex justify-content-between align-items-start">
        <div>
          <div class="fw-semibold">${message.username}</div>
          <div class="message-content">${escapeHtml(message.content)}</div>
          <div class="message-meta">${new Date(message.created_at).toLocaleString()}</div>
        </div>
        <div class="message-actions d-flex gap-2">
          ${isOwn ? `<button class="btn btn-sm btn-outline-secondary edit-btn">Edit</button>` : ''}
          ${isOwn ? `<button class="btn btn-sm btn-outline-danger delete-btn">Delete</button>` : ''}
        </div>
      </div>`;

    if (isOwn) {
      li.querySelector('.edit-btn').addEventListener('click', async () => {
        const current = message.content;
        const updated = prompt('Edit message:', current);
        if (updated == null || updated.trim() === '' || updated === current) return;
        try {
          await Api.updateMessage(message.id, updated.trim());
          await loadMessages();
        } catch (err) {
          showChatError(err.message);
        }
      });

      li.querySelector('.delete-btn').addEventListener('click', async () => {
        if (!confirm('Delete this message?')) return;
        try {
          await Api.deleteMessage(message.id);
          await loadMessages();
        } catch (err) {
          showChatError(err.message);
        }
      });
    }

    return li;
  }

  function escapeHtml(str) {
    return str
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
  }

  async function loadMessages() {
    try {
      chatError.style.display = 'none';
      const data = await Api.getMessages();
      messagesList.innerHTML = '';
      for (const msg of data.messages || []) {
        const isOwn = session && msg.username === session.username;
        messagesList.appendChild(renderMessageItem(msg, isOwn));
      }
      messagesList.scrollTop = messagesList.scrollHeight;
    } catch (err) {
      showChatError(err.message);
    }
  }

  function showChatError(message) {
    chatError.textContent = message || 'Something went wrong';
    chatError.style.display = '';
  }

  function showJoinError(message) {
    joinError.textContent = message || 'Unable to join';
    joinError.style.display = '';
  }

  // Handlers
  joinForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    joinError.style.display = 'none';
    const username = usernameInput.value.trim();
    if (!username) return;
    try {
      session = await Api.createSession(username);
      currentUsernameEl.textContent = session.username;
      setView(true);
      await loadMessages();
    } catch (err) {
      showJoinError(err.message);
    }
  });

  messageForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = messageInput.value.trim();
    if (!content) return;
    try {
      await Api.createMessage(content);
      messageInput.value = '';
      await loadMessages();
    } catch (err) {
      showChatError(err.message);
    }
  });

  refreshBtn.addEventListener('click', loadMessages);

  summarizeBtn.addEventListener('click', async () => {
    summarizeBtn.disabled = true;
    summarizeBtn.textContent = 'Summarizing...';
    try {
      const res = await Api.summarize();
      if (res && res.summary) {
        summaryContent.textContent = res.summary;
        summaryResult.style.display = '';
      }
    } catch (err) {
      showChatError(err.message);
    } finally {
      summarizeBtn.disabled = false;
      summarizeBtn.textContent = 'Summarize';
    }
  });
})();


