// Filename: disease-summaries-to-markdown.js

const fs = require('fs').promises;
const axios = require('axios'); // To make HTTP requests

const OPENAI_API_KEY = 'your-api-key-here';

// Diseases for which we need case summaries
const diseases = ['Chickenpox', 'Measles'] //, 'Giardia'];

// Function to create prompt from disease name
const createPrompt = (disease) => `Provide a case summary for the disease ${disease}.`;

// Function to save response as a markdown file
const saveMarkdown = async (text, filename) => {
    try {
        await fs.writeFile(filename, text);
        console.log(`Saved as ${filename}`);
    } catch (error) {
        console.error(`Error saving file ${filename}: `, error);
    }
};

// Function to send the prompt to ChatGPT and get the response
const sendPromptToChatGPT = async (disease) => {
    try {
        const systemPrompt = createPrompt(disease);
        
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-4o", // Make sure to use the correct model name
            messages: [{
                role: "system", content: systemPrompt
            }//,
              //  {
               //     role: "user", content: systemPrompt
                //}
            ]
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        //const response = await axios.post('https://api.openai.com/v1/chat/completions', payload, { headers });
        const messageContent = response.data.choices[0].message.content;

        const markdownText = `# ${disease} Case Summary\n\n${messageContent.trim()}\n`;

        await saveMarkdown(markdownText, `${disease.toLowerCase()}-summary.md`);
    } catch (error) {
        console.error(`Error in sending prompt for ${disease}: `, error);
    }
};

// Call the function for each disease to create the markdown files
(async () => {
    for (const disease of diseases) {
        await sendPromptToChatGPT(disease);
    }
})();// JavaScript source code
