const fs = require('fs').promises;
const path = require('path');
const pandoc = require('node-pandoc');

// Define directory paths
const casesDir = './caseGen/';
const outputDir = './public/cases/';

// Function to convert Markdown to a specified format using node-pandoc
function convertMarkdown(inputFilePath, outputFilePath, outputFormat) {
    return new Promise((resolve, reject) => {
        let args = `-f markdown -t ${outputFormat} -o ${outputFilePath}`;
        // If you have a specific reference doc you need for styling docx, enable it here:
        // args += ' --reference-doc=path/to/reference.docx';
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

// Function to add download links right above "## Background" in the Markdown content

async function addDownloadLinks(markdownFilePath, pdfPath, docxPath) {
    try {
        const markdownContent = await fs.readFile(markdownFilePath, 'utf8');
        const downloadLinksMarkdown = `- [Download as PDF](${pdfPath})\n- [Download as DOCX](${docxPath})\n\n`;
        // Create a new markdown file content with the download links in the second line.
        const markdownLines = markdownContent.split(/\r?\n/); // Split content into lines
        markdownLines.splice(1, 0, downloadLinksMarkdown); // Insert download links after the first line
        let newMarkdownContent = markdownLines.join('\n'); // Recombine the content into a single string

        // Return the updated content
        return newMarkdownContent;
    } catch (error) {
        console.error(`Error adding download links to Markdown file: ${markdownFilePath}:`, error);
        throw error;
    }
}

async function convertAllMarkdownFiles(directory, outputDirectory) {
    try {
        const files = await fs.readdir(directory);
        const markdownFiles = files.filter(file => path.extname(file).toLowerCase() === '.md');

        for (const file of markdownFiles) {
            const baseName = path.basename(file, '.md');
            const inputMarkdownFilePath = path.join(directory, file);
            const outputPdfPath = `${baseName}.pdf`;
            const outputDocxPath = `${baseName}.docx`;

            // Generate the updated Markdown content with download links
            const newMarkdownContent = await addDownloadLinks(inputMarkdownFilePath, outputPdfPath, outputDocxPath);

            // Generate a temporary file path to save the updated markdown
            const updatedMarkdownFilePath = path.join(outputDirectory, `${baseName}.md`);

            // Write the modified content with download links to a new Markdown file
            await fs.writeFile(updatedMarkdownFilePath, newMarkdownContent, 'utf8');

            // Convert the Markdown with download links to PDF and DOCX formats
            await convertMarkdown(updatedMarkdownFilePath, path.join(outputDirectory, outputPdfPath), 'pdf');
            await convertMarkdown(updatedMarkdownFilePath, path.join(outputDirectory, outputDocxPath), 'docx');

            // Optional: delete the temporary Markdown file after conversion,
            // uncomment the following line if you wish to remove the file:
            // await fs.unlink(updatedMarkdownFilePath);
        }
    } catch (error) {
        console.error('An error occurred during the conversion process:', error);
    }
}

// Use the cases directory for the original files and the output directory for the modified versions
convertAllMarkdownFiles(casesDir, outputDir);