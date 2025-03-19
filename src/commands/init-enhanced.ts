import { WorkDatabase } from '../database';
import { createWorkOrderDirectory, createNotesFile } from '../utils/filesystem';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { BrowserAutomation } from '../utils/browser';
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
      
      // Fill in employee code
      await browser.page.type('#ContentPlaceHolder1_txtEmployeeCode_I', 'LPOLLOCK', { delay: 100 });
      
      // Fill in password
      await browser.page.type('#ContentPlaceHolder1_txtPassword_I', 'password', { delay: 100 });
      
      // Select the database (URMCCEX3)
      await browser.page.click('#ContentPlaceHolder1_cboDatabase_B-1');
      await browser.page.waitForSelector('#ContentPlaceHolder1_cboDatabase_DDD_L_LBI2T0');
      await browser.page.click('#ContentPlaceHolder1_cboDatabase_DDD_L_LBI2T0');
      
      // Click login button
      await browser.page.click('#ContentPlaceHolder1_btnLogin_CD');
      
      // Wait for navigation to complete
      await browser.page.waitForNavigation({ waitUntil: 'networkidle2' });
      
      console.log(chalk.green('Login successful'));
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
