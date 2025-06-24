/// auto-upload-brevo-templates.js
const path = require('path');
const fs = require('fs');
const { uploadTemplates } = require('./brevo_template_uploader.js');
const nodemailer = require('nodemailer');

// Create logs directory if it doesn't exist
const LOGS_DIR = path.join(__dirname, 'email-logs');
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// Log file path with timestamp
const LOG_FILE = path.join(LOGS_DIR, `template-upload-log-${new Date().toISOString().split('T')[0]}.log`);

/**
 * Log message to console and file
 * @param {string} message - Message to log
 */
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  
  console.log(logMessage);
  
  // Append to log file
  fs.appendFileSync(LOG_FILE, logMessage + '\n');
}

/**
 * Send notification email about job completion
 * @param {Object} results - Upload results
 * @returns {Promise<void>}
 */
async function sendNotificationEmail(results) {
  // Check if notification is enabled via environment variable
  const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL;
  if (!NOTIFICATION_EMAIL) {
    log('Notification email not configured. Set NOTIFICATION_EMAIL environment variable to enable.');
    return;
  }

  try {
    // Create a test account if no SMTP settings are provided
    const account = await nodemailer.createTestAccount();

    // Create a transporter object
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.ethereal.email',
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || account.user,
        pass: process.env.SMTP_PASS || account.pass,
      },
    });

    // Count successful and failed uploads
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    // Create email content
    let emailContent = `
      <h2>Brevo Template Upload Report</h2>
      <p>The template upload process has completed.</p>
      <p><strong>Summary:</strong></p>
      <ul>
        <li>Total templates: ${results.length}</li>
        <li>Successfully uploaded: ${successful}</li>
        <li>Failed: ${failed}</li>
      </ul>
    `;

    if (successful > 0) {
      emailContent += `
        <h3>Successfully uploaded templates:</h3>
        <ul>
          ${results.filter(r => r.success).map(r => `<li>${r.templateName} (ID: ${r.templateId})</li>`).join('')}
        </ul>
      `;
    }

    if (failed > 0) {
      emailContent += `
        <h3>Failed templates:</h3>
        <ul>
          ${results.filter(r => !r.success).map(r => `<li>${r.templateName}: ${r.error}</li>`).join('')}
        </ul>
      `;
    }

    // Send the email
    const info = await transporter.sendMail({
      from: '"Propel Flow Automation" <katie@propel-flow.com>',
      to: NOTIFICATION_EMAIL,
      subject: `Brevo Template Upload Report - ${successful}/${results.length} successful`,
      html: emailContent,
    });

    log(`Notification email sent: ${info.messageId}`);
    
    // If using Ethereal, log the URL to view the email
    if (!process.env.SMTP_HOST) {
      log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
  } catch (error) {
    log(`Failed to send notification email: ${error.message}`);
  }
}

