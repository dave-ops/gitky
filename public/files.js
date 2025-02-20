// files.js

const urlParams = new URLSearchParams(window.location.search);
const user = urlParams.get('user');
const repo = urlParams.get('repo');
const branch = urlParams.get('branch');
let currentPath = ''; // Track current directory path

document.getElementById('repoInfo').textContent = `Repository: ${user}/${repo} (Branch: ${branch})`;

async function loadFiles(path = '') {
    const fileList = document.getElementById('fileList');
    const fileContent = document.getElementById('fileContent');
    fileContent.textContent = '';
    document.getElementById('currentPath').textContent = `Path: /${path || ''}`;

    try {
        const response = await fetch(`/files?user=${user}&repo=${repo}&branch=${branch}&path=${encodeURIComponent(path)}`);
        const data = await response.json();
        console.log('Fetched structure:', data); // Debug: Check what’s returned

        fileList.innerHTML = '';
        if (!data || !data.children || Object.keys(data.children).length === 0) {
            fileList.innerHTML = '<li>No files or folders found.</li>';
        } else {
            displayFiles(data.children, path);
        }
    } catch (error) {
        console.error('Error loading files:', error);
        fileList.innerHTML = '<li>Error loading files.</li>';
    }
}

function displayFiles(structure, path = '') {
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = ''; // Clear current list

    // Update breadcrumb
    const breadcrumb = document.getElementById('breadcrumb');
    breadcrumb.innerHTML = `<a href="#" onclick="navigateTo('')">Root</a>`;
    if (path) {
        const parts = path.split('/').filter(p => p);
        let current = '';
        parts.forEach((part, index) => {
            current += (current ? '/' : '') + part;
            breadcrumb.innerHTML += ` / <a href="#" onclick="navigateTo('${current}')">${part}</a>`;
        });
    }

    // Display files and folders at the current path
    const items = getItemsAtPath(structure, path);
    Object.entries(items).forEach(([name, item]) => {
        const li = document.createElement('li');
        li.className = item.type === 'directory' ? 'folder-item' : 'file-item';
        li.textContent = name;
        if (item.type === 'directory') {
            li.onclick = () => navigateTo(item.path);
        } else {
            li.onclick = () => showFileContent(item.path, name);
        }
        fileList.appendChild(li);
    });
}

function getItemsAtPath(structure, path) {
    let current = structure;
    if (!path) return current;

    const parts = path.split('/').filter(p => p);
    for (const part of parts) {
        if (current[part] && current[part].children) {
            current = current[part].children;
        } else {
            return {};
        }
    }
    return current;
}

async function navigateTo(path) {
    currentPath = path;
    await loadFiles(path);
}

async function showFileContent(filePath, fileName) {
    const fileContent = document.getElementById('fileContent');
    console.log('Fetching content for:', filePath); // Debug
    try {
        const response = await fetch(`/file?user=${user}&repo=${repo}&branch=${branch}&path=${encodeURIComponent(filePath)}`);
        const data = await response.json();
        console.log('Response status:', response.status, 'Content:', data); // Debug
        if (response.ok) {
            fileContent.textContent = data.content || 'No content available'; // Use plain text
        } else {
            fileContent.textContent = `Error: ${data.error || 'Failed to load file'}`;
        }
    } catch (error) {
        fileContent.textContent = 'Error loading file content.';
        console.error('Error fetching file content:', error);
    }
}

// Initial load
loadFiles();