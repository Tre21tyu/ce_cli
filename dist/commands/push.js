"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pushStack = pushStack;
/**
 * Compare time values to see if they're equivalent, ignoring formatting differences
 *
 * @param actual - Actual time value from the form
 * @param expected - Expected time value
 * @returns True if time values are equivalent
 */
function compareTimeValues(actual, expected) {
    try {
        // Extract numbers and AM/PM from both strings
        const actualNumbers = actual.replace(/[^0-9]/g, '');
        const expectedNumbers = expected.replace(/[^0-9]/g, '');
        const actualHasAM = actual.toLowerCase().includes('am');
        const actualHasPM = actual.toLowerCase().includes('pm');
        const expectedHasAM = expected.toLowerCase().includes('am');
        const expectedHasPM = expected.toLowerCase().includes('pm');
        // Special case - compact format might be missing leading zeros
        if (expected.match(/^\d{3,4}(am|pm)$/i)) {
            // For compact format like "800am" or "1118pm"
            const numbers = expected.replace(/[^0-9]/g, '');
            if (numbers === actualNumbers) {
                return (actualHasAM && expectedHasAM) || (actualHasPM && expectedHasPM);
            }
        }
        // Check if the numeric parts match and AM/PM matches
        const numbersMatch = actualNumbers.includes(expectedNumbers) || expectedNumbers.includes(actualNumbers);
        const amPmMatch = (actualHasAM && expectedHasAM) || (actualHasPM && expectedHasPM);
        return numbersMatch && amPmMatch;
    }
    catch (error) {
        console.log(chalk_1.default.yellow(`Error comparing time values: ${error instanceof Error ? error.message : 'Unknown error'}`));
        return false;
    }
}
const chalk_1 = __importDefault(require("chalk"));
const stack_manager_1 = require("../utils/stack-manager");
const browser_enhanced_1 = require("../utils/browser-enhanced");
/**
 * Push services from the stack to Medimizer
 *
 * @param dryRun - If true, simulate without actually pushing to Medimizer
 * @returns A promise that resolves to a success message
 */
