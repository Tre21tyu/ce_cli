"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearDatabase = clearDatabase;
const database_1 = require("../database");
const inquirer_1 = __importDefault(require("inquirer"));
const chalk_1 = __importDefault(require("chalk"));
/**
 * Clear the database
 *
 * This command drops all tables and recreates them, effectively clearing all data
 *
 * @returns A promise that resolves to a success message
 */
async function clearDatabase() {
    try {
        // Confirm with the user
        const { confirm } = await inquirer_1.default.prompt([
            {
                type: 'confirm',
                name: 'confirm',
                message: chalk_1.default.red('WARNING: This will delete all data in the database. Continue?'),
                default: false
            }
        ]);
        if (!confirm) {
            return 'Database clear operation cancelled';
        }
        // Double confirm for safety
        const { doubleConfirm } = await inquirer_1.default.prompt([
            {
                type: 'confirm',
                name: 'doubleConfirm',
                message: chalk_1.default.red('ARE YOU ABSOLUTELY SURE? This cannot be undone!'),
                default: false
            }
        ]);
        if (!doubleConfirm) {
            return 'Database clear operation cancelled';
        }
        // Get database instance
        const db = database_1.WorkDatabase.getInstance();
        // Clear database
        await db.clearDatabase();
        return 'Database cleared successfully';
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to clear database: ${error.message}`);
        }
        else {
            throw new Error('Failed to clear database: Unknown error');
        }
    }
}
