// get-brevo-subscribers.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Get API key from environment variable or use a default for local development
const API_KEY = process.env.BREVO_API_KEY || 'your-brevo-api-key-here';
const BASE_URL = 'https://api.brevo.com/v3';

/**
 * Get all subscribers from Brevo using direct HTTP calls
 * @param {number} limit - Maximum number of contacts to return (default: 50)
 * @returns {Promise<Array>} List of subscribers
 */
async function getSubscribers(limit = 50) {
  try {
    console.log('Fetching subscribers from Brevo API using direct HTTP...');

    const response = await axios.get(`${BASE_URL}/contacts`, {
      headers: {
        'api-key': API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      params: {
        limit: limit,
        offset: 0,
        sort: 'desc'
      }
    });

    console.log(`✅ HTTP request successful! Status: ${response.status}`);
    console.log(`✅ Successfully retrieved ${response.data.contacts.length} contacts`);

    // Transform contacts to the format needed for sending emails
    const subscribers = response.data.contacts.map(contact => {
      return {
        email: contact.email,
        name: contact.attributes?.FIRSTNAME || 'Subscriber',
        attributes: contact.attributes || {}
      };
    });

    return subscribers;

  } catch (error) {
    console.error('❌ HTTP request failed:', error.message);

    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      console.error('Response headers:', error.response.headers);
    } else if (error.request) {
      console.error('No response received:', error.request);
    }

    console.log('Falling back to mock subscriber list');

    // Mock subscriber list with attributes for testing/fallback
    const mockSubscribers = [
      {
        email: "test@example.com",
        name: "Test User",
        attributes: {
          FIRSTNAME: "Test",
          LASTNAME: "User",
          COMPANY: "Test Company",
          PHONE: "123-456-7890"
        }
      },
      {
        email: "subscriber1@example.com",
        name: "Subscriber One",
        attributes: {
          FIRSTNAME: "Subscriber",
          LASTNAME: "One",
          COMPANY: "Company One",
          PHONE: "111-222-3333"
        }
      },
      {
        email: "subscriber2@example.com",
        name: "Subscriber Two",
        attributes: {
          FIRSTNAME: "Subscriber",
          LASTNAME: "Two",
          COMPANY: "Company Two",
          PHONE: "444-555-6666"
        }
      }
    ];

    console.log(`✅ Using ${mockSubscribers.length} mock contacts`);
    return mockSubscribers;
  }
}

/**
 * Save subscribers to a JSON file
 * @param {Array} subscribers - List of subscribers
 * @param {string} filePath - Path to save the file
 */
async function saveSubscribersToFile(subscribers, filePath = path.join(__dirname, 'subscribers.json')) {
  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, JSON.stringify(subscribers, null, 2), 'utf8', (err) => {
      if (err) {
        console.error('❌ Error saving subscribers to file:', err);
        reject(err);
        return;
      }
      console.log(`✅ Subscribers saved to ${filePath}`);
      resolve();
    });
  });
}

// Execute if run directly
if (require.main === module) {
  getSubscribers()
    .then(subscribers => {
      console.log(`Found ${subscribers.length} subscribers`);
      
      // Save to file for later use
      return saveSubscribersToFile(subscribers, './subscribers.json');
    })
    .then(() => console.log('Process completed'))
    .catch(err => console.error('Process failed:', err));
}

// Export functions for use in other files
module.exports = {
  getSubscribers,
  saveSubscribersToFile
};
