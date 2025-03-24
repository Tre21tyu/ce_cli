"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseServices = parseServices;
exports.convertToStackableServices = convertToStackableServices;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const util_1 = require("util");
const chalk_1 = __importDefault(require("chalk"));
const code_lookup_1 = require("./code-lookup");
// Convert fs functions to use promises
const readFile = (0, util_1.promisify)(fs_1.default.readFile);
const exists = (0, util_1.promisify)(fs_1.default.exists);
/**
 * Parse service entries from a work order markdown file
 *
 * @param workOrderNumber - The work order number
 * @returns An array of parsed services
 */
async function parseServices(workOrderNumber) {
    try {
        // Build the path to the work order's markdown file
        const mdFilePath = path_1.default.join(process.cwd(), 'work_orders', workOrderNumber, `${workOrderNumber}_notes.md`);
        // Check if the file exists
        if (!(await exists(mdFilePath))) {
            throw new Error(`Notes file for work order ${workOrderNumber} not found`);
        }
        // Read the file
        const content = await readFile(mdFilePath, 'utf8');
        // Extract services that don't have the (||) marker
        const services = [];
        // Match services with the format [Verb] (YYYY-MM-DD HH:MM) => notes
        // or [Verb, Noun] (YYYY-MM-DD HH:MM) => notes
        // and don't have the (||) marker
        const serviceRegex = /\[(.*?)(?:,\s*(.*?))?\]\s*\(([\d-]+\s[\d:-]+)\)\s*=>\s*(.*?)(?:\n\n|\n(?=\[)|\n$|$)/gs;
        let match;
        while ((match = serviceRegex.exec(content)) !== null) {
            const verb = match[1]?.trim() || '';
            const noun = match[2]?.trim();
            const datetime = match[3]?.trim() || '';
            const notes = match[4]?.trim() || '';
            // Skip services that are already uploaded (contain the (||) marker)
            if (notes.includes('(||)')) {
                continue;
            }
            // Add the service to the array
            services.push({
                verb,
                noun,
                datetime,
                notes
            });
        }
        console.log(chalk_1.default.green(`Found ${services.length} services to process in work order ${workOrderNumber}`));
        return services;
    }
    catch (error) {
        console.error(chalk_1.default.red(`Error parsing services for work order ${workOrderNumber}:`), error);
        throw new Error(`Failed to parse services for work order ${workOrderNumber}`);
    }
}
/**
 * Convert parsed services to stackable services with the appropriate codes
 *
 * @param services - The parsed services
 * @returns An array of stackable services with codes
 */
async function convertToStackableServices(services) {
    try {
        // Initialize the code lookup if needed
        const codeLookup = code_lookup_1.CodeLookup.getInstance();
        await codeLookup.initialize();
        const stackableServices = [];
        for (const service of services) {
            // Look up the verb code
            const verb = codeLookup.findVerb(service.verb);
            if (!verb) {
                console.error(chalk_1.default.red(`Verb "${service.verb}" not found in lookup table`));
                continue;
            }
            // Create the stackable service
            const stackableService = {
                verb_code: verb.code,
                datetime: service.datetime,
                notes: service.notes
            };
            // If the verb has a noun and a noun was provided, look it up
            if (verb.hasNoun && service.noun) {
                const nounCode = codeLookup.findNoun(service.noun);
                if (!nounCode) {
                    console.error(chalk_1.default.red(`Noun "${service.noun}" not found in lookup table`));
                    continue;
                }
                stackableService.noun_code = nounCode;
            }
            // Add the service to the array
            stackableServices.push(stackableService);
        }
        console.log(chalk_1.default.green(`Converted ${stackableServices.length} services to stackable format`));
        return stackableServices;
    }
    catch (error) {
        console.error(chalk_1.default.red('Error converting to stackable services:'), error);
        throw new Error('Failed to convert services to stackable format');
    }
}
