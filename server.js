require('dotenv').config();
const express = require('express');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const app = express();
const session = require('express-session');
const PORT = process.env.PORT || 3000;
const marked = require('marked');

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
const loadCharacterProfiles = async () => {
    try {
        const data = await fs.readFile(path.join(__dirname, 'public', 'cases', 'personalities.txt'), 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading personalities file:', error);
        return {};
    }
};

// Route to clear chat
app.post('/api/clear-chat', (req, res) => {
    if (req.session) {
        req.session.chatHistory = [];
        req.session.isPatientMode = true; // Reset to patient mode
        console.log('Chat history cleared');
    }
    res.json({ status: 'success', message: 'Chat history cleared' });
});

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
        const characterProfiles = await loadCharacterProfiles();
        const characterProfile = characterProfiles[selectedPatient] || {};
        const characterDescription = `
            You are a patient who is ${characterProfile.personality}, with an education level of ${characterProfile.education}.
            Your level of inquisitiveness is ${characterProfile.inquisitiveness}, and your verbosity is ${characterProfile.verbosity}.
            You have ${characterProfile.knowledge}.
        `;

        // Check if we should switch the role
        if (req.body.prompt.toLowerCase() === "end") {
            req.session.isPatientMode = false;

            // Load learning objectives for the specific case
            const loPath = path.join(__dirname, `public/cases/lo-${selectedPatient}.txt`);
            const learningObjectives = await fs.readFile(loPath, 'utf8');

            // Analyze conversation history
            const analysisPrompt = `
                Based on the following learning objectives: ${learningObjectives}
                Analyze the chat history below and determine whether the objectives were met:
                ${previousMessages.map(msg => msg.content).join('\n')}
            `;

            const analysisResponse = await axios.post('https://api.openai.com/v1/chat/completions', {
                model: "gpt-4o",
                messages: [{
                    role: "system",
                    content: "You are an evaluator."
                }, {
                    role: "user",
                    content: analysisPrompt
                }]
            }, {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            // Convert analyzed markdown content to HTML
            try {
                const analysisContentMarkdown = analysisResponse.data.choices[0].message.content;
                const analysisContentHTML = marked.parse(analysisContentMarkdown);

                return res.json({ message: analysisContentHTML });
            } catch (error) {
                console.error('Error converting markdown to HTML:', error);
                return res.status(500).json({ error: 'Error processing response', details: error.message });
            }
        }

        // Regular conversational response
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
app.post('/api/select-patient', async (req, res) => {
    const selectedPatient = req.body.patient.toLowerCase();

    try {
        // Generate the file path for the summary
        const summaryFile = `summary-case-${selectedPatient.split('-')[1]}.txt`; // Assuming case-1, case-2, etc.
        const summaryPath = path.join(__dirname, 'public', 'cases', summaryFile);
        
        // Read the summary from the file
        const caseSummary = await fs.readFile(summaryPath, 'utf8');

        // Reset chat history in the session
        req.session.chatHistory = [];
        req.session.isPatientMode = true; // Ensure the initial role is as patient
        
        req.session.selectedPatient = selectedPatient;
        
        console.log(`Chat history cleared and new patient selected: ${selectedPatient}`);

        res.json({
            status: 'success',
            message: `Chat history cleared. Patient selected: ${selectedPatient}`,
            chatHistory: req.session.chatHistory,
            caseSummary: `Summary: ${caseSummary}`
        });

    } catch (error) {
        console.error('Error reading case summary:', error);
        res.status(500).json({ error: 'Failed to read case summary', details: error.message });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});