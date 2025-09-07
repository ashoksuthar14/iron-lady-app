// Lightweight API client with placeholder endpoints
const Api = (() => {
  const defaultHeaders = { 'Content-Type': 'application/json' };

  async function handleResponse(response) {
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `HTTP ${response.status}`);
    }
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return response.json();
    }
    return response.text();
  }

  return {
    async createSession(username) {
      // POST /api/session { username }
      return handleResponse(await fetch('/api/session', {
        method: 'POST',
        headers: defaultHeaders,
        body: JSON.stringify({ username })
      }));
    },

    async getMessages() {
      return handleResponse(await fetch('/api/messages'));
    },

    async createMessage(content) {
      return handleResponse(await fetch('/api/messages', {
        method: 'POST',
        headers: defaultHeaders,
        body: JSON.stringify({ content })
      }));
    },

    async updateMessage(messageId, content) {
      return handleResponse(await fetch(`/api/messages/${messageId}`, {
        method: 'PUT',
        headers: defaultHeaders,
        body: JSON.stringify({ content })
      }));
    },

    async deleteMessage(messageId) {
      return handleResponse(await fetch(`/api/messages/${messageId}`, {
        method: 'DELETE'
      }));
    },

    async summarize() {
      return handleResponse(await fetch('/api/summarize', { method: 'POST' }));
    },

    async latestSummary() {
      return handleResponse(await fetch('/api/summaries/latest'));
    },

    async download(type) {
      // type: 'pdf' | 'docx'
      const res = await fetch(`/api/summaries/latest/download?type=${encodeURIComponent(type)}`);
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `summary.${type === 'pdf' ? 'pdf' : 'docx'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }
  };
})();


