import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import chalk from 'chalk';
import { parseServicesFromNotes, validateServices } from '../commands/note';
import { readNotesFile, writeNotesFile } from '../utils/filesystem';

// Convert callback-based fs functions to Promise-based
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const exists = promisify(fs.exists);

/**
 * Interface for a stacked work order
 */
interface StackedWorkOrder {
  workOrderNumber: string;
  services: Array<{
    verb: string;
    noun: string;
    description: string;
  }>;
}

/**
 * Class to manage the stack of work orders to be pushed to Medimizer
 */
export class StackManager {
  private stackFile: string;
  private static instance: StackManager;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    // Set the path to the stack file
    this.stackFile = path.join(process.cwd(), 'data', 'stack.json');

    // Create the data directory if it doesn't exist
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Create the stack file if it doesn't exist
    if (!fs.existsSync(this.stackFile)) {
      fs.writeFileSync(this.stackFile, JSON.stringify([], null, 2), 'utf8');
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
   * Get the current stack
   * 
   * @returns A promise that resolves to the current stack
   */
  public async getStack(): Promise<StackedWorkOrder[]> {
    try {
      const data = await readFile(this.stackFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to read stack: ${error.message}`);
      } else {
        throw new Error('Failed to read stack: Unknown error');
      }
    }
  }

  /**
   * Save the stack
   * 
   * @param stack - Stack to save
   * @returns A promise that resolves when the stack is saved
   */
  public async saveStack(stack: StackedWorkOrder[]): Promise<void> {
    try {
      await writeFile(this.stackFile, JSON.stringify(stack, null, 2), 'utf8');
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to save stack: ${error.message}`);
      } else {
        throw new Error('Failed to save stack: Unknown error');
      }
    }
  }

  /**
   * Stack a work order for pushing to Medimizer
   * 
   * @param workOrderNumber - 7-digit work order number
   * @returns A promise that resolves to a result message
   */
  public async stackWorkOrder(workOrderNumber: string): Promise<string> {
    try {
      // Read the notes file
      const notes = await readNotesFile(workOrderNumber);

      // Parse services from notes
      const services = parseServicesFromNotes(notes);

      // Validate services
      const validationResults = await validateServices(services);

      // Check if any services are invalid
      const invalidServices = validationResults.filter(
        (result) => !result.verbValid || !result.nounValid
      );

      if (invalidServices.length > 0) {
        let errorMessage = `Invalid services found in notes:\n`;
        
        invalidServices.forEach((service) => {
          errorMessage += `  [${service.verb}${service.noun ? `, ${service.noun}` : ''}] => ${service.description}\n`;
          if (!service.verbValid) {
            errorMessage += `    - Invalid verb: ${service.verb}\n`;
          }
          if (!service.nounValid) {
            errorMessage += `    - Invalid noun: ${service.noun}\n`;
          }
        });
        
        throw new Error(errorMessage);
      }

      // Get the current stack
      const stack = await this.getStack();

      // Check if work order is already in the stack
      const existingIndex = stack.findIndex(
        (wo) => wo.workOrderNumber === workOrderNumber
      );

      if (existingIndex !== -1) {
        // Replace existing work order
        stack[existingIndex] = {
          workOrderNumber,
          services: services.map(({ verb, noun, description }) => ({
            verb,
            noun,
            description,
          })),
        };
      } else {
        // Add new work order to stack
        stack.push({
          workOrderNumber,
          services: services.map(({ verb, noun, description }) => ({
            verb,
            noun,
            description,
          })),
        });
      }

      // Save the updated stack
      await this.saveStack(stack);

      // Update the notes file with a timestamp
      const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const updatedNotes = `${notes}

================================
PUSHED TO MM ON ${currentDate}
================================

`;
      await writeNotesFile(workOrderNumber, updatedNotes);

      return `Work order ${workOrderNumber} with ${services.length} services stacked successfully`;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to stack work order: ${error.message}`);
      } else {
        throw new Error('Failed to stack work order: Unknown error');
      }
    }
  }

  /**
   * Get the next work order in the stack
   * 
   * @returns A promise that resolves to the next work order or null if stack is empty
   */
  public async getNextWorkOrder(): Promise<StackedWorkOrder | null> {
    try {
      const stack = await this.getStack();
      
      if (stack.length === 0) {
        return null;
      }
      
      return stack[0];
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get next work order: ${error.message}`);
      } else {
        throw new Error('Failed to get next work order: Unknown error');
      }
    }
  }

  /**
   * Remove a work order from the stack
   * 
   * @param workOrderNumber - 7-digit work order number
   * @returns A promise that resolves when the work order is removed
   */
  public async removeWorkOrder(workOrderNumber: string): Promise<void> {
    try {
      // Get the current stack
      const stack = await this.getStack();
      
      // Filter out the work order
      const newStack = stack.filter(
        (wo) => wo.workOrderNumber !== workOrderNumber
      );
      
      // Save the updated stack
      await this.saveStack(newStack);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to remove work order: ${error.message}`);
      } else {
        throw new Error('Failed to remove work order: Unknown error');
      }
    }
  }
}
