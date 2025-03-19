"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StackManager = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const util_1 = require("util");
const note_1 = require("../commands/note");
const filesystem_1 = require("../utils/filesystem");
// Convert callback-based fs functions to Promise-based
const writeFile = (0, util_1.promisify)(fs_1.default.writeFile);
const readFile = (0, util_1.promisify)(fs_1.default.readFile);
const exists = (0, util_1.promisify)(fs_1.default.exists);
/**
 * Class to manage the stack of work orders to be pushed to Medimizer
 */
class StackManager {
    /**
     * Private constructor to enforce singleton pattern
     */
    constructor() {
        // Set the path to the stack file
        this.stackFile = path_1.default.join(process.cwd(), 'data', 'stack.json');
        // Create the data directory if it doesn't exist
        const dataDir = path_1.default.join(process.cwd(), 'data');
        if (!fs_1.default.existsSync(dataDir)) {
            fs_1.default.mkdirSync(dataDir, { recursive: true });
        }
        // Create the stack file if it doesn't exist
        if (!fs_1.default.existsSync(this.stackFile)) {
            fs_1.default.writeFileSync(this.stackFile, JSON.stringify([], null, 2), 'utf8');
        }
    }
    /**
     * Get the singleton instance
     */
    static getInstance() {
        if (!StackManager.instance) {
            StackManager.instance = new StackManager();
        }
        return StackManager.instance;
    }
    /**
     * Get the current stack
     *
     * @returns A promise that resolves to the current stack
     */
    async getStack() {
        try {
            const data = await readFile(this.stackFile, 'utf8');
            return JSON.parse(data);
        }
        catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to read stack: ${error.message}`);
            }
            else {
                throw new Error('Failed to read stack: Unknown error');
            }
        }
    }
    /**
     * Save the stack
     *
     * @param stack - Stack to save
     * @returns A promise that resolves when the stack is saved
     */
    async saveStack(stack) {
        try {
            await writeFile(this.stackFile, JSON.stringify(stack, null, 2), 'utf8');
        }
        catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to save stack: ${error.message}`);
            }
            else {
                throw new Error('Failed to save stack: Unknown error');
            }
        }
    }
    /**
     * Stack a work order for pushing to Medimizer
     *
     * @param workOrderNumber - 7-digit work order number
     * @returns A promise that resolves to a result message
     */
    async stackWorkOrder(workOrderNumber) {
        try {
            // Read the notes file
            const notes = await (0, filesystem_1.readNotesFile)(workOrderNumber);
            // Parse services from notes
            const services = (0, note_1.parseServicesFromNotes)(notes);
            // Validate services
            const validationResults = await (0, note_1.validateServices)(services);
            // Check if any services are invalid
            const invalidServices = validationResults.filter((result) => !result.verbValid || !result.nounValid);
            if (invalidServices.length > 0) {
                let errorMessage = `Invalid services found in notes:\n`;
                invalidServices.forEach((service) => {
                    errorMessage += `  [${service.verb}${service.noun ? `, ${service.noun}` : ''}] => ${service.description}\n`;
                    if (!service.verbValid) {
                        errorMessage += `    - Invalid verb: ${service.verb}\n`;
                    }
                    if (!service.nounValid) {
                        errorMessage += `    - Invalid noun: ${service.noun}\n`;
                    }
                });
                throw new Error(errorMessage);
            }
            // Get the current stack
            const stack = await this.getStack();
            // Check if work order is already in the stack
            const existingIndex = stack.findIndex((wo) => wo.workOrderNumber === workOrderNumber);
            if (existingIndex !== -1) {
                // Replace existing work order
                stack[existingIndex] = {
                    workOrderNumber,
                    services: services.map(({ verb, noun, description }) => ({
                        verb,
                        noun,
                        description,
                    })),
                };
            }
            else {
                // Add new work order to stack
                stack.push({
                    workOrderNumber,
                    services: services.map(({ verb, noun, description }) => ({
                        verb,
                        noun,
                        description,
                    })),
                });
            }
            // Save the updated stack
            await this.saveStack(stack);
            // Update the notes file with a timestamp
            const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            const updatedNotes = `${notes}

================================
PUSHED TO MM ON ${currentDate}
================================

`;
            await (0, filesystem_1.writeNotesFile)(workOrderNumber, updatedNotes);
            return `Work order ${workOrderNumber} with ${services.length} services stacked successfully`;
        }
        catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to stack work order: ${error.message}`);
            }
            else {
                throw new Error('Failed to stack work order: Unknown error');
            }
        }
    }
    /**
     * Get the next work order in the stack
     *
     * @returns A promise that resolves to the next work order or null if stack is empty
     */
    async getNextWorkOrder() {
        try {
            const stack = await this.getStack();
            if (stack.length === 0) {
                return null;
            }
            return stack[0];
        }
        catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to get next work order: ${error.message}`);
            }
            else {
                throw new Error('Failed to get next work order: Unknown error');
            }
        }
    }
    /**
     * Remove a work order from the stack
     *
     * @param workOrderNumber - 7-digit work order number
     * @returns A promise that resolves when the work order is removed
     */
    async removeWorkOrder(workOrderNumber) {
        try {
            // Get the current stack
            const stack = await this.getStack();
            // Filter out the work order
            const newStack = stack.filter((wo) => wo.workOrderNumber !== workOrderNumber);
            // Save the updated stack
            await this.saveStack(newStack);
        }
        catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to remove work order: ${error.message}`);
            }
            else {
                throw new Error('Failed to remove work order: Unknown error');
            }
        }
    }
}
exports.StackManager = StackManager;
