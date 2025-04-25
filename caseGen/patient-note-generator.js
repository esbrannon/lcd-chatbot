// Filename: patient-note-generator.js
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
require('dotenv').config();

const casesDirectory = './caseGen/cases';

const generatePatientName = (index) => {
    const names = ["Alex Smith", "Jamie Johnson", "Taylor Brown", "Jordan Lee", "Casey Kim", "Morgan Chen"];
    return names[index % names.length] || `Patient${index + 1}`;
};

const createPrompt = (patientName, caseDescription, role) => {
    const prompts = {
        'Physician': `
Write a clinical note from a physician for the diabetic patient ${patientName}: ${caseDescription}. 
Include the diagnosis, history of present illness, past medical history, surgical history, family history, social history, medications, allergies, assessment, and plan.`,
        'Nutritionist': `
Write a clinical dietary consultation note from a nutritionist for the diabetic patient ${patientName}: ${caseDescription}. 
Include dietary recommendations, goals for macronutrient intake, and suggested lifestyle modifications. Include the patient name.`,
        'Social Worker': `
Write a clinical note from a social worker addressing the social support needs of the diabetic patient ${patientName}: ${caseDescription}. 
Include resources for community support, counseling options, and strategies for addressing financial or social barriers. Include the patient name.`,
        'Pharmacist': `
Write a clinical medication management note from a pharmacist for the diabetic patient ${patientName}: ${caseDescription}. 
Include medication review, adherence assessment, and any necessary counseling points regarding the patient's medication regimen. Include the patient name.`,
        'Lab Work': `
Generate a recent set of lab work results for the diabetic patient ${patientName}: ${caseDescription}. 
Include HbA1c, fasting glucose levels, cholesterol levels, and any other relevant tests.`
    };
    return prompts[role];
};

const saveMarkdown = async (text, filename) => {
    try {
        await fs.writeFile(filename, text);
        console.log(`Saved as ${filename}`);
    } catch (error) {
        console.error(`Error saving file ${filename}: `, error);
    }
};

const sendPromptToChatGPT = async (patientName, caseDescription, role) => {
    const systemPrompt = createPrompt(patientName, caseDescription, role);
    const maxRetries = 5;
    let attempt = 0;
    let delay = 2000; // Start with a 2-second delay

    while (attempt < maxRetries) {
        try {
            const response = await axios.post('https://api.openai.com/v1/chat/completions', {
                model: "gpt-4",
                messages: [{
                    role: "system", content: systemPrompt
                }]
            }, {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.data.choices[0].message.content.trim();
        } catch (error) {
            if (error.response && error.response.status === 429) {
                console.warn(`Rate limit hit, retrying ${role} for ${patientName} (${attempt + 1}/${maxRetries})...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // Exponential backoff
                attempt++;
            } else {
                console.error(`Error generating ${role} note for ${patientName}: `, error);
                return `Error generating ${role} note.`;
            }
        }
    }

    return `Failed to generate ${role} note for ${patientName} after ${maxRetries} attempts.`;
};

(async () => {
    try {
        const files = await fs.readdir(casesDirectory);
        const caseFiles = files.filter(file => file.startsWith('case') && file.endsWith('.txt')).sort();

        for (const [index, file] of caseFiles.entries()) {
            const caseDescription = await fs.readFile(path.join(casesDirectory, file), 'utf-8');
            const patientName = generatePatientName(index);

            const notes = {};
            const roles = ['Physician', 'Nutritionist', 'Social Worker', 'Pharmacist', 'Lab Work'];

            for (const role of roles) {
                notes[role] = await sendPromptToChatGPT(patientName, caseDescription, role);
            }

            const markdownText = `
# Comprehensive Notes for Patient: ${patientName}

## Physician Note
${notes['Physician']}

## Nutritionist Note
${notes['Nutritionist']}

## Social Worker Note
${notes['Social Worker']}

## Pharmacist Note
${notes['Pharmacist']}

## Recent Lab Work
${notes['Lab Work']}
`;

            await saveMarkdown(markdownText, `./caseGen/patientNotes/diabetes_patient_${index + 1}.md`);
        }
    } catch (error) {
        console.error('Error processing case files:', error);
    }
})();