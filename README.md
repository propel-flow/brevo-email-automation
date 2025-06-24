# Brevo Email Automation with GitHub Actions

This repository contains scripts for automating email operations with Brevo, converted from cron jobs to GitHub Actions.

## Features

- Scheduled daily email sending to subscribers
- Automated email template uploads
- Detailed logging and artifacts storage
- Manual trigger option for both workflows

## Setup Instructions

### 1. Local Setup

1. Clone this repository to your local machine
2. Initialize the repository:
   ```bash
   npm run init
   ```
   This will:
   - Create necessary directories
   - Generate the template list
   - Create a `.env` file from the example
   - Install dependencies

3. Update the `.env` file with your Brevo API key and other settings

### 2. GitHub Repository Setup

1. Push this repository to GitHub
2. Set up the required secrets in your GitHub repository:
   - `BREVO_API_KEY`: Your Brevo API key
   - `NOTIFICATION_EMAIL`: Email to receive notifications (optional)
   - `SMTP_HOST`: SMTP server host (optional)
   - `SMTP_PORT`: SMTP server port (optional)
   - `SMTP_USER`: SMTP username (optional)
   - `SMTP_PASS`: SMTP password (optional)
   - `SMTP_SECURE`: Whether to use secure connection (optional)

### 2. Email Templates

1. Place your HTML email templates in the `email-templates` directory
2. Update the template paths in `auto-upload-brevo-templates.js` to use relative paths:
   ```javascript
   const templateConfigs = [
     {
       templateName: "Welcome Email 1 - Thanks",
       subject: "Welcome to Propel Flow AI - Thanks for Subscribing!",
       htmlFile: "./email-templates/welcome_email_1_thanks.html",
       // other properties...
     },
     // other templates...
   ];
   ```

## Workflows

### Daily Email Sender

This workflow replaces the `setup-daily-email-cron.js` cron job.

- **Schedule**: Runs daily at 9:00 AM UTC (configurable in `.github/workflows/daily-email-sender.yml`)
- **Manual Trigger**: Available with optional custom email template path
- **Artifacts**: Email logs are saved as workflow artifacts for 7 days

### Template Uploader

This workflow replaces the `setup-template-upload-cron.js` cron job.

- **Schedule**: Runs daily at 8:00 AM UTC (configurable in `.github/workflows/template-uploader.yml`)
- **Manual Trigger**: Available for on-demand template uploads
- **Artifacts**: Upload logs are saved as workflow artifacts for 7 days

## Testing Workflows

### Testing in GitHub

You can manually test both workflows in GitHub:

1. Go to the "Actions" tab in your GitHub repository
2. Select the workflow you want to run
3. Click "Run workflow"
4. For the Daily Email Sender, you can optionally specify a custom email template path
5. Click "Run workflow" to start the execution

### Testing Locally

The repository includes a test script to simulate GitHub Actions workflows locally:

1. Create a `.env` file based on the `.env.example` template
2. Test the daily email sender workflow:
   ```bash
   npm run test:email
   ```

3. Test the template uploader workflow:
   ```bash
   npm run test:template
   ```

These commands will simulate the GitHub Actions environment and run the workflows locally, allowing you to test changes before pushing to GitHub.

## Viewing Results

After a workflow runs:

1. Go to the "Actions" tab in your GitHub repository
2. Click on the completed workflow run
3. Scroll down to the "Artifacts" section
4. Download the logs to view detailed information about the execution

## Local Development

For local development and testing:

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a `.env` file with your environment variables
4. Run scripts manually: `node daily-email-sender.js` or `node auto-upload-brevo-templates.js`

## HTML Files Management

All HTML email templates are stored in the `email-templates` directory of this repository. There are several ways to view and edit these templates:

### Using the Template Viewer

The repository includes a built-in template viewer for easy preview and testing:

1. Run the template list generator:
   ```bash
   npm run generate-template-list
   ```

2. Start the template viewer server:
   ```bash
   npm run view-templates
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:3000/view-template.html
   ```

4. Use the viewer to:
   - Preview templates in desktop or mobile view
   - Switch between different templates
   - Open templates directly in VS Code for editing

### Manual Editing

You can also edit the HTML files directly:

1. Clone the repository to your local machine
2. Make changes to the HTML files in the `email-templates` directory
3. Test locally by opening the HTML files in a web browser
4. Commit and push your changes
5. Manually trigger the workflow to test the updated templates

## Migrating from Cron Jobs

This repository replaces the following cron jobs:

- `setup-daily-email-cron.js`: Replaced by the Daily Email Sender GitHub Action
- `setup-template-upload-cron.js`: Replaced by the Template Uploader GitHub Action

The main advantages of using GitHub Actions over cron jobs:

- No need for a constantly running server
- Built-in logging and artifacts storage
- Easy manual triggering
- Version control for all scripts and templates
- Simplified secrets management
