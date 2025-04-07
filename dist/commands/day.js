"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startDay = startDay;
exports.endDay = endDay;
exports.dayStatus = dayStatus;
exports.daysSummary = daysSummary;
const chalk_1 = __importDefault(require("chalk"));
const day_manager_1 = require("../utils/day-manager");
/**
 * Start a new work day
 *
 * @returns A promise that resolves to a success message
 */
async function startDay() {
    try {
        // Get day manager instance
        const dayManager = day_manager_1.DayManager.getInstance();
        // Start a new day
        const result = await dayManager.startDay();
        return result;
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
 * @returns A promise that resolves to a success message with day summary
 */
async function endDay() {
    try {
        // Get day manager instance
        const dayManager = day_manager_1.DayManager.getInstance();
        // End the current day
        const result = await dayManager.endDay();
        return result;
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
 * Get the status of the current day
 *
 * @returns A promise that resolves to the current day status
 */
async function dayStatus() {
    try {
        // Get day manager instance
        const dayManager = day_manager_1.DayManager.getInstance();
        // Get the current day
        const currentDay = await dayManager.getCurrentDay();
        if (!currentDay) {
            return chalk_1.default.yellow("No active day. Start a day with 'start-day'.");
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
        }
        else {
            const hours = Math.floor(durationMinutes / 60);
            const remainingMinutes = durationMinutes % 60;
            durationStr = `${hours} hour${hours !== 1 ? 's' : ''} and ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
        }
        // Format start time
        const startTime = startDate.toLocaleString();
        return `
${chalk_1.default.cyan('================== DAY STATUS ===================')}
Active day started at: ${chalk_1.default.green(startTime)}
Current duration: ${chalk_1.default.green(durationStr)}
${chalk_1.default.cyan('================================================')}\n`;
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to get day status: ${error.message}`);
        }
        else {
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
async function daysSummary(days = 7) {
    try {
        // Get day manager instance
        const dayManager = day_manager_1.DayManager.getInstance();
        // Get the summary of recent days
        const result = await dayManager.getRecentDaysSummary(days);
        return result;
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to get days summary: ${error.message}`);
        }
        else {
            throw new Error('Failed to get days summary: Unknown error');
        }
    }
}