async function pushStack(dryRun = false) {
    try {
        // Get stack manager instance
        const stackManager = stack_manager_1.StackManager.getInstance();
        // Get the current stack
        const stack = await stackManager.getStack();
        if (stack.length === 0) {
            return 'Stack is empty. Nothing to push.';
        }
        // Count total services that need to be pushed
        let totalServices = 0;
        let unpushedServices = 0;
        stack.forEach(wo => {
            totalServices += wo.services.length;
            unpushedServices += wo.services.filter(service => !service.pushedToMM).length;
        });
        if (unpushedServices === 0) {
            return 'All services in the stack have already been pushed to Medimizer.';
        }
        console.log(chalk_1.default.yellow(`Preparing to push ${unpushedServices} service(s) to Medimizer...`));
        if (dryRun) {
            console.log(chalk_1.default.yellow('DRY RUN: No actual changes will be made to Medimizer.'));
            return await simulatePush(stack);
        }
        // Get browser automation instance
        const browser = browser_enhanced_1.BrowserAutomation.getInstance();
        try {
            // Initialize browser and ensure login
            await browser.initialize();
            // Check if login is needed and perform login
            console.log(chalk_1.default.yellow('Checking if login is required...'));
            const isLoginPage = await browser.isLoginPage();
            if (isLoginPage) {
                console.log(chalk_1.default.yellow('Login page detected. Logging in...'));
                await browser.login('LPOLLOCK', '890piojkl!@#$98', 'URMCCEX3');
            }
            else {
                console.log(chalk_1.default.green('Already logged in.'));
            }
            // Push each work order's services
            let successCount = 0;
            let failureCount = 0;
            for (const workOrder of stack) {
                console.log(chalk_1.default.cyan(`Processing work order ${workOrder.workOrderNumber}...`));
                // Get unpushed services for this work order
                const unpushedServices = workOrder.services.filter(service => !service.pushedToMM);
                if (unpushedServices.length === 0) {
                    console.log(chalk_1.default.green(`No unpushed services for work order ${workOrder.workOrderNumber}.`));
                    continue;
                }
                for (let i = 0; i < unpushedServices.length; i++) {
                    const service = unpushedServices[i];
                    console.log(chalk_1.default.yellow(`Pushing service ${i + 1}/${unpushedServices.length}: Verb ${service.verb_code}${service.noun_code ? `, Noun ${service.noun_code}` : ''}`));
                    try {
                        // Push the service to Medimizer
                        await pushServiceToMedimizer(browser, workOrder.workOrderNumber, service);
                        // Mark service as pushed
                        service.pushedToMM = 1;
                        successCount++;
                        console.log(chalk_1.default.green(`Service pushed successfully.`));
                    }
                    catch (error) {
                        console.error(chalk_1.default.red(`Failed to push service: ${error instanceof Error ? error.message : 'Unknown error'}`));
                        failureCount++;
                    }
                }
            }
            // Save updated stack
            await stackManager.saveStack();
            // Close browser
            await browser.close();
            // Return summary
            return `Push completed. ${successCount} service(s) pushed successfully, ${failureCount} failed.`;
        }
        catch (error) {
            // Make sure to close the browser even if there's an error
            try {
                await browser.close();
            }
            catch (closeError) {
                console.log(chalk_1.default.yellow(`Warning: Could not close browser properly: ${closeError instanceof Error ? closeError.message : 'Unknown error'}`));
            }
            throw error;
        }
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to push stack: ${error.message}`);
        }
        else {
            throw new Error('Failed to push stack: Unknown error');
        }
    }
}
/**
 * Simulate pushing services without actually doing it (dry run)
 *
 * @param stack - The current stack of work orders
 * @returns A simulation summary message
 */
async function simulatePush(stack) {
    let totalServices = 0;
    for (const workOrder of stack) {
        const unpushedServices = workOrder.services.filter((service) => !service.pushedToMM);
        if (unpushedServices.length > 0) {
            console.log(chalk_1.default.cyan(`Would push ${unpushedServices.length} service(s) for work order ${workOrder.workOrderNumber}:`));
            unpushedServices.forEach((service, index) => {
                // Parse datetime into MM/DD/YYYY and HH:MM AM/PM format
                const [datePart, timePart] = parseDatetime(service.datetime);
                console.log(chalk_1.default.white(`  ${index + 1}. Verb: ${service.verb_code}${service.noun_code ? `, Noun: ${service.noun_code}` : ''}`));
                console.log(chalk_1.default.white(`     Date: ${datePart}, Time: ${timePart}`));
                console.log(chalk_1.default.white(`     Notes: ${service.notes.substring(0, 50)}${service.notes.length > 50 ? '...' : ''}`));
            });
            totalServices += unpushedServices.length;
        }
    }
    return `Simulation complete. Would push ${totalServices} service(s) to Medimizer.`;
}
/**
 * Push a service to Medimizer using browser automation
 *
 * @param browser - Browser automation instance
 * @param workOrderNumber - Work order number
 * @param service - Service to push
 */
async function pushServiceToMedimizer(browser, workOrderNumber, service) {
    if (!browser.page) {
        throw new Error('Browser page not initialized');
    }
    try {
        // Navigate to service add page
        const serviceAddUrl = `http://sqlmedimizer1/MMWeb/App_Pages/ServiceForm.aspx?WO=${workOrderNumber}&Service=add`;
        console.log(chalk_1.default.yellow(`Navigating to ${serviceAddUrl}...`));
        await browser.page.goto(serviceAddUrl, { waitUntil: 'networkidle2' });
        await browser.takeScreenshot('service_add_page');
        // Check if we were redirected to login page
        const isLoginPage = await browser.isLoginPage();
        if (isLoginPage) {
            console.log(chalk_1.default.yellow('Redirected to login page. Logging in...'));
            await browser.login('LPOLLOCK', '890piojkl!@#$98', 'URMCCEX3');
            // Navigate back to service add page after login
            await browser.page.goto(serviceAddUrl, { waitUntil: 'networkidle2' });
            await browser.takeScreenshot('service_add_page_after_login');
        }
        // Enter Verb Code
        await enterTextWithRetry(browser, '#ContentPlaceHolder1_pagService_cboServiceCode_I', service.verb_code.toString());
        // Wait for dropdown and select first option
        await new Promise(resolve => setTimeout(resolve, 750));
        await browser.page.keyboard.press('ArrowDown');
        await browser.page.keyboard.press('Enter');
        // Enter Noun Code if applicable
        if (service.noun_code !== undefined) {
            await enterTextWithRetry(browser, '#ContentPlaceHolder1_pagService_cboServiceNoun_I', service.noun_code.toString());
            // Wait for dropdown and select first option
            await new Promise(resolve => setTimeout(resolve, 750));
            await browser.page.keyboard.press('ArrowDown');
            await browser.page.keyboard.press('Enter');
        }
        // Parse datetime
        const [datePart, timePart] = parseDatetime(service.datetime);
        // Enter Date
        await enterTextWithRetry(browser, '#ContentPlaceHolder1_pagService_datCompletedOn_I', datePart);
        // Press Enter after entering date
        await browser.page.keyboard.press('Enter');
        // Enter Time - simplified format with no colon or space
        // Format time as "800am" or "1118pm" and press Enter
        const timeFormatted = formatTimeForInput(timePart);
        await enterTextWithRetry(browser, '#ContentPlaceHolder1_pagService_timCompletedOn_I', timeFormatted);
        // Press Enter after entering time
        await browser.page.keyboard.press('Enter');
        // Enter Time Used (0 for now)
        // Try multiple possible selectors for the time used field
        const timeUsedSelectors = [
            '#ContentPlaceHolder1_pagService_meTime_I',
            '#ContentPlaceHolder1_pagService_txtTime_I',
            'input[name="ctl00$ContentPlaceHolder1$pagService$meTime"]'
        ];
        let timeFieldFound = false;
        for (const selector of timeUsedSelectors) {
            try {
                const exists = await browser.page.waitForSelector(selector, {
                    visible: true,
                    timeout: 2000
                }).then(() => true).catch(() => false);
                if (exists) {
                    await enterTextWithRetry(browser, selector, '0');
                    // Press Enter after entering time used
                    await browser.page.keyboard.press('Enter');
                    timeFieldFound = true;
                    break;
                }
            }
            catch (error) {
                console.log(chalk_1.default.yellow(`Time used selector ${selector} not found, trying next...`));
            }
        }
        if (!timeFieldFound) {
            console.log(chalk_1.default.yellow('Could not find time used field, continuing anyway...'));
            // Take screenshot for debugging
            await browser.takeScreenshot('time_field_not_found');
        }
        // Enter Employee (LPOLLOCK) - last field before submission
        const employeeSelector = '#ContentPlaceHolder1_pagService_cboEmployees_I';
        try {
            await enterTextWithRetry(browser, employeeSelector, 'LPOLLOCK');
            // Press Enter after entering employee
            await browser.page.keyboard.press('Enter');
            console.log(chalk_1.default.green('Successfully entered employee information'));
        }
        catch (error) {
            console.log(chalk_1.default.yellow(`Could not enter employee information: ${error instanceof Error ? error.message : 'Unknown error'}`));
            // Continue anyway - the field might have a default value
        }
        // Screenshot before submission
        await browser.page.screenshot({ path: browser.getScreenshotPath('before_service_submit'), fullPage: true });
        // Submit the form
        console.log(chalk_1.default.yellow('Submitting service form...'));
        // Look for the "Work Order Form" button
        const workOrderFormButtonSelector = '#ContentPlaceHolder1_btnWorkOrderForm';
        await browser.page.waitForSelector(workOrderFormButtonSelector, { visible: true, timeout: 10000 });
        await browser.page.click(workOrderFormButtonSelector);
        // Wait for navigation back to the work order form
        await browser.page.waitForNavigation({ waitUntil: 'networkidle2' });
        // Take screenshot after submission
        await browser.takeScreenshot('after_service_submit');
        // Verify the service was added
        const wasAdded = await verifyServiceAdded(browser, workOrderNumber, service);
        if (!wasAdded) {
            throw new Error('Service was not successfully added to Medimizer');
        }
    }
    catch (error) {
        await browser.takeScreenshot('service_push_error');
        if (error instanceof Error) {
            throw new Error(`Failed to push service: ${error.message}`);
        }
        else {
            throw new Error('Failed to push service: Unknown error');
        }
    }
}
/**
 * Enter text into an input field with retries
 *
 * @param browser - Browser automation instance
 * @param selector - CSS selector for the input field
 * @param text - Text to enter
 */