/**
 * Display notification (GitHub Actions compatible)
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 */
function showNotification(title, message) {
  // In GitHub Actions, just log the notification
  if (process.env.GITHUB_ACTIONS) {
    log(`NOTIFICATION: ${title} - ${message}`);
    return;
  }
  
  // On macOS, show desktop notification
  if (process.platform === 'darwin') {
    const { exec } = require('child_process');
    const escapedMessage = message.replace(/"/g, '\\"');
    const command = `osascript -e 'display notification "${escapedMessage}" with title "${title}"'`;

    exec(command, (error) => {
      if (error) {
        log(`Failed to show notification: ${error.message}`);
      } else {
        log('Desktop notification displayed');
      }
    });
  } else {
    // For other platforms, just log
    log(`NOTIFICATION: ${title} - ${message}`);
  }
}

/**
 * Extract template information from HTML file name
 * @param {string} fileName - HTML file name
 * @returns {Object} Template information
 */
function extractTemplateInfo(fileName) {
  // Remove .html extension
  const baseName = fileName.replace('.html', '');
  
  // Convert underscores and hyphens to spaces and capitalize words
  const templateName = baseName
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
  
  // Create a subject line based on the template name
  const subject = `${templateName} - Propel Flow AI`;
  
  // Extract tag from the first part of the file name (before first underscore or hyphen)
  // or use 'general' if no separator is found
  let tag = 'general';
  const separatorMatch = baseName.match(/[_-]/);
  if (separatorMatch) {
    tag = baseName.substring(0, separatorMatch.index).toLowerCase();
  }
  
  return {
    templateName,
    subject,
    tag
  };
}

/**
 * Find HTML files in the email-templates directory (excluding the sent folder)
 * @returns {Array<string>} Array of HTML file paths
 */
function findHtmlFiles() {
  const templatesDir = path.join(__dirname, 'email-templates');
  const sentDir = path.join(templatesDir, 'sent');
  
  // Create sent directory if it doesn't exist
  if (!fs.existsSync(sentDir)) {
    fs.mkdirSync(sentDir, { recursive: true });
  }
  
  // Get all files in the templates directory
  const files = fs.readdirSync(templatesDir);
  
  // Filter for HTML files and exclude directories
  return files.filter(file => {
    const filePath = path.join(templatesDir, file);
    return fs.statSync(filePath).isFile() && 
           path.extname(file).toLowerCase() === '.html';
  }).map(file => path.join(templatesDir, file));
}

/**
 * Move a file to the sent folder
 * @param {string} filePath - Path to the file
 */
function moveToSentFolder(filePath) {
  const fileName = path.basename(filePath);
  const sentDir = path.join(__dirname, 'email-templates', 'sent');
  const destPath = path.join(sentDir, fileName);
  
  // Add timestamp to avoid overwriting files with the same name
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const destPathWithTimestamp = path.join(
    sentDir, 
    `${path.parse(fileName).name}_${timestamp}${path.extname(fileName)}`
  );
  
  try {
    fs.copyFileSync(filePath, destPathWithTimestamp);
    fs.unlinkSync(filePath);
    log(`Moved ${fileName} to sent folder as ${path.basename(destPathWithTimestamp)}`);
  } catch (error) {
    log(`Error moving file to sent folder: ${error.message}`);
  }
}

/**
 * Main function to upload templates
 */
async function main() {
  log('Starting Brevo template upload process...');
  
  // Find HTML files to upload
  const htmlFiles = findHtmlFiles();
  
  if (htmlFiles.length === 0) {
    log('No HTML files found in the email-templates directory');
    return;
  }
  
  log(`Found ${htmlFiles.length} HTML files to upload`);
  
  // Configure the templates to upload
  const templateConfigs = htmlFiles.map(htmlFile => {
    const fileName = path.basename(htmlFile);
    const templateInfo = extractTemplateInfo(fileName);
    
    return {
      templateName: templateInfo.templateName,
      subject: templateInfo.subject,
      htmlFile: htmlFile,
      senderName: "Propel Flow",
      senderEmail: "katie@propel-flow.com",
      tag: templateInfo.tag
    };
  });
  
  try {
    // Upload templates
    log(`Uploading ${templateConfigs.length} templates to Brevo...`);
    const results = await uploadTemplates(templateConfigs);
    
    // Log results
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    log('\n' + '='.repeat(50));
    log('UPLOAD SUMMARY');
    log('='.repeat(50));
    log(`Total templates: ${results.length}`);
    log(`Successful: ${successful}`);
    log(`Failed: ${failed}`);
    
    if (successful > 0) {
      log('\nSuccessfully created templates:');
      results.filter(r => r.success).forEach(r => {
        log(`- ${r.templateName} (ID: ${r.templateId})`);
      });
    }
    
    if (failed > 0) {
      log('\nFailed templates:');
      results.filter(r => !r.success).forEach(r => {
        log(`- ${r.templateName}: ${r.error}`);
      });
    }
    
    // Save results to file for reference
    const resultsFile = path.join(LOGS_DIR, `template-upload-results-${new Date().toISOString().split('T')[0]}.json`);
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
    log(`\nResults saved to: ${resultsFile}`);
    
    // Move successfully uploaded files to the sent folder
    results.filter(r => r.success).forEach(r => {
      moveToSentFolder(r.config.htmlFile);
    });
    
    // Send notification email
    await sendNotificationEmail(results);
    
    // Show notification
    const notificationTitle = 'Brevo Template Upload Complete';
    const notificationMessage = `${successful}/${results.length} templates uploaded successfully`;
    showNotification(notificationTitle, notificationMessage);
    
    log('Template upload process completed successfully');
  } catch (error) {
    log(`ERROR: ${error.message}`);
    if (error.stack) {
      log(`Stack trace: ${error.stack}`);
    }
    
    // Show error notification
    showNotification('Brevo Template Upload Failed', error.message);
    
    process.exit(1);
  }
}

// Run the main function
main();
