const fs = require('fs').promises;
const path = require('path');
const pandoc = require('node-pandoc');

// Define directory path
const casesDir = './public/cases/';


// Function to convert Markdown to a specified format using node-pandoc
function convertMarkdown(inputFilePath, outputFilePath, outputFormat) {
    return new Promise((resolve, reject) => {
        const args = `-o ${outputFilePath}`;
        pandoc(inputFilePath, args, function (err, result) {
            if (err) {
                console.error(`An error occurred converting ${path.basename(inputFilePath)} to ${outputFormat}:`, err);
                reject(err);
            } else {
                console.log(`Successfully converted ${path.basename(inputFilePath)} to ${outputFormat}: ${path.basename(outputFilePath)}`);
                resolve(result);
            }
        });
    });
}


const headerContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ChatGPT-assisted Nurse Educator</title>
    <!-- Bootstrap CSS -->
    <link href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css" rel="stylesheet">
    <link href="/css/style.css" rel="stylesheet">

</head>
<body>

    <!-- Navigation Bar -->
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
        <a class="navbar-brand" href="/">ChatGPT-assisted Nurse Educator</a>
        <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
            <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarNav">
            <ul class="navbar-nav">
                <li class="nav-item dropdown">
                    <a class="nav-link dropdown-toggle" href="#" id="caseSummaryDropdown" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                        Case Summary
                    </a>
                    <div class="dropdown-menu" aria-labelledby="caseSummaryDropdown">
                        <a class="dropdown-item" href="/cases/chickenpox.html" id="chickenpoxSummary">Chickenpox</a>
                        <a class="dropdown-item" href="/cases/giardia.html" id="giardiaSummary">Giardia</a>
                        <a class="dropdown-item" href="/cases/measles.html" id="measlesSummary">Measles</a>
                    </div>
                </li>
            </ul>
        </div>
    </nav>
     <div class="container mt-5">
`;

const footerContent = `
</div>
    <footer class="bg-dark text-light text-center p-3 mt-5">
        <p><a href="./" class="text-light">ChatGPT-assisted Nurse Educator</a>.</p>
    </footer>

    <!-- Bootstrap and jQuery Scripts -->
    <script src="https://code.jquery.com/jquery-3.5.1.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.14.7/umd/popper.min.js"></script>
    <script src="/js/marked.min.js"></script>
    <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/js/bootstrap.min.js"></script>>
</body>
</html>
`;


// Function to search for all markdown documents in the directory and convert them
async function convertAllMarkdownFiles(directory) {
    try {
        const files = await fs.readdir(directory);
        const markdownFiles = files.filter(file => path.extname(file).toLowerCase() === '.md');

        for (let file of markdownFiles) {
            const baseName = path.basename(file, '.md');
            const markdownFilePath = path.join(directory, file);
            const outputHtmlPath = path.join(directory, `${baseName}.html`);
            const outputPdfPath = path.join(directory, `${baseName}.pdf`);
            const outputDocxPath = path.join(directory, `${baseName}.docx`);

            // Convert each Markdown file to HTML, then append the links
            await convertMarkdown(markdownFilePath, outputHtmlPath, 'html');
            await appendLinksToHtml(outputHtmlPath, `${baseName}.pdf`, `${baseName}.docx`);
            // Convert each Markdown file to PDF
            await convertMarkdown(markdownFilePath, outputPdfPath, 'pdf');
            // Convert each Markdown file to DOCX
            await convertMarkdown(markdownFilePath, outputDocxPath, 'docx');
        }
    } catch (error) {
        console.error('An error occurred during the conversion process:', error);
    }
}

// Function to append additional HTML content with download links for PDF and DOCX
async function appendLinksToHtml(htmlFilePath, pdfLink, docxLink) {
    try {
        const htmlContent = await fs.readFile(htmlFilePath, 'utf8');
        const fullHtmlContent = `${headerContent}${htmlContent}${footerContent}`;
        const linkHtml =
            `<div>
    <a href="${pdfLink}" download>Download as PDF</a>
    <span> | </span>
    <a href="${docxLink}" download>Download as DOCX</a>
</div>`;

        // Regex pattern to find the first <h1> tag, now allowing for multiline match
        const updatedHtmlContent = fullHtmlContent.replace(/(<h1.*?>.*?<\/h1>)/s, `$1${linkHtml}`);

        if (fullHtmlContent === updatedHtmlContent) {
            console.warn(`No <h1> tag found or replacement was not performed in file: ${htmlFilePath}`);
        } else {
            await fs.writeFile(htmlFilePath, updatedHtmlContent, 'utf8');
            console.log(`Links appended to HTML file: ${htmlFilePath}`);
        }
    } catch (error) {
        console.error(`Error appending links to HTML file: ${htmlFilePath}:`, error);
    }
}

// Start the conversion for all Markdown files in the directory
convertAllMarkdownFiles(casesDir);