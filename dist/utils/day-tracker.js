"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DayTrackerManager = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const util_1 = require("util");
const chalk_1 = __importDefault(require("chalk"));
// Convert fs functions to promises
const writeFile = (0, util_1.promisify)(fs_1.default.writeFile);
const readFile = (0, util_1.promisify)(fs_1.default.readFile);
const mkdir = (0, util_1.promisify)(fs_1.default.mkdir);
const exists = (0, util_1.promisify)(fs_1.default.exists);
/**
 * Class for tracking work days and service times
 */
class DayTrackerManager {
    /**
     * Private constructor for singleton pattern
     */
    constructor() {
        // Set up the day tracker directory
        this.dayTrackerDir = path_1.default.join(process.cwd(), 'data', 'day_tracker');
        // Ensure directory exists
        if (!fs_1.default.existsSync(this.dayTrackerDir)) {
            fs_1.default.mkdirSync(this.dayTrackerDir, { recursive: true });
        }
    }
    /**
     * Get the singleton instance
     */
    static getInstance() {
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
    async startDay() {
        try {
            // Check if a day is already in progress
            if (this.currentDay && !this.currentDay.day_end) {
                return chalk_1.default.yellow(`A day is already in progress that started at ${this.currentDay.day_begin}. Please end it before starting a new one.`);
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
            return chalk_1.default.green(`Day started at ${currentTime}`);
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
     * @returns A message summarizing the day
     */
    async endDay() {
        try {
            // Check if a day is in progress
            if (!this.currentDay) {
                return chalk_1.default.yellow('No day is currently in progress. Start a day first.');
            }
            if (this.currentDay.day_end) {
                return chalk_1.default.yellow(`The day is already ended at ${this.currentDay.day_end}`);
            }
            // Get current time
            const now = new Date();
            const endTime = now.toLocaleTimeString();
            // Calculate day duration in minutes
            const startTime = new Date(`${this.currentDay.date}T${this.currentDay.day_begin.split(' ')[1]}`);
            const totalMinutes = Math.round((now.getTime() - startTime.getTime()) / 60000);
            // Update day tracker
            this.currentDay.day_end = `${this.currentDay.date} ${endTime}`;
            this.currentDay.total_day_minutes = totalMinutes;
            // Save to file
            await this.saveDayTracker();
            // Format and return summary
            const servicePercentage = Math.round((this.currentDay.total_service_minutes / totalMinutes) * 100) || 0;
            return chalk_1.default.green(`
Day ended at ${endTime}
---------------------
Total day duration: ${totalMinutes} minutes
Service time logged: ${this.currentDay.total_service_minutes} minutes
Productivity: ${servicePercentage}%
Work orders processed: ${this.currentDay.work_orders.length}
`);
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
     * Get the current day tracker
     *
     * @returns The current day tracker or undefined if no day is in progress
     */
    async getCurrentDay() {
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
    async addServiceMinutes(workOrderNumber, minutes) {
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
        }
        catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to add service minutes: ${error.message}`);
            }
            else {
                throw new Error('Failed to add service minutes: Unknown error');
            }
        }
    }
    /**
     * Get a summary of the current day
     *
     * @returns A formatted string with day information
     */
    async getDaySummary() {
        try {
            // Ensure day tracker is loaded
            if (!this.currentDay) {
                await this.loadCurrentDay();
                if (!this.currentDay) {
                    return chalk_1.default.yellow('No day is currently in progress. Start a day first.');
                }
            }
            // Calculate current duration if day is still in progress
            let totalMinutes = this.currentDay.total_day_minutes;
            let statusMessage = '';
            if (!this.currentDay.day_end) {
                const now = new Date();
                const startTime = new Date(`${this.currentDay.date}T${this.currentDay.day_begin.split(' ')[1]}`);
                totalMinutes = Math.round((now.getTime() - startTime.getTime()) / 60000);
                statusMessage = chalk_1.default.green('Day in progress');
            }
            else {
                statusMessage = chalk_1.default.yellow('Day ended');
            }
            // Calculate service percentage
            const servicePercentage = Math.round((this.currentDay.total_service_minutes / totalMinutes) * 100) || 0;
            // Format and return summary
            return `
${statusMessage}
---------------------
Started: ${this.currentDay.day_begin}
${this.currentDay.day_end ? `Ended: ${this.currentDay.day_end}` : ''}
Total duration: ${totalMinutes} minutes
Service time logged: ${this.currentDay.total_service_minutes} minutes
Productivity: ${servicePercentage}%
Work orders processed: ${this.currentDay.work_orders.join(', ')}
`;
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
    /**
     * Load the current day tracker from file
     */
    async loadCurrentDay() {
        try {
            // Get current date
            const currentDate = new Date().toISOString().split('T')[0];
            const dayFilePath = path_1.default.join(this.dayTrackerDir, `${currentDate}.json`);
            // Check if file exists
            if (await exists(dayFilePath)) {
                const data = await readFile(dayFilePath, 'utf8');
                this.currentDay = JSON.parse(data);
            }
            else {
                this.currentDay = undefined;
            }
        }
        catch (error) {
            console.error('Error loading day tracker:', error);
            this.currentDay = undefined;
        }
    }
    /**
     * Save the current day tracker to file
     */
    async saveDayTracker() {
        if (!this.currentDay) {
            return;
        }
        try {
            const dayFilePath = path_1.default.join(this.dayTrackerDir, `${this.currentDay.date}.json`);
            await writeFile(dayFilePath, JSON.stringify(this.currentDay, null, 2), 'utf8');
        }
        catch (error) {
            console.error('Error saving day tracker:', error);
            throw error;
        }
    }
}
exports.DayTrackerManager = DayTrackerManager;
