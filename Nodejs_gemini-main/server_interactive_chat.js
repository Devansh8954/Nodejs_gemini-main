const { GoogleGenerativeAI } = require("@google/generative-ai");
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serve index.html as the default route
app.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const gemini_api_key = process.env.API_KEY;
if (!gemini_api_key) {
    console.error("❌ ERROR: API_KEY environment variable is not set!");
    process.exit(1);
}

const googleAI = new GoogleGenerativeAI(gemini_api_key);
const geminiModel = googleAI.getGenerativeModel({
    model: "gemini-2.0-flash-lite", // ✅ Free tier: 30 RPM, 1500 req/day — works with v1beta
});

/* ----------------------------------------------- */

// Cap history to last 20 messages to avoid token limit errors on Render
const MAX_HISTORY = 20;
let chatHistory = [];

/* ----------------------------------------------- */

app.get('/home', (req, res) => {
    res.status(200).json('Welcome, your app is working well');
});

app.get('/chat', async (req, res) => {
    try {
        const message = req.query.message;
        if (!message) {
            return res.status(400).json({ error: 'Missing message query parameter' });
        }

        // Add the user message to the chat history
        chatHistory.push({ role: 'user', parts: [{ text: message }] });

        // Trim history to the last MAX_HISTORY messages to prevent token overflow
        if (chatHistory.length > MAX_HISTORY) {
            chatHistory = chatHistory.slice(chatHistory.length - MAX_HISTORY);
        }

        const systemPrompt = `You are a supportive AI chatbot designed to help students with emotional and mental health support. Your responses should be empathetic and understanding.
        User says: ${message}
        Respond to the user in a kind and helpful way, but do not share personal information.
        Do not ask like this, "Is there anything else I can do to help?" instead ask like "are you comfortable or fine now?" and also don't ask this all the time.
        If someone uses words like "suicidal", "killing", or other dangerous words, try to be their mentor, guider, and make them feel special — be their friend.
        Avoid asking repetitive or robotic questions like "Is there anything else I can help with?" Instead ask in a more human way.
        Always make sure the user feels safe, heard, and cared for. Let the conversation flow naturally, as if you're simply a supportive friend who's always there to listen.`;

        // Send the message to the model (with one automatic retry on 429)
        let result;
        try {
            const chat = geminiModel.startChat({ history: chatHistory });
            result = await chat.sendMessage(systemPrompt);
        } catch (apiError) {
            const is429 = apiError?.status === 429 || apiError?.message?.includes('429');
            if (is429) {
                // Wait 15 seconds and retry once
                console.warn('⚠️ Rate limited (429). Retrying in 15s...');
                await new Promise(resolve => setTimeout(resolve, 15000));
                const retryChat = geminiModel.startChat({ history: chatHistory });
                result = await retryChat.sendMessage(systemPrompt);
            } else {
                throw apiError;
            }
        }

        const responseText = result.response.text();

        // Add the model response to the chat history
        chatHistory.push({ role: 'model', parts: [{ text: responseText }] });

        // Send the model response to the client
        res.json({ response: responseText });
    } catch (error) {
        // Log the full error for debugging on Render logs
        console.error("❌ Chat error:", error?.message || error);

        // Detect specific error types and return clean messages
        const is429 = error?.status === 429 || error?.message?.includes('429');
        const statusCode = is429 ? 429 : (error?.status || 500);
        const userMessage = is429
            ? 'The AI is a bit busy right now. Please wait a moment and try again.'
            : 'Something went wrong on our end. Please try again.';

        res.status(statusCode).json({
            error: userMessage,
            retryAfter: is429 ? 15 : null
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Server is running on port ${PORT}`);
    console.log(`Server running at http://localhost:${PORT}`);
});