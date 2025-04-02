import chalk from 'chalk';
import { DayTrackerManager } from '../utils/day-tracker';

/**
 * Start a new work day
 * 
 * @returns A message indicating the day has started
 */
export async function startDay(): Promise<string> {
  try {
    const dayTracker = DayTrackerManager.getInstance();
    return await dayTracker.startDay();
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
 * @returns A summary of the completed day
 */
export async function endDay(): Promise<string> {
  try {
    const dayTracker = DayTrackerManager.getInstance();
    return await dayTracker.endDay();
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to end day: ${error.message}`);
    } else {
      throw new Error('Failed to end day: Unknown error');
    }
  }
}

/**
 * Get a summary of the current day
 * 
 * @returns A formatted string with day information
 */
export async function getDaySummary(): Promise<string> {
  try {
    const dayTracker = DayTrackerManager.getInstance();
    return await dayTracker.getDaySummary();
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to get day summary: ${error.message}`);
    } else {
      throw new Error('Failed to get day summary: Unknown error');
    }
  }
}