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

// Function to generate a detailed personality profile
const generateCharacterProfile = (patientNumber) => {
    const profiles = {
        'case-1': {
            personality: "cheerful and optimistic",
            education: "high school graduate",
            inquisitiveness: "moderately curious",
            verbosity: "talkative",
            knowledge: "limited knowledge about low carb diets"
        },
        'case-2': {
            personality: "quiet and introspective",
            education: "college graduate",
            inquisitiveness: "highly curious",
            verbosity: "concise",
            knowledge: "basic understanding of low carb diets"
        },
        'case-3': {
            personality: "outgoing and energetic",
            education: "some college",
            inquisitiveness: "somewhat curious",
            verbosity: "verbose",
            knowledge: "very familiar with low carb diets"
        },
        'case-4': {
            personality: "analytical and detailed",
            education: "advanced degree",
            inquisitiveness: "very curious",
            verbosity: "articulate",
            knowledge: "deep knowledge of low carb diets"
        },
        'case-5': {
            personality: "pragmatic and down-to-earth",
            education: "high school graduate",
            inquisitiveness: "curiously practical",
            verbosity: "to-the-point",
            knowledge: "some awareness of low carb diets"
        },
        'case-6': {
            personality: "empathetic and understanding",
            education: "college graduate",
            inquisitiveness: "moderately curious",
            verbosity: "balanced in speech",
            knowledge: "general knowledge about low carb diets"
        }
    };
    return profiles[patientNumber] || {
        personality: "no defined personality",
        education: "unspecified education level",
        inquisitiveness: "average curiosity",
        verbosity: "average verbosity",
        knowledge: "general knowledge level"
    };
};

// Route to handle chat completion requests
app.post('/api/query', async (req, res) => {
    try {
        const selectedPatient = req.body.patient.toLowerCase();

        let htmlPath;
        switch (selectedPatient) {
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
        const characterProfile = generateCharacterProfile(selectedPatient);
        const characterDescription = `
            You are a patient who is ${characterProfile.personality}, with an education level of ${characterProfile.education}.
            Your level of inquisitiveness is ${characterProfile.inquisitiveness}, and your verbosity is ${characterProfile.verbosity}.
            You have ${characterProfile.knowledge}.
        `;

        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-4o",
            messages: [{
                role: "system",
                content: `${characterDescription} You are involved in the following case study: ${caseStudy}. The user is a nurse who will educate you about a low carbohydrate diet.`
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

// Route to handle patient selection and reset chat history
app.post('/api/select-patient', (req, res) => {
    const selectedPatient = req.body.patient.toLowerCase();

    try {
        // Read the summary for the selected case
        const summaryFile = `case-summary-${selectedPatient.split('-')[1]}.txt`; // Assuming case-1, case-2, etc.
        const summaryPath = path.join(__dirname, 'public', 'cases', summaryFile);
        const caseSummary = await fs.readFile(summaryPath, 'utf8');
        
    req.session.chatHistory = [{
        role: 'system',
        content: `Patient selected: ${selectedPatient}`
    }];

    req.session.selectedPatient = selectedPatient;

    res.json({
        status: 'success',
        message: `Chat history cleared. Patient selected: ${selectedPatient}`,
        chatHistory: req.session.chatHistory
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});