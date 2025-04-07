import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

// Convert callback-based fs functions to Promise-based
const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const exists = promisify(fs.exists);

/**
 * Base directory for work order files
 */
const BASE_DIR = path.join(process.cwd(), 'work_orders');

/**
 * Create directory structure for a work order
 * 
 * @param workOrderNumber - 7-digit work order number
 * @returns A promise that resolves to the path of the created directory
 */
export async function createWorkOrderDirectory(workOrderNumber: string): Promise<string> {
  try {
    // Validate work order number
    if (!/^\d{7}$/.test(workOrderNumber)) {
      throw new Error('Work order number must be exactly 7 digits');
    }

    // Create base directory if it doesn't exist
    if (!fs.existsSync(BASE_DIR)) {
      await mkdir(BASE_DIR, { recursive: true });
    }

    // Create work order directory
    const workOrderDir = path.join(BASE_DIR, workOrderNumber);
    if (!fs.existsSync(workOrderDir)) {
      await mkdir(workOrderDir, { recursive: true });
    }

    // Create POs directory
    const posDir = path.join(workOrderDir, 'pos');
    if (!fs.existsSync(posDir)) {
      await mkdir(posDir, { recursive: true });
    }

    return workOrderDir;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to create directory structure: ${error.message}`);
    } else {
      throw new Error('Failed to create directory structure: Unknown error');
    }
  }
}

/**
 * Format the current date and time in a consistent format
 * 
 * @returns Formatted date and time string (YYYY-MM-DD at HH:MM:SS)
 */
export function getFormattedDateTime(): string {
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
export function getFormattedServiceImportTime(): string {
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
export async function createNotesFile(workOrderNumber: string): Promise<string> {
  try {
    // Validate work order number
    if (!/^\d{7}$/.test(workOrderNumber)) {
      throw new Error('Work order number must be exactly 7 digits');
    }

    // Create directory if it doesn't exist
    const workOrderDir = await createWorkOrderDirectory(workOrderNumber);

    // Create notes file
    const notesFilePath = path.join(workOrderDir, `${workOrderNumber}_notes.md`);
    
    // Only create the file if it doesn't exist
    if (!fs.existsSync(notesFilePath)) {
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
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to create notes file: ${error.message}`);
    } else {
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
export async function getNotesFilePath(workOrderNumber: string): Promise<string> {
  // Validate work order number
  if (!/^\d{7}$/.test(workOrderNumber)) {
    throw new Error('Work order number must be exactly 7 digits');
  }

  const notesFilePath = path.join(BASE_DIR, workOrderNumber, `${workOrderNumber}_notes.md`);
  
  // Check if the file exists
  if (!fs.existsSync(notesFilePath)) {
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
export async function readNotesFile(workOrderNumber: string): Promise<string> {
  try {
    const notesFilePath = await getNotesFilePath(workOrderNumber);
    const content = await readFile(notesFilePath, 'utf8');
    return content;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to read notes file: ${error.message}`);
    } else {
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
export async function writeNotesFile(workOrderNumber: string, content: string): Promise<void> {
  try {
    const notesFilePath = await getNotesFilePath(workOrderNumber);
    await writeFile(notesFilePath, content, 'utf8');
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to write notes file: ${error.message}`);
    } else {
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
export async function appendImportedServicesToNotes(
  workOrderNumber: string,
  services: string[]
): Promise<void> {
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
    } else {
      servicesSection += 'No services found\n\n';
    }
    
    // Append to content
    const updatedContent = currentContent + servicesSection;
    
    // Write updated content
    await writeNotesFile(workOrderNumber, updatedContent);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to append imported services: ${error.message}`);
    } else {
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
export async function openNotesFile(workOrderNumber: string): Promise<void> {
  // This will be implemented in a separate file
}