import { WorkDatabase } from '../database';
import { WorkOrder } from '../models/workOrder';
import chalk from 'chalk';

/**
 * List all work orders from the database
 * 
 * @returns A formatted string containing all work orders
 */
export async function listWorkOrders(): Promise<string> {
  try {
    // Get database instance
    const db = WorkDatabase.getInstance();

    // Get all work orders
    const workOrders = await db.getAllWorkOrders();

    // Handle case with no work orders
    if (workOrders.length === 0) {
      return 'No work orders found in the database.';
    }

    // Format the results
    return formatWorkOrdersList(workOrders);
  } catch (error) {
    // Handle errors
    if (error instanceof Error) {
      throw new Error(`Failed to list work orders: ${error.message}`);
    } else {
      throw new Error('Failed to list work orders: Unknown error');
    }
  }
}

/**
 * Format work orders into a readable string
 * 
 * @param workOrders - Array of work orders to format
 * @returns A formatted string with work order details
 */
function formatWorkOrdersList(workOrders: WorkOrder[]): string {
  // Create header
  let result = '\n';
  result += chalk.cyan('=============================================================\n');
  result += chalk.cyan('                      WORK ORDERS                            \n');
  result += chalk.cyan('=============================================================\n\n');

  // Add each work order
  workOrders.forEach((wo, index) => {
    // Determine color based on open status
    const statusColor = wo.open ? chalk.green : chalk.gray;
    const statusText = wo.open ? 'OPEN' : 'CLOSED';
    
    // Format dates to be more readable
    const openedDate = new Date(wo.dateOpened).toLocaleString();
    const closedDate = wo.dateClosed ? new Date(wo.dateClosed).toLocaleString() : 'N/A';
    
    // Add work order details
    result += chalk.white(`WO #${wo.workOrderNumber}`);
    if (wo.controlNumber) {
      result += chalk.white(` (Control: ${wo.controlNumber})`);
    }
    result += '\n';
    
    result += `Status: ${statusColor(statusText)}\n`;
    result += `Opened: ${openedDate}\n`;
    
    if (!wo.open && wo.dateClosed) {
      result += `Closed: ${closedDate}\n`;
    }
    
    // Add notes if they exist
    if (wo.notes) {
      result += `Notes: ${wo.notes}\n`;
    }
    
    // Add separator between work orders (except after the last one)
    if (index < workOrders.length - 1) {
      result += chalk.cyan('-------------------------------------------------------------\n');
    }
  });

  // Add footer
  result += chalk.cyan('\n=============================================================\n');
  result += `Total: ${workOrders.length} work order(s)\n`;
  result += `Open: ${workOrders.filter(wo => wo.open).length} | `;
  result += `Closed: ${workOrders.filter(wo => !wo.open).length}\n`;

  return result;
}
