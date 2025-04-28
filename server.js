require('dotenv').config();
const express = require('express');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const app = express();
const session = require('express-session');
const PORT = process.env.PORT || 3000;

// Configure session middleware
app.use(session({
    secret: 'your-secret', // Use a secure string in production
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, maxAge: 3600000 }
}));

app.use(express.static('public'));
app.use(express.json());

app.get('/js/marked.min.js', function (req, res) {
    res.type('application/javascript');
    res.sendFile(path.join(__dirname, 'public', 'js', 'marked.min.js'));
});

// Function to generate a unique personality
const generatePersonalityForCase = (caseNumber) => {
    const personalities = {
        'case-1': "resistant and angry",
        'case-2': "quiet and introspective",
        'case-3': "outgoing and energetic",
        'case-4': "analytical and detailed",
        'case-5': "pragmatic and down-to-earth",
        'case-6': "empathetic and understanding"
    };
    return personalities[caseNumber] || "no defined personality";
};

// Route to handle chat completion requests
app.post('/api/query', async (req, res) => {
    try {
        const selectedDisease = req.body.disease.toLowerCase();
        
        let htmlPath;
        switch (selectedDisease) {
            case 'case-1':
                htmlPath = './public/cases/case-1.md';
                break;
            case 'case-2':
                htmlPath = './public/cases/case-2.md';
                break;
            case 'case-3':
                htmlPath = './public/cases/case-3.md';
                break;
            case 'case-4':
                htmlPath = './public/cases/case-4.md';
                break;
            case 'case-5':
                htmlPath = './public/cases/case-5.md';
                break;
            case 'case-6':
                htmlPath = './public/cases/case-6.md';
                break;
        }

        const caseStudy = await fs.readFile(htmlPath, 'utf8');

        if (!req.session.chatHistory) {
            req.session.chatHistory = [];
        }

        const previousMessages = req.session.chatHistory;
        const casePersonality = generatePersonalityForCase(selectedDisease);

        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-4o",
            messages: [{
                role: "system",
                content: `You are a ${casePersonality} patient in the following case study: ${caseStudy}. The user is a nurse who will educate you about a low carbohydrate diet.`
            },
            ...previousMessages,
            { role: "user", content: req.body.prompt }]
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('OpenAI API Response:', JSON.stringify(response.data, null, 2));

        req.session.chatHistory.push({
            role: "user",
            content: req.body.prompt
        });

        const messageContent = response.data.choices[0].message.content;

        req.session.chatHistory.push({
            role: "assistant",
            content: messageContent
        });

        res.json({ message: messageContent });

    } catch (error) {
        console.error('Error with OpenAI API:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
        res.status(500).json({ error: 'Failed to fetch response from OpenAI', details: error.message });
    }
});

// Route to handle disease selection and reset chat history
app.post('/api/select-disease', (req, res) => {
    const selectedDisease = req.body.disease.toLowerCase();

    req.session.chatHistory = [{
        role: 'system',
        content: `Disease selected: ${selectedDisease}`
    }];

    req.session.selectedDisease = selectedDisease;

    res.json({
        status: 'success',
        message: `Chat history cleared. Disease selected: ${selectedDisease}`,
        chatHistory: req.session.chatHistory
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
