
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const fs = require('fs').promises;
const app = express();
const session = require('express-session');
const PORT = process.env.PORT || 3000;
const { marked } = require('marked');

// Configure session middleware
app.use(session({
    secret: 'your-secret', // Replace 'your-secret' with a secret string
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, maxAge: 3600000 } // For development, 'secure' is false; in production, it should be true if using HTTPS
}));

app.use(express.static('public'));

app.get('/js/marked.min.js', function (req, res) {
    res.type('application/javascript');
    res.sendFile(path.join(__dirname, 'public', 'js', 'marked.min.js'));
});


app.use(express.json());


// Route to handle chat completion requests
app.post('/api/query', async (req, res) => {
    try {
        //const htmlPath = './public/cases/chickenpox.html'; // Replace with the path to your HTML file
        // Get the disease the user selected from the request body
        const selectedDisease = req.body.disease.toLowerCase();

        // Use the selectedDisease variable to determine which case study to use
        // For example, you may have a switch case or if-else structure to select the correct path:
        let htmlPath;
        switch (selectedDisease) {
            case 'chickenpox':
                htmlPath = './public/cases/chickenpox.md';
                break;
            case 'giardia':
                htmlPath = './public/cases/giardia.md';
                break;
            case 'measles':
                htmlPath = './public/cases/measles.md';
                break;
            case 'pertussis':
                htmlPath = './public/cases/pertussis.md';
                break;
            case 'paratyphoid':
                htmlPath = './public/cases/paratyphoid.md';
                break;
            case 'neisseria-meningitis':
                htmlPath = './public/cases/neisseria-meningitis.md';
                break;
            case 'hepatitis-a':
                htmlPath = './public/cases/hepatitis-a.md';
                break;
            case 'histoplasmosis':
                htmlPath = './public/cases/histoplasmosis.md';
                break;
            case 'lyme':
                htmlPath = './public/cases/eee.md';
                break;
            case 'eee':
                htmlPath = './public/cases/eee.md';
                break;
            default:
                htmlPath = './public/cases/default.md'; // Default path or an error message
                break;
        }

        const caseStudy = await fs.readFile(htmlPath, 'utf8'); // Read the HTML file content

        // Initialize the session's chat history if it doesn't exist
        if (!req.session.chatHistory) {
            req.session.chatHistory = [];
        }

        const previousMessages = req.session.chatHistory;

        // Make an API call to the OpenAI chat completion endpoint
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-4o", // Make sure to use the correct model name
            messages: [{
                role: "system", content: `You are a patient in the following case study: ${caseStudy} . The user is a public health nurse investigating 
                your case. Your education level, based on your age, should be reflected in your responses. When the user types "END" provide an evaluation 
                of the nurse using the RIME framework based only on the chat history and using the following form (use markdown format in your response):
                
                Communicable Disease Nursing RIME Evaluation
This evaluation is intended to help you assess how your learning is progressing across the RIME (Reporter-Interpreter-Manager-Educator) stages.

Case Under Review: (insert disease name)                                                                                            

R – Reporter
☐  Reports age and demographics (sex, race, ethnicity) of patient (instert new line here)
☐  Reports all signs and symptoms
☐  Reports suspected exposure source (location, date(s), whether patient traveled, possible connection to patient’s job or hobbies, etc.)
☐  Reports suspected locations / individuals exposed by the patient
☐  Reports all labs required to classify this case and how / where to access them
☐  Maintains sensitive and appropriate interpersonal skills while gathering required information and responding to patient concerns or questions 
Notes:



I – Interpreter 
☐  Possesses all skills of the Reporter (above)
☐  Effectively summarizes all necessary information about the case
☐  Able to classify the case status from a clinical perspective and public health perspective
☐  Interprets where the case was most likely exposed
☐  Able to identify and prioritize concerns for potential exposure to the others (e.g., vulnerable groups such as young children or older adults)
Notes:


M – Manager
☐  Possesses all skills of the Reporter and Interpreter (above)
☐  Describes the necessary measures to address the condition (e.g., prophylaxis, vaccination, etc.)
☐  Describes the necessary measures to control exposures and limit risk to the public (e.g., isolation, prophylaxis for others exposed, etc.)
Notes:



E – Educator
☐  Possesses all skills of the Reporter, Interpreter, and Manager (above)
☐  Able to educate others (patients, colleagues, etc.) on the characteristics of this case
☐  Able to educate others (patients, colleagues, etc.) on best practices for prevention of cases
☐  Able to educate others (patients, colleagues, etc.) on the appropriate response to this case (treatment, prevention of exposure to others, etc.)
Notes:



Overall notes and feedback:







Your RIME stage as of (insert today's date) is                R           I           M          E (bold one)

                
                `
            },
            ...previousMessages, // Spread the previous messages here
            { role: "user", content: req.body.prompt }]
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });


        // Log the full response data
        console.log('OpenAI API Response:', JSON.stringify(response.data, null, 2));

        req.session.chatHistory.push({
            role: "user",
            content: req.body.prompt
        });

        // Extract the message content and send back to the client
        const messageContent = response.data.choices[0].message.content;

        // Add the AI's response to session history
        req.session.chatHistory.push({
            role: "assistant",
            content: messageContent
        });

        res.json({ message: messageContent });

    } catch (error) {
        // Log the error details
        console.error('Error with OpenAI API:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
        // Send a 500 Internal Server Error response to the client
        res.status(500).json({ error: 'Failed to fetch response from OpenAI', details: error.message });
    }
});

// Route to handle disease selection and reset chat history
app.post('/api/select-disease', (req, res) => {
    const selectedDisease = req.body.disease.toLowerCase();

    // Reset the chat history and initiate with selected disease message
    req.session.chatHistory = [{
        role: 'system',
        content: `Disease selected: ${selectedDisease}`
    }];

    // You may also want to store the selectedDisease in the session
    req.session.selectedDisease = selectedDisease;

    // Respond with a success message and the initial chat message
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
