// script.js
const chatHistory = document.getElementById('chat-history');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');

sendButton.addEventListener('click', sendMessage);
messageInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    sendMessage();
  }
});

function sendMessage() {
  const message = messageInput.value.trim();
  if (message !== '') {
    
    // Clear the input field immediately after capturing the message
    messageInput.value = '';

    const userMessage = document.createElement('div');
    userMessage.classList.add('message', 'user-message');
    userMessage.textContent = message;
    chatHistory.appendChild(userMessage);

    fetch('/chat?message=' + encodeURIComponent(message))
      .then(response => response.json())
      .then(data => {
        const modelMessage = document.createElement('div');
        modelMessage.classList.add('message', 'model-message');

        // Convert the Markdown response to HTML
        modelMessage.innerHTML = marked.parse(data.response); // Use marked.js to convert Markdown to HTML
        // modelMessage.textContent = data.response;
        
        chatHistory.appendChild(modelMessage);

        // Scroll to the bottom of the chat window
        chatHistory.scrollTop = chatHistory.scrollHeight;
      })
      .catch(error => {
        console.error(error);
        alert('An error occurred while sending the message.');
      });
  }
}

function displayTypingIndicator() {
  const typingIndicator = document.createElement('div');
  typingIndicator.classList.add('message', 'model-message', 'typing');
  typingIndicator.textContent = "AI is typing...";
  chatHistory.appendChild(typingIndicator);

  chatHistory.scrollTop = chatHistory.scrollHeight;

  // Simulate delay before the real response appears
  setTimeout(() => {
    chatHistory.removeChild(typingIndicator); // Remove typing indicator
    const modelMessage = document.createElement('div');
    modelMessage.classList.add('message', 'model-message');
    modelMessage.innerHTML = marked.parse(data.response); // Use your model response here
    chatHistory.appendChild(modelMessage);
    chatHistory.scrollTop = chatHistory.scrollHeight;
  }, 1500); // Delay of 1.5 seconds (adjust to your preference)
}

function sendMessage() {
  const message = messageInput.value.trim();
  if (message !== '') {
    // Clear the input field immediately after capturing the message
    messageInput.value = '';

    const userMessage = document.createElement('div');
    userMessage.classList.add('message', 'user-message');
    userMessage.textContent = message;
    chatHistory.appendChild(userMessage);

    // Call typing indicator before sending the request
    displayTypingIndicator();

    fetch('/chat?message=' + encodeURIComponent(message))
      .then(response => response.json())
      .then(data => {
        const modelMessage = document.createElement('div');
        modelMessage.classList.add('message', 'model-message');
        modelMessage.innerHTML = marked.parse(data.response);
        chatHistory.appendChild(modelMessage);

        // Scroll to the bottom of the chat window
        chatHistory.scrollTop = chatHistory.scrollHeight;
      })
      .catch(error => {
        console.error(error);
        alert('An error occurred while sending the message.');
      });
  }
}

let typingIndicator;

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

function sendMessage() {
  const message = messageInput.value.trim();
  if (message !== '') {
    messageInput.value = '';

    const userMessage = document.createElement('div');
    userMessage.classList.add('message', 'user-message');
    userMessage.innerHTML = `<span>${message}</span> <small>${getTimestamp()}</small>`;
    chatHistory.appendChild(userMessage);

    displayTypingIndicator();

    fetch('/chat?message=' + encodeURIComponent(message))
      .then(response => response.json())
      .then(data => {
        setTimeout(() => {
          chatHistory.removeChild(typingIndicator);

          const modelMessage = document.createElement('div');
          modelMessage.classList.add('message', 'model-message');
          modelMessage.innerHTML = `${marked.parse(data.response)} <small>${getTimestamp()}</small>`;
          chatHistory.appendChild(modelMessage);
          chatHistory.scrollTop = chatHistory.scrollHeight;
        }, getTypingDelay(data.response));
      })
      .catch(error => {
        console.error(error);
        chatHistory.removeChild(typingIndicator);

        const errorMessage = document.createElement('div');
        errorMessage.classList.add('message', 'model-message');
        errorMessage.innerHTML = `<i>⚠️ Sorry, something went wrong. Please try again.</i> <small>${getTimestamp()}</small>`;
        chatHistory.appendChild(errorMessage);
        chatHistory.scrollTop = chatHistory.scrollHeight;
      });
  }
}

function getTimestamp() {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getTypingDelay(responseText) {
  // Simulate delay based on message length (minimum 300ms, max 3000ms)
  const wordCount = responseText.split(' ').length;
  return Math.min(3000, Math.max(800, wordCount * 40));
}


