"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listWorkOrders = listWorkOrders;
const database_1 = require("../database");
const chalk_1 = __importDefault(require("chalk"));
/**
 * List all work orders from the database
 *
 * @returns A formatted string containing all work orders
 */
async function listWorkOrders() {
    try {
        // Get database instance
        const db = database_1.WorkDatabase.getInstance();
        // Get all work orders
        const workOrders = await db.getAllWorkOrders();
        // Handle case with no work orders
        if (workOrders.length === 0) {
            return 'No work orders found in the database.';
        }
        // Format the results
        return formatWorkOrdersList(workOrders);
    }
    catch (error) {
        // Handle errors
        if (error instanceof Error) {
            throw new Error(`Failed to list work orders: ${error.message}`);
        }
        else {
            throw new Error('Failed to list work orders: Unknown error');
        }
    }
}
/**
 * Format work orders into a readable string
 *
 * @param workOrders - Array of work orders to format
 * @returns A formatted string with work order details
 */
function formatWorkOrdersList(workOrders) {
    // Create header
    let result = '\n';
    result += chalk_1.default.cyan('=============================================================\n');
    result += chalk_1.default.cyan('                      WORK ORDERS                            \n');
    result += chalk_1.default.cyan('=============================================================\n\n');
    // Add each work order
    workOrders.forEach((wo, index) => {
        // Determine color based on open status
        const statusColor = wo.open ? chalk_1.default.green : chalk_1.default.gray;
        const statusText = wo.open ? 'OPEN' : 'CLOSED';
        // Format dates to be more readable
        const openedDate = new Date(wo.dateOpened).toLocaleString();
        const closedDate = wo.dateClosed ? new Date(wo.dateClosed).toLocaleString() : 'N/A';
        // Add work order details
        result += chalk_1.default.white(`WO #${wo.workOrderNumber}`);
        if (wo.controlNumber) {
            result += chalk_1.default.white(` (Control: ${wo.controlNumber})`);
        }
        result += '\n';
        result += `Status: ${statusColor(statusText)}\n`;
        result += `Opened: ${openedDate}\n`;
        if (!wo.open && wo.dateClosed) {
            result += `Closed: ${closedDate}\n`;
        }
        // Add notes if they exist
        if (wo.notes) {
            result += `Notes: ${wo.notes}\n`;
        }
        // Add separator between work orders (except after the last one)
        if (index < workOrders.length - 1) {
            result += chalk_1.default.cyan('-------------------------------------------------------------\n');
        }
    });
    // Add footer
    result += chalk_1.default.cyan('\n=============================================================\n');
    result += `Total: ${workOrders.length} work order(s)\n`;
    result += `Open: ${workOrders.filter(wo => wo.open).length} | `;
    result += `Closed: ${workOrders.filter(wo => !wo.open).length}\n`;
    return result;
}
