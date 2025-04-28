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

// Function to load character profiles from the personalities file
const loadCharacterProfiles = async () => {
    try {
        const data = await fs.readFile(path.join(__dirname, 'public', 'cases', 'personalities.txt'), 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading personalities file:`, error);
        return {};
    }
};

// Function to generate patient summary
const generatePatientSummary = (characterProfile) => {
    return `This is a patient characterized as ${characterProfile.personality || 'with an unspecified personality'}. They are a ${characterProfile.education || 'learner'} and have ${characterProfile.knowledge || 'some understanding of low carb diets'}.`;
};

// Route to handle chat completion requests
app.post('/api/query', async (req, res) => {
    try {
        const selectedPatient = req.body.patient.toLowerCase();
        const characterProfiles = await loadCharacterProfiles();
        const characterProfile = characterProfiles[selectedPatient] || {};

        const previousMessages = req.session.chatHistory || [];

        // Check if first interaction for this patient
        let summaryProvided = false;
        if (!req.session.summaryProvided) {
            const summary = generatePatientSummary(characterProfile);
            req.session.chatHistory.push({
                role: 'assistant',
                content: `Summary: ${summary}`
            });
            summaryProvided = true;
            req.session.summaryProvided = true;
        }

        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-4o",
            messages: [{
                role: "system",
                content: `You are a ${characterProfile.personality}. You are engaged in the case: ${summaryProvided ? 'with additional information' : 'summary needed'}.`
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

        const messageContent = summaryProvided ? `Summary: ${generatePatientSummary(characterProfile)}` : response.data.choices[0].message.content;

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

    req.session.chatHistory = [{
        role: 'system',
        content: `Begin case`
    }];
    req.session.selectedPatient = selectedPatient;
    req.session.summaryProvided = false;  // Reset summary flag for new patient

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