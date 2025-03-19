"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openNotes = openNotes;
exports.importNotes = importNotes;
exports.parseServicesFromNotes = parseServicesFromNotes;
exports.validateServices = validateServices;
const database_1 = require("../database");
const filesystem_1 = require("../utils/filesystem");
const editor_1 = require("../utils/editor");
const browser_1 = require("../utils/browser");
const chalk_1 = __importDefault(require("chalk"));
/**
 * Open notes for a work order
 * Either creates a new notes file or opens an existing one
 *
 * @param workOrderNumber - 7-digit work order number
 * @returns A promise that resolves when the operation is complete
 */
async function openNotes(workOrderNumber) {
    try {
        // Input validation
        if (!workOrderNumber || workOrderNumber.trim() === '') {
            throw new Error('Work order number is required');
        }
        // Validate work order number format
        if (!/^\d{7}$/.test(workOrderNumber)) {
            throw new Error('Work order number must be exactly 7 digits');
        }
        // Get database instance
        const db = database_1.WorkDatabase.getInstance();
        // Check if work order exists in the database
        const workOrder = await db.getWorkOrder(workOrderNumber);
        if (!workOrder) {
            throw new Error(`Work order ${workOrderNumber} not found in the database`);
        }
        // Create or get the notes file
        const notesFilePath = await (0, filesystem_1.createNotesFile)(workOrderNumber);
        // Open the notes file in the editor
        await (0, editor_1.openNotesInEditor)(workOrderNumber);
        return `Notes for work order ${workOrderNumber} opened successfully`;
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to open notes: ${error.message}`);
        }
        else {
            throw new Error('Failed to open notes: Unknown error');
        }
    }
}
/**
 * Import notes from Medimizer for a work order
 *
 * @param workOrderNumber - 7-digit work order number
 * @returns A promise that resolves when the import is complete
 */
async function importNotes(workOrderNumber) {
    try {
        // Input validation
        if (!workOrderNumber || workOrderNumber.trim() === '') {
            throw new Error('Work order number is required');
        }
        // Validate work order number format
        if (!/^\d{7}$/.test(workOrderNumber)) {
            throw new Error('Work order number must be exactly 7 digits');
        }
        // Get database instance
        const db = database_1.WorkDatabase.getInstance();
        // Check if work order exists in the database
        const workOrder = await db.getWorkOrder(workOrderNumber);
        if (!workOrder) {
            throw new Error(`Work order ${workOrderNumber} not found in the database`);
        }
        // Create the notes file if it doesn't exist
        await (0, filesystem_1.createNotesFile)(workOrderNumber);
        // Get browser automation instance
        const browser = browser_1.BrowserAutomation.getInstance();
        // Import notes from Medimizer
        console.log(chalk_1.default.yellow(`Importing notes for work order ${workOrderNumber}...`));
        const notesFromMM = await browser.importNotes(workOrderNumber);
        // Get current date for timestamp
        const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        // Format notes with timestamp
        const formattedNotes = `
================================
IMPORTED FROM MM ON ${currentDate}
================================

${notesFromMM || '~Notes~'}

`;
        // Write notes to file
        await (0, filesystem_1.writeNotesFile)(workOrderNumber, formattedNotes);
        console.log(chalk_1.default.green(`Notes imported successfully for work order ${workOrderNumber}`));
        // Close the browser after import
        await browser.close();
        return `Notes imported successfully for work order ${workOrderNumber}`;
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to import notes: ${error.message}`);
        }
        else {
            throw new Error('Failed to import notes: Unknown error');
        }
    }
}
/**
 * Parse services from notes
 * Looks for patterns like [Verb, Noun] => Description
 *
 * @param notes - Notes to parse
 * @returns An array of parsed services
 */
function parseServicesFromNotes(notes) {
    const services = [];
    // Regular expression to match service patterns
    // Matches [Verb, Noun] => Description or [Verb] => Description
    const serviceRegex = /\[(.*?)(?:,\s*(.*?))?\]\s*=>\s*(.*?)(?:\n|$)/g;
    let match;
    while ((match = serviceRegex.exec(notes)) !== null) {
        const verb = match[1]?.trim() || '';
        const noun = match[2]?.trim() || '';
        const description = match[3]?.trim() || '';
        if (verb) {
            services.push({ verb, noun, description });
        }
    }
    return services;
}
/**
 * Validate services against database
 * Checks if verbs and nouns exist in the database
 *
 * @param services - Services to validate
 * @returns A promise that resolves to an array of validation results
 */
async function validateServices(services) {
    // Get database instance
    const db = database_1.WorkDatabase.getInstance();
    // Array to hold validation results
    const validationResults = [];
    // Validate each service
    for (const service of services) {
        // Check if verb exists
        const verbExists = await db.db('Verbs')
            .where({ name: service.verb })
            .first();
        // Check if noun exists (if provided)
        let nounExists = true;
        if (service.noun) {
            nounExists = !!(await db.db('Nouns')
                .where({ name: service.noun })
                .first());
        }
        // Add validation result
        validationResults.push({
            ...service,
            verbValid: !!verbExists,
            nounValid: nounExists
        });
    }
    return validationResults;
}
