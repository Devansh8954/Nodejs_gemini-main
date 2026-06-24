// script.js
const chatHistory = document.getElementById('chat-history');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');

let typingIndicator = null;

sendButton.addEventListener('click', sendMessage);
messageInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    sendMessage();
  }
});

function getTimestamp() {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getTypingDelay(responseText) {
  // Simulate delay based on message length (minimum 800ms, max 3000ms)
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

function sendMessage() {
  const message = messageInput.value.trim();
  if (message !== '') {
    messageInput.value = '';

    // Show user message
    const userMessage = document.createElement('div');
    userMessage.classList.add('message', 'user-message');
    userMessage.innerHTML = `<span>${message}</span> <small>${getTimestamp()}</small>`;
    chatHistory.appendChild(userMessage);

    // Show typing indicator
    displayTypingIndicator();

    fetch('/chat?message=' + encodeURIComponent(message))
      .then(response => response.json())
      .then(data => {
        setTimeout(() => {
          removeTypingIndicator();

          const modelMessage = document.createElement('div');
          modelMessage.classList.add('message', 'model-message');
          modelMessage.innerHTML = `${marked.parse(data.response)} <small>${getTimestamp()}</small>`;
          chatHistory.appendChild(modelMessage);
          chatHistory.scrollTop = chatHistory.scrollHeight;
        }, getTypingDelay(data.response));
      })
      .catch(error => {
        console.error(error);
        removeTypingIndicator();

        const errorMessage = document.createElement('div');
        errorMessage.classList.add('message', 'model-message');
        errorMessage.innerHTML = `<i>⚠️ Sorry, something went wrong. Please try again.</i> <small>${getTimestamp()}</small>`;
        chatHistory.appendChild(errorMessage);
        chatHistory.scrollTop = chatHistory.scrollHeight;
      });
  }
}
