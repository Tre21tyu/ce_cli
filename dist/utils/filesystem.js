"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWorkOrderDirectory = createWorkOrderDirectory;
exports.getFormattedDateTime = getFormattedDateTime;
exports.getFormattedServiceImportTime = getFormattedServiceImportTime;
exports.createNotesFile = createNotesFile;
exports.getNotesFilePath = getNotesFilePath;
exports.readNotesFile = readNotesFile;
exports.writeNotesFile = writeNotesFile;
exports.appendImportedServicesToNotes = appendImportedServicesToNotes;
exports.openNotesFile = openNotesFile;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const util_1 = require("util");
// Convert callback-based fs functions to Promise-based
const mkdir = (0, util_1.promisify)(fs_1.default.mkdir);
const writeFile = (0, util_1.promisify)(fs_1.default.writeFile);
const readFile = (0, util_1.promisify)(fs_1.default.readFile);
const exists = (0, util_1.promisify)(fs_1.default.exists);
/**
 * Base directory for work order files
 */
const BASE_DIR = path_1.default.join(process.cwd(), 'work_orders');
/**
 * Create directory structure for a work order
 *
 * @param workOrderNumber - 7-digit work order number
 * @returns A promise that resolves to the path of the created directory
 */
async function createWorkOrderDirectory(workOrderNumber) {
    try {
        // Validate work order number
        if (!/^\d{7}$/.test(workOrderNumber)) {
            throw new Error('Work order number must be exactly 7 digits');
        }
        // Create base directory if it doesn't exist
        if (!fs_1.default.existsSync(BASE_DIR)) {
            await mkdir(BASE_DIR, { recursive: true });
        }
        // Create work order directory
        const workOrderDir = path_1.default.join(BASE_DIR, workOrderNumber);
        if (!fs_1.default.existsSync(workOrderDir)) {
            await mkdir(workOrderDir, { recursive: true });
        }
        // Create POs directory
        const posDir = path_1.default.join(workOrderDir, 'pos');
        if (!fs_1.default.existsSync(posDir)) {
            await mkdir(posDir, { recursive: true });
        }
        return workOrderDir;
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to create directory structure: ${error.message}`);
        }
        else {
            throw new Error('Failed to create directory structure: Unknown error');
        }
    }
}
/**
 * Format the current date and time in a consistent format
 *
 * @returns Formatted date and time string (YYYY-MM-DD at HH:MM:SS)
 */
function getFormattedDateTime() {
    const now = new Date();
    const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const time = now.toTimeString().split(' ')[0]; // HH:MM:SS
    return `${date} at ${time}`;
}
/**
 * Format the current date and time for service imports
 *
 * @returns Formatted date and time string for services import (YYYY-MM-DD HH:MM)
 */
function getFormattedServiceImportTime() {
    const now = new Date();
    const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${date} ${hours}:${minutes}`;
}
/**
 * Create an initial notes markdown file for a work order
 *
 * @param workOrderNumber - 7-digit work order number
 * @returns A promise that resolves to the path of the created file
 */
async function createNotesFile(workOrderNumber) {
    try {
        // Validate work order number
        if (!/^\d{7}$/.test(workOrderNumber)) {
            throw new Error('Work order number must be exactly 7 digits');
        }
        // Create directory if it doesn't exist
        const workOrderDir = await createWorkOrderDirectory(workOrderNumber);
        // Create notes file
        const notesFilePath = path_1.default.join(workOrderDir, `${workOrderNumber}_notes.md`);
        // Only create the file if it doesn't exist
        if (!fs_1.default.existsSync(notesFilePath)) {
            const formattedDateTime = getFormattedDateTime();
            const initialContent = `
================================
IMPORTED FROM MM ON ${formattedDateTime}
================================

~Notes~

`;
            await writeFile(notesFilePath, initialContent, 'utf8');
        }
        return notesFilePath;
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to create notes file: ${error.message}`);
        }
        else {
            throw new Error('Failed to create notes file: Unknown error');
        }
    }
}
/**
 * Get the path to the notes file for a work order
 *
 * @param workOrderNumber - 7-digit work order number
 * @returns A promise that resolves to the path of the notes file
 */
async function getNotesFilePath(workOrderNumber) {
    // Validate work order number
    if (!/^\d{7}$/.test(workOrderNumber)) {
        throw new Error('Work order number must be exactly 7 digits');
    }
    const notesFilePath = path_1.default.join(BASE_DIR, workOrderNumber, `${workOrderNumber}_notes.md`);
    // Check if the file exists
    if (!fs_1.default.existsSync(notesFilePath)) {
        throw new Error(`Notes file for work order ${workOrderNumber} does not exist`);
    }
    return notesFilePath;
}
/**
 * Read the content of a notes file
 *
 * @param workOrderNumber - 7-digit work order number
 * @returns A promise that resolves to the content of the notes file
 */
async function readNotesFile(workOrderNumber) {
    try {
        const notesFilePath = await getNotesFilePath(workOrderNumber);
        const content = await readFile(notesFilePath, 'utf8');
        return content;
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to read notes file: ${error.message}`);
        }
        else {
            throw new Error('Failed to read notes file: Unknown error');
        }
    }
}
/**
 * Write content to a notes file
 *
 * @param workOrderNumber - 7-digit work order number
 * @param content - Content to write to the file
 * @returns A promise that resolves when the file has been written
 */
async function writeNotesFile(workOrderNumber, content) {
    try {
        const notesFilePath = await getNotesFilePath(workOrderNumber);
        await writeFile(notesFilePath, content, 'utf8');
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to write notes file: ${error.message}`);
        }
        else {
            throw new Error('Failed to write notes file: Unknown error');
        }
    }
}
/**
 * Append imported services template with timestamp to notes file
 *
 * @param workOrderNumber - 7-digit work order number
 * @param services - Array of service strings to append
 * @returns A promise that resolves when the file has been updated
 */
async function appendImportedServicesToNotes(workOrderNumber, services) {
    try {
        // Get current content
        const currentContent = await readNotesFile(workOrderNumber);
        // Create timestamp
        const formattedDateTime = getFormattedDateTime();
        // Create services section with timestamp
        let servicesSection = `
================================
IMPORTED SERVICES FROM MM @ ${formattedDateTime}
================================
`;
        if (services.length > 0) {
            servicesSection += `${services.join('\n')}\n\n`;
        }
        else {
            servicesSection += 'No services found\n\n';
        }
        // Append to content
        const updatedContent = currentContent + servicesSection;
        // Write updated content
        await writeNotesFile(workOrderNumber, updatedContent);
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to append imported services: ${error.message}`);
        }
        else {
            throw new Error('Failed to append imported services: Unknown error');
        }
    }
}
/**
 * Open the notes file in the default editor
 *
 * @param workOrderNumber - 7-digit work order number
 * @returns A promise that resolves when the editor is closed
 */
async function openNotesFile(workOrderNumber) {
    // This will be implemented in a separate file
}
