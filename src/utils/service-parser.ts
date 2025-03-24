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
  notes: string;
}

/**
 * Interface for a service with codes ready for stacking
 */
export interface StackableService {
  verb_code: number;
  noun_code?: number;
  datetime: string;
  notes: string;
}

/**
 * Parse service entries from a work order markdown file
 * 
 * @param workOrderNumber - The work order number
 * @returns An array of parsed services
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

    // Extract services that don't have the (||) marker
    const services: ParsedService[] = [];
    
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
        const notes = serviceMatch[4]?.trim() || '';
        
        // Add the service to the array
        services.push({
          verb,
          noun,
          datetime,
          notes
        });
        
        // Log for debugging
        console.log(`Found service: Verb="${verb}", Noun="${noun || ''}", datetime="${datetime}", notes="${notes}"`);
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
        notes: service.notes
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