"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StackManager = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const util_1 = require("util");
const chalk_1 = __importDefault(require("chalk"));
const service_parser_1 = require("./service-parser");
const database_1 = require("../database");
// Convert fs functions to use promises
const writeFile = (0, util_1.promisify)(fs_1.default.writeFile);
const readFile = (0, util_1.promisify)(fs_1.default.readFile);
const exists = (0, util_1.promisify)(fs_1.default.exists);
const mkdir = (0, util_1.promisify)(fs_1.default.mkdir);
/**
 * Class for managing the stack of work orders for export to Medimizer
 */
class StackManager {
    /**
     * Private constructor to enforce singleton pattern
     */
    constructor() {
        this.stack = [];
        // Set the path to the stack file
        this.stackFile = path_1.default.join(process.cwd(), 'data', 'service_stack.json');
        // Create the data directory if it doesn't exist
        const dataDir = path_1.default.join(process.cwd(), 'data');
        if (!fs_1.default.existsSync(dataDir)) {
            fs_1.default.mkdirSync(dataDir, { recursive: true });
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
     * Load the stack from the file
     */
    async loadStack() {
        try {
            // Create the stack file if it doesn't exist
            if (!(await exists(this.stackFile))) {
                await writeFile(this.stackFile, JSON.stringify([], null, 2), 'utf8');
                this.stack = [];
                return;
            }
            // Read the stack file
            const data = await readFile(this.stackFile, 'utf8');
            this.stack = JSON.parse(data);
        }
        catch (error) {
            console.error(chalk_1.default.red('Error loading stack:'), error);
            this.stack = [];
        }
    }
    /**
     * Save the stack to the file
     */
    async saveStack() {
        try {
            await writeFile(this.stackFile, JSON.stringify(this.stack, null, 2), 'utf8');
        }
        catch (error) {
            console.error(chalk_1.default.red('Error saving stack:'), error);
            throw new Error('Failed to save stack');
        }
    }
    /**
     * Add a work order to the stack
     *
     * @param workOrderNumber - The work order number
     * @returns A promise that resolves to a success message
     */
    async addWorkOrderToStack(workOrderNumber) {
        try {
            // Load the stack if not already loaded
            if (this.stack.length === 0) {
                await this.loadStack();
            }
            // Get work order details from the database
            const db = database_1.WorkDatabase.getInstance();
            const workOrder = await db.getWorkOrder(workOrderNumber);
            if (!workOrder) {
                throw new Error(`Work order ${workOrderNumber} not found in database`);
            }
            // Parse services from the work order's markdown file
            const { services, importTimestamp } = await (0, service_parser_1.parseServices)(workOrderNumber);
            if (services.length === 0) {
                return `No services found to add for work order ${workOrderNumber}`;
            }
            // Convert the parsed services to stackable services
            const stackableServices = await (0, service_parser_1.convertToStackableServices)(services, importTimestamp);
            if (stackableServices.length === 0) {
                return `No valid services found for work order ${workOrderNumber}`;
            }
            // Combine all notes from services
            const combinedNotes = stackableServices.map(service => {
                return `${service.datetime}\n${service.notes}`;
            }).join('\n\n');
            // Check if the work order is already in the stack
            const existingIndex = this.stack.findIndex(wo => wo.workOrderNumber === workOrderNumber);
            if (existingIndex !== -1) {
                // Update the existing work order
                this.stack[existingIndex].services = stackableServices;
                this.stack[existingIndex].notes = combinedNotes;
            }
            else {
                // Add a new work order to the stack
                this.stack.push({
                    workOrderNumber,
                    controlNumber: workOrder.controlNumber,
                    services: stackableServices,
                    notes: combinedNotes
                });
            }
            // Save the updated stack
            await this.saveStack();
            return `Added ${stackableServices.length} services for work order ${workOrderNumber} to the stack`;
        }
        catch (error) {
            console.error(chalk_1.default.red(`Error adding work order ${workOrderNumber} to stack:`), error);
            throw new Error(`Failed to add work order ${workOrderNumber} to stack: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Clear the stack
     *
     * @returns A promise that resolves to a success message
     */
    async clearStack() {
        try {
            this.stack = [];
            await this.saveStack();
            return 'Stack cleared successfully';
        }
        catch (error) {
            console.error(chalk_1.default.red('Error clearing stack:'), error);
            throw new Error('Failed to clear stack');
        }
    }
    /**
     * Get the current stack
     *
     * @returns The current stack of work orders
     */
    async getStack() {
        if (this.stack.length === 0) {
            await this.loadStack();
        }
        return this.stack;
    }
    /**
     * Format the stack for display
     *
     * @returns A formatted string representation of the stack
     */
    async formatStack() {
        try {
            // Get the current stack
            const stack = await this.getStack();
            if (stack.length === 0) {
                return `
=============================================================
-----------------------CE_CLI STACK--------------------------
=============================================================

Stack is empty. Use the "stack <wo-number>" command to add work orders.

=============================================================
`;
            }
            // Build the header
            let result = `
=============================================================
-----------------------CE_CLI STACK--------------------------
=============================================================
`;
            // Add each work order
            stack.forEach((wo, index) => {
                result += `\n${index + 1}. Work Order ${wo.workOrderNumber} (${wo.services.length})`;
                if (wo.services.length > 0) {
                    wo.services.forEach(service => {
                        // Extract date part from datetime
                        const datePart = service.datetime.split(' ')[0];
                        // Format based on whether there's a noun and include time
                        if (service.noun_code !== undefined) {
                            result += `\n   - (${datePart}) Verb Code: ${service.verb_code}, Noun Code: ${service.noun_code}, Time: ${service.serviceTimeCalculated || 0}`;
                        }
                        else {
                            result += `\n   - (${datePart}) Verb Code: ${service.verb_code}, Time: ${service.serviceTimeCalculated || 0}`;
                        }
                    });
                }
                else {
                    result += '\n   No services to export';
                }
                // Add separator between work orders
                if (index < stack.length - 1) {
                    result += '\n';
                }
            });
            // Add footer
            result += `\n\n=============================================================`;
            return result;
        }
        catch (error) {
            console.error(chalk_1.default.red('Error formatting stack:'), error);
            throw new Error('Failed to format stack');
        }
    }
}
exports.StackManager = StackManager;
