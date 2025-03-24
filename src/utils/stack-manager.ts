import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import chalk from 'chalk';
import { StackableService, parseServices, convertToStackableServices } from './service-parser';
import { WorkDatabase } from '../database';

// Convert fs functions to use promises
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const exists = promisify(fs.exists);
const mkdir = promisify(fs.mkdir);

/**
 * Interface for a work order in the stack
 */
export interface StackedWorkOrder {
  workOrderNumber: string;
  controlNumber?: string;
  services: StackableService[];
  notes: string;
}

/**
 * Class for managing the stack of work orders for export to Medimizer
 */
export class StackManager {
  private static instance: StackManager;
  private stackFile: string;
  private stack: StackedWorkOrder[] = [];

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    // Set the path to the stack file
    this.stackFile = path.join(process.cwd(), 'data', 'service_stack.json');
    
    // Create the data directory if it doesn't exist
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): StackManager {
    if (!StackManager.instance) {
      StackManager.instance = new StackManager();
    }
    return StackManager.instance;
  }

  /**
   * Load the stack from the file
   */
  public async loadStack(): Promise<void> {
    try {
      // Create the stack file if it doesn't exist
      if (!(await exists(this.stackFile))) {
        await writeFile(this.stackFile, JSON.stringify([], null, 2), 'utf8');
        this.stack = [];
        return;
      }
      
      // Read the stack file
      const data = await readFile(this.stackFile, 'utf8');
      this.stack = JSON.parse(data);
    } catch (error) {
      console.error(chalk.red('Error loading stack:'), error);
      this.stack = [];
    }
  }

  /**
   * Save the stack to the file
   */
  public async saveStack(): Promise<void> {
    try {
      await writeFile(this.stackFile, JSON.stringify(this.stack, null, 2), 'utf8');
    } catch (error) {
      console.error(chalk.red('Error saving stack:'), error);
      throw new Error('Failed to save stack');
    }
  }

  /**
   * Add a work order to the stack
   * 
   * @param workOrderNumber - The work order number
   * @returns A promise that resolves to a success message
   */
  public async addWorkOrderToStack(workOrderNumber: string): Promise<string> {
    try {
      // Load the stack if not already loaded
      if (this.stack.length === 0) {
        await this.loadStack();
      }
      
      // Get work order details from the database
      const db = WorkDatabase.getInstance();
      const workOrder = await db.getWorkOrder(workOrderNumber);
      
      if (!workOrder) {
        throw new Error(`Work order ${workOrderNumber} not found in database`);
      }
      
      // Parse services from the work order's markdown file
      const parsedServices = await parseServices(workOrderNumber);
      
      if (parsedServices.length === 0) {
        return `No services found to add for work order ${workOrderNumber}`;
      }
      
      // Convert the parsed services to stackable services
      const stackableServices = await convertToStackableServices(parsedServices);
      
      if (stackableServices.length === 0) {
        return `No valid services found for work order ${workOrderNumber}`;
      }
      
      // Combine all notes from services
      const combinedNotes = stackableServices.map(service => {
        return `${service.datetime}\n${service.notes}`;
      }).join('\n\n');
      
      // Check if the work order is already in the stack
      const existingIndex = this.stack.findIndex(wo => wo.workOrderNumber === workOrderNumber);
      
      if (existingIndex !== -1) {
        // Update the existing work order
        this.stack[existingIndex].services = stackableServices;
        this.stack[existingIndex].notes = combinedNotes;
      } else {
        // Add a new work order to the stack
        this.stack.push({
          workOrderNumber,
          controlNumber: workOrder.controlNumber,
          services: stackableServices,
          notes: combinedNotes
        });
      }
      
      // Save the updated stack
      await this.saveStack();
      
      return `Added ${stackableServices.length} services for work order ${workOrderNumber} to the stack`;
    } catch (error) {
      console.error(chalk.red(`Error adding work order ${workOrderNumber} to stack:`), error);
      throw new Error(`Failed to add work order ${workOrderNumber} to stack: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clear the stack
   * 
   * @returns A promise that resolves to a success message
   */
  public async clearStack(): Promise<string> {
    try {
      this.stack = [];
      await this.saveStack();
      return 'Stack cleared successfully';
    } catch (error) {
      console.error(chalk.red('Error clearing stack:'), error);
      throw new Error('Failed to clear stack');
    }
  }

  /**
   * Get the current stack
   * 
   * @returns The current stack of work orders
   */
  public async getStack(): Promise<StackedWorkOrder[]> {
    if (this.stack.length === 0) {
      await this.loadStack();
    }
    return this.stack;
  }

  /**
   * Format the stack for display
   * 
   * @returns A formatted string representation of the stack
   */
  public async formatStack(): Promise<string> {
    try {
      // Get the current stack
      const stack = await this.getStack();
      
      if (stack.length === 0) {
        return `
=============================================================
-----------------------CE_CLI STACK--------------------------
=============================================================

Stack is empty. Use the "stack <wo-number>" command to add work orders.

=============================================================
`;
      }
      
      // Build the header
      let result = `
=============================================================
-----------------------CE_CLI STACK--------------------------
=============================================================
`;
      
      // Add each work order
      stack.forEach((wo, index) => {
        result += `\n${index + 1}. Work Order ${wo.workOrderNumber} (${wo.services.length})`;
        
        if (wo.services.length > 0) {
          wo.services.forEach(service => {
            // Extract date part from datetime
            const datePart = service.datetime.split(' ')[0];
            
            // Format based on whether there's a noun
            if (service.noun_code !== undefined) {
              result += `\n   - (${datePart}) Verb Code: ${service.verb_code}, Noun Code: ${service.noun_code}`;
            } else {
              result += `\n   - (${datePart}) Verb Code: ${service.verb_code}`;
            }
          });
        } else {
          result += '\n   No services to export';
        }
        
        // Add separator between work orders
        if (index < stack.length - 1) {
          result += '\n';
        }
      });
      
      // Add footer
      result += `\n\n=============================================================`;
      
      return result;
    } catch (error) {
      console.error(chalk.red('Error formatting stack:'), error);
      throw new Error('Failed to format stack');
    }
  }
}