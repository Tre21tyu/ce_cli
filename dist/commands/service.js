"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addService = addService;
exports.addPartToService = addPartToService;
const database_1 = require("../database");
const chalk_1 = __importDefault(require("chalk"));
/**
 * Add a service to a work order
 *
 * @param workOrderNumber - 7-digit work order number
 * @param verbName - Name of the verb
 * @param nounName - Name of the noun
 * @param duration - Duration in minutes
 * @returns A formatted string confirming service creation
 */
async function addService(workOrderNumber, verbName, nounName, duration = 0) {
    try {
        // Validate input
        if (!workOrderNumber || workOrderNumber.trim() === '') {
            throw new Error('Work order number is required');
        }
        if (!verbName || verbName.trim() === '') {
            throw new Error('Verb name is required');
        }
        if (!nounName || nounName.trim() === '') {
            throw new Error('Noun name is required');
        }
        // Get database instance
        const db = database_1.WorkDatabase.getInstance();
        // Get work order
        const workOrder = await db.getWorkOrder(workOrderNumber);
        if (!workOrder) {
            throw new Error(`Work order ${workOrderNumber} not found`);
        }
        if (!workOrder.open) {
            throw new Error(`Cannot add service to closed work order ${workOrderNumber}`);
        }
        // Add service to work order
        const service = await db.addService(workOrder.id, verbName, nounName, duration);
        // Return success message
        return chalk_1.default.green(`Added service "${verbName} ${nounName}" to work order ${workOrderNumber}`);
    }
    catch (error) {
        // Handle errors
        if (error instanceof Error) {
            throw new Error(`Failed to add service: ${error.message}`);
        }
        else {
            throw new Error('Failed to add service: Unknown error');
        }
    }
}
/**
 * Add a part to a service
 *
 * @param workOrderNumber - 7-digit work order number
 * @param serviceIndex - Index of the service (1-based)
 * @param partNumber - Part number
 * @param quantity - Quantity of parts
 * @param cost - Cost per part
 * @returns A formatted string confirming part addition
 */
async function addPartToService(workOrderNumber, serviceIndex, partNumber, quantity = 1, cost) {
    try {
        // Validate input
        if (!workOrderNumber || workOrderNumber.trim() === '') {
            throw new Error('Work order number is required');
        }
        if (!partNumber || partNumber.trim() === '') {
            throw new Error('Part number is required');
        }
        if (serviceIndex < 1) {
            throw new Error('Service index must be a positive number');
        }
        // Get database instance
        const db = database_1.WorkDatabase.getInstance();
        // Get work order with services
        const workOrder = await db.getWorkOrder(workOrderNumber);
        if (!workOrder) {
            throw new Error(`Work order ${workOrderNumber} not found`);
        }
        if (!workOrder.open) {
            throw new Error(`Cannot add part to closed work order ${workOrderNumber}`);
        }
        // Get all services for this work order to find the right serviceId
        // First get the workOrder record to get its ID
        if (!workOrder.id) {
            throw new Error(`Invalid work order ID for ${workOrderNumber}`);
        }
        // Then get all services for this work order using the ID
        const services = await db.db('Services')
            .where({ workOrderId: workOrder.id })
            .orderBy('dateAdded', 'desc');
        if (services.length === 0) {
            throw new Error(`No services found for work order ${workOrderNumber}`);
        }
        if (serviceIndex > services.length) {
            throw new Error(`Service index ${serviceIndex} is out of range. Work order has ${services.length} services`);
        }
        // Get the service ID
        const serviceId = services[serviceIndex - 1].id;
        // Add part to service
        const partCharged = await db.addPartToService(serviceId, partNumber, quantity, cost);
        // Return success message
        return chalk_1.default.green(`Added part ${partNumber} (x${quantity}) to service #${serviceIndex} in work order ${workOrderNumber}`);
    }
    catch (error) {
        // Handle errors
        if (error instanceof Error) {
            throw new Error(`Failed to add part: ${error.message}`);
        }
        else {
            throw new Error('Failed to add part: Unknown error');
        }
    }
}
