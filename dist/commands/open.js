"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openWorkOrder = openWorkOrder;
const chalk_1 = __importDefault(require("chalk"));
const browser_enhanced_1 = require("../utils/browser-enhanced");
/**
 * Open a work order in Medimizer and keep the browser window open
 *
 * @param workOrderNumber - 7-digit work order number
 * @returns A promise that resolves to a success message
 */
async function openWorkOrder(workOrderNumber) {
    try {
        // Validate input
        if (!workOrderNumber || workOrderNumber.trim() === '') {
            throw new Error('Work order number is required');
        }
        // Validate work order number format
        if (!/^\d{7}$/.test(workOrderNumber)) {
            throw new Error('Work order number must be exactly 7 digits');
        }
        console.log(chalk_1.default.yellow(`Opening work order ${workOrderNumber} in Medimizer...`));
        // Get browser automation instance
        const browser = browser_enhanced_1.BrowserAutomation.getInstance();
        try {
            // Initialize browser
            await browser.initialize();
            // Navigate to work order page
            const url = `http://sqlmedimizer1/MMWeb/App_Pages/WOForm.aspx?wo=${workOrderNumber}&mode=Edit&tab=0`;
            console.log(chalk_1.default.yellow(`Navigating to ${url}...`));
            if (!browser.page) {
                throw new Error('Browser page not initialized');
            }
            await browser.page.goto(url, { waitUntil: 'networkidle2' });
            await browser.takeScreenshot('open_work_order');
            // Check if login is needed
            const isLoginPage = await browser.isLoginPage();
            if (isLoginPage) {
                console.log(chalk_1.default.yellow('Login page detected. Logging in...'));
                await browser.login('LPOLLOCK', 'password', 'URMCCEX3');
                // Navigate back to work order page after login
                await browser.page.goto(url, { waitUntil: 'networkidle2' });
                await browser.takeScreenshot('open_work_order_after_login');
            }
            console.log(chalk_1.default.green(`Successfully opened work order ${workOrderNumber} in Medimizer`));
            console.log(chalk_1.default.yellow('Browser window will remain open until the application is closed'));
            // The browser will remain open since we're not calling browser.close()
            return `Work order ${workOrderNumber} opened in Medimizer. Browser window will remain open.`;
        }
        catch (error) {
            // Don't close the browser even if there's an error
            if (error instanceof Error) {
                throw new Error(`Failed to open work order: ${error.message}`);
            }
            else {
                throw new Error('Failed to open work order: Unknown error');
            }
        }
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to open work order: ${error.message}`);
        }
        else {
            throw new Error('Failed to open work order: Unknown error');
        }
    }
}
