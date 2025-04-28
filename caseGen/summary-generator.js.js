// Filename: summary-generator.js
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
require('dotenv').config();

// Directory where the case files are located
const casesDirectory = './caseGen/cases';

const generateCaseSummary = async (caseDescription) => {
    const prompt = `Create a concise three-sentence summary for the following case notes:\n\n${caseDescription}`;

    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-4",
            messages: [{
                role: "system", content: prompt
            }]
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        return response.data.choices[0].message.content.trim();
    } catch (error) {
        console.error('Error generating case summary:', error);
        return 'Error generating case summary.';
    }
};

const saveSummary = async (summary, filename) => {
    try {
        await fs.writeFile(filename, summary);
        console.log(`Summary saved as ${filename}`);
    } catch (error) {
        console.error(`Error saving summary to file ${filename}: `, error);
    }
};

(async () => {
    try {
        const files = await fs.readdir(casesDirectory);
        const caseFiles = files.filter(file => file.startsWith('case') && file.endsWith('.txt')).sort();

        for (const file of caseFiles) {
            const caseDescription = await fs.readFile(path.join(casesDirectory, file), 'utf-8');
            const summary = await generateCaseSummary(caseDescription);
            
            const summaryFilename = path.join(casesDirectory, `summary-${file}`);
            await saveSummary(summary, summaryFilename);
        }
    } catch (error) {
        console.error('Error processing case files:', error);
    }
})();