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
 * Open the notes file in the default editor
 * 
 * @param workOrderNumber - 7-digit work order number
 * @returns A promise that resolves when the editor is closed
 */
export async function openNotesFile(workOrderNumber: string): Promise<void> {
  // This will be implemented in a separate file
}
