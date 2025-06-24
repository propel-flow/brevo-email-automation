// test-workflow.js
// A simple script to test the GitHub Actions workflow locally

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Set environment variables to simulate GitHub Actions
process.env.GITHUB_ACTIONS = 'true';
process.env.GITHUB_WORKSPACE = __dirname;

// Load environment variables from .env file if it exists
try {
  if (fs.existsSync(path.join(__dirname, '.env'))) {
    console.log('Loading environment variables from .env file...');
    require('dotenv').config();
  } else {
    console.log('No .env file found. Please create one based on .env.example');
    console.log('For testing purposes, you can use mock data without actual API calls.');
  }
} catch (error) {
  console.error('Error loading .env file:', error.message);
}

/**
 * Test the daily email sender workflow
 */
async function testDailyEmailSender() {
  console.log('\n=== Testing Daily Email Sender Workflow ===\n');
  
  try {
    // Create logs directory if it doesn't exist
    if (!fs.existsSync(path.join(__dirname, 'email-logs'))) {
      fs.mkdirSync(path.join(__dirname, 'email-logs'), { recursive: true });
    }
    
    // Create sent-emails directory if it doesn't exist
    if (!fs.existsSync(path.join(__dirname, 'sent-emails'))) {
      fs.mkdirSync(path.join(__dirname, 'sent-emails'), { recursive: true });
    }
    
    // Run the daily email sender script
    console.log('Running daily-email-sender.js...');
    execSync('node daily-email-sender.js', { stdio: 'inherit' });
    
    console.log('\n✅ Daily Email Sender workflow test completed successfully!');
  } catch (error) {
    console.error('\n❌ Daily Email Sender workflow test failed:', error.message);
  }
}

/**
 * Test the template uploader workflow
 */
async function testTemplateUploader() {
  console.log('\n=== Testing Template Uploader Workflow ===\n');
  
  try {
    // Create logs directory if it doesn't exist
    if (!fs.existsSync(path.join(__dirname, 'email-logs'))) {
      fs.mkdirSync(path.join(__dirname, 'email-logs'), { recursive: true });
    }
    
    // Run the template uploader script
    console.log('Running auto-upload-brevo-templates.js...');
    execSync('node auto-upload-brevo-templates.js', { stdio: 'inherit' });
    
    console.log('\n✅ Template Uploader workflow test completed successfully!');
  } catch (error) {
    console.error('\n❌ Template Uploader workflow test failed:', error.message);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const workflow = args[0];

if (workflow === 'email') {
  testDailyEmailSender();
} else if (workflow === 'template') {
  testTemplateUploader();
} else {
  console.log('Usage: node test-workflow.js [email|template]');
  console.log('  email    - Test the daily email sender workflow');
  console.log('  template - Test the template uploader workflow');
}
