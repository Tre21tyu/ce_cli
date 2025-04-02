"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startDay = startDay;
exports.endDay = endDay;
exports.getDaySummary = getDaySummary;
const day_tracker_1 = require("../utils/day-tracker");
/**
 * Start a new work day
 *
 * @returns A message indicating the day has started
 */
async function startDay() {
    try {
        const dayTracker = day_tracker_1.DayTrackerManager.getInstance();
        return await dayTracker.startDay();
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to start day: ${error.message}`);
        }
        else {
            throw new Error('Failed to start day: Unknown error');
        }
    }
}
/**
 * End the current work day
 *
 * @returns A summary of the completed day
 */
async function endDay() {
    try {
        const dayTracker = day_tracker_1.DayTrackerManager.getInstance();
        return await dayTracker.endDay();
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to end day: ${error.message}`);
        }
        else {
            throw new Error('Failed to end day: Unknown error');
        }
    }
}
/**
 * Get a summary of the current day
 *
 * @returns A formatted string with day information
 */
async function getDaySummary() {
    try {
        const dayTracker = day_tracker_1.DayTrackerManager.getInstance();
        return await dayTracker.getDaySummary();
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to get day summary: ${error.message}`);
        }
        else {
            throw new Error('Failed to get day summary: Unknown error');
        }
    }
}
