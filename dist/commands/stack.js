"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stackWorkOrder = stackWorkOrder;
exports.displayStack = displayStack;
exports.clearStack = clearStack;
const stack_manager_1 = require("../utils/stack-manager");
/**
 * Add a work order to the stack for processing
 *
 * @param workOrderNumber - 7-digit work order number
 * @returns A promise that resolves to a success message
 */
async function stackWorkOrder(workOrderNumber) {
    try {
        // Input validation
        if (!workOrderNumber || workOrderNumber.trim() === '') {
            throw new Error('Work order number is required');
        }
        // Validate work order number format
        if (!/^\d{7}$/.test(workOrderNumber)) {
            throw new Error('Work order number must be exactly 7 digits');
        }
        // Get stack manager instance
        const stackManager = stack_manager_1.StackManager.getInstance();
        // Add the work order to the stack
        const result = await stackManager.addWorkOrderToStack(workOrderNumber);
        return result;
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
 * Display the current stack
 *
 * @returns A promise that resolves to a formatted string representation of the stack
 */
async function displayStack() {
    try {
        // Get stack manager instance
        const stackManager = stack_manager_1.StackManager.getInstance();
        // Get the formatted stack
        const formattedStack = await stackManager.formatStack();
        return formattedStack;
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to display stack: ${error.message}`);
        }
        else {
            throw new Error('Failed to display stack: Unknown error');
        }
    }
}
/**
 * Clear the stack
 *
 * @returns A promise that resolves to a success message
 */
async function clearStack() {
    try {
        // Get stack manager instance
        const stackManager = stack_manager_1.StackManager.getInstance();
        // Clear the stack
        const result = await stackManager.clearStack();
        return result;
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to clear stack: ${error.message}`);
        }
        else {
            throw new Error('Failed to clear stack: Unknown error');
        }
    }
}
