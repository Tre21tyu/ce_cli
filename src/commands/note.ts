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
    
    // Print services count for debugging
    console.log(chalk.yellow(`Found ${servicesFromMM.length} services to import`));

    // Get current date for timestamp
    const currentDate = new Date();
    const formattedDate = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD
    const formattedTime = currentDate.toTimeString().split(' ')[0]; // HH:MM:SS

    // Format notes with timestamp, notes, and services
    let formattedContent = `
================================
IMPORTED FROM MM ON ${formattedDate} at ${formattedTime}
================================

${notesFromMM || '~No notes found in Medimizer~'}

`;

    // Only add services section if we actually found services
    if (servicesFromMM && servicesFromMM.length > 0) {
      formattedContent += `
================================
IMPORTED SERVICES FROM MM
================================
${servicesFromMM.join('\n')}

`;
    }

    // Write notes to file
    await writeNotesFile(workOrderNumber, formattedContent);

    console.log(chalk.green(`Notes${servicesFromMM.length > 0 ? ` and ${servicesFromMM.length} services` : ''} imported successfully for work order ${workOrderNumber}`));
    
    // Close the browser after import
    await browser.close();

    return `Notes${servicesFromMM.length > 0 ? ` and ${servicesFromMM.length} services` : ''} imported successfully for work order ${workOrderNumber}`;
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
 * And detects closing token =| if present
 * 
 * @param notes - Notes to parse
 * @returns An object with parsed services and closing flag
 */
export function parseServicesFromNotes(notes: string): {
  services: Array<{verb: string, noun: string, description: string}>,
  shouldCloseWorkOrder: boolean
} {
  const services: Array<{verb: string, noun: string, description: string}> = [];
  let shouldCloseWorkOrder = false;
  
  // Regular expression to match service patterns
  // Format: [Verb, Noun] => Description or [Verb] => Description
  const serviceRegex = /^\s*\[(.*?)(?:,\s*(.*?))?\]\s*\((.*?)\)\s*=>\s*(.*?)\s*$/gm;
  
  // Store line numbers for validation
  const serviceLineNumbers: number[] = [];
  const lines = notes.split('\n');
  
  // First, find all service patterns and their line numbers
  let match;
  while ((match = serviceRegex.exec(notes)) !== null) {
    const verb = match[1]?.trim() || '';
    const noun = match[2]?.trim() || '';
    const datetime = match[3]?.trim() || '';
    const description = match[4]?.trim() || '';
    
    // Get line number for this match
    const matchStart = match.index;
    let lineNumber = 0;
    let charCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
      charCount += lines[i].length + 1; // +1 for newline
      if (charCount > matchStart) {
        lineNumber = i;
        break;
      }
    }
    
    serviceLineNumbers.push(lineNumber);
    
    if (verb) {
      services.push({ verb, noun, description });
    }
  }
  
  // Now check if the last service has the closing token
  if (services.length > 0) {
    const lastService = services[services.length - 1];
    const lastServiceLineNumber = serviceLineNumbers[serviceLineNumbers.length - 1];
    
    // Check if description ends with =|
    if (lastService.description.trim().endsWith('=|')) {
      // Remove the =| token from the description
      lastService.description = lastService.description.trim().replace(/\s*=\|\s*$/, '');
      shouldCloseWorkOrder = true;
      
      // Validate no services after this one
      for (let i = 0; i < serviceLineNumbers.length - 1; i++) {
        const serviceDesc = services[i].description;
        if (serviceDesc.includes('=|')) {
          throw new Error('Closing token =| can only appear in the last service entry');
        }
      }
    }
  }
  
  return { services, shouldCloseWorkOrder };
}
/**
 * Extract closing token from service description
 * 
 * @param description - Service description text
 * @returns Cleaned description without token and whether token was found
 */
function extractClosingToken(description: string): { text: string, hasClosingToken: boolean } {
  const trimmedDesc = description.trim();
  const hasClosingToken = trimmedDesc.endsWith('=|');
  
  // Remove token if present
  const cleanedText = hasClosingToken 
    ? trimmedDesc.substring(0, trimmedDesc.length - 2).trim() 
    : trimmedDesc;
    
  return { text: cleanedText, hasClosingToken };
}
/**
 * Validate proper use of closing token in services
 * 
 * @param services - Array of parsed services
 * @throws Error if token is used incorrectly
 * @returns Whether work order should be closed
 */
function validateClosingToken(services: Array<{verb: string, noun: string, description: string}>): boolean {
  if (services.length === 0) return false;
  
  // Check if any non-last service has the closing token
  for (let i = 0; i < services.length - 1; i++) {
    if (services[i].description.includes('=|')) {
      throw new Error('Closing token =| can only appear in the last service entry');
    }
  }
  
  // Check if last service has the token
  const lastService = services[services.length - 1];
  return lastService.description.trim().endsWith('=|');
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