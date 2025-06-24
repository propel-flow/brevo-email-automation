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
 * Main function to upload templates
 */
async function main() {
  log('Starting Brevo template upload process...');
  
  // Configure the templates to upload - using relative paths for GitHub Actions compatibility
  const templateConfigs = [
    {
      templateName: "Welcome Email 1 - Thanks",
      subject: "Welcome to Propel Flow AI - Thanks for Subscribing!",
      htmlFile: path.join(__dirname, "email-templates", "welcome_email_1_thanks.html"),
      senderName: "Propel Flow",
      senderEmail: "katie@propel-flow.com",
      tag: "welcome-series"
    },
    {
      templateName: "Welcome Email 2 - Assessment",
      subject: "Your Propel Flow AI Assessment",
      htmlFile: path.join(__dirname, "email-templates", "welcome_email_2_assessment.html"),
      senderName: "Propel Flow",
      senderEmail: "katie@propel-flow.com",
      tag: "welcome-series"
    },
    {
      templateName: "Welcome Email 3 - Vendor Traps",
      subject: "Avoiding Common AI Vendor Traps",
      htmlFile: path.join(__dirname, "email-templates", "welcome_email_3_vendor_traps.html"),
      senderName: "Propel Flow",
      senderEmail: "katie@propel-flow.com",
      tag: "welcome-series"
    }
  ];
  
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
