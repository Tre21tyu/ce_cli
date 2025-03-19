"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initWorkOrder = initWorkOrder;
const database_1 = require("../database");
const filesystem_1 = require("../utils/filesystem");
const inquirer_1 = __importDefault(require("inquirer"));
const chalk_1 = __importDefault(require("chalk"));
const browser_enhanced_1 = require("../utils/browser-enhanced");
const filesystem_2 = require("../utils/filesystem");
/**
 * Initialize a new work order
 *
 * This command creates a new work order in the database with the provided 7-digit number
 * and optional 8-digit control number. It also creates a directory structure for the work order.
 * Optionally imports notes from Medimizer if requested.
 *
 * @param workOrderNumber - 7-digit work order number
 * @param controlNumber - Optional 8-digit control number
 * @returns A promise that resolves to a success message or rejects with an error
 */
async function initWorkOrder(workOrderNumber, controlNumber) {
    try {
        // Input validation
        if (!workOrderNumber || workOrderNumber.trim() === '') {
            throw new Error('Work order number is required');
        }
        // Get database instance
        const db = database_1.WorkDatabase.getInstance();
        // Ensure database is initialized
        const dbReady = await db.ensureInitialized();
        if (!dbReady) {
            return 'Operation canceled: Database is not initialized.';
        }
        // Add work order to database
        const workOrder = await db.addWorkOrder(workOrderNumber, controlNumber);
        // Create directory structure for the work order
        await (0, filesystem_1.createWorkOrderDirectory)(workOrderNumber);
        // Create initial notes file
        await (0, filesystem_1.createNotesFile)(workOrderNumber);
        // Initial success message
        let resultMessage = `Work order ${workOrderNumber} initialized successfully with directory structure`;
        // Prompt user if they want to import notes from Medimizer
        const { importNotes } = await inquirer_1.default.prompt([
            {
                type: 'confirm',
                name: 'importNotes',
                message: chalk_1.default.yellow('Would you like to import notes from Medimizer?'),
                default: true
            }
        ]);
        if (importNotes) {
            try {
                console.log(chalk_1.default.yellow(`Importing notes for work order ${workOrderNumber}...`));
                const importResult = await importNotesFromMedimizer(workOrderNumber);
                resultMessage += `\n${importResult}`;
            }
            catch (importError) {
                console.error(chalk_1.default.red(`Error importing notes: ${importError instanceof Error ? importError.message : 'Unknown error'}`));
                resultMessage += `\nFailed to import notes from Medimizer.`;
            }
        }
        // Return success message
        return resultMessage;
    }
    catch (error) {
        // Handle errors
        if (error instanceof Error) {
            throw new Error(`Failed to initialize work order: ${error.message}`);
        }
        else {
            throw new Error('Failed to initialize work order: Unknown error');
        }
    }
}
/**
 * Import notes from Medimizer for a work order
 * Handles login if needed
 *
 * @param workOrderNumber - 7-digit work order number
 * @returns A promise that resolves to a success message
 */
async function importNotesFromMedimizer(workOrderNumber) {
    // Get browser automation instance
    const browser = browser_enhanced_1.BrowserAutomation.getInstance();
    try {
        // Navigate directly to the work order page
        const url = `http://10.221.0.155/MMWeb/App_Pages/WOForm.aspx?wo=${workOrderNumber}&mode=Edit&tab=2`;
        console.log(chalk_1.default.yellow(`Navigating to: ${url}`));
        await browser.initialize();
        if (!browser.page) {
            throw new Error("Browser page not initialized");
        }
        // Navigate to the page
        await browser.page.goto(url, { waitUntil: 'networkidle2' });
        // Check if we're on the login page
        const isLoginPage = await browser.page.evaluate(() => {
            return !!document.querySelector('#ContentPlaceHolder1_txtEmployeeCode_I');
        });
        if (isLoginPage) {
            console.log(chalk_1.default.yellow('Login page detected. Attempting to log in...'));
            // Use the improved login method
            await browser.login('LPOLLOCK', 'password', 'URMCCEX3');
            // After login, navigate to the original URL
            await browser.page.goto(url, { waitUntil: 'networkidle2' });
        }
        // Wait for the notes textarea to appear
        console.log(chalk_1.default.yellow('Waiting for notes element...'));
        await browser.page.waitForSelector('#ContentPlaceHolder1_pagWorkOrder_memNotes_I', {
            timeout: 10000,
            visible: true
        });
        // Extract the notes
        const notes = await browser.page.evaluate(() => {
            const textarea = document.querySelector('#ContentPlaceHolder1_pagWorkOrder_memNotes_I');
            return textarea ? textarea.value : '';
        });
        // Get current date for timestamp
        const currentDate = new Date();
        const formattedDate = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD
        const formattedTime = currentDate.toTimeString().split(' ')[0]; // HH:MM:SS
        // Format notes with timestamp
        const formattedNotes = `
================================
IMPORTED FROM MM ON ${formattedDate} at ${formattedTime}
================================

${notes || '~No notes found in Medimizer~'}

`;
        // Write notes to file
        await (0, filesystem_2.writeNotesFile)(workOrderNumber, formattedNotes);
        // Close the browser
        await browser.close();
        return 'Notes imported successfully from Medimizer';
    }
    catch (error) {
        // Make sure to close the browser even if there's an error
        try {
            await browser.close();
        }
        catch (closeError) {
            console.log(chalk_1.default.yellow(`Warning: Could not close browser properly: ${closeError instanceof Error ? closeError.message : 'Unknown error'}`));
        }
        if (error instanceof Error) {
            throw new Error(`Failed to import notes: ${error.message}`);
        }
        else {
            throw new Error('Failed to import notes: Unknown error');
        }
    }
}
