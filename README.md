# Gitky - Privte Github File Viewer

Welcome to **Gitky**, a simple web application designed to view and navigate through files in a GitHub-like interface. This project aims to provide a user-friendly way to explore repository contents, particularly focusing on a responsive layout that adapts to different screen sizes.

## Features

- **Responsive Design**: The layout adjusts to fit different screen sizes, ensuring usability on both desktop and mobile devices.
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


## Project Structure
```text
project-root/
├── public/
│   ├── index.html
│   ├── styles.css
│   └── script.js
├── utils/
│   ├── fsUtils.js
│   └── gitUtils.js
├── routes/
│   └── index.js
├── config.js
└── server.js
```
