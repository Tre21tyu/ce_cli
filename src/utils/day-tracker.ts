import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import chalk from 'chalk';

// Convert fs functions to promises
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const mkdir = promisify(fs.mkdir);
const exists = promisify(fs.exists);

/**
 * Interface for daily work tracking
 */
export interface DayTracker {
  day_begin: string;        // ISO string format
  day_begin_timestamp: number; // Milliseconds timestamp
  day_end?: string;         // ISO string format
  day_end_timestamp?: number; // Milliseconds timestamp
  total_day_minutes: number;
  total_service_minutes: number;
  date: string; // YYYY-MM-DD format
  work_orders: string[]; // List of work orders processed this day
}

/**
 * Class for tracking work days and service times
 */
export class DayTrackerManager {
  private static instance: DayTrackerManager;
  private currentDay?: DayTracker;
  private dayTrackerDir: string;
  
  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    // Set up the day tracker directory
    this.dayTrackerDir = path.join(process.cwd(), 'data', 'day_tracker');
    
    // Ensure directory exists
    if (!fs.existsSync(this.dayTrackerDir)) {
      fs.mkdirSync(this.dayTrackerDir, { recursive: true });
    }
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): DayTrackerManager {
    if (!DayTrackerManager.instance) {
      DayTrackerManager.instance = new DayTrackerManager();
    }
    return DayTrackerManager.instance;
  }

  /**
   * Start a new work day
   * 
   * @returns A message confirming the day has started
   */
  public async startDay(): Promise<string> {
    try {
      // Check if a day is already in progress
      if (this.currentDay && !this.currentDay.day_end) {
        return chalk.yellow(`A day is already in progress that started at ${new Date(this.currentDay.day_begin_timestamp).toLocaleTimeString()}. Please end it before starting a new one.`);
      }
      
      // Get current date and time
      const now = new Date();
      const currentTime = now.toLocaleTimeString();
      const currentTimestamp = now.getTime();
      const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Create new day tracker with timestamp
      this.currentDay = {
        day_begin: now.toISOString(),
        day_begin_timestamp: currentTimestamp,
        total_day_minutes: 0,
        total_service_minutes: 0,
        date: currentDate,
        work_orders: []
      };
      
      // Save to file
      await this.saveDayTracker();
      
      return chalk.green(`Day started at ${currentTime}`);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to start day: ${error.message}`);
      } else {
        throw new Error('Failed to start day: Unknown error');
      }
    }
  }

  /**
   * End the current work day
   * 
   * @returns A message summarizing the day
   */
  public async endDay(): Promise<string> {
    try {
      // Check if a day is in progress
      if (!this.currentDay) {
        return chalk.yellow('No day is currently in progress. Start a day first.');
      }
      
      if (this.currentDay.day_end) {
        return chalk.yellow(`The day is already ended at ${new Date(this.currentDay.day_end_timestamp || 0).toLocaleTimeString()}`);
      }
      
      // Get current time
      const now = new Date();
      const endTime = now.toLocaleTimeString();
      const endTimestamp = now.getTime();
      
      // Calculate day duration in minutes
      let totalMinutes = 0;
      
      if (this.currentDay.day_begin_timestamp) {
        // Use timestamp-based calculation
        totalMinutes = Math.max(1, Math.round((endTimestamp - this.currentDay.day_begin_timestamp) / 60000));
      } else {
        // Fallback to a default if timestamp is missing
        console.log(chalk.yellow('Warning: Missing start timestamp. Using default of 5 minutes.'));
        totalMinutes = 5;
      }
      
      // Update day tracker
      this.currentDay.day_end = now.toISOString();
      this.currentDay.day_end_timestamp = endTimestamp;
      this.currentDay.total_day_minutes = totalMinutes;
      
      // Save to file
      await this.saveDayTracker();
      
      // Format and return summary
      const servicePercentage = Math.round((this.currentDay.total_service_minutes / totalMinutes) * 100) || 0;
      
      return chalk.green(`
Day ended at ${endTime}
---------------------
Total day duration: ${totalMinutes} minutes
Service time logged: ${this.currentDay.total_service_minutes} minutes
Productivity: ${servicePercentage}%
Work orders processed: ${this.currentDay.work_orders.length}
`);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to end day: ${error.message}`);
      } else {
        throw new Error('Failed to end day: Unknown error');
      }
    }
  }

  /**
   * Get the current day tracker
   * 
   * @returns The current day tracker or undefined if no day is in progress
   */
  public async getCurrentDay(): Promise<DayTracker | undefined> {
    if (!this.currentDay) {
      await this.loadCurrentDay();
    }
    return this.currentDay;
  }

  /**
   * Add service minutes to the day tracker
   * 
   * @param workOrderNumber The work order number
   * @param minutes The number of minutes to add
   */
  public async addServiceMinutes(workOrderNumber: string, minutes: number): Promise<void> {
    try {
      // Ensure day tracker is loaded
      if (!this.currentDay) {
        await this.loadCurrentDay();
        
        if (!this.currentDay) {
          throw new Error('No day is currently in progress. Start a day first.');
        }
      }
      
      // Validate minutes to ensure it's reasonable
      let validatedMinutes = minutes;
      
      // Cap service time to prevent unreasonable values
      const MAX_SERVICE_TIME = 240; // 4 hours max per service
      if (validatedMinutes > MAX_SERVICE_TIME) {
        console.log(chalk.yellow(`Service time of ${validatedMinutes} minutes seems high. Capping at ${MAX_SERVICE_TIME} minutes.`));
        validatedMinutes = MAX_SERVICE_TIME;
      }
      
      if (validatedMinutes <= 0) {
        console.log(chalk.yellow(`Invalid service time: ${validatedMinutes} minutes. Using minimum of 5 minutes.`));
        validatedMinutes = 5;
      }
      
      // Add minutes to total
      this.currentDay.total_service_minutes += validatedMinutes;
      
      // Add work order to the list if not already present
      if (!this.currentDay.work_orders.includes(workOrderNumber)) {
        this.currentDay.work_orders.push(workOrderNumber);
      }
      
      // Save updates
      await this.saveDayTracker();
      
      console.log(chalk.green(`Added ${validatedMinutes} minutes for work order ${workOrderNumber}. Total service time: ${this.currentDay.total_service_minutes} minutes`));
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to add service minutes: ${error.message}`);
      } else {
        throw new Error('Failed to add service minutes: Unknown error');
      }
    }
  }

  /**
   * Get a summary of the current day
   * 
   * @returns A formatted string with day information
   */
  public async getDaySummary(): Promise<string> {
    try {
      // Ensure day tracker is loaded
      if (!this.currentDay) {
        await this.loadCurrentDay();
        
        if (!this.currentDay) {
          return chalk.yellow('No day is currently in progress. Start a day first.');
        }
      }
      
      // Calculate current duration if day is still in progress
      let totalMinutes = this.currentDay.total_day_minutes;
      let statusMessage = '';
      
      if (!this.currentDay.day_end) {
        // Day is still in progress, calculate current duration
        const now = new Date();
        const nowTimestamp = now.getTime();
        
        if (this.currentDay.day_begin_timestamp) {
          totalMinutes = Math.max(1, Math.round((nowTimestamp - this.currentDay.day_begin_timestamp) / 60000));
        } else {
          // Fallback if timestamp is missing
          totalMinutes = 5;
        }
        
        statusMessage = chalk.green('Day in progress');
      } else {
        statusMessage = chalk.yellow('Day ended');
      }
      
      // Calculate service percentage
      const servicePercentage = Math.round((this.currentDay.total_service_minutes / totalMinutes) * 100) || 0;
      
      // Format work orders list
      const workOrdersList = this.currentDay.work_orders.length > 0 
        ? this.currentDay.work_orders.join(', ')
        : 'None';
      
      // Format time displays
      const startTime = new Date(this.currentDay.day_begin_timestamp || Date.now()).toLocaleTimeString();
      const endTime = this.currentDay.day_end_timestamp 
        ? new Date(this.currentDay.day_end_timestamp).toLocaleTimeString() 
        : '';
      
      // Format and return summary
      return `
${statusMessage}
---------------------
Started: ${this.currentDay.date} ${startTime}
${this.currentDay.day_end ? `Ended: ${this.currentDay.date} ${endTime}` : ''}
Total duration: ${totalMinutes} minutes
Service time logged: ${this.currentDay.total_service_minutes} minutes
Productivity: ${servicePercentage}%
Work orders processed: ${workOrdersList}
`;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get day summary: ${error.message}`);
      } else {
        throw new Error('Failed to get day summary: Unknown error');
      }
    }
  }

  /**
   * Load the current day tracker from file
   */
  private async loadCurrentDay(): Promise<void> {
    try {
      // Get current date
      const currentDate = new Date().toISOString().split('T')[0];
      const dayFilePath = path.join(this.dayTrackerDir, `${currentDate}.json`);
      
      // Check if file exists
      if (await exists(dayFilePath)) {
        const data = await readFile(dayFilePath, 'utf8');
        this.currentDay = JSON.parse(data);
        
        // Ensure timestamp fields are present (for backward compatibility)
        if (this.currentDay && !this.currentDay.day_begin_timestamp) {
          // Try to convert ISO string to timestamp
          try {
            this.currentDay.day_begin_timestamp = new Date(this.currentDay.day_begin).getTime();
          } catch (e) {
            // If conversion fails, use current time as fallback
            this.currentDay.day_begin_timestamp = Date.now();
          }
        }
        
        if (this.currentDay && this.currentDay.day_end && !this.currentDay.day_end_timestamp) {
          try {
            this.currentDay.day_end_timestamp = new Date(this.currentDay.day_end).getTime();
          } catch (e) {
            // If conversion fails, use current time as fallback
            this.currentDay.day_end_timestamp = Date.now();
          }
        }
      } else {
        this.currentDay = undefined;
      }
    } catch (error) {
      console.error('Error loading day tracker:', error);
      this.currentDay = undefined;
    }
  }

  /**
   * Save the current day tracker to file
   */
  private async saveDayTracker(): Promise<void> {
    if (!this.currentDay) {
      return;
    }
    
    try {
      const dayFilePath = path.join(this.dayTrackerDir, `${this.currentDay.date}.json`);
      await writeFile(dayFilePath, JSON.stringify(this.currentDay, null, 2), 'utf8');
    } catch (error) {
      console.error('Error saving day tracker:', error);
      throw error;
    }
  }
}