import { WorkDatabase } from '../database';
import { createNotesFile, readNotesFile, writeNotesFile } from '../utils/filesystem';
import { openNotesInNvim } from '../utils/editor';
import { BrowserAutomation } from '../utils/browser-enhanced';
import chalk from 'chalk';

/**
 * Open notes for a work order using nvim
 * Either creates a new notes file or opens an existing one
 * 
 * @param workOrderNumber - 7-digit work order number
 * @returns A promise that resolves when the operation is complete
 */
export async function openNotes(workOrderNumber: string): Promise<string> {
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
    const db = WorkDatabase.getInstance();

    // Check if work order exists in the database
    const workOrder = await db.getWorkOrder(workOrderNumber);
    if (!workOrder) {
      throw new Error(`Work order ${workOrderNumber} not found in the database`);
    }

    // Create or get the notes file
    const notesFilePath = await createNotesFile(workOrderNumber);

    // Open the notes file in nvim
    await openNotesInNvim(workOrderNumber);

    return `Notes for work order ${workOrderNumber} opened successfully with nvim`;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to open notes: ${error.message}`);
    } else {
      throw new Error('Failed to open notes: Unknown error');
    }
  }
}

/**
 * Import notes and services from Medimizer for a work order
 * 
 * @param workOrderNumber - 7-digit work order number
 * @returns A promise that resolves when the import is complete
 */
export async function importNotes(workOrderNumber: string): Promise<string> {
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
    const db = WorkDatabase.getInstance();

    // Check if work order exists in the database
    const workOrder = await db.getWorkOrder(workOrderNumber);
    if (!workOrder) {
      throw new Error(`Work order ${workOrderNumber} not found in the database`);
    }

    // Create the notes file if it doesn't exist
    await createNotesFile(workOrderNumber);

    // Get browser automation instance
    const browser = BrowserAutomation.getInstance();

    // Import notes from Medimizer
    console.log(chalk.yellow(`Importing notes for work order ${workOrderNumber}...`));
    const notesFromMM = await browser.importNotes(workOrderNumber);

    // Import services from Medimizer
    console.log(chalk.yellow(`Importing services for work order ${workOrderNumber}...`));
    const servicesFromMM = await browser.importServices(workOrderNumber);

    // Get current date for timestamp
    const currentDate = new Date();
    const formattedDate = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD
    const formattedTime = currentDate.toTimeString().split(' ')[0]; // HH:MM:SS

    // Format notes with timestamp, notes, and services
    const formattedContent = `
================================
IMPORTED FROM MM ON ${formattedDate} at ${formattedTime}
================================

${notesFromMM || '~No notes found in Medimizer~'}

================================
IMPORTED SERVICES FROM MM
================================
${servicesFromMM.length > 0 
  ? servicesFromMM.join('\n')
  : '~No services found in Medimizer~'}

`;

    // Write notes to file
    await writeNotesFile(workOrderNumber, formattedContent);

    console.log(chalk.green(`Notes and ${servicesFromMM.length} services imported successfully for work order ${workOrderNumber}`));
    
    // Close the browser after import
    await browser.close();

    return `Notes and ${servicesFromMM.length} services imported successfully for work order ${workOrderNumber}`;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to import notes: ${error.message}`);
    } else {
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
export function parseServicesFromNotes(notes: string): Array<{verb: string, noun: string, description: string}> {
  const services: Array<{verb: string, noun: string, description: string}> = [];
  
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
export async function validateServices(
  services: Array<{verb: string, noun: string, description: string}>
): Promise<Array<{
  verb: string,
  noun: string,
  description: string,
  verbValid: boolean,
  nounValid: boolean
}>> {
  // Get database instance
  const db = WorkDatabase.getInstance();
  
  // Array to hold validation results
  const validationResults: Array<{
    verb: string,
    noun: string,
    description: string,
    verbValid: boolean,
    nounValid: boolean
  }> = [];
  
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