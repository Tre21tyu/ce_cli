import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import chalk from 'chalk';
import { CodeLookup } from './code-lookup';

// Convert fs functions to use promises
const readFile = promisify(fs.readFile);
const exists = promisify(fs.exists);

/**
 * Interface for a parsed service from a markdown file
 */
export interface ParsedService {
  verb: string;
  noun?: string;
  datetime: string;
  timestamp: Date;  // Actual date object for time calculations
  notes: string;
  calculatedMinutes?: number;  // Minutes calculated from previous timestamp
}

/**
 * Interface for a service with codes ready for stacking
 */
export interface StackableService {
  verb_code: number;
  noun_code?: number;
  datetime: string;
  notes: string;
  calculatedMinutes: number;  // Time calculated from previous timestamp
  pushedToMM?: number;  // Boolean flag (0/1) indicating if pushed to Medimizer
}

/**
 * Parse service entries from a work order markdown file with time calculations
 * 
 * @param workOrderNumber - The work order number
 * @returns An array of parsed services with calculated durations
 */
export async function parseServices(workOrderNumber: string): Promise<ParsedService[]> {
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

    // Extract START/RESUME TIME
    let startTime: Date | null = null;
    const startTimeMatch = content.match(/START\/RESUME TIME:\s*(\d{1,2}:\d{1,2}:\d{1,2})/);
    
    if (startTimeMatch && startTimeMatch[1]) {
      // Create a date object for the start time
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      startTime = new Date(`${today}T${startTimeMatch[1]}`);
    }

    // Extract services that don't have the (||) marker
    const services: ParsedService[] = [];
    
    // Split the content into lines for better processing
    const lines = content.split('\n');
    
    // Log for debugging
    console.log(`Processing ${lines.length} lines in ${workOrderNumber}_notes.md`);

    // Track previous timestamp for duration calculations
    let previousTimestamp = startTime;
    
    // Process each line individually
    for (const line of lines) {
      // Skip if the line contains the (||) marker (already processed)
      if (line.includes('(||)')) {
        continue;
      }
      
      // Use a regex to match service lines
      // Format: [Verb, Noun] (YYYY-MM-DD HH:MM) => notes or [Verb] (YYYY-MM-DD HH:MM) => notes
      const serviceMatch = line.match(/^\s*\[(.*?)(?:,\s*(.*?))?\]\s*\((\d{4}-\d{2}-\d{2}\s+\d{1,2}:\d{2}(?::\d{2})?)\)\s*=>\s*(.*?)\s*$/);
      
      if (serviceMatch) {
        const verb = serviceMatch[1]?.trim() || '';
        const noun = serviceMatch[2]?.trim();
        const datetime = serviceMatch[3]?.trim() || '';
        const notes = serviceMatch[4]?.trim() || '';
        
        // Parse the timestamp
        const timestamp = new Date(datetime);
        
        // Calculate minutes since previous timestamp/start time
        let calculatedMinutes = 0;
        if (previousTimestamp && !isNaN(timestamp.getTime())) {
          // Calculate minutes difference
          calculatedMinutes = Math.round((timestamp.getTime() - previousTimestamp.getTime()) / 60000);
          
          // Update previous timestamp for next calculation
          previousTimestamp = timestamp;
        }
        
        // Add the service to the array
        services.push({
          verb,
          noun,
          datetime,
          timestamp,
          notes,
          calculatedMinutes
        });
        
        // Log for debugging
        console.log(`Found service: Verb="${verb}", Noun="${noun || ''}", datetime="${datetime}", calculatedMinutes=${calculatedMinutes}, notes="${notes}"`);
      }
    }
    
    console.log(chalk.green(`Found ${services.length} services to process in work order ${workOrderNumber}`));
    
    return services;
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
  services: ParsedService[]
): Promise<StackableService[]> {
  try {
    // Initialize the code lookup if needed
    const codeLookup = CodeLookup.getInstance();
    await codeLookup.initialize();
    
    const stackableServices: StackableService[] = [];
    
    for (const service of services) {
      // Skip services with 0 or negative calculated minutes
      if (!service.calculatedMinutes || service.calculatedMinutes <= 0) {
        console.log(chalk.yellow(`Skipping service with ${service.calculatedMinutes} minutes: ${service.verb} ${service.noun || ''}`));
        continue;
      }

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
        calculatedMinutes: service.calculatedMinutes || 0
      };
      
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
    
    console.log(chalk.green(`Converted ${stackableServices.length} services to stackable format`));
    
    return stackableServices;
  } catch (error) {
    console.error(chalk.red('Error converting to stackable services:'), error);
    throw new Error('Failed to convert services to stackable format');
  }
}