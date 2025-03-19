"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stackWorkOrder = stackWorkOrder;
exports.displayStack = displayStack;
exports.clearStack = clearStack;
const database_1 = require("../database");
const stack_1 = require("../utils/stack");
const chalk_1 = __importDefault(require("chalk"));
/**
 * Stack a work order for pushing to Medimizer
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
        // Get database instance
        const db = database_1.WorkDatabase.getInstance();
        // Check if work order exists in the database
        const workOrder = await db.getWorkOrder(workOrderNumber);
        if (!workOrder) {
            throw new Error(`Work order ${workOrderNumber} not found in the database`);
        }
        // Get stack manager instance
        const stackManager = stack_1.StackManager.getInstance();
        // Stack the work order
        const result = await stackManager.stackWorkOrder(workOrderNumber);
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
        const stackManager = stack_1.StackManager.getInstance();
        // Get the current stack
        const stack = await stackManager.getStack();
        // Format the stack for display
        return formatStack(stack);
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
 * Format the stack for display
 *
 * @param stack - Stack to format
 * @returns A formatted string representation of the stack
 */
function formatStack(stack) {
    // Create header
    let result = '\n';
    result += chalk_1.default.cyan('=============================================================\n');
    result += chalk_1.default.cyan('                    WORK ORDER STACK                         \n');
    result += chalk_1.default.cyan('=============================================================\n\n');
    if (stack.length === 0) {
        result += 'Stack is empty. Use the "stack <wo-number>" command to add work orders.\n';
    }
    else {
        // Add each work order in the stack
        stack.forEach((workOrder, index) => {
            result += chalk_1.default.white(`${index + 1}. Work Order #${workOrder.workOrderNumber}\n`);
            // Add services
            if (workOrder.services && workOrder.services.length > 0) {
                result += chalk_1.default.yellow(`   Services (${workOrder.services.length}):\n`);
                workOrder.services.forEach((service, serviceIndex) => {
                    result += chalk_1.default.green(`     ${serviceIndex + 1}. [${service.verb}${service.noun ? `, ${service.noun}` : ''}] => `);
                    result += chalk_1.default.white(`${service.description.substring(0, 50)}${service.description.length > 50 ? '...' : ''}\n`);
                });
            }
            else {
                result += chalk_1.default.yellow('   No services found\n');
            }
            // Add separator between work orders
            if (index < stack.length - 1) {
                result += chalk_1.default.cyan('-------------------------------------------------------------\n');
            }
        });
    }
    // Add footer
    result += chalk_1.default.cyan('\n=============================================================\n');
    result += `Total: ${stack.length} work order(s) in stack\n`;
    return result;
}
/**
 * Clear the stack
 *
 * @returns A promise that resolves to a success message
 */
async function clearStack() {
    try {
        // Get stack manager instance
        const stackManager = stack_1.StackManager.getInstance();
        // Clear the stack
        await stackManager.saveStack([]);
        return 'Stack cleared successfully';
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
