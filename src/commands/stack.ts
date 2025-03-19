import { WorkDatabase } from '../database';
import { StackManager } from '../utils/stack';
import chalk from 'chalk';

/**
 * Stack a work order for pushing to Medimizer
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

    // Get database instance
    const db = WorkDatabase.getInstance();

    // Check if work order exists in the database
    const workOrder = await db.getWorkOrder(workOrderNumber);
    if (!workOrder) {
      throw new Error(`Work order ${workOrderNumber} not found in the database`);
    }

    // Get stack manager instance
    const stackManager = StackManager.getInstance();

    // Stack the work order
    const result = await stackManager.stackWorkOrder(workOrderNumber);

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

    // Get the current stack
    const stack = await stackManager.getStack();

    // Format the stack for display
    return formatStack(stack);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to display stack: ${error.message}`);
    } else {
      throw new Error('Failed to display stack: Unknown error');
    }
  }
}

/**
 * Format the stack for display
 * 
 * @param stack - Stack to format
 * @returns A formatted string representation of the stack
 */
function formatStack(stack: any[]): string {
  // Create header
  let result = '\n';
  result += chalk.cyan('=============================================================\n');
  result += chalk.cyan('                    WORK ORDER STACK                         \n');
  result += chalk.cyan('=============================================================\n\n');

  if (stack.length === 0) {
    result += 'Stack is empty. Use the "stack <wo-number>" command to add work orders.\n';
  } else {
    // Add each work order in the stack
    stack.forEach((workOrder, index) => {
      result += chalk.white(`${index + 1}. Work Order #${workOrder.workOrderNumber}\n`);
      
      // Add services
      if (workOrder.services && workOrder.services.length > 0) {
        result += chalk.yellow(`   Services (${workOrder.services.length}):\n`);
        
        workOrder.services.forEach((service: any, serviceIndex: number) => {
          result += chalk.green(`     ${serviceIndex + 1}. [${service.verb}${service.noun ? `, ${service.noun}` : ''}] => `);
          result += chalk.white(`${service.description.substring(0, 50)}${service.description.length > 50 ? '...' : ''}\n`);
        });
      } else {
        result += chalk.yellow('   No services found\n');
      }
      
      // Add separator between work orders
      if (index < stack.length - 1) {
        result += chalk.cyan('-------------------------------------------------------------\n');
      }
    });
  }

  // Add footer
  result += chalk.cyan('\n=============================================================\n');
  result += `Total: ${stack.length} work order(s) in stack\n`;

  return result;
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
    await stackManager.saveStack([]);

    return 'Stack cleared successfully';
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to clear stack: ${error.message}`);
    } else {
      throw new Error('Failed to clear stack: Unknown error');
    }
  }
}
