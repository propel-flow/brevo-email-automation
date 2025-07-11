/// daily-email-sender.js
const fs = require('fs');
const path = require('path');
const { getSubscribers, saveSubscribersToFile } = require('./get-brevo-subscribers');
const { sendToSubscribers } = require('./send-welcome-email');

// Define the sent folder path - use relative path for GitHub Actions compatibility
const SENT_FOLDER = process.env.GITHUB_ACTIONS 
  ? path.join(process.env.GITHUB_WORKSPACE, 'email-templates', 'sent')
  : path.join(__dirname, 'email-templates', 'sent');

// Create logs directory if it doesn't exist
const LOGS_DIR = path.join(__dirname, 'email-logs');
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// Log file path with timestamp
const LOG_FILE = path.join(LOGS_DIR, `email-log-${new Date().toISOString().split('T')[0]}.log`);

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
 * Move the email template to the sent folder
 * @param {string} templatePath - Path to the email template
 * @returns {Promise<string>} The new path of the moved file
 */
async function moveToSentFolder(templatePath) {
  return new Promise((resolve, reject) => {
    // Create the sent folder if it doesn't exist
    if (!fs.existsSync(SENT_FOLDER)) {
      fs.mkdirSync(SENT_FOLDER, { recursive: true });
      log(`Created sent folder: ${SENT_FOLDER}`);
    }
    
    // Get the filename from the path
    const fileName = path.basename(templatePath);
    
    // Add a timestamp to the filename to avoid overwriting
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const newFileName = `${path.parse(fileName).name}_sent_${timestamp}${path.parse(fileName).ext}`;
    const newPath = path.join(SENT_FOLDER, newFileName);
    
    // Copy the file to the sent folder
    fs.copyFile(templatePath, newPath, (err) => {
      if (err) {
        log(`Error copying file to sent folder: ${err.message}`);
        reject(err);
        return;
      }
      
      // Delete the original file
      fs.unlink(templatePath, (err) => {
        if (err) {
          log(`Warning: Could not delete original file: ${err.message}`);
          // Don't reject here, we still want to consider the move successful
        }
        
        log(`Moved email template to: ${newPath}`);
        resolve(newPath);
      });
    });
  });
}

// Function to find the newest HTML file in a directory
function findNewestHtmlFile(directory) {
  try {
    // Check if directory exists
    if (!fs.existsSync(directory)) {
      log(`Directory not found: ${directory}`);
      return null;
    }
    
    // Get all files in the directory
    const files = fs.readdirSync(directory);
    
    // Filter for HTML files and exclude directories
    const htmlFiles = files.filter(file => {
      const filePath = path.join(directory, file);
      return fs.statSync(filePath).isFile() && 
             path.extname(file).toLowerCase() === '.html';
    });
    
    if (htmlFiles.length === 0) {
      log(`No HTML files found in directory: ${directory}`);
      return null;
    }
    
    // Get file stats and sort by modification time (newest first)
    const fileStats = htmlFiles.map(file => {
      const filePath = path.join(directory, file);
      return {
        path: filePath,
        stats: fs.statSync(filePath)
      };
    }).sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());
    
    // Return the path of the newest file
    log(`Found newest HTML file: ${fileStats[0].path}`);
    return fileStats[0].path;
  } catch (error) {
    log(`Error finding newest HTML file: ${error.message}`);
    return null;
  }
}

/**
 * Main function to fetch subscribers and send emails
 */
async function main() {
  try {
    log('Starting daily email process...');
    
    // Parse command line arguments
    // Format: node daily-email-sender.js [email-template-path]
    let emailTemplatePath = process.argv[2];

    // If no template path is provided, try to find the newest HTML file in the email-templates directory
    if (!emailTemplatePath) {
      const readyToSendDir = path.join(__dirname, 'email-templates', 'ready-to-send');
      const emailTemplatesDir = path.join(__dirname, 'email-templates');
      
      // First check the ready-to-send directory if it exists
      if (fs.existsSync(readyToSendDir)) {
        emailTemplatePath = findNewestHtmlFile(readyToSendDir);
      }
      
      // If no file found in ready-to-send, check the main email-templates directory
      if (!emailTemplatePath) {
        emailTemplatePath = findNewestHtmlFile(emailTemplatesDir);
      }
      
      if (emailTemplatePath) {
        log(`Automatically selected template: ${emailTemplatePath}`);
      } else {
        log('No HTML template files found. Please provide a template path.');
        process.exit(1);
      }
    }
    
    // Fetch latest subscribers from Brevo API
    log('Fetching subscribers...');
    const subscribers = await getSubscribers();
    log(`Found ${subscribers.length} subscribers`);
    
    // Save subscribers to file for reference
    await saveSubscribersToFile(subscribers);
    
    // Send emails to all subscribers
    log('Sending welcome emails to subscribers...');
    // If email template path is provided, pass it directly to the sendToSubscribers function
    if (emailTemplatePath) {
      log(`Using custom email template: ${emailTemplatePath}`);
    }
    const results = await sendToSubscribers(subscribers, emailTemplatePath);
    
    // Log results
    const successful = results.filter(r => r.success).length;
    log(`Email sending complete: ${successful}/${subscribers.length} successful`);
    
    if (successful < subscribers.length) {
      log('Failed emails:');
      results.filter(r => !r.success).forEach(r => {
        log(`- ${r.email}: ${r.error}`);
      });
    }
    
    // Move the email template to the sent folder
    if (emailTemplatePath || process.argv[2]) {
      const templatePath = emailTemplatePath || process.argv[2];
      try {
        await moveToSentFolder(templatePath);
        log(`Email template moved to sent folder`);
      } catch (error) {
        log(`Warning: Could not move email template to sent folder: ${error.message}`);
      }
    }
    
    log('Daily email process completed successfully');
  } catch (error) {
    log(`ERROR: ${error.message}`);
    if (error.stack) {
      log(`Stack trace: ${error.stack}`);
    }
    process.exit(1);
  }
}

// Run the main function
main();
