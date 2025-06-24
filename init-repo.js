// init-repo.js
// A script to initialize the repository with necessary directories and files

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Directories to create
const directories = [
  'email-templates',
  'email-logs',
  'sent-emails'
];

// Create directories if they don't exist
console.log('Creating necessary directories...');
directories.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  } else {
    console.log(`ℹ️ Directory already exists: ${dir}`);
  }
});

// Generate template list
console.log('\nGenerating template list...');
try {
  execSync('node generate-template-list.js', { stdio: 'inherit' });
  console.log('✅ Template list generated');
} catch (error) {
  console.error('❌ Failed to generate template list:', error.message);
}

// Create .env file if it doesn't exist
const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, '.env.example');

if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
  console.log('\nCreating .env file from .env.example...');
  fs.copyFileSync(envExamplePath, envPath);
  console.log('✅ Created .env file');
  console.log('⚠️ Please update the .env file with your actual API keys and settings');
}

// Install dependencies
console.log('\nInstalling dependencies...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Dependencies installed');
} catch (error) {
  console.error('❌ Failed to install dependencies:', error.message);
  console.log('Please run "npm install" manually');
}

console.log('\n🎉 Repository initialized successfully!');
console.log('\nNext steps:');
console.log('1. Update your .env file with your Brevo API key');
console.log('2. Add your HTML email templates to the email-templates directory');
console.log('3. Run "npm run view-templates" to preview your templates');
console.log('4. Test the workflows locally with "npm run test:email" or "npm run test:template"');
console.log('5. Push to GitHub and set up the GitHub Actions workflows');
