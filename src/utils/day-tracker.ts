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
  day_begin: string;
  day_end?: string;
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
        return chalk.yellow(`A day is already in progress that started at ${this.currentDay.day_begin}. Please end it before starting a new one.`);
      }
      
      // Get current date and time
      const now = new Date();
      const currentTime = now.toLocaleTimeString();
      const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Create new day tracker
      this.currentDay = {
        day_begin: `${currentDate} ${currentTime}`,
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
        return chalk.yellow(`The day is already ended at ${this.currentDay.day_end}`);
      }
      
      // Get current time
      const now = new Date();
      const endTime = now.toLocaleTimeString();
      
      // Calculate day duration in minutes
      let totalMinutes = 0;
      
      try {
        // Parse start date and time properly
        const startParts = this.currentDay.day_begin.split(' ');
        const startDate = startParts[0]; // YYYY-MM-DD
        const startTimeStr = startParts[1]; // HH:MM:SS
        
        // Create proper Date objects
        const startDateTime = new Date(`${startDate}T${this.formatTimeForISO(startTimeStr)}`);
        
        // Make sure we have valid dates before calculating
        if (!isNaN(startDateTime.getTime()) && !isNaN(now.getTime())) {
          // Calculate minutes between start and now
          totalMinutes = Math.round((now.getTime() - startDateTime.getTime()) / 60000);
          
          // Ensure we never have negative minutes
          if (totalMinutes < 0) {
            console.log(chalk.yellow(`Warning: Calculated negative duration (${totalMinutes} minutes). Using absolute value.`));
            totalMinutes = Math.abs(totalMinutes);
          }
          
          // If minutes are still 0, set a minimum of 1 minute
          if (totalMinutes === 0) {
            totalMinutes = 1;
          }
        } else {
          // If we have invalid dates, use a default
          console.log(chalk.yellow('Warning: Invalid date/time calculation. Using default of 60 minutes.'));
          totalMinutes = 60;
        }
      } catch (error) {
        console.log(chalk.yellow(`Error calculating minutes: ${error instanceof Error ? error.message : 'Unknown error'}`));
        console.log(chalk.yellow('Using default of 60 minutes'));
        totalMinutes = 60;
      }
      
      // Update day tracker
      this.currentDay.day_end = `${this.currentDay.date} ${endTime}`;
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
   * Format time string (HH:MM:SS or HH:MM AM/PM) to ISO format (HH:MM:SS)
   * 
   * @param timeStr - Time string to format
   * @returns Formatted time string in ISO format (HH:MM:SS)
   */
  private formatTimeForISO(timeStr: string): string {
    // Check if time is in AM/PM format
    if (timeStr.toLowerCase().includes('am') || timeStr.toLowerCase().includes('pm')) {
      // Convert to 24-hour format
      const [timePart, period] = timeStr.split(' ');
      const [hours, minutes, seconds = '00'] = timePart.split(':');
      
      let hour = parseInt(hours, 10);
      
      // Convert 12-hour to 24-hour
      if (period.toLowerCase() === 'pm' && hour < 12) {
        hour += 12;
      } else if (period.toLowerCase() === 'am' && hour === 12) {
        hour = 0;
      }
      
      // Format as HH:MM:SS
      return `${hour.toString().padStart(2, '0')}:${minutes}:${seconds}`;
    }
    
    // If already in 24-hour format, make sure it has seconds
    const parts = timeStr.split(':');
    if (parts.length === 2) {
      return `${parts[0]}:${parts[1]}:00`;
    }
    
    return timeStr;
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
      
      // Add minutes to total
      this.currentDay.total_service_minutes += minutes;
      
      // Add work order to the list if not already present
      if (!this.currentDay.work_orders.includes(workOrderNumber)) {
        this.currentDay.work_orders.push(workOrderNumber);
      }
      
      // Save updates
      await this.saveDayTracker();
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
        try {
          // Parse the start date and time
          const startParts = this.currentDay.day_begin.split(' ');
          const startDate = startParts[0]; // YYYY-MM-DD
          const startTimeStr = startParts[1]; // HH:MM:SS
          
          // Create proper Date objects
          const startDateTime = new Date(`${startDate}T${this.formatTimeForISO(startTimeStr)}`);
          const now = new Date();
          
          // Calculate current running time
          if (!isNaN(startDateTime.getTime()) && !isNaN(now.getTime())) {
            totalMinutes = Math.round((now.getTime() - startDateTime.getTime()) / 60000);
            
            // Ensure we never have negative minutes
            if (totalMinutes < 0) {
              console.log(chalk.yellow(`Warning: Calculated negative duration (${totalMinutes} minutes). Using absolute value.`));
              totalMinutes = Math.abs(totalMinutes);
            }
            
            // If minutes are still 0, set a minimum of 1 minute
            if (totalMinutes === 0) {
              totalMinutes = 1;
            }
          } else {
            // Default for invalid dates
            totalMinutes = 60;
          }
        } catch (error) {
          console.log(chalk.yellow(`Error calculating minutes: ${error instanceof Error ? error.message : 'Unknown error'}`));
          // Use a default value
          totalMinutes = 60;
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
      
      // Format and return summary
      return `
${statusMessage}
---------------------
Started: ${this.currentDay.day_begin}
${this.currentDay.day_end ? `Ended: ${this.currentDay.day_end}` : ''}
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