// send-welcome-email.js
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// API configuration - use environment variables for GitHub Actions
const API_KEY = process.env.BREVO_API_KEY || 'your-brevo-api-key-here';
const BASE_URL = 'https://api.brevo.com/v3';

// Path to the HTML template
// Default path can be overridden by command line argument
const DEFAULT_TEMPLATE_PATH = path.join(__dirname, 'email-templates', 'welcome_email_1_thanks.html');
const EMAIL_TEMPLATE_PATH = process.argv[2] || DEFAULT_TEMPLATE_PATH;

/**
 * Read the HTML template file
 * @returns {Promise<string>} The HTML content
 */
async function readEmailTemplate() {
  return new Promise((resolve, reject) => {
    fs.readFile(EMAIL_TEMPLATE_PATH, 'utf8', (err, data) => {
      if (err) {
        console.error('❌ Error reading email template:', err);
        reject(err);
        return;
      }
      resolve(data);
    });
  });
}

/**
 * Send the welcome email to a subscriber using direct HTTP API
 * @param {string} subscriberEmail - The subscriber's email address
 * @param {string} subscriberName - The subscriber's name
 * @param {Object} attributes - The subscriber's attributes for personalization
 * @returns {Promise<object>} The result from Brevo API
 */
async function sendWelcomeEmail(subscriberEmail, subscriberName, attributes = {}) {
  try {
    // Read the HTML template
    const htmlContent = await readEmailTemplate();
    
    // Create the email payload
    const emailPayload = {
      sender: {
        name: "Propel Flow",
        email: "katie@propel-flow.com"
      },
      to: [{
        email: subscriberEmail,
        name: subscriberName
      }],
      subject: "Welcome to Propel Flow AI - Thanks for Subscribing!",
      htmlContent: htmlContent,
      params: {
        unsubscribe: "{{ unsubscribe }}",
        update_profile: "{{ update_profile }}",
        // Add all subscriber attributes for personalization
        ...attributes
      }
    };

    // Send the email using Brevo's API
    const response = await axios.post(`${BASE_URL}/smtp/email`, emailPayload, {
      headers: {
        'api-key': API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    console.log('✅ Email sent successfully!');
    console.log('Message ID:', response.data.messageId);
    console.log('Recipient:', subscriberEmail);
    return response.data;
  } catch (error) {
    console.error('❌ Email failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

/**
 * Send the welcome email to a list of subscribers
 * @param {Array<{email: string, name: string, attributes: Object}>} subscribers - List of subscribers
 * @returns {Promise<Array>} Results from sending emails
 */
async function sendToSubscribers(subscribers) {
  console.log(`Starting to send emails to ${subscribers.length} subscribers...`);
  
  const results = [];
  for (const subscriber of subscribers) {
    try {
      console.log(`Sending to ${subscriber.email}...`);
      const result = await sendWelcomeEmail(subscriber.email, subscriber.name, subscriber.attributes || {});
      results.push({ success: true, email: subscriber.email, result });
      
      // Add a small delay between sends to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      results.push({ success: false, email: subscriber.email, error: error.message });
    }
  }
  
  // Log summary
  const successful = results.filter(r => r.success).length;
  console.log(`\nEmail sending complete: ${successful}/${subscribers.length} successful`);
  
  if (successful < subscribers.length) {
    console.log('Failed emails:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`- ${r.email}: ${r.error}`);
    });
  }
  
  return results;
}

/**
 * Load subscribers from the JSON file
 * @param {string} filePath - Path to the subscribers JSON file
 * @returns {Promise<Array>} List of subscribers
 */
async function loadSubscribersFromFile(filePath = path.join(__dirname, 'subscribers.json')) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        console.error('❌ Error loading subscribers from file:', err);
        reject(err);
        return;
      }
      try {
        const subscribers = JSON.parse(data);
        console.log(`✅ Loaded ${subscribers.length} subscribers from ${filePath}`);
        resolve(subscribers);
      } catch (parseErr) {
        console.error('❌ Error parsing subscribers JSON:', parseErr);
        reject(parseErr);
      }
    });
  });
}

// Execute if run directly
if (require.main === module) {
  // Try to load subscribers from file, or use example subscriber if file doesn't exist
  loadSubscribersFromFile()
    .catch(err => {
      console.log('Using example subscriber instead');
      return [{ email: "test@example.com", name: "Test User" }];
    })
    .then(subscribers => sendToSubscribers(subscribers))
    .then(() => console.log('Process completed'))
    .catch(err => console.error('Process failed:', err));
}

// Export functions for use in other files
module.exports = {
  sendWelcomeEmail,
  sendToSubscribers,
  loadSubscribersFromFile
};
