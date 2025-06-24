// generate-template-list.js
// A Node.js script to generate a JSON list of email templates

const fs = require('fs');
const path = require('path');

// Path to the email templates directory
const templatesDir = path.join(__dirname, 'email-templates');

// Function to generate the template list
function generateTemplateList() {
  try {
    // Check if the directory exists
    if (!fs.existsSync(templatesDir)) {
      console.error(`Directory not found: ${templatesDir}`);
      return [];
    }

    // Get all files in the directory
    const files = fs.readdirSync(templatesDir);

    // Filter for HTML files only
    const templates = files.filter(file => {
      return path.extname(file).toLowerCase() === '.html';
    });

    return templates;
  } catch (error) {
    console.error('Error generating template list:', error.message);
    return [];
  }
}

// Generate the template list
const templates = generateTemplateList();

// Save the list to a JSON file
fs.writeFileSync(
  path.join(__dirname, 'email-templates-list.json'),
  JSON.stringify(templates, null, 2)
);

console.log(`Generated template list with ${templates.length} templates`);
console.log('Saved to email-templates-list.json');

// If run from command line, print the templates
if (require.main === module) {
  console.log('\nAvailable templates:');
  templates.forEach((template, index) => {
    console.log(`${index + 1}. ${template}`);
  });
}

module.exports = { generateTemplateList };
