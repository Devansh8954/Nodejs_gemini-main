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

// System instruction — passed at model level, NOT injected into every message
const SYSTEM_INSTRUCTION = `You are a supportive AI chatbot designed to help students with emotional and mental health support.
Respond in a kind, empathetic, and helpful way — like a trusted friend and mentor.
Do not share personal information. Do not ask "Is there anything else I can do to help?" — instead check in naturally like "How are you feeling about that?".
If someone mentions suicidal thoughts, self-harm, or dangerous situations, respond with deep care, make them feel valued, and gently guide them toward positive steps.
Avoid repetitive or robotic questions. Let the conversation feel natural and human.
Always make sure the user feels safe, heard, and cared for.`;

const geminiModel = googleAI.getGenerativeModel({
    model: "gemini-2.0-flash-lite",
    systemInstruction: SYSTEM_INSTRUCTION,
});

// ----------------------------------------------------------------
// chatHistory stores ONLY completed exchanges (user + model pairs)
// It must ALWAYS end with a 'model' turn so the next sendMessage()
// correctly starts a 'user' turn — no consecutive same-role bug.
// ----------------------------------------------------------------
const MAX_HISTORY = 40; // 20 user + 20 model turns
let chatHistory = [];

app.get('/home', (req, res) => {
    res.status(200).json('Welcome, your app is working well');
});

app.get('/chat', async (req, res) => {
    try {
        const message = req.query.message;
        if (!message) {
            return res.status(400).json({ error: 'Missing message query parameter' });
        }

        // Trim history BEFORE the call so we don't exceed token limits
        if (chatHistory.length > MAX_HISTORY) {
            // Keep pairs (user+model), so slice on even boundary
            const trimTo = chatHistory.length - MAX_HISTORY;
            chatHistory = chatHistory.slice(trimTo % 2 === 0 ? trimTo : trimTo + 1);
        }

        // Pass history snapshot + send ONLY the raw user message
        // The SDK's sendMessage() will add the user turn itself
        const chat = geminiModel.startChat({ history: [...chatHistory] });
        let result;

        try {
            result = await chat.sendMessage(message);
        } catch (apiError) {
            const is429 = apiError?.status === 429 || apiError?.message?.includes('429');
            if (is429) {
                console.warn('⚠️ Rate limited (429). Retrying in 15s...');
                await new Promise(resolve => setTimeout(resolve, 15000));
                // Fresh chat with same history, retry
                const retryChat = geminiModel.startChat({ history: [...chatHistory] });
                result = await retryChat.sendMessage(message);
            } else {
                throw apiError;
            }
        }

        const responseText = result.response.text();

        // Save BOTH turns to history as a completed pair
        chatHistory.push(
            { role: 'user',  parts: [{ text: message }] },
            { role: 'model', parts: [{ text: responseText }] }
        );

        res.json({ response: responseText });

    } catch (error) {
        console.error("❌ Chat error:", error?.message || error);

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