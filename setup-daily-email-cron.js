// setup-daily-email-cron.js
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Path to the daily email sender script
const SCRIPT_PATH = path.join(__dirname, 'daily-email-sender.js');

// Default time to run the script (9:00 AM)
const DEFAULT_HOUR = 9;
const DEFAULT_MINUTE = 0;

// Default email template path (can be overridden via command line)
const DEFAULT_EMAIL_TEMPLATE_PATH = '/Users/katiepotter/0Code/Marketing/Emails/2-Ready-to-send/welcome_email_1_thanks.html';

/**
 * Set up a cron job to run the daily email sender
 * @param {number} hour - Hour to run (0-23)
 * @param {number} minute - Minute to run (0-59)
 * @param {string} emailTemplatePath - Path to the email template file
 */
function setupCronJob(hour = DEFAULT_HOUR, minute = DEFAULT_MINUTE, emailTemplatePath = DEFAULT_EMAIL_TEMPLATE_PATH) {
  // Ensure the script exists
  if (!fs.existsSync(SCRIPT_PATH)) {
    console.error(`❌ Script not found: ${SCRIPT_PATH}`);
    process.exit(1);
  }

  // Get the absolute path to node executable
  const nodePath = process.execPath;
  
  // Create the cron expression
  const cronExpression = `${minute} ${hour} * * *`;
  
  // Create the full command
  const command = emailTemplatePath 
    ? `${nodePath} ${SCRIPT_PATH} "${emailTemplatePath}"`
    : `${nodePath} ${SCRIPT_PATH}`;
  
  // Create a temporary file with the new cron job
  const tempFile = path.join(os.tmpdir(), 'temp-crontab');
  
  console.log('Setting up cron job with the following details:');
  console.log(`Time: ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} daily`);
  console.log(`Command: ${command}`);
  
  // Export existing crontab
  exec('crontab -l', (error, stdout, stderr) => {
    let crontabContent = '';
    
    // If there's an error, it might mean there's no crontab yet
    if (error && !stdout) {
      console.log('No existing crontab found. Creating a new one.');
    } else {
      crontabContent = stdout;
    }
    
    // Check if our job is already in the crontab
    const jobPattern = new RegExp(`.*${SCRIPT_PATH.replace(/\//g, '\\/').replace(/\./g, '\\.')}.*`);
    const lines = crontabContent.split('\n').filter(line => !jobPattern.test(line));
    
    // Add our new job
    lines.push(`${cronExpression} ${command} >> ${path.join(__dirname, 'email-logs', 'cron-output.log')} 2>&1`);
    
    // Add a comment to identify this job
    lines.push('# Propel Flow - Daily Email Sender');
    
    // Write to the temporary file
    fs.writeFileSync(tempFile, lines.join('\n') + '\n');
    
    // Install the new crontab
    exec(`crontab ${tempFile}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Failed to set up cron job: ${error.message}`);
        console.error(stderr);
        return;
      }
      
      console.log('✅ Cron job set up successfully!');
      console.log(`The script will run daily at ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
      
      // Clean up the temporary file
      fs.unlinkSync(tempFile);
    });
  });
}

/**
 * Remove the cron job
 */
function removeCronJob() {
  // Export existing crontab
  exec('crontab -l', (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Failed to get current crontab: ${error.message}`);
      return;
    }
    
    const crontabContent = stdout;
    
    // Check if our job is in the crontab
    const jobPattern = new RegExp(`.*${SCRIPT_PATH.replace(/\//g, '\\/').replace(/\./g, '\\.')}.*`);
    const commentPattern = /# Propel Flow - Daily Email Sender/;
    
    const lines = crontabContent.split('\n').filter(line => 
      !jobPattern.test(line) && !commentPattern.test(line)
    );
    
    // If no lines were removed, our job wasn't there
    if (lines.length === crontabContent.split('\n').length) {
      console.log('No matching cron job found to remove.');
      return;
    }
    
    // Write to a temporary file
    const tempFile = path.join(os.tmpdir(), 'temp-crontab');
    fs.writeFileSync(tempFile, lines.join('\n') + '\n');
    
    // Install the new crontab
    exec(`crontab ${tempFile}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Failed to update crontab: ${error.message}`);
        console.error(stderr);
        return;
      }
      
      console.log('✅ Cron job removed successfully!');
      
      // Clean up the temporary file
      fs.unlinkSync(tempFile);
    });
  });
}

/**
 * Show the current cron jobs
 */
function showCronJobs() {
  exec('crontab -l', (error, stdout, stderr) => {
    if (error) {
      console.log('No cron jobs are currently set up.');
      return;
    }
    
    console.log('Current cron jobs:');
    console.log(stdout || 'No cron jobs found.');
  });
}

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'setup':
    // Parse hour and minute if provided
    const hour = args[1] ? parseInt(args[1], 10) : DEFAULT_HOUR;
    const minute = args[2] ? parseInt(args[2], 10) : DEFAULT_MINUTE;
    // Get email template path if provided
    const emailTemplatePath = args[3] || DEFAULT_EMAIL_TEMPLATE_PATH;

    if (isNaN(hour) || hour < 0 || hour > 23) {
      console.error('❌ Invalid hour. Must be between 0 and 23.');
      process.exit(1);
    }

    if (isNaN(minute) || minute < 0 || minute > 59) {
      console.error('❌ Invalid minute. Must be between 0 and 59.');
      process.exit(1);
    }

    setupCronJob(hour, minute, emailTemplatePath);
    break;
    
  case 'remove':
    removeCronJob();
    break;
    
  case 'show':
    showCronJobs();
    break;
    
  default:
    console.log('Usage:');
    console.log('  node setup-daily-email-cron.js setup [hour] [minute] [email-template-path]  - Set up a cron job (default: 9:00 AM)');
    console.log('  node setup-daily-email-cron.js remove                                       - Remove the cron job');
    console.log('  node setup-daily-email-cron.js show                                         - Show current cron jobs');
    console.log('\nExample:');
    console.log('  node setup-daily-email-cron.js setup 9 0 "/path/to/email/template.html"     - Run daily at 9:00 AM with custom template');
    break;
}
