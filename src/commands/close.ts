import { WorkDatabase } from '../database';
import chalk from 'chalk';

/**
 * Close a work order
 * 
 * @param workOrderNumber - 7-digit work order number
 * @returns A success message
 */
export async function closeWorkOrder(workOrderNumber: string): Promise<string> {
  try {
    // Validate input
    if (!workOrderNumber || workOrderNumber.trim() === '') {
      throw new Error('Work order number is required');
    }

    // Get database instance
    const db = WorkDatabase.getInstance();

    // Close work order
    const result = await db.closeWorkOrder(workOrderNumber);
    
    // Return success message
    return chalk.green(result);
  } catch (error) {
    // Handle errors
    if (error instanceof Error) {
      throw new Error(`Failed to close work order: ${error.message}`);
    } else {
      throw new Error('Failed to close work order: Unknown error');
    }
  }
}
