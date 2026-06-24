// script.js
const chatHistory = document.getElementById('chat-history');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');

let typingIndicator = null;
let isSending = false; // Prevent double-sends

sendButton.addEventListener('click', sendMessage);
messageInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    sendMessage();
  }
});

function getTimestamp() {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getTypingDelay(responseText) {
  const wordCount = responseText.split(' ').length;
  return Math.min(3000, Math.max(800, wordCount * 40));
}

function displayTypingIndicator() {
  typingIndicator = document.createElement('div');
  typingIndicator.classList.add('message', 'model-message');
  typingIndicator.innerHTML = `
    <div class="typing-indicator">
      <span></span><span></span><span></span>
    </div>`;
  chatHistory.appendChild(typingIndicator);
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

function removeTypingIndicator() {
  if (typingIndicator && typingIndicator.parentNode === chatHistory) {
    chatHistory.removeChild(typingIndicator);
    typingIndicator = null;
  }
}

function appendMessage(html, cssClass) {
  const el = document.createElement('div');
  el.classList.add('message', cssClass);
  el.innerHTML = html;
  chatHistory.appendChild(el);
  chatHistory.scrollTop = chatHistory.scrollHeight;
  return el;
}

function sendMessage() {
  if (isSending) return; // Guard against double-click
  const message = messageInput.value.trim();
  if (message === '') return;

  isSending = true;
  messageInput.value = '';
  sendButton.disabled = true;

  // Show user message
  appendMessage(`<span>${escapeHtml(message)}</span> <small>${getTimestamp()}</small>`, 'user-message');

  // Show typing indicator
  displayTypingIndicator();

  fetch('/chat?message=' + encodeURIComponent(message))
    .then(response => {
      if (!response.ok) {
        return response.json().then(err => {
          const e = new Error(err.error || `Server error ${response.status}`);
          e.status = response.status;
          e.retryAfter = err.retryAfter || null;
          throw e;
        });
      }
      return response.json();
    })
    .then(data => {
      if (!data.response) throw new Error('Empty response from server');

      setTimeout(() => {
        removeTypingIndicator();
        appendMessage(
          `${marked.parse(data.response)} <small>${getTimestamp()}</small>`,
          'model-message'
        );
        isSending = false;
        sendButton.disabled = false;
        messageInput.focus();
      }, getTypingDelay(data.response));
    })
    .catch(error => {
      console.error('Chat error:', error);
      removeTypingIndicator();

      const is429 = error.status === 429;
      let errorHtml;

      if (is429) {
        let countdown = error.retryAfter || 15;
        const msgEl = appendMessage(
          `<i>⏳ ${error.message} Retrying in <span class="countdown">${countdown}</span>s...</i> <small>${getTimestamp()}</small>`,
          'model-message error-message'
        );
        const timer = setInterval(() => {
          countdown--;
          const span = msgEl.querySelector('.countdown');
          if (span) span.textContent = countdown;
          if (countdown <= 0) {
            clearInterval(timer);
            msgEl.innerHTML = `<i>🔄 Retrying now...</i>`;
            messageInput.value = message; // Restore the message
            isSending = false;
            sendButton.disabled = false;
            sendMessage(); // Auto-retry
          }
        }, 1000);
      } else {
        appendMessage(
          `<i>⚠️ ${error.message}</i> <small>${getTimestamp()}</small>`,
          'model-message error-message'
        );
        isSending = false;
        sendButton.disabled = false;
        messageInput.focus();
      }
    });
}

// Prevent XSS from user input in the chat bubble
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
