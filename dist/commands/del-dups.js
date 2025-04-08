"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteDuplicates = deleteDuplicates;
const chalk_1 = __importDefault(require("chalk"));
const browser_enhanced_1 = require("../utils/browser-enhanced");
/**
 * del-dups command: Delete duplicate services from a work order
 *
 * @param workOrderNumber - 7-digit work order number
 * @returns A promise that resolves to a success message
 */
async function deleteDuplicates(workOrderNumber) {
    if (!workOrderNumber || !/^\d{7}$/.test(workOrderNumber)) {
        return chalk_1.default.red('Please provide a valid 7-digit work order number');
    }
    console.log(chalk_1.default.yellow(`Starting duplicate deletion for work order ${workOrderNumber}...`));
    const browser = browser_enhanced_1.BrowserAutomation.getInstance();
    try {
        // Initialize browser
        await browser.initialize();
        // Check if login is needed and perform login
        const isLoginPage = await browser.isLoginPage();
        if (isLoginPage) {
            console.log(chalk_1.default.yellow('Login page detected. Logging in...'));
            await browser.login('LPOLLOCK', '890piojkl!@#$98', 'URMCCEX3');
        }
        // Navigate to work order services tab
        await navigateToWorkOrderServices(browser, workOrderNumber);
        // Scan for duplicates and delete them
        const deletedCount = await scanAndDeleteDuplicates(browser, workOrderNumber);
        // Cleanup
        await browser.close();
        if (deletedCount > 0) {
            return chalk_1.default.green(`Successfully deleted ${deletedCount} duplicate services from work order ${workOrderNumber}`);
        }
        else {
            return chalk_1.default.green(`No duplicate services found for work order ${workOrderNumber}`);
        }
    }
    catch (error) {
        // Make sure to close the browser even if there's an error
        try {
            await browser.close();
        }
        catch (closeError) {
            console.log(chalk_1.default.yellow(`Warning: Could not close browser properly: ${closeError instanceof Error ? closeError.message : 'Unknown error'}`));
        }
        if (error instanceof Error) {
            return chalk_1.default.red(`Error: ${error.message}`);
        }
        else {
            return chalk_1.default.red('An unknown error occurred');
        }
    }
}
/**
 * Navigate to the services tab of a work order
 *
 * @param browser - Browser automation instance
 * @param workOrderNumber - Work order number
 */
