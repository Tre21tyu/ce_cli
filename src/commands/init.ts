import { WorkDatabase } from '../database';
import { createWorkOrderDirectory, createNotesFile } from '../utils/filesystem';

/**
 * Initialize a new work order
 * 
 * This command creates a new work order in the database with the provided 7-digit number
 * and optional 8-digit control number. It also creates a directory structure for the work order.
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

    // Return success message
    return `Work order ${workOrderNumber} initialized successfully with directory structure`;
  } catch (error) {
    // Handle errors
    if (error instanceof Error) {
      throw new Error(`Failed to initialize work order: ${error.message}`);
    } else {
      throw new Error('Failed to initialize work order: Unknown error');
    }
  }
}
