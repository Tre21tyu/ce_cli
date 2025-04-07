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
  serviceTimeCalculated?: number; // Time calculated from time management system
  pushedToMM?: number; // Boolean flag (0/1) indicating if pushed to Medimizer
}

/**
 * Parse service entries from a work order markdown file
 * 
 * @param workOrderNumber - The work order number
 * @returns An array of parsed services with import timestamp
 */
export async function parseServices(workOrderNumber: string): Promise<{
  services: ParsedService[],
  importTimestamp: string | null
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

    // Extract import timestamp if available
    const importMatch = content.match(/IMPORTED\s+(?:FROM\s+MM|SERVICES\s+FROM\s+MM)\s+(?:ON|@)\s+([\d-]+\s+(?:at\s+)?[\d:]+)/i);
    const importTimestamp = importMatch ? importMatch[1] : null;

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
      const serviceMatch = line.match(/^\s*\[(.*?)(?:,\s*(.*?))?\]\s*(?:\(\d+min\))?\s*\((.*?)\)\s*=>\s*(.*?)\s*$/);
      
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
    
    return { services, importTimestamp };
  } catch (error) {
    console.error(chalk.red(`Error parsing services for work order ${workOrderNumber}:`), error);
    throw new Error(`Failed to parse services for work order ${workOrderNumber}`);
  }
}

/**
 * Calculate time differences between consecutive services
 * 
 * @param services - Array of parsed services
 * @param importTimestamp - Timestamp of when the work order was imported
 * @returns Array of services with calculated time
 */
export function calculateServiceTimes(
  services: ParsedService[],
  importTimestamp: string | null
): ParsedService[] {
  // Sort services by datetime
  const sortedServices = [...services].sort((a, b) => {
    return convertDatetimeToDate(a.datetime).getTime() - convertDatetimeToDate(b.datetime).getTime();
  });

  // Calculate time differences
  const servicesWithTime = sortedServices.map((service, index) => {
    const currentDateTime = convertDatetimeToDate(service.datetime);
    
    // For the first service, use import timestamp if available
    if (index === 0) {
      if (importTimestamp) {
        const importDate = convertImportTimestampToDate(importTimestamp);
        const diffMinutes = Math.round((currentDateTime.getTime() - importDate.getTime()) / 60000);
        return { 
          ...service, 
          serviceTimeCalculated: diffMinutes > 0 ? diffMinutes : 0 
        };
      }
      return { ...service, serviceTimeCalculated: 0 }; // Default to 0 if no import timestamp
    }

    // For subsequent services, use previous service timestamp
    const prevDateTime = convertDatetimeToDate(sortedServices[index - 1].datetime);
    const diffMinutes = Math.round((currentDateTime.getTime() - prevDateTime.getTime()) / 60000);
    
    return { 
      ...service, 
      serviceTimeCalculated: diffMinutes > 0 ? diffMinutes : 0 
    };
  });

  return servicesWithTime;
}

/**
 * Convert datetime string from service to Date object
 * 
 * @param datetime - Datetime string from service (format: YYYY-MM-DD HH-MM)
 * @returns JavaScript Date object
 */
export function convertDatetimeToDate(datetime: string): Date {
  try {
    // Handle various datetime formats
    // YYYY-MM-DD HH-MM format
    let match = datetime.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2})-(\d{2})/);
    
    if (match) {
      const [_, year, month, day, hours, minutes] = match;
      return new Date(
        parseInt(year), 
        parseInt(month) - 1, // JS months are 0-based
        parseInt(day),
        parseInt(hours),
        parseInt(minutes)
      );
    }
    
    // YYYY-MM-DD HH:MM format
    match = datetime.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
    
    if (match) {
      const [_, year, month, day, hours, minutes] = match;
      return new Date(
        parseInt(year), 
        parseInt(month) - 1, // JS months are 0-based
        parseInt(day),
        parseInt(hours),
        parseInt(minutes)
      );
    }
    
    // If we can't parse the datetime, return current date as fallback
    console.log(chalk.yellow(`Could not parse datetime: ${datetime}, using current time`));
    return new Date();
  } catch (error) {
    console.error(chalk.red(`Error converting datetime: ${error}`));
    return new Date(); // Fallback to current date
  }
}

/**
 * Convert import timestamp to Date object
 * 
 * @param timestamp - Import timestamp string
 * @returns JavaScript Date object
 */
export function convertImportTimestampToDate(timestamp: string): Date {
  try {
    // Format: YYYY-MM-DD at HH:MM:SS or YYYY-MM-DD HH:MM
    let match = timestamp.match(/(\d{4})-(\d{2})-(\d{2})\s+at\s+(\d{2}):(\d{2})(?::(\d{2}))?/);
    
    if (match) {
      const [_, year, month, day, hours, minutes, seconds = '0'] = match;
      return new Date(
        parseInt(year),
        parseInt(month) - 1, // JS months are 0-based
        parseInt(day),
        parseInt(hours),
        parseInt(minutes),
        parseInt(seconds)
      );
    }
    
    // Try alternative format: YYYY-MM-DD HH:MM
    match = timestamp.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
    
    if (match) {
      const [_, year, month, day, hours, minutes] = match;
      return new Date(
        parseInt(year),
        parseInt(month) - 1, // JS months are 0-based
        parseInt(day),
        parseInt(hours),
        parseInt(minutes)
      );
    }
    
    // If we can't parse the timestamp, return current date as fallback
    console.log(chalk.yellow(`Could not parse import timestamp: ${timestamp}, using current time`));
    return new Date();
  } catch (error) {
    console.error(chalk.red(`Error converting import timestamp: ${error}`));
    return new Date(); // Fallback to current date
  }
}

/**
 * Convert parsed services to stackable services with the appropriate codes
 * 
 * @param services - The parsed services
 * @param importTimestamp - Timestamp of when the work order was imported
 * @returns An array of stackable services with codes
 */
export async function convertToStackableServices(
  services: ParsedService[],
  importTimestamp: string | null
): Promise<StackableService[]> {
  try {
    // Initialize the code lookup if needed
    const codeLookup = CodeLookup.getInstance();
    await codeLookup.initialize();
    
    // Calculate time differences between services
    const servicesWithTime = calculateServiceTimes(services, importTimestamp);
    
    const stackableServices: StackableService[] = [];
    
    for (const service of servicesWithTime) {
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
        serviceTimeCalculated: (service as any).serviceTimeCalculated || 0
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