async function enterTextWithRetry(browser, selector, text) {
    if (!browser.page) {
        throw new Error('Browser page not initialized');
    }
    const maxRetries = 3;
    let retries = 0;
    let success = false;
    while (retries < maxRetries && !success) {
        try {
            // Wait for selector
            await browser.page.waitForSelector(selector, { visible: true, timeout: 5000 });
            // Click to focus and clear existing content
            await browser.page.click(selector, { clickCount: 3 });
            await browser.page.keyboard.press('Backspace'); // Ensure field is cleared
            // Wait a bit before typing (some forms need this delay)
            await new Promise(resolve => setTimeout(resolve, 200));
            // Type the text
            await browser.page.type(selector, text, { delay: 50 });
            // Wait a bit to allow form to process the input
            await new Promise(resolve => setTimeout(resolve, 200));
            // Verify text was entered
            const enteredText = await browser.page.evaluate((sel) => {
                const input = document.querySelector(sel);
                return input ? input.value : '';
            }, selector);
            // For time fields, AM/PM might be automatically set by the form,
            // so we check if the text is contained rather than exact match
            if (text.includes(':') || text.toLowerCase().includes('am') || text.toLowerCase().includes('pm')) {
                // For time fields, check if the important parts match
                const timeMatch = compareTimeValues(enteredText, text);
                if (timeMatch) {
                    success = true;
                    console.log(chalk_1.default.green(`Successfully entered time value similar to "${text}" into ${selector}`));
                }
                else {
                    console.log(chalk_1.default.yellow(`Failed to enter time correctly. Expected "${text}", got "${enteredText}". Retrying...`));
                    retries++;
                }
            }
            else if (enteredText.includes(text) || text.includes(enteredText)) {
                // For other fields, check if the text is contained
                success = true;
                console.log(chalk_1.default.green(`Successfully entered "${text}" into ${selector}`));
            }
            else {
                console.log(chalk_1.default.yellow(`Failed to enter text. Expected "${text}", got "${enteredText}". Retrying...`));
                retries++;
            }
        }
        catch (error) {
            console.log(chalk_1.default.yellow(`Error entering text (${retries + 1}/${maxRetries}): ${error instanceof Error ? error.message : 'Unknown error'}`));
            retries++;
            if (retries >= maxRetries) {
                throw new Error(`Failed to enter text after ${maxRetries} attempts`);
            }
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
}
/**
 * Verify that a service was successfully added to Medimizer
 *
 * @param browser - Browser automation instance
 * @param workOrderNumber - Work order number
 * @param service - Service that was pushed
 * @returns True if the service was found, false otherwise
 */
async function verifyServiceAdded(browser, workOrderNumber, service) {
    if (!browser.page) {
        throw new Error('Browser page not initialized');
    }
    try {
        // Ensure we're on the work order page with services tab
        const workOrderUrl = `http://sqlmedimizer1/MMWeb/App_Pages/WOForm.aspx?wo=${workOrderNumber}&tab=1`;
        // Only navigate if we're not already on the correct page
        const currentUrl = browser.page.url();
        if (!currentUrl.includes(`wo=${workOrderNumber}&tab=1`)) {
            await browser.page.goto(workOrderUrl, { waitUntil: 'networkidle2' });
            // Check if we were redirected to login page
            const isLoginPage = await browser.isLoginPage();
            if (isLoginPage) {
                console.log(chalk_1.default.yellow('Redirected to login page during verification. Logging in...'));
                await browser.login('LPOLLOCK', '890piojkl!@#$98', 'URMCCEX3');
                // Navigate back to work order page after login
                await browser.page.goto(workOrderUrl, { waitUntil: 'networkidle2' });
            }
        }
        // Parse datetime for matching
        const [datePart] = parseDatetime(service.datetime);
        // Wait for the services table to load
        console.log(chalk_1.default.yellow('Checking if service was added...'));
        // Wait for table
        await browser.page.waitForSelector('td.dxgv', { timeout: 10000 });
        // Take screenshot of the services page
        await browser.takeScreenshot('service_verification');
        // Look for the service in the table
        const serviceFound = await browser.page.evaluate((verbCode, nounCode, dateStr) => {
            // Helper function to check if a cell contains text
            const cellContains = (cell, text) => {
                return cell.textContent?.includes(text) || false;
            };
            // Get all service rows
            const cells = Array.from(document.querySelectorAll('td.dxgv'));
            // Look for cells that contain both the verb code and the date
            for (const cell of cells) {
                // For service verification, we just need to find the verb code and date
                // The service might not include the noun code in the display
                if (cellContains(cell, verbCode.toString()) && cellContains(cell, dateStr)) {
                    return true;
                }
            }
            return false;
        }, service.verb_code, service.noun_code, datePart);
        if (serviceFound) {
            console.log(chalk_1.default.green('Service was successfully verified in Medimizer'));
            return true;
        }
        else {
            console.log(chalk_1.default.red('Service was not found in Medimizer'));
            return false;
        }
    }
    catch (error) {
        console.log(chalk_1.default.red(`Error verifying service: ${error instanceof Error ? error.message : 'Unknown error'}`));
        return false;
    }
}
/**
 * Format time from "HH:MM AM/PM" to compact format "HHMMam/pm" for input fields
 *
 * @param timeString - Time string in format "HH:MM AM/PM"
 * @returns Formatted time string like "800am" or "1118pm"
 */
function formatTimeForInput(timeString) {
    try {
        // Extract hours, minutes, and period (AM/PM)
        const matches = timeString.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (!matches) {
            console.log(chalk_1.default.yellow(`Could not parse time string: ${timeString}, using as is`));
            return timeString;
        }
        const hours = parseInt(matches[1], 10);
        const minutes = matches[2];
        const period = matches[3].toLowerCase();
        // Combine without colon or space
        return `${hours}${minutes}${period}`;
    }
    catch (error) {
        console.log(chalk_1.default.yellow(`Error formatting time: ${error instanceof Error ? error.message : 'Unknown error'}`));
        return timeString;
    }
}
function parseDatetime(datetime) {
    try {
        // Split datetime into date and time parts
        const parts = datetime.split(' ');
        if (parts.length < 2) {
            throw new Error(`Invalid datetime format: ${datetime}`);
        }
        const datePart = parts[0]; // YYYY-MM-DD
        let timePart = parts[1]; // HH:MM or HH-MM
        // Parse date
        const [year, month, day] = datePart.split('-').map(part => parseInt(part, 10));
        // Format date as MM/DD/YYYY
        const formattedDate = `${month}/${day}/${year}`;
        // Parse time
        let hours;
        let minutes;
        // Check if time part uses colon or hyphen
        if (timePart.includes(':')) {
            [hours, minutes] = timePart.split(':').map(part => parseInt(part, 10));
        }
        else if (timePart.includes('-')) {
            [hours, minutes] = timePart.split('-').map(part => parseInt(part, 10));
        }
        else {
            throw new Error(`Invalid time format: ${timePart}`);
        }
        // Format time as HH:MM AM/PM
        const isPM = hours >= 12;
        const hour12 = hours % 12 || 12; // Convert 0 to 12
        const formattedTime = `${hour12}:${minutes.toString().padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;
        return [formattedDate, formattedTime];
    }
    catch (error) {
        console.error(chalk_1.default.red(`Error parsing datetime ${datetime}: ${error instanceof Error ? error.message : 'Unknown error'}`));
        // Return defaults in case of error
        return ['01/01/2025', '12:00 PM'];
    }
}
