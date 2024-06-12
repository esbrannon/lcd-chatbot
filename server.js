
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
                htmlPath = './public/cases/chickenpox.html';
                break;
            case 'giardia':
                htmlPath = './public/cases/giardia.html';
                break;
            case 'measles':
                htmlPath = './public/cases/measles.html';
                break;
            default:
                htmlPath = './public/cases/default.html'; // Default path or an error message
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
                role: "system", content: `You are a patient in the following case study: ${caseStudy} . The user is a public health nurse investigating your case. Your education level, based on your age, should be reflected in your responses. When the user types "END" provide an evaluation of the nurse using the RIME framework based only on the chat history`
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
