import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import chalk from 'chalk';
import { StackManager } from './stack-manager';

// Convert fs functions to use promises
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const exists = promisify(fs.exists);
const mkdir = promisify(fs.mkdir);

/**
 * Interface for a work day
 */
export interface WorkDay {
  id: string;           // Unique ID for the day (based on timestamp)
  startTime: string;    // Start time ISO string
  endTime?: string;     // End time ISO string (undefined while day is active)
  durationInMinutes?: number; // Duration in minutes (calculated when day is ended)
  totalServiceTime?: number;  // Total time of services logged this day
  summary?: {           // Summary of the day (calculated when day is ended)
    timeSurplusDeficit: number; // Positive for surplus, negative for deficit
    workOrders: string[]; // Work orders serviced during this day
    totalServices: number; // Total number of services performed
  };
}

/**
 * Class for managing work days
 */
export class DayManager {
  private static instance: DayManager;
  private daysFile: string;
  private days: WorkDay[] = [];
  private currentDay: WorkDay | null = null;
  private maxDayHistory: number = 365;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    // Set the path to the days file
    this.daysFile = path.join(process.cwd(), 'data', 'days.json');
    
    // Create the data directory if it doesn't exist
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): DayManager {
    if (!DayManager.instance) {
      DayManager.instance = new DayManager();
    }
    return DayManager.instance;
  }

  /**
   * Load the days from the file
   */
  public async loadDays(): Promise<void> {
    try {
      // Create the days file if it doesn't exist
      if (!(await exists(this.daysFile))) {
        await writeFile(this.daysFile, JSON.stringify([], null, 2), 'utf8');
        this.days = [];
        this.currentDay = null;
        return;
      }
      
      // Read the days file
      const data = await readFile(this.daysFile, 'utf8');
      this.days = JSON.parse(data);
      
      // Check for an active day (no endTime)
      this.currentDay = this.days.find(day => !day.endTime) || null;
    } catch (error) {
      console.error(chalk.red('Error loading days:'), error);
      this.days = [];
      this.currentDay = null;
    }
  }

  /**
   * Save the days to the file
   */
  public async saveDays(): Promise<void> {
    try {
      // Ensure we don't exceed the max history
      if (this.days.length > this.maxDayHistory) {
        // Sort days by start time (newest first)
        this.days.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
        
        // Keep only the most recent days
        this.days = this.days.slice(0, this.maxDayHistory);
      }
      
      await writeFile(this.daysFile, JSON.stringify(this.days, null, 2), 'utf8');
    } catch (error) {
      console.error(chalk.red('Error saving days:'), error);
      throw new Error('Failed to save days');
    }
  }

  /**
   * Start a new work day
   * 
   * @returns A message indicating the day has started
   */
  public async startDay(): Promise<string> {
    try {
      // Load days if not already loaded
      if (this.days.length === 0) {
        await this.loadDays();
      }
      
      // Check if there's already an active day
      if (this.currentDay) {
        return chalk.yellow(`There's already an active day that started at ${formatDateTime(this.currentDay.startTime)}. End it first before starting a new one.`);
      }
      
      // Create a new day
      const now = new Date();
      const dayId = now.getTime().toString();
      
      this.currentDay = {
        id: dayId,
        startTime: now.toISOString()
      };
      
      // Add to days array
      this.days.push(this.currentDay);
      
      // Save the updated days
      await this.saveDays();
      
      return chalk.green(`Work day started at ${formatDateTime(this.currentDay.startTime)}`);
    } catch (error) {
      console.error(chalk.red('Error starting day:'), error);
      throw new Error('Failed to start day');
    }
  }

  /**
   * Get the current day
   * 
   * @returns The current day or null if no active day
   */
  public async getCurrentDay(): Promise<WorkDay | null> {
    // Load days if not already loaded
    if (this.days.length === 0) {
      await this.loadDays();
    }
    
    return this.currentDay;
  }

  /**
   * Check if there's an active day
   * 
   * @returns True if there's an active day, false otherwise
   */
  public async hasActiveDay(): Promise<boolean> {
    const currentDay = await this.getCurrentDay();
    return currentDay !== null;
  }

  /**
   * End the current work day
   * 
   * @returns A summary of the day
   */
  public async endDay(): Promise<string> {
    try {
      // Load days if not already loaded
      if (this.days.length === 0) {
        await this.loadDays();
      }
      
      // Check if there's an active day
      if (!this.currentDay) {
        return chalk.yellow("There's no active day to end. Start a day first with 'start-day'.");
      }
      
      // Set end time
      const now = new Date();
      this.currentDay.endTime = now.toISOString();
      
      // Calculate duration
      const startDate = new Date(this.currentDay.startTime);
      const endDate = now;
      const durationMs = endDate.getTime() - startDate.getTime();
      this.currentDay.durationInMinutes = Math.round(durationMs / (1000 * 60));
      
      // Calculate service time from the stack
      const stackManager = StackManager.getInstance();
      const stack = await stackManager.getStack();
      
      let totalServiceTime = 0;
      const servicesCount = stack.reduce((count, wo) => count + wo.services.length, 0);
      const workOrderNumbers = stack.map(wo => wo.workOrderNumber);
      
      // Sum up service times from all work orders in the stack
      stack.forEach(wo => {
        wo.services.forEach(service => {
          totalServiceTime += service.serviceTimeCalculated || 0;
        });
      });
      
      this.currentDay.totalServiceTime = totalServiceTime;
      
      // Calculate time surplus/deficit
      const timeSurplusDeficit = totalServiceTime - this.currentDay.durationInMinutes;
      
      // Store summary
      this.currentDay.summary = {
        timeSurplusDeficit,
        workOrders: workOrderNumbers,
        totalServices: servicesCount
      };
      
      // Save the updated days
      await this.saveDays();
      
      // Clear the current day
      this.currentDay = null;
      
      // Format the summary message
      let summaryMessage = `
${chalk.cyan('================== DAY SUMMARY ===================')}
Work day ended at ${formatDateTime(now.toISOString())}

${chalk.cyan('Duration:')} ${formatDuration(this.days[this.days.length - 1].durationInMinutes || 0)}
${chalk.cyan('Total Service Time:')} ${formatDuration(totalServiceTime)}
`;

      // Add time surplus/deficit with appropriate color
      if (timeSurplusDeficit > 0) {
        summaryMessage += `${chalk.cyan('Time Surplus:')} ${chalk.blue(formatDuration(timeSurplusDeficit))}\n`;
      } else if (timeSurplusDeficit < 0) {
        summaryMessage += `${chalk.cyan('Time Deficit:')} ${chalk.red(formatDuration(Math.abs(timeSurplusDeficit)))}\n`;
      } else {
        summaryMessage += `${chalk.cyan('Time Balance:')} ${chalk.green('Perfect match')}\n`;
      }
      
      // Add work order and service statistics
      summaryMessage += `
${chalk.cyan('Work Orders:')} ${workOrderNumbers.length === 0 ? 'None' : workOrderNumbers.join(', ')}
${chalk.cyan('Total Services:')} ${servicesCount}
${chalk.cyan('=================================================')}`;
      
      return summaryMessage;
    } catch (error) {
      console.error(chalk.red('Error ending day:'), error);
      throw new Error('Failed to end day');
    }
  }

  /**
   * Get a summary of the most recent days
   * 
   * @param count - Number of days to include in the summary (default: 7)
   * @returns A summary of the recent days
   */
  public async getRecentDaysSummary(count: number = 7): Promise<string> {
    try {
      // Load days if not already loaded
      if (this.days.length === 0) {
        await this.loadDays();
      }
      
      // Get completed days (has endTime)
      const completedDays = this.days
        .filter(day => day.endTime)
        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
        .slice(0, count);
      
      if (completedDays.length === 0) {
        return chalk.yellow("No completed work days found in history.");
      }
      
      // Format the summary
      let summary = `
${chalk.cyan('================ RECENT DAYS SUMMARY ===============')}
${chalk.cyan('Showing the most recent')} ${completedDays.length} ${chalk.cyan('completed work days:')}
`;
      
      // Calculate totals for all days
      let totalDuration = 0;
      let totalServiceTime = 0;
      let totalSurplusDeficit = 0;
      
      completedDays.forEach((day, index) => {
        const date = new Date(day.startTime).toLocaleDateString();
        const duration = day.durationInMinutes || 0;
        const serviceTime = day.totalServiceTime || 0;
        const surplusDeficit = day.summary?.timeSurplusDeficit || 0;
        
        totalDuration += duration;
        totalServiceTime += serviceTime;
        totalSurplusDeficit += surplusDeficit;
        
        // Format surplus/deficit with color
        let surplusDeficitStr;
        if (surplusDeficit > 0) {
          surplusDeficitStr = chalk.blue(`+${formatDuration(surplusDeficit)}`);
        } else if (surplusDeficit < 0) {
          surplusDeficitStr = chalk.red(`${formatDuration(surplusDeficit)}`);
        } else {
          surplusDeficitStr = chalk.green('0m');
        }
        
        summary += `
${chalk.yellow(`Day ${index + 1} (${date}):`)}
  Duration: ${formatDuration(duration)}
  Service Time: ${formatDuration(serviceTime)}
  Balance: ${surplusDeficitStr}
  Services: ${day.summary?.totalServices || 0}
`;
      });
      
      // Add the totals/averages
      const avgDuration = totalDuration / completedDays.length;
      const avgServiceTime = totalServiceTime / completedDays.length;
      const avgSurplusDeficit = totalSurplusDeficit / completedDays.length;
      
      // Format average surplus/deficit with color
      let avgSurplusDeficitStr;
      if (avgSurplusDeficit > 0) {
        avgSurplusDeficitStr = chalk.blue(`+${formatDuration(avgSurplusDeficit)}`);
      } else if (avgSurplusDeficit < 0) {
        avgSurplusDeficitStr = chalk.red(`${formatDuration(avgSurplusDeficit)}`);
      } else {
        avgSurplusDeficitStr = chalk.green('0m');
      }
      
      summary += `
${chalk.cyan('=================== AVERAGES =====================')}
Avg Duration: ${formatDuration(avgDuration)}
Avg Service Time: ${formatDuration(avgServiceTime)}
Avg Balance: ${avgSurplusDeficitStr}
${chalk.cyan('===================================================')}`;
      
      return summary;
    } catch (error) {
      console.error(chalk.red('Error getting days summary:'), error);
      throw new Error('Failed to get days summary');
    }
  }
}

/**
 * Format a date-time string to a human-readable format
 * 
 * @param isoString - ISO date string
 * @returns Formatted date-time string
 */
function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString();
}

/**
 * Format a duration in minutes to a human-readable format
 * 
 * @param minutes - Duration in minutes
 * @returns Formatted duration string (e.g., "1h 30m")
 */
function formatDuration(minutes: number): string {
  if (isNaN(minutes)) return '0m';
  
  // Round to nearest minute
  minutes = Math.round(minutes);
  
  if (minutes < 60) {
    return `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
}