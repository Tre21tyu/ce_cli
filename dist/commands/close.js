"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeWorkOrder = closeWorkOrder;
const database_1 = require("../database");
const chalk_1 = __importDefault(require("chalk"));
/**
 * Close a work order
 *
 * @param workOrderNumber - 7-digit work order number
 * @returns A success message
 */
async function closeWorkOrder(workOrderNumber) {
    try {
        // Validate input
        if (!workOrderNumber || workOrderNumber.trim() === '') {
            throw new Error('Work order number is required');
        }
        // Get database instance
        const db = database_1.WorkDatabase.getInstance();
        // Close work order
        const result = await db.closeWorkOrder(workOrderNumber);
        // Return success message
        return chalk_1.default.green(result);
    }
    catch (error) {
        // Handle errors
        if (error instanceof Error) {
            throw new Error(`Failed to close work order: ${error.message}`);
        }
        else {
            throw new Error('Failed to close work order: Unknown error');
        }
    }
}
