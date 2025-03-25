"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLog = createLog;
exports.listLogs = listLogs;
exports.openLog = openLog;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const util_1 = require("util");
const inquirer_1 = __importDefault(require("inquirer"));
const chalk_1 = __importDefault(require("chalk"));
const figlet_1 = __importDefault(require("figlet"));
const editor_1 = require("../utils/editor");
// Convert callback-based fs functions to Promise-based
/**
 * Center text in a fixed width
 * @param text Text to center
 * @param width Total width
 * @returns Centered text padded with spaces
 */
function centerText(text, width) {
    if (text.length >= width)
        return text;
    const leftPadding = Math.floor((width - text.length) / 2);
    const rightPadding = width - text.length - leftPadding;
    return ' '.repeat(leftPadding) + text + ' '.repeat(rightPadding);
}
const mkdir = (0, util_1.promisify)(fs_1.default.mkdir);
const writeFile = (0, util_1.promisify)(fs_1.default.writeFile);
const exists = (0, util_1.promisify)(fs_1.default.exists);
/**
 * Create and open a daily journal log
 *
 * @param logName - Name for the log entry (max 50 chars)
 * @returns A promise that resolves to a success message
 */
async function createLog(logName) {
    try {
        // Validate log name
        if (!logName || logName.trim() === '') {
            throw new Error('Log name is required');
        }
        if (logName.length > 50) {
            throw new Error('Log name must be 50 characters or less');
        }
        // Process log name (lowercase, replace spaces with underscores, remove invalid chars)
        const processedName = logName.trim().toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_-]/g, ''); // Remove any characters that aren't safe for filenames
        // Check if journal directory exists, create if needed
        const journalDir = path_1.default.join(process.cwd(), 'journal');
        if (!fs_1.default.existsSync(journalDir)) {
            const { createDir } = await inquirer_1.default.prompt([
                {
                    type: 'confirm',
                    name: 'createDir',
                    message: chalk_1.default.yellow('Journal directory does not exist. Create it?'),
                    default: true
                }
            ]);
            if (createDir) {
                await mkdir(journalDir, { recursive: true });
                console.log(chalk_1.default.green('Journal directory created successfully'));
            }
            else {
                return 'Operation canceled: Journal directory is required';
            }
        }
        // Generate current date for filename and content
        const now = new Date();
        const dateString = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const timeString = now.toTimeString().split(' ')[0]; // HH:MM:SS
        const dateTimeString = `${dateString} ${timeString}`;
        // Create filename
        const filename = `${dateString}_${processedName}.md`;
        const filePath = path_1.default.join(journalDir, filename);
        // Check if file already exists
        const fileExists = await exists(filePath);
        if (fileExists) {
            const { openExisting } = await inquirer_1.default.prompt([
                {
                    type: 'confirm',
                    name: 'openExisting',
                    message: chalk_1.default.yellow(`Log file "${filename}" already exists. Open it?`),
                    default: true
                }
            ]);
            if (openExisting) {
                await (0, editor_1.openInNvim)(filePath);
                return `Opened existing log file: ${filename}`;
            }
            else {
                return 'Operation canceled';
            }
        }
        // Generate ASCII art date using figlet
        const figletDate = figlet_1.default.textSync(dateString, {
            font: 'Slant',
            horizontalLayout: 'default',
            verticalLayout: 'default'
        });
        // Generate ASCII art for "CE BIO TECH LOG"
        const logHeader = figlet_1.default.textSync('CE BIO TECH LOG', {
            font: 'Small',
            horizontalLayout: 'default',
            verticalLayout: 'default'
        });
        // Create template
        const template = `
=====================================================================
---------------------------------------------------------------------
${logHeader}
/*
${figletDate}
*/
     -------------------------------------------------------------    
     |${centerText(`~${dateTimeString}~`, 59)}|
    -------------------------------------------------------------    
=====================================================================

`;
        // Write template to file
        await writeFile(filePath, template, 'utf8');
        console.log(chalk_1.default.green(`Created log file: ${filename}`));
        // Open file in nvim
        await (0, editor_1.openInNvim)(filePath);
        return `Log file created and opened: ${filename}`;
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to create log: ${error.message}`);
        }
        else {
            throw new Error('Failed to create log: Unknown error');
        }
    }
}
/**
 * List all journal logs
 *
 * @returns A promise that resolves to a formatted string with all logs
 */
async function listLogs() {
    try {
        const journalDir = path_1.default.join(process.cwd(), 'journal');
        if (!fs_1.default.existsSync(journalDir)) {
            return 'Journal directory does not exist. Create one with the log command.';
        }
        const files = fs_1.default.readdirSync(journalDir)
            .filter(file => file.endsWith('.md'))
            .sort((a, b) => b.localeCompare(a)); // Sort in reverse chronological order
        if (files.length === 0) {
            return 'No log files found in the journal directory.';
        }
        // Format the list
        let result = '\n';
        result += chalk_1.default.cyan('=============================================================\n');
        result += chalk_1.default.cyan('                      JOURNAL LOGS                           \n');
        result += chalk_1.default.cyan('=============================================================\n\n');
        files.forEach(file => {
            // Extract date and name from filename
            const [date, ...nameParts] = file.replace('.md', '').split('_');
            const name = nameParts.join('_');
            // Get file stats
            const stats = fs_1.default.statSync(path_1.default.join(journalDir, file));
            const modified = stats.mtime.toLocaleString();
            result += chalk_1.default.white(`${date}: ${name.replace(/_/g, ' ')}\n`);
            result += `  Last modified: ${modified}\n`;
            result += `  File: ${file}\n\n`;
        });
        result += chalk_1.default.cyan('=============================================================\n');
        result += `Total: ${files.length} log file(s)\n`;
        return result;
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to list logs: ${error.message}`);
        }
        else {
            throw new Error('Failed to list logs: Unknown error');
        }
    }
}
/**
 * Open a specific log file
 *
 * @param logIdentifier - Date or name to identify the log
 * @returns A promise that resolves to a success message
 */
async function openLog(logIdentifier) {
    try {
        const journalDir = path_1.default.join(process.cwd(), 'journal');
        if (!fs_1.default.existsSync(journalDir)) {
            return 'Journal directory does not exist. Create one with the log command.';
        }
        const files = fs_1.default.readdirSync(journalDir).filter(file => file.endsWith('.md'));
        if (files.length === 0) {
            return 'No log files found in the journal directory.';
        }
        // Try to find a match by date or name
        const matchingFiles = files.filter(file => file.includes(logIdentifier.toLowerCase().replace(/\s+/g, '_')));
        if (matchingFiles.length === 0) {
            return `No log files found matching "${logIdentifier}"`;
        }
        if (matchingFiles.length > 1) {
            // Multiple matches, ask user to select one
            console.log(chalk_1.default.yellow(`Found ${matchingFiles.length} matching logs:`));
            const { selectedFile } = await inquirer_1.default.prompt([
                {
                    type: 'list',
                    name: 'selectedFile',
                    message: 'Select a log file to open:',
                    choices: matchingFiles
                }
            ]);
            const filePath = path_1.default.join(journalDir, selectedFile);
            await (0, editor_1.openInNvim)(filePath);
            return `Opened log file: ${selectedFile}`;
        }
        else {
            // Single match, open it directly
            const filePath = path_1.default.join(journalDir, matchingFiles[0]);
            await (0, editor_1.openInNvim)(filePath);
            return `Opened log file: ${matchingFiles[0]}`;
        }
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to open log: ${error.message}`);
        }
        else {
            throw new Error('Failed to open log: Unknown error');
        }
    }
}