async function navigateToWorkOrderServices(browser, workOrderNumber) {
    if (!browser.page) {
        throw new Error('Browser page not initialized');
    }
    // URL for the work order services tab (tab=1)
    const url = `http://sqlmedimizer1/MMWeb/App_Pages/WOForm.aspx?wo=${workOrderNumber}&mode=Edit&tab=1`;
    console.log(chalk_1.default.yellow(`Navigating to: ${url}`));
    try {
        await browser.page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        // Take screenshot for debugging
        await browser.takeScreenshot('work_order_services_page');
        // Check if we need to log in
        const isLoginPage = await browser.isLoginPage();
        if (isLoginPage) {
            console.log(chalk_1.default.yellow('Redirected to login page. Logging in...'));
            await browser.login('LPOLLOCK', '890piojkl!@#$98', 'URMCCEX3');
            // Navigate again after login
            await browser.page.goto(url, { waitUntil: 'networkidle2' });
            await browser.takeScreenshot('work_order_services_after_login');
        }
        // Wait for page to fully load
        await new Promise(resolve => setTimeout(resolve, 2000));
        // Verify we're on the services tab by checking for the services grid
        const servicesGridExists = await browser.page.evaluate(() => {
            return !!document.querySelector('#ContentPlaceHolder1_pagWorkOrder_gvServInfo_DXMainTable');
        });
        if (!servicesGridExists) {
            throw new Error('Failed to load services grid');
        }
        console.log(chalk_1.default.green('Successfully navigated to work order services page'));
    }
    catch (error) {
        throw new Error(`Failed to navigate to work order services: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Scan for duplicate services and delete them
 *
 * @param browser - Browser automation instance
 * @param workOrderNumber - Work order number
 * @returns Number of duplicates deleted
 */
async function scanAndDeleteDuplicates(browser, workOrderNumber) {
    if (!browser.page) {
        throw new Error('Browser page not initialized');
    }
    try {
        console.log(chalk_1.default.yellow('Scanning for duplicate services...'));
        // Extract all service records from the page
        const serviceRecords = await extractServiceRecords(browser);
        if (serviceRecords.length === 0) {
            console.log(chalk_1.default.yellow('No services found'));
            return 0;
        }
        console.log(chalk_1.default.green(`Found ${serviceRecords.length} total services`));
        // Find duplicate groups (services with the same date/time and description)
        const duplicateGroups = findDuplicateGroups(serviceRecords);
        if (duplicateGroups.length === 0) {
            console.log(chalk_1.default.green('No duplicate services found'));
            return 0;
        }
        console.log(chalk_1.default.yellow(`Found ${duplicateGroups.length} groups of duplicate services`));
        // Log each duplicate group
        duplicateGroups.forEach((group, index) => {
            console.log(chalk_1.default.cyan(`Group ${index + 1}: ${group.services[0].dateTime} - ${group.services[0].description}`));
            console.log(chalk_1.default.cyan(`  ${group.services.length} occurrences found`));
            group.services.forEach((service, idx) => {
                console.log(chalk_1.default.cyan(`    ${idx + 1}. Row ID: ${service.rowId}`));
            });
        });
        // Delete the duplicates (keeping the first one in each group)
        let totalDeleted = 0;
        for (const group of duplicateGroups) {
            // Skip the first service (keep it)
            const duplicatesToDelete = group.services.slice(1);
            console.log(chalk_1.default.yellow(`Processing group: ${group.services[0].dateTime} - ${group.services[0].description}`));
            console.log(chalk_1.default.yellow(`  Keeping first occurrence, deleting ${duplicatesToDelete.length} duplicates`));
            for (const service of duplicatesToDelete) {
                // Delete this duplicate
                const success = await deleteService(browser, service.rowId);
                if (success) {
                    totalDeleted++;
                    console.log(chalk_1.default.green(`  Successfully deleted duplicate (Row ID: ${service.rowId})`));
                }
                else {
                    console.log(chalk_1.default.red(`  Failed to delete duplicate (Row ID: ${service.rowId})`));
                }
                // Wait a moment before continuing
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            // After deleting duplicates from this group, refresh the page to get updated DOM
            if (duplicatesToDelete.length > 0) {
                await navigateToWorkOrderServices(browser, workOrderNumber);
            }
        }
        return totalDeleted;
    }
    catch (error) {
        throw new Error(`Failed to scan and delete duplicates: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Extract all service records from the page
 *
 * @param browser - Browser automation instance
 * @returns Array of service records
 */
async function extractServiceRecords(browser) {
    if (!browser.page) {
        throw new Error('Browser page not initialized');
    }
    try {
        return await browser.page.evaluate(() => {
            const records = [];
            // Get all service rows from the grid
            const rows = document.querySelectorAll('tr.dxgvDataRow_Aqua');
            rows.forEach(row => {
                // Skip employee row
                const cellText = row.querySelector('td.dxgv')?.textContent || '';
                if (cellText.includes('(Employee)')) {
                    return;
                }
                // Extract row ID
                const rowId = row.id || '';
                if (!rowId) {
                    return;
                }
                // Parse cell content
                // Example: "-   4/7/2025 12:39 AM -   21 Minutes - Analyzed Unit"
                const match = cellText.match(/^\s*-\s*([\d/]+\s+[\d:]+\s*[APM]+)\s*-\s*(\d+)\s*Minutes\s*-\s*(.+?)\s*$/i);
                if (match) {
                    records.push({
                        rowId,
                        dateTime: match[1].trim(),
                        minutes: parseInt(match[2], 10),
                        description: match[3].trim()
                    });
                }
            });
            return records;
        });
    }
    catch (error) {
        throw new Error(`Failed to extract service records: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Find groups of duplicate services
 *
 * @param services - Array of service records
 * @returns Array of duplicate groups
 */
function findDuplicateGroups(services) {
    // Group services by date/time + description
    const groups = new Map();
    services.forEach(service => {
        const key = `${service.dateTime}|${service.description}`;
        if (!groups.has(key)) {
            groups.set(key, []);
        }
        groups.get(key).push(service);
    });
    // Convert to array of duplicate groups (only where count > 1)
    const duplicateGroups = [];
    groups.forEach((services, key) => {
        if (services.length > 1) {
            duplicateGroups.push({
                key,
                services
            });
        }
    });
    return duplicateGroups;
}
/**
 * Delete a service by its row ID
 *
 * @param browser - Browser automation instance
 * @param rowId - Row ID of the service to delete
 * @returns True if successful, false otherwise
 */
async function deleteService(browser, rowId) {
    if (!browser.page) {
        throw new Error('Browser page not initialized');
    }
    try {
        console.log(chalk_1.default.yellow(`Deleting service with row ID: ${rowId}`));
        // Take screenshot before deletion
        await browser.takeScreenshot(`before_delete_${rowId}`);
        // 1. Click on the row to select it
        const rowSelector = `#${rowId}`;
        try {
            await browser.page.waitForSelector(rowSelector, { visible: true, timeout: 5000 });
        }
        catch (error) {
            console.log(chalk_1.default.red(`Row not found: ${rowId}`));
            return false;
        }
        // Click the row to select it
        await browser.page.click(rowSelector);
        console.log(chalk_1.default.yellow(`Clicked row ${rowId}`));
        // Wait for selection to process
        await new Promise(resolve => setTimeout(resolve, 1000));
        // 2. Find and click the Delete button
        console.log(chalk_1.default.yellow('Looking for Delete button...'));
        // Try multiple selectors for the Delete button
        const deleteButtonSelectors = [
            '#ContentPlaceHolder1_pagWorkOrder_btnDeleteService', // Try this specific ID first
            '#ContentPlaceHolder1_pagWorkOrder_btnDelete',
            'input[value="Delete"]',
            'input[type="button"][value="Delete"]',
            'input[onclick*="delete"]',
            'input[id*="Delete"]',
            'a[id*="Delete"]',
            'span[id*="Delete"]'
        ];
        let buttonFound = false;
        for (const selector of deleteButtonSelectors) {
            try {
                const buttonExists = await browser.page.$(selector);
                if (buttonExists) {
                    console.log(chalk_1.default.yellow(`Found delete button: ${selector}`));
                    await browser.page.click(selector);
                    buttonFound = true;
                    break;
                }
            }
            catch (error) {
                // Continue to next selector
            }
        }
        // If no button found by selector, try to find by text content
        if (!buttonFound) {
            console.log(chalk_1.default.yellow('Trying to find Delete button by text content...'));
            buttonFound = await browser.page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('input, button, a, span'));
                const deleteButton = buttons.find(el => (el.textContent?.trim() === 'Delete' ||
                    el.getAttribute('value')?.trim() === 'Delete'));
                if (deleteButton) {
                    deleteButton.click();
                    return true;
                }
                return false;
            });
        }
        if (!buttonFound) {
            console.log(chalk_1.default.red('Delete button not found'));
            return false;
        }
        // 3. Handle the confirmation dialog
        console.log(chalk_1.default.yellow('Waiting for confirmation dialog...'));
        // Set up dialog handler (must be done before clicking Delete)
        let dialogDetected = false;
        browser.page.once('dialog', async (dialog) => {
            dialogDetected = true;
            console.log(chalk_1.default.yellow(`Dialog detected: ${dialog.message()}`));
            await dialog.accept();
        });
        // Wait for the dialog
        await new Promise(resolve => setTimeout(resolve, 2000));
        // If no dialog was detected, try pressing Enter anyway
        if (!dialogDetected) {
            console.log(chalk_1.default.yellow('No dialog detected, pressing Enter key...'));
            await browser.page.keyboard.press('Enter');
        }
        // Wait for the page to update
        await new Promise(resolve => setTimeout(resolve, 3000));
        // Take screenshot after deletion attempt
        await browser.takeScreenshot(`after_delete_${rowId}`);
        // 4. Verify the row was deleted
        const rowStillExists = await browser.page.evaluate((id) => {
            return !!document.getElementById(id);
        }, rowId);
        if (rowStillExists) {
            console.log(chalk_1.default.red(`Row ${rowId} still exists after deletion attempt`));
            return false;
        }
        console.log(chalk_1.default.green(`Successfully deleted service ${rowId}`));
        return true;
    }
    catch (error) {
        console.log(chalk_1.default.red(`Error deleting service: ${error instanceof Error ? error.message : 'Unknown error'}`));
        return false;
    }
}
