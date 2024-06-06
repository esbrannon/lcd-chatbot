
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
        // const htmlPath = 'https://quiet-beyond-24129-5f235946185f.herokuapp.com/cases/chickenpox.html'; // Replace with the path to your HTML file
        // const caseStudyHTML = await fs.readFile(htmlPath, 'utf8'); // Read the HTML file content
        const caseStudyHTML = 'Case Study: Public Health Nurse and Chickenpox Outbreak
        Background: Public health nurse Ann Baxter, RN, MPH, who is part of the communicable disease division at the Midtown County Health Department in Michigan, faced an imminent challenge.On March 10th, the health department was notified of several suspected cases of chickenpox at a local elementary school.Ann was tasked with the investigation, containment, and educational response to the reported outbreak.
Case Presentation Expanded:
Ann's investigation began with the index case, a 7-year-old girl named Emma – a second grader at the local elementary school. Here is an expanded account:
Initial Case - Emma(Case Index):
•	Patient Profile: Emma, a previously healthy 7 - year - old female with no immunizations for chickenpox, due to her parents' preference.
•	Initial Symptoms: She started showing symptoms with a low - grade fever of 100.5°F(38°C) and was experiencing a headache and fatigue two days prior to her case being reported.
•	Progression of Symptoms: By the next day, Emma's mother noticed a red, itchy rash on Emma’s back and abdomen.
•	Clinical Examination: A pediatrician assessed Emma and found the rash had developed into fluid - filled blisters with a characteristic pattern of central indentation known as umbilication - a hallmark of varicella lesions.The presence of lesions at different stages was also typical of chickenpox.
•	Diagnosis and Reporting: The pediatrician confirmed the diagnosis of chickenpox based on the symptoms and absence of vaccine protection.The county health department was notified of the case, following state public health laws.
Subsequent Cases:
•	Shortly after Emma's diagnosis, four additional cases were reported, belonging to children aged 5 to 9, some of whom had not received any varicella vaccine and others had incomplete vaccinations.
•	Symptoms: The symptoms mirrored those of Emma with the onset of fever, malaise, and rash, progressing to the classic vesicular stage. 
•	Confirmation of Infection: The timing of the subsequent cases' symptom onset fell within 10 to 21 days after exposure to Emma, which fits the incubation period for the varicella-zoster virus, indicating an outbreak.
Ann collected and reviewed detailed clinical and vaccination histories to solidify the case findings and ensure all confirmed cases met the official case definition for chickenpox.Annex traced potential contacts within and outside the school and compiled data to monitor the outbreak.
Learning Objectives:
•	Understand the pathology and transmission vectors of varicella - zoster virus.
•	Integrate knowledge of chickenpox clinical manifestations, complications, and management.
•	Articulate the public health importance of the chickenpox vaccine and strategies for managing an outbreak.
•	Identify and implement appropriate response actions in the community and educational settings to contain the spread of disease.
Actions and Outcomes:
Ann's immediate action included confirming the chickenpox diagnosis and acquiring the vaccination history for the school's population.She rolled out several crucial interventions:
1.	Outbreak Confirmation: Ann ensured that there was a bona fide outbreak of varicella at the school through clinical and epidemiological evidence.
2.	Educational Campaign: She spearheaded an educational campaign, aimed particularly at the parents and school staff to explain chickenpox transmission, signs and symptoms, and preventive measures.
3.	Vaccination Clinic: A vaccination clinic was planned in collaboration with healthcare providers to improve vaccination coverage among students.
4.	Surveillance Expansion: Surveillance for additional cases was heightened to monitor the spread of chickenpox.
5.	Enforcement of Control Measures: Those infected were advised to stay home until the lesions crusted over, while the school implemented enhanced hygiene measures.
Thanks to Ann's efforts, the spread was curtailed, new cases reduced significantly, and community awareness and vaccination rates improved.
Reflection: Post - outbreak, Ann considered ways to improve future responses, such as developing better emergency communication plans, enforcing school health policies, and increasing engagement with the community on vaccine education.
Discussion Questions:
•	How can public health nurses prime communities for vaccine - preventable disease outbreaks ?
•	What are the barriers to vaccine acceptance, and how can public health messaging address vaccine hesitancy ?
•	What's the role of schools in disease prevention and how can they effectively cooperate with health departments?
This case study weaves together the challenges of managing a chickenpox outbreak, focusing on the educational role of public health nurses, and underscores the importance of vaccinations as a cornerstone of public health strategy.
'


        // Make an API call to the OpenAI chat completion endpoint
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-3.5-turbo", // Make sure to use the correct model name
            messages: [{
                role: "system", content: "You a patient and the user is a nurse. The nurse will ask you questions about the following case study: ${caseStudyHTML}" },
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
