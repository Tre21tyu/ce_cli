import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import chalk from 'chalk';
import { CodeLookup } from './code-lookup';

// Convert fs functions to use promises
const readFile = promisify(fs.readFile);
const exists = promisify(fs.exists);

///////////////////////////** INTERFACES **/////////////////////////////////

/**
 * Interface for a work order in the stack
 */
export interface StackedWorkOrder {
  workOrderNumber: string;
  controlNumber?: string;
  services: StackableService[];
  notes: string;
  shouldCloseOnPush?: boolean; // New flag to indicate if work order should be closed when pushed
}

/**
 * Interface for a parsed service from a markdown file
 */
export interface ParsedService {
  verb: string;
  noun?: string;
  datetime: string;
  notes: string;
  hasClosingToken?: boolean; // New flag to track if this service has the closing token
}

/**
 * Interface for a service with codes ready for stacking
 */
export interface StackableService {
  verb_code: number;
  noun_code?: number;
  datetime: string;
  notes: string;
  serviceTimeCalculated?: number; // Time calculated from time management system
  pushedToMM?: number; // Boolean flag (0/1) indicating if pushed to Medimizer
  hasClosingToken?: boolean; // New flag to track if this service has the closing token
}

/**
 * Parse service entries from a work order markdown file
 * 
 * @param workOrderNumber - The work order number
 * @returns An object with parsed services and closing flag
 */
export async function parseServices(workOrderNumber: string): Promise<{
  services: ParsedService[],
  shouldCloseWorkOrder: boolean
}> {
  try {
    // Build the path to the work order's markdown file
    const mdFilePath = path.join(
      process.cwd(),
      'work_orders',
      workOrderNumber,
      `${workOrderNumber}_notes.md`
    );

    // Check if the file exists
    if (!(await exists(mdFilePath))) {
      throw new Error(`Notes file for work order ${workOrderNumber} not found`);
    }

    // Read the file
    const content = await readFile(mdFilePath, 'utf8');

    // Extract services that don't have the (||) marker
    const services: ParsedService[] = [];
    let shouldCloseWorkOrder = false;
    
    // Split the content into lines for better processing
    const lines = content.split('\n');
    
    // Log for debugging
    console.log(`Processing ${lines.length} lines in ${workOrderNumber}_notes.md`);
    
    // Process each line individually
    for (const line of lines) {
      // Skip if the line contains the (||) marker (already processed)
      if (line.includes('(||)')) {
        continue;
      }
      
      // Use a simpler regex to match service lines
      // Format: [Verb] (datetime) => notes or [Verb, Noun] (datetime) => notes
      const serviceMatch = line.match(/^\s*\[(.*?)(?:,\s*(.*?))?\]\s*\((.*?)\)\s*=>\s*(.*?)\s*$/);
      
      if (serviceMatch) {
        const verb = serviceMatch[1]?.trim() || '';
        const noun = serviceMatch[2]?.trim();
        const datetime = serviceMatch[3]?.trim() || '';
        let notes = serviceMatch[4]?.trim() || '';
        
        // Check for closing token
        const hasClosingToken = notes.endsWith('=|');
        if (hasClosingToken) {
          // Remove token from notes
          notes = notes.substring(0, notes.length - 2).trim();
          
          // Only the last service should have the closing token
          if (shouldCloseWorkOrder) {
            throw new Error('Closing token =| can only appear once in the file');
          }
          
          shouldCloseWorkOrder = true;
        }
        
        // Add the service to the array
        services.push({
          verb,
          noun,
          datetime,
          notes,
          hasClosingToken
        });
        
        // Log for debugging
        console.log(`Found service: Verb="${verb}", Noun="${noun || ''}", datetime="${datetime}", notes="${notes}"${hasClosingToken ? ' (will close work order)' : ''}`);
      }
    }
    
    // Validate closing token only appears in the last service
    if (shouldCloseWorkOrder && services.length > 0) {
      const lastService = services[services.length - 1];
      if (!lastService.hasClosingToken) {
        throw new Error('Closing token =| can only appear in the last service entry');
      }
    }
    
    console.log(chalk.green(`Found ${services.length} services to process in work order ${workOrderNumber}${shouldCloseWorkOrder ? ' (will close work order)' : ''}`));
    
    return { services, shouldCloseWorkOrder };
  } catch (error) {
    console.error(chalk.red(`Error parsing services for work order ${workOrderNumber}:`), error);
    throw new Error(`Failed to parse services for work order ${workOrderNumber}`);
  }
}

/**
 * Convert parsed services to stackable services with the appropriate codes
 * 
 * @param services - The parsed services
 * @returns An array of stackable services with codes
 */
export async function convertToStackableServices(
  parsedServices: ParsedService[]
): Promise<{ 
  services: StackableService[],
  shouldCloseWorkOrder: boolean 
}> {
  try {
    // Initialize the code lookup if needed
    const codeLookup = CodeLookup.getInstance();
    await codeLookup.initialize();
    
    const stackableServices: StackableService[] = [];
    let shouldCloseWorkOrder = false;
    
    for (const service of parsedServices) {
      // Look up the verb code
      const verb = codeLookup.findVerb(service.verb);
      if (!verb) {
        console.error(chalk.red(`Verb "${service.verb}" not found in lookup table`));
        continue;
      }
      
      // Create the stackable service
      const stackableService: StackableService = {
        verb_code: verb.code,
        datetime: service.datetime,
        notes: service.notes,
        hasClosingToken: service.hasClosingToken
      };
      
      // Track closing flag
      if (service.hasClosingToken) {
        shouldCloseWorkOrder = true;
      }
      
      // If the verb has a noun and a noun was provided, look it up
      if (verb.hasNoun && service.noun) {
        const nounCode = codeLookup.findNoun(service.noun);
        if (!nounCode) {
          console.error(chalk.red(`Noun "${service.noun}" not found in lookup table`));
          continue;
        }
        
        stackableService.noun_code = nounCode;
      }
      
      // Add the service to the array
      stackableServices.push(stackableService);
    }
    
    console.log(chalk.green(`Converted ${stackableServices.length} services to stackable format${shouldCloseWorkOrder ? ' (will close work order)' : ''}`));
    
    return { services: stackableServices, shouldCloseWorkOrder };
  } catch (error) {
    console.error(chalk.red('Error converting to stackable services:'), error);
    throw new Error('Failed to convert services to stackable format');
  }
}