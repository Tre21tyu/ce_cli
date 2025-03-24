import chalk from 'chalk';
import { StackManager } from '../utils/stack-manager';

/**
 * Add a work order to the stack for processing
 * 
 * @param workOrderNumber - 7-digit work order number
 * @returns A promise that resolves to a success message
 */
export async function stackWorkOrder(workOrderNumber: string): Promise<string> {
  try {
    // Input validation
    if (!workOrderNumber || workOrderNumber.trim() === '') {
      throw new Error('Work order number is required');
    }

    // Validate work order number format
    if (!/^\d{7}$/.test(workOrderNumber)) {
      throw new Error('Work order number must be exactly 7 digits');
    }

    // Get stack manager instance
    const stackManager = StackManager.getInstance();

    // Add the work order to the stack
    const result = await stackManager.addWorkOrderToStack(workOrderNumber);

    return result;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to stack work order: ${error.message}`);
    } else {
      throw new Error('Failed to stack work order: Unknown error');
    }
  }
}

/**
 * Display the current stack
 * 
 * @returns A promise that resolves to a formatted string representation of the stack
 */
export async function displayStack(): Promise<string> {
  try {
    // Get stack manager instance
    const stackManager = StackManager.getInstance();

    // Get the formatted stack
    const formattedStack = await stackManager.formatStack();
    
    return formattedStack;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to display stack: ${error.message}`);
    } else {
      throw new Error('Failed to display stack: Unknown error');
    }
  }
}

/**
 * Clear the stack
 * 
 * @returns A promise that resolves to a success message
 */
export async function clearStack(): Promise<string> {
  try {
    // Get stack manager instance
    const stackManager = StackManager.getInstance();

    // Clear the stack
    const result = await stackManager.clearStack();
    
    return result;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to clear stack: ${error.message}`);
    } else {
      throw new Error('Failed to clear stack: Unknown error');
    }
  }
}