// setup-template-upload-cron.js
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Get the absolute path to the auto-upload-brevo-templates.js script
const scriptPath = path.resolve(__dirname, 'auto-upload-brevo-templates.js');

// Get the absolute path to the node executable
const nodePath = process.execPath;

// Create logs directory if it doesn't exist
const LOGS_DIR = path.join(__dirname, 'email-logs');
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// Log file for cron output
const logFile = path.join(LOGS_DIR, 'template-upload-cron-output.log');

/**
 * Set up a cron job to run the auto-upload-brevo-templates.js script
 * @param {number} hour - Hour to run the job (0-23)
 * @param {number} minute - Minute to run the job (0-59)
 */
function setupCronJob(hour, minute) {
  // Format the time for cron
  const cronTime = `${minute} ${hour} * * *`;
  
  // Create the cron command
  const cronCommand = `${nodePath} ${scriptPath} >> ${logFile} 2>&1`;
  
  try {
    // Get existing crontab
    const existingCrontab = execSync('crontab -l').toString().trim();
    
    // Check if the job already exists
    const jobRegex = new RegExp(`.*${scriptPath.replace(/\//g, '\\/').replace(/\./g, '\\.')}.*`);
    const jobExists = existingCrontab.split('\n').some(line => jobRegex.test(line));
    
    let newCrontab;
    if (jobExists) {
      // Replace the existing job
      newCrontab = existingCrontab.split('\n').map(line => {
        if (jobRegex.test(line)) {
          return `${cronTime} ${cronCommand} # Propel Flow - Template Uploader`;
        }
        return line;
      }).join('\n');
    } else {
      // Add the new job
      newCrontab = existingCrontab + (existingCrontab ? '\n' : '') + 
        `${cronTime} ${cronCommand} # Propel Flow - Template Uploader`;
    }
    
    // Write the new crontab
    fs.writeFileSync('/tmp/new-crontab', newCrontab);
    execSync('crontab /tmp/new-crontab');
    fs.unlinkSync('/tmp/new-crontab');
    
    console.log('Setting up cron job with the following details:');
    console.log(`Time: ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} daily`);
    console.log(`Command: ${cronCommand}`);
    console.log('✅ Cron job set up successfully!');
    console.log(`The script will run daily at ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
  } catch (error) {
    console.error('❌ Error setting up cron job:', error.message);
    process.exit(1);
  }
}

/**
 * Remove the cron job
 */
function removeCronJob() {
  try {
    // Get existing crontab
    const existingCrontab = execSync('crontab -l').toString().trim();
    
    // Check if the job exists
    const jobRegex = new RegExp(`.*${scriptPath.replace(/\//g, '\\/').replace(/\./g, '\\.')}.*`);
    const jobExists = existingCrontab.split('\n').some(line => jobRegex.test(line));
    
    if (jobExists) {
      // Remove the job
      const newCrontab = existingCrontab.split('\n').filter(line => !jobRegex.test(line)).join('\n');
      
      // Write the new crontab
      fs.writeFileSync('/tmp/new-crontab', newCrontab);
      execSync('crontab /tmp/new-crontab');
      fs.unlinkSync('/tmp/new-crontab');
      
      console.log('✅ Cron job removed successfully!');
    } else {
      console.log('⚠️ No matching cron job found.');
    }
  } catch (error) {
    console.error('❌ Error removing cron job:', error.message);
    process.exit(1);
  }
}

/**
 * Display usage information
 */
function showUsage() {
  console.log(`
Usage: node ${path.basename(__filename)} <command> [options]

Commands:
  setup <hour> <minute>  Set up a cron job to run the template uploader
  remove                 Remove the cron job

Examples:
  node ${path.basename(__filename)} setup 8 0     # Run daily at 8:00 AM
  node ${path.basename(__filename)} remove        # Remove the cron job
  `);
}

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];

if (command === 'setup') {
  const hour = parseInt(args[1], 10);
  const minute = parseInt(args[2], 10);
  
  if (isNaN(hour) || hour < 0 || hour > 23 || isNaN(minute) || minute < 0 || minute > 59) {
    console.error('❌ Invalid time. Hour must be 0-23, minute must be 0-59.');
    showUsage();
    process.exit(1);
  }
  
  setupCronJob(hour, minute);
} else if (command === 'remove') {
  removeCronJob();
} else {
  showUsage();
  process.exit(1);
}
