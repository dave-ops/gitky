const simpleGit = require('simple-git');
const path = require('path');
const config = require('../config');

function cloneRepo(repoUrl, repoName) {
    return new Promise((resolve, reject) => {
        const git = simpleGit(config.WORKING_DIR);
        git.clone(repoUrl, repoName, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve(repoName);
            }
        });
    });
}

function listFiles(repoName) {
    return new Promise((resolve, reject) => {
        const git = simpleGit(path.join(config.WORKING_DIR, repoName));
        git.raw(['ls-tree', '-r', 'HEAD', '--name-only'], (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result.split('\n').filter(file => file !== ''));
            }
        });
    });
}

module.exports = {
    cloneRepo,
    listFiles
};