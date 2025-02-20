# Gitky - Private Github File Share

Welcome to **Gitky**, a simple web application designed to view and navigate through files in a GitHub-like interface. This project aims to provide a user-friendly way to explore contents of your private repositories with a private uri.

## Features

- **File/Folder Navigation**: Users can navigate through directories and view file contents in a split-pane view, similar to GitHub's file explorer.
- **File Content Display**: Content of selected files is displayed in the right pane, with support for text files.
- **Breadcrumb Navigation**: Easy navigation back to parent directories or root with clickable breadcrumbs.

## Usage

1. **Accessing the Application**: Open the application in your web browser.
2. **Repository Information**: At the top, you'll see repository details including the user, repository name, and branch.
3. **Navigation**:
   - Use the left pane to navigate through folders and files. Click on folders to explore their contents.
   - Click on files to view their content in the right pane.
   - Use the breadcrumb navigation to move between directories.
4. **Viewing File Content**: When a file is selected, its content will be displayed in the right pane.

## Project Structure

```text
project-root/
├── .github/          # GitHub specific files
│   └── workflows/    # GitHub Actions workflows
├── public/           # Static files that are served directly to the client
│   ├── index.html    # Main HTML file
│   ├── styles.css    # CSS styling
│   └── script.js     # Client-side JavaScript
├── utils/            # Utility functions
│   ├── fsUtils.js    # File system utility functions
│   └── gitUtils.js   # Git related utility functions
├── routes/           # Express.js route handlers
│   └── index.js      # Main routing file
├── config/           # Configuration files
│   └── config.js     # Configuration settings
├── src/              # Source code for the application
│   └── server.js     # Main server file
├── package.json      # npm package configuration
├── README.md         # Project documentation
└── .gitignore        # Specifies which files to ignore in version control
```


A simple Node.js server that clones one of your private GitHub repository and allows you to privately share its contents over the web.

## Getting Started

### Prerequisites

- Node.js (v14.x or later)
- npm (v6.x or later)
- A GitHub repository you wish to clone and view

### Installation

1. **Clone this Repository:**
```bash
git clone https://github.com/your-username/git-web-viewer.git
cd git-web-viewer

