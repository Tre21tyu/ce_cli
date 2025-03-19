import { WorkDatabase } from '../database';
import chalk from 'chalk';

/**
 * Get detailed information for a specific work order
 * 
 * @param workOrderNumber - 7-digit work order number
 * @returns A formatted string with work order details including services and parts
 */
export async function getWorkOrderDetails(workOrderNumber: string): Promise<string> {
  try {
    // Validate input
    if (!workOrderNumber || workOrderNumber.trim() === '') {
      throw new Error('Work order number is required');
    }

    // Get database instance
    const db = WorkDatabase.getInstance();

    // Get work order details
    const workOrder = await db.getWorkOrderDetails(workOrderNumber);

    // Format the results
    return formatWorkOrderDetails(workOrder);
  } catch (error) {
    // Handle errors
    if (error instanceof Error) {
      throw new Error(`Failed to get work order details: ${error.message}`);
    } else {
      throw new Error('Failed to get work order details: Unknown error');
    }
  }
}

/**
 * Format work order details into a readable string
 * 
 * @param workOrder - Work order details to format
 * @returns A formatted string with work order details
 */
function formatWorkOrderDetails(workOrder: any): string {
  // Create header
  let result = '\n';
  result += chalk.cyan('=============================================================\n');
  result += chalk.cyan(`        WORK ORDER: ${workOrder.workOrderNumber}              \n`);
  result += chalk.cyan('=============================================================\n\n');

  // Basic work order information
  result += chalk.white(`Control Number: ${workOrder.controlNumber || 'N/A'}\n`);
  
  // Status
  const statusColor = workOrder.open ? chalk.green : chalk.gray;
  const statusText = workOrder.open ? 'OPEN' : 'CLOSED';
  result += `Status: ${statusColor(statusText)}\n`;
  
  // Dates
  const openedDate = new Date(workOrder.dateOpened).toLocaleString();
  result += `Opened: ${openedDate}\n`;
  
  if (!workOrder.open && workOrder.dateClosed) {
    const closedDate = new Date(workOrder.dateClosed).toLocaleString();
    result += `Closed: ${closedDate}\n`;
  }
  
  // Add notes if they exist
  if (workOrder.notes) {
    result += `\nNotes: ${workOrder.notes}\n`;
  }
  
  // Services section
  result += chalk.cyan('\n----- SERVICES -----\n\n');
  
  if (workOrder.services && workOrder.services.length > 0) {
    workOrder.services.forEach((service: any, index: number) => {
      const serviceDate = new Date(service.dateAdded).toLocaleString();
      result += chalk.yellow(`${index + 1}. ${service.verb} ${service.noun}\n`);
      result += `   Date: ${serviceDate}\n`;
      result += `   Duration: ${service.duration} minutes\n`;
      
      // Add service notes if they exist
      if (service.notes) {
        result += `   Notes: ${service.notes}\n`;
      }
      
      // Parts section for this service
      if (service.partsCharged && service.partsCharged.length > 0) {
        result += chalk.magenta('   Parts:\n');
        
        let totalPartsCost = 0;
        service.partsCharged.forEach((part: any) => {
          const partCost = part.cost * part.quantity;
          totalPartsCost += partCost;
          
          result += `     - ${part.partNumber} x${part.quantity}: $${partCost.toFixed(2)}\n`;
        });
        
        result += chalk.magenta(`   Total Parts Cost: $${totalPartsCost.toFixed(2)}\n`);
      } else {
        result += chalk.magenta('   No parts charged\n');
      }
      
      // Add separator between services
      if (index < workOrder.services.length - 1) {
        result += '\n';
      }
    });
  } else {
    result += 'No services recorded for this work order.\n';
  }
  
  // Add footer
  result += chalk.cyan('\n=============================================================\n');
  
  return result;
}
