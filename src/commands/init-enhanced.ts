import { WorkDatabase } from '../database';
import { createWorkOrderDirectory, createNotesFile, writeNotesFile } from '../utils/filesystem';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { BrowserAutomation } from '../utils/browser-enhanced';
import { DayTrackerManager } from '../utils/day-tracker';

/**
 * Initialize a new work order
 * 
 * This command creates a new work order in the database with the provided 7-digit number
 * and optional 8-digit control number. It also creates a directory structure for the work order.
 * Optionally imports notes from Medimizer if requested.
 * Now includes start time tracking for service time allocation.
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

    // Get current time for START TIME tracking
    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-US', { hour12: false });
    
    // Add start time to notes file
    // First read the existing content
    const notesFilePath = await createNotesFile(workOrderNumber);
    
    // Add START TIME marker to notes
    await writeNotesFile(workOrderNumber, `
================================
IMPORTED FROM MM ON ${now.toISOString().split('T')[0]} at ${currentTime}
================================

---
START/RESUME TIME: ${currentTime}

`);

    // Check if day tracking is active
    const dayTracker = DayTrackerManager.getInstance();
    const currentDay = await dayTracker.getCurrentDay();
    
    if (!currentDay || currentDay.day_end) {
      // No active day, ask if the user wants to start one
      const { startDay } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'startDay',
          message: chalk.yellow('No active day found. Would you like to start a new day?'),
          default: true
        }
      ]);
      
      if (startDay) {
        await dayTracker.startDay();
        resultMessage += '\nNew work day started.';
      }
    }

    // Prompt user if they want to import notes from Medimizer
    const { importData } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'importData',
        message: chalk.yellow('Would you like to import notes from Medimizer?'),
        default: true
      }
    ]);

    if (importData) {
      try {
        console.log(chalk.yellow(`Importing notes for work order ${workOrderNumber}...`));
        const importResult = await importFromMedimizer(workOrderNumber);
        resultMessage += `\n${importResult}`;
      } catch (importError) {
        console.error(chalk.red(`Error importing from Medimizer: ${importError instanceof Error ? importError.message : 'Unknown error'}`));
        resultMessage += `\nFailed to import from Medimizer.`;
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
 * Import notes and services from Medimizer for a work order
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
    
    // Print services count for debugging
    console.log(chalk.yellow(`Found ${services.length} services to import`));
    
    // Get current date for timestamp
    const currentDate = new Date();
    const formattedDate = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD
    const formattedTime = currentDate.toLocaleTimeString('en-US', { hour12: false });
    
    // Preserve START TIME line if it exists in current notes
    let currentNotes;
    try {
      const parts = notes.split('---');
      if (parts.length > 1 && parts[1].includes('START/RESUME TIME:')) {
        currentNotes = parts[1];
      }
    } catch (e) {
      // Ignore parsing errors
    }
    
    // Format content with timestamp, notes, and services
    let formattedContent = `
================================
IMPORTED FROM MM ON ${formattedDate} at ${formattedTime}
================================

`;

    // Add START TIME if it was found
    if (currentNotes) {
      formattedContent += `---${currentNotes}\n`;
    } else {
      formattedContent += `---
START/RESUME TIME: ${formattedTime}

`;
    }

    // Add notes content
    formattedContent += `${notes || '~No notes found in Medimizer~'}

`;

    // Only add services section if we actually found services
    if (services && services.length > 0) {
      formattedContent += `
================================
IMPORTED SERVICES FROM MM
================================
${services.join('\n')}

`;
    }
    
    // Write to the notes file
    await writeNotesFile(workOrderNumber, formattedContent);
    
    // Close the browser
    await browser.close();
    
    return `Notes${services.length > 0 ? ` and ${services.length} services` : ''} imported successfully from Medimizer`;
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