"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWorkOrderDetails = getWorkOrderDetails;
const database_1 = require("../database");
const chalk_1 = __importDefault(require("chalk"));
/**
 * Get detailed information for a specific work order
 *
 * @param workOrderNumber - 7-digit work order number
 * @returns A formatted string with work order details including services and parts
 */
async function getWorkOrderDetails(workOrderNumber) {
    try {
        // Validate input
        if (!workOrderNumber || workOrderNumber.trim() === '') {
            throw new Error('Work order number is required');
        }
        // Get database instance
        const db = database_1.WorkDatabase.getInstance();
        // Get work order details
        const workOrder = await db.getWorkOrderDetails(workOrderNumber);
        // Format the results
        return formatWorkOrderDetails(workOrder);
    }
    catch (error) {
        // Handle errors
        if (error instanceof Error) {
            throw new Error(`Failed to get work order details: ${error.message}`);
        }
        else {
            throw new Error('Failed to get work order details: Unknown error');
        }
    }
}
/**
 * Format work order details into a readable string
 *
 * @param workOrder - Work order details to format
 * @returns A formatted string with work order details
 */
function formatWorkOrderDetails(workOrder) {
    // Create header
    let result = '\n';
    result += chalk_1.default.cyan('=============================================================\n');
    result += chalk_1.default.cyan(`        WORK ORDER: ${workOrder.workOrderNumber}              \n`);
    result += chalk_1.default.cyan('=============================================================\n\n');
    // Basic work order information
    result += chalk_1.default.white(`Control Number: ${workOrder.controlNumber || 'N/A'}\n`);
    // Status
    const statusColor = workOrder.open ? chalk_1.default.green : chalk_1.default.gray;
    const statusText = workOrder.open ? 'OPEN' : 'CLOSED';
    result += `Status: ${statusColor(statusText)}\n`;
    // Dates
    const openedDate = new Date(workOrder.dateOpened).toLocaleString();
    result += `Opened: ${openedDate}\n`;
    if (!workOrder.open && workOrder.dateClosed) {
        const closedDate = new Date(workOrder.dateClosed).toLocaleString();
        result += `Closed: ${closedDate}\n`;
    }
    // Add notes if they exist
    if (workOrder.notes) {
        result += `\nNotes: ${workOrder.notes}\n`;
    }
    // Services section
    result += chalk_1.default.cyan('\n----- SERVICES -----\n\n');
    if (workOrder.services && workOrder.services.length > 0) {
        workOrder.services.forEach((service, index) => {
            const serviceDate = new Date(service.dateAdded).toLocaleString();
            result += chalk_1.default.yellow(`${index + 1}. ${service.verb} ${service.noun}\n`);
            result += `   Date: ${serviceDate}\n`;
            result += `   Duration: ${service.duration} minutes\n`;
            // Add service notes if they exist
            if (service.notes) {
                result += `   Notes: ${service.notes}\n`;
            }
            // Parts section for this service
            if (service.partsCharged && service.partsCharged.length > 0) {
                result += chalk_1.default.magenta('   Parts:\n');
                let totalPartsCost = 0;
                service.partsCharged.forEach((part) => {
                    const partCost = part.cost * part.quantity;
                    totalPartsCost += partCost;
                    result += `     - ${part.partNumber} x${part.quantity}: $${partCost.toFixed(2)}\n`;
                });
                result += chalk_1.default.magenta(`   Total Parts Cost: $${totalPartsCost.toFixed(2)}\n`);
            }
            else {
                result += chalk_1.default.magenta('   No parts charged\n');
            }
            // Add separator between services
            if (index < workOrder.services.length - 1) {
                result += '\n';
            }
        });
    }
    else {
        result += 'No services recorded for this work order.\n';
    }
    // Add footer
    result += chalk_1.default.cyan('\n=============================================================\n');
    return result;
}
