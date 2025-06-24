// brevo-template-uploader.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Get API key from environment variable or use a default for local development
const API_KEY = process.env.BREVO_API_KEY || 'your-brevo-api-key-here';
const BASE_URL = 'https://api.brevo.com/v3';

/**
 * Read HTML file content
 * @param {string} filePath - Path to the HTML file
 * @returns {Promise<string>} HTML content
 */
async function readHtmlFile(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(data);
    });
  });
}

/**
 * Create an email template in Brevo
 * @param {Object} templateData - Template configuration
 * @returns {Promise<Object>} API response
 */
async function createEmailTemplate(templateData) {
  try {
    const response = await axios.post(`${BASE_URL}/smtp/templates`, templateData, {
      headers: {
        'api-key': API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    console.log(`✅ Template "${templateData.templateName}" created successfully!`);
    console.log(`Template ID: ${response.data.id}`);
    return response.data;
    
  } catch (error) {
    console.error(`❌ Failed to create template "${templateData.templateName}":`, error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

/**
 * Upload multiple HTML templates to Brevo
 * @param {Array} templateConfigs - Array of template configurations
 * @returns {Promise<Array>} Array of created template responses
 */
async function uploadTemplates(templateConfigs) {
  const results = [];
  
  for (const config of templateConfigs) {
    try {
      console.log(`\nProcessing: ${config.templateName}`);
      
      // Read HTML content
      const htmlContent = await readHtmlFile(config.htmlFile);
      
      // Prepare template data
      const templateData = {
        templateName: config.templateName,
        subject: config.subject,
        sender: {
          name: config.senderName || "Propel Flow",
          email: config.senderEmail || "hello@propel-flow.com"
        },
        htmlContent: htmlContent,
        isActive: true,
        // Add tags for organization
        tag: config.tag || "automation-workflow"
      };
      
      // Create template
      const result = await createEmailTemplate(templateData);
      results.push({
        success: true,
        templateName: config.templateName,
        templateId: result.id,
        config: config
      });
      
      // Small delay between uploads
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      results.push({
        success: false,
        templateName: config.templateName,
        error: error.message,
        config: config
      });
    }
  }
  
  return results;
}

/**
 * Example template configurations
 * Modify these to match your HTML files and requirements
 */
const templateConfigs = [
  {
    templateName: "Welcome Email 1 - Thanks",
    subject: "Welcome to Propel Flow AI - Thanks for Subscribing!",
    htmlFile: "/Users/katiepotter/0Code/Marketing/Emails/Emails-to-Review-NEED-BULK-UPDATE-FOOTER-RerunTags/welcome_email_1_thanks.html",
    senderName: "Propel Flow",
    senderEmail: "hello@propel-flow.com",
    tag: "welcome-series"
  },
  {
    templateName: "Welcome Email 2 - Getting Started",
    subject: "Getting Started with Propel Flow AI",
    htmlFile: "/path/to/your/welcome_email_2.html", // Update this path
    senderName: "Propel Flow",
    senderEmail: "hello@propel-flow.com",
    tag: "welcome-series"
  },
  {
    templateName: "Welcome Email 3 - Tips & Tricks",
    subject: "Pro Tips for Using Propel Flow AI",
    htmlFile: "/path/to/your/welcome_email_3.html", // Update this path
    senderName: "Propel Flow",
    senderEmail: "hello@propel-flow.com",
    tag: "welcome-series"
  },
  {
    templateName: "Welcome Email 4 - Community",
    subject: "Join the Propel Flow AI Community",
    htmlFile: "/path/to/your/welcome_email_4.html", // Update this path
    senderName: "Propel Flow",
    senderEmail: "hello@propel-flow.com",
    tag: "welcome-series"
  }
];

/**
 * Main function to upload all templates
 */
async function main() {
  console.log('Starting template upload process...');
  console.log(`Uploading ${templateConfigs.length} templates to Brevo...`);
  
  try {
    const results = await uploadTemplates(templateConfigs);
    
    // Summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log('\n' + '='.repeat(50));
    console.log('UPLOAD SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total templates: ${results.length}`);
    console.log(`Successful: ${successful}`);
    console.log(`Failed: ${failed}`);
    
    if (successful > 0) {
      console.log('\n✅ Successfully created templates:');
      results.filter(r => r.success).forEach(r => {
        console.log(`- ${r.templateName} (ID: ${r.templateId})`);
      });
    }
    
    if (failed > 0) {
      console.log('\n❌ Failed templates:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`- ${r.templateName}: ${r.error}`);
      });
    }
    
    // Save results to file for reference
    const resultsFile = path.join(__dirname, 'template-upload-results.json');
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
    console.log(`\n📁 Results saved to: ${resultsFile}`);
    
  } catch (error) {
    console.error('❌ Upload process failed:', error.message);
  }
}

// Execute if run directly
if (require.main === module) {
  main()
    .then(() => console.log('\nTemplate upload process completed'))
    .catch(err => {
      console.error('Process failed:', err);
      process.exit(1);
    });
}

module.exports = {
  uploadTemplates,
  createEmailTemplate,
  readHtmlFile
};
