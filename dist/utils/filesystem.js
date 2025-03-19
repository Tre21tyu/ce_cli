"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWorkOrderDirectory = createWorkOrderDirectory;
exports.createNotesFile = createNotesFile;
exports.getNotesFilePath = getNotesFilePath;
exports.readNotesFile = readNotesFile;
exports.writeNotesFile = writeNotesFile;
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
            const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            const initialContent = `
================================
IMPORTED FROM MM ON ${currentDate}
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
 * Open the notes file in the default editor
 *
 * @param workOrderNumber - 7-digit work order number
 * @returns A promise that resolves when the editor is closed
 */
async function openNotesFile(workOrderNumber) {
    // This will be implemented in a separate file
}
