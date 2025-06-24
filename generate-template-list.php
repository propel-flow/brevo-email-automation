<?php
// generate-template-list.php
// A simple script to generate a JSON list of email templates

// Set the content type to JSON
header('Content-Type: application/json');

// Path to the email templates directory
$templatesDir = __DIR__ . '/email-templates';

// Check if the directory exists
if (!is_dir($templatesDir)) {
    echo json_encode([]);
    exit;
}

// Get all HTML files in the directory
$templates = [];
$files = scandir($templatesDir);

foreach ($files as $file) {
    // Only include HTML files
    if (pathinfo($file, PATHINFO_EXTENSION) === 'html') {
        $templates[] = $file;
    }
}

// Return the list as JSON
echo json_encode($templates);
