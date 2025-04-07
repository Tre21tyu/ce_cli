import chalk from 'chalk';
import { DayManager } from '../utils/day-manager';

/**
 * Start a new work day
 * 
 * @returns A promise that resolves to a success message
 */
export async function startDay(): Promise<string> {
  try {
    // Get day manager instance
    const dayManager = DayManager.getInstance();

    // Start a new day
    const result = await dayManager.startDay();
    
    return result;
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
 * @returns A promise that resolves to a success message with day summary
 */
export async function endDay(): Promise<string> {
  try {
    // Get day manager instance
    const dayManager = DayManager.getInstance();

    // End the current day
    const result = await dayManager.endDay();
    
    return result;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to end day: ${error.message}`);
    } else {
      throw new Error('Failed to end day: Unknown error');
    }
  }
}

/**
 * Get the status of the current day
 * 
 * @returns A promise that resolves to the current day status
 */
export async function dayStatus(): Promise<string> {
  try {
    // Get day manager instance
    const dayManager = DayManager.getInstance();

    // Get the current day
    const currentDay = await dayManager.getCurrentDay();
    
    if (!currentDay) {
      return chalk.yellow("No active day. Start a day with 'start-day'.");
    }
    
    // Calculate how long the day has been active
    const startDate = new Date(currentDay.startTime);
    const now = new Date();
    const durationMs = now.getTime() - startDate.getTime();
    const durationMinutes = Math.round(durationMs / (1000 * 60));
    
    // Format duration
    let durationStr = '';
    if (durationMinutes < 60) {
      durationStr = `${durationMinutes} minutes`;
    } else {
      const hours = Math.floor(durationMinutes / 60);
      const remainingMinutes = durationMinutes % 60;
      durationStr = `${hours} hour${hours !== 1 ? 's' : ''} and ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
    }
    
    // Format start time
    const startTime = startDate.toLocaleString();
    
    return `
${chalk.cyan('================== DAY STATUS ===================')}
Active day started at: ${chalk.green(startTime)}
Current duration: ${chalk.green(durationStr)}
${chalk.cyan('================================================')}\n`;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to get day status: ${error.message}`);
    } else {
      throw new Error('Failed to get day status: Unknown error');
    }
  }
}

/**
 * Get a summary of recent days
 * 
 * @param days - Number of days to include in the summary
 * @returns A promise that resolves to a summary of recent days
 */
export async function daysSummary(days: number = 7): Promise<string> {
  try {
    // Get day manager instance
    const dayManager = DayManager.getInstance();

    // Get the summary of recent days
    const result = await dayManager.getRecentDaysSummary(days);
    
    return result;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to get days summary: ${error.message}`);
    } else {
      throw new Error('Failed to get days summary: Unknown error');
    }
  }
}