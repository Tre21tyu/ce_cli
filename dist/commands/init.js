"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initWorkOrder = initWorkOrder;
const database_1 = require("../database");
const filesystem_1 = require("../utils/filesystem");
/**
 * Initialize a new work order
 *
 * This command creates a new work order in the database with the provided 7-digit number
 * and optional 8-digit control number. It also creates a directory structure for the work order.
 *
 * @param workOrderNumber - 7-digit work order number
 * @param controlNumber - Optional 8-digit control number
 * @returns A promise that resolves to a success message or rejects with an error
 */
async function initWorkOrder(workOrderNumber, controlNumber) {
    try {
        // Input validation
        if (!workOrderNumber || workOrderNumber.trim() === '') {
            throw new Error('Work order number is required');
        }
        // Get database instance
        const db = database_1.WorkDatabase.getInstance();
        // Add work order to database
        const workOrder = await db.addWorkOrder(workOrderNumber, controlNumber);
        // Create directory structure for the work order
        await (0, filesystem_1.createWorkOrderDirectory)(workOrderNumber);
        // Create initial notes file
        await (0, filesystem_1.createNotesFile)(workOrderNumber);
        // Return success message
        return `Work order ${workOrderNumber} initialized successfully with directory structure`;
    }
    catch (error) {
        // Handle errors
        if (error instanceof Error) {
            throw new Error(`Failed to initialize work order: ${error.message}`);
        }
        else {
            throw new Error('Failed to initialize work order: Unknown error');
        }
    }
}
