import { WorkDatabase } from '../database';
import { createWorkOrderDirectory, createNotesFile } from '../utils/filesystem';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { BrowserAutomation } from '../utils/browser-enhanced';
import { writeNotesFile } from '../utils/filesystem';

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
export async function initWorkOrder(workOrderNumber: string, controlNumber?: string): Promise<string> {
  try {
    // Input validation
    if (!workOrderNumber || workOrderNumber.trim() === '') {
      throw new Error('Work order number is required');
    }

    // Get database instance
    const db = WorkDatabase.getInstance();
    
    // Ensure database is initialized
    const dbReady = await db.ensureInitialized();
    if (!dbReady) {
      return 'Operation canceled: Database is not initialized.';
    }

    // Add work order to database
    const workOrder = await db.addWorkOrder(workOrderNumber, controlNumber);

    // Create directory structure for the work order
    await createWorkOrderDirectory(workOrderNumber);

    // Create initial notes file
    await createNotesFile(workOrderNumber);

    // Initial success message
    let resultMessage = `Work order ${workOrderNumber} initialized successfully with directory structure`;

    // Prompt user if they want to import notes from Medimizer
    const { importNotes } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'importNotes',
        message: chalk.yellow('Would you like to import notes from Medimizer?'),
        default: true
      }
    ]);

    if (importNotes) {
      try {
        console.log(chalk.yellow(`Importing notes for work order ${workOrderNumber}...`));
        const importResult = await importNotesFromMedimizer(workOrderNumber);
        resultMessage += `\n${importResult}`;
      } catch (importError) {
        console.error(chalk.red(`Error importing notes: ${importError instanceof Error ? importError.message : 'Unknown error'}`));
        resultMessage += `\nFailed to import notes from Medimizer.`;
      }
    }

    // Return success message
    return resultMessage;
  } catch (error) {
    // Handle errors
    if (error instanceof Error) {
      throw new Error(`Failed to initialize work order: ${error.message}`);
    } else {
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
async function importNotesFromMedimizer(workOrderNumber: string): Promise<string> {
  // Get browser automation instance
  const browser = BrowserAutomation.getInstance();

  try {
    // Navigate directly to the work order page
    const url = `http://10.221.0.155/MMWeb/App_Pages/WOForm.aspx?wo=${workOrderNumber}&mode=Edit&tab=2`;
    console.log(chalk.yellow(`Navigating to: ${url}`));
    
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
      console.log(chalk.yellow('Login page detected. Attempting to log in...'));
      
      // Use the improved login method
      await browser.login('LPOLLOCK', 'password', 'URMCCEX3');
      
      // After login, navigate to the original URL
      await browser.page.goto(url, { waitUntil: 'networkidle2' });
    }
    
    // Wait for the notes textarea to appear
    console.log(chalk.yellow('Waiting for notes element...'));
    await browser.page.waitForSelector('#ContentPlaceHolder1_pagWorkOrder_memNotes_I', { 
      timeout: 10000,
      visible: true 
    });
    
    // Extract the notes
    const notes = await browser.page.evaluate(() => {
      const textarea = document.querySelector('#ContentPlaceHolder1_pagWorkOrder_memNotes_I') as HTMLTextAreaElement;
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
    await writeNotesFile(workOrderNumber, formattedNotes);
    
    // Close the browser
    await browser.close();
    
    return 'Notes imported successfully from Medimizer';
  } catch (error) {
    // Make sure to close the browser even if there's an error
    try {
      await browser.close();
    } catch (closeError) {
      console.log(chalk.yellow(`Warning: Could not close browser properly: ${closeError instanceof Error ? closeError.message : 'Unknown error'}`));
    }
    
    if (error instanceof Error) {
      throw new Error(`Failed to import notes: ${error.message}`);
    } else {
      throw new Error('Failed to import notes: Unknown error');
    }
  }
}
/**
 * Import notes and services from Medimizer for a work order
 * This function should be used in place of the previous importNotesFromMedimizer
 * 
 * @param workOrderNumber - 7-digit work order number
 * @returns A promise that resolves to a success message
 */
async function importFromMedimizer(workOrderNumber: string): Promise<string> {
  // Get browser automation instance
  const browser = BrowserAutomation.getInstance();

  try {
    // Initialize the browser
    await browser.initialize();
    if (!browser.page) {
      throw new Error("Browser page not initialized");
    }
    
    // Import notes
    console.log(chalk.yellow(`Importing notes for work order ${workOrderNumber}...`));
    const notes = await browser.importNotes(workOrderNumber);
    
    // Import services
    console.log(chalk.yellow(`Importing services for work order ${workOrderNumber}...`));
    const services = await browser.importServices(workOrderNumber);
    
    // Get current date for timestamp
    const currentDate = new Date();
    const formattedDate = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD
    const formattedTime = currentDate.toTimeString().split(' ')[0]; // HH:MM:SS
    
    // Format content with timestamp, notes, and services
    const formattedContent = `
================================
IMPORTED FROM MM ON ${formattedDate} at ${formattedTime}
================================

${notes || '~No notes found in Medimizer~'}

================================
IMPORTED SERVICES FROM MM
================================
${services.length > 0 
  ? services.join('\n')
  : '~No services found in Medimizer~'}

`;
    
    // Write to the notes file
    await writeNotesFile(workOrderNumber, formattedContent);
    
    // Close the browser
    await browser.close();
    
    return `Notes and ${services.length} services imported successfully from Medimizer`;
  } catch (error) {
    // Make sure to close the browser even if there's an error
    try {
      await browser.close();
    } catch (closeError) {
      console.log(chalk.yellow(`Warning: Could not close browser properly: ${closeError instanceof Error ? closeError.message : 'Unknown error'}`));
    }
    
    if (error instanceof Error) {
      throw new Error(`Failed to import from Medimizer: ${error.message}`);
    } else {
      throw new Error('Failed to import from Medimizer: Unknown error');
    }
  }
}