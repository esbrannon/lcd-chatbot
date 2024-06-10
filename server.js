
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
        const htmlPath = './public/cases/chickenpox-case.html'; // Replace with the path to your HTML file
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
                role: "system", content: `You are a patient and the user is a nurse. The user will ask you questions about the following case study: ${caseStudy} When the user types "END" provide an evaluation of the nurse using the RIME framework`
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

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
