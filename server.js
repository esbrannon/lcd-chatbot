
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const fs = require('fs').promises;
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to serve static files and parse JSON bodies
app.use(express.static('public'));
app.use(express.json());

// Route to handle chat completion requests
app.post('/api/query', async (req, res) => {
    try {
         const htmlPath = './cases/chickenpox.html'; // Replace with the path to your HTML file
         const caseStudy = await fs.readFile(htmlPath, 'utf8'); // Read the HTML file content
        // const caseStudy = "Case Study: Public Health Nurse and Chickenpox Outbrea Background: Public health nurse Ann Baxter, RN, MPH, who is part of the communicable disease division at the Midtown County Health Department in Michigan, faced an imminent challenge.On March 10th, the health department was notified of several suspected cases of chickenpox at a local elementary school.Ann was tasked with the investigation, containment, and educational response to the reported outbreak Case Presentation Expanded: Anns investigation began with the index case, a 7-year-old girl named Emma – a second grader at the local elementary school. Here is an expanded account: Initial Case - Emma(Case Index): Patient Profile: Emma, a previously healthy 7 - year - old female with no immunizations for chickenpox, due to her parents preference. Initial Symptoms: She started showing symptoms with a low - grade fever of 100.5°F(38°C) and was experiencing a headache and fatigue two days prior to her case being reported. Progression of Symptoms: By the next day, Emmas mother noticed a red, itchy rash on Emma’s back and abdomen. Clinical Examination: A pediatrician assessed Emma and found the rash had developed into fluid - filled blisters with a characteristic pattern of central indentation known as umbilication - a hallmark of varicella lesions.The presence of lesions at different stages was also typical of chickenpox. Diagnosis and Reporting: The pediatrician confirmed the diagnosis of chickenpox based on the symptoms and absence of vaccine protection.The county health department was notified of the case, following state public health laws Subsequent Cases: Shortly after Emmas diagnosis, four additional cases were reported, belonging to children aged 5 to 9, some of whom had not received any varicella vaccine and others had incomplete vaccinations. Symptoms: The symptoms mirrored those of Emma with the onset of fever, malaise, and rash, progressing to the classic vesicular stage.  Confirmation of Infection: The timing of the subsequent cases. Symptom onset fell within 10 to 21 days after exposure to Emma, which fits the incubation period for the varicella-zoster virus, indicating an outbreak."

        // Make an API call to the OpenAI chat completion endpoint
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-3.5-turbo", // Make sure to use the correct model name
            messages: [{
                //role: "system", content: "You a patient and the user is a nurse. The nurse will ask you questions about the following case study: Case Study: Public Health Nurse and Chickenpox Outbrea Background: Public health nurse Ann Baxter, RN, MPH, who is part of the communicable disease division at the Midtown County Health Department in Michigan, faced an imminent challenge.On March 10th, the health department was notified of several suspected cases of chickenpox at a local elementary school.Ann was tasked with the investigation, containment, and educational response to the reported outbreak Case Presentation Expanded: Anns investigation began with the index case, a 7-year-old girl named Emma – a second grader at the local elementary school. Here is an expanded account: Initial Case - Emma(Case Index): Patient Profile: Emma, a previously healthy 7 - year - old female with no immunizations for chickenpox, due to her parents preference. Initial Symptoms: She started showing symptoms with a low - grade fever of 100.5°F(38°C) and was experiencing a headache and fatigue two days prior to her case being reported. Progression of Symptoms: By the next day, Emmas mother noticed a red, itchy rash on Emma’s back and abdomen. Clinical Examination: A pediatrician assessed Emma and found the rash had developed into fluid - filled blisters with a characteristic pattern of central indentation known as umbilication - a hallmark of varicella lesions.The presence of lesions at different stages was also typical of chickenpox. Diagnosis and Reporting: The pediatrician confirmed the diagnosis of chickenpox based on the symptoms and absence of vaccine protection.The county health department was notified of the case, following state public health laws Subsequent Cases: Shortly after Emmas diagnosis, four additional cases were reported, belonging to children aged 5 to 9, some of whom had not received any varicella vaccine and others had incomplete vaccinations. Symptoms: The symptoms mirrored those of Emma with the onset of fever, malaise, and rash, progressing to the classic vesicular stage.  Confirmation of Infection: The timing of the subsequent cases. Symptom onset fell within 10 to 21 days after exposure to Emma, which fits the incubation period for the varicella-zoster virus, indicating an outbreak." },
                role: "system", content: `You a patient and the user is a nurse. The nurse will ask you questions about the following case study: ${caseStudy} `
            },
            { role: "user", content: req.body.prompt }]
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        // Log the full response data
        console.log('OpenAI API Response:', JSON.stringify(response.data, null, 2));

        // Extract the message content and send back to the client
        const messageContent = response.data.choices[0].message.content;
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
