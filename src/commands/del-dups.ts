import chalk from 'chalk';
import { BrowserAutomation } from '../utils/browser-enhanced';

/**
 * del-dups command: Delete duplicate services from a work order
 * 
 * @param workOrderNumber - 7-digit work order number
 * @returns A promise that resolves to a success message
 */
export async function deleteDuplicates(workOrderNumber: string): Promise<string> {
  if (!workOrderNumber || !/^\d{7}$/.test(workOrderNumber)) {
    return chalk.red('Please provide a valid 7-digit work order number');
  }

  console.log(chalk.yellow(`Starting duplicate deletion for work order ${workOrderNumber}...`));
  
  const browser = BrowserAutomation.getInstance();
  
  try {
    // Initialize browser
    await browser.initialize();
    
    // Check if login is needed and perform login
    const isLoginPage = await browser.isLoginPage();
    if (isLoginPage) {
      console.log(chalk.yellow('Login page detected. Logging in...'));
      await browser.login('LPOLLOCK', '890piojkl!@#$98', 'URMCCEX3');
    }
    
    // Navigate to work order services tab
    await navigateToWorkOrderServices(browser, workOrderNumber);
    
    // Scan for duplicates and delete them
    const deletedCount = await scanAndDeleteDuplicates(browser, workOrderNumber);
    
    // Cleanup
    await browser.close();
    
    if (deletedCount > 0) {
      return chalk.green(`Successfully deleted ${deletedCount} duplicate services from work order ${workOrderNumber}`);
    } else {
      return chalk.green(`No duplicate services found for work order ${workOrderNumber}`);
    }
  } catch (error) {
    // Make sure to close the browser even if there's an error
    try {
      await browser.close();
    } catch (closeError) {
      console.log(chalk.yellow(`Warning: Could not close browser properly: ${closeError instanceof Error ? closeError.message : 'Unknown error'}`));
    }
    
    if (error instanceof Error) {
      return chalk.red(`Error: ${error.message}`);
    } else {
      return chalk.red('An unknown error occurred');
    }
  }
}

/**
 * Navigate to the services tab of a work order
 * 
 * @param browser - Browser automation instance
 * @param workOrderNumber - Work order number
 */
async function navigateToWorkOrderServices(browser: BrowserAutomation, workOrderNumber: string): Promise<void> {
  if (!browser.page) {
    throw new Error('Browser page not initialized');
  }
  
  // URL for the work order services tab (tab=1)
  const url = `http://sqlmedimizer1/MMWeb/App_Pages/WOForm.aspx?wo=${workOrderNumber}&mode=Edit&tab=1`;
  
  console.log(chalk.yellow(`Navigating to: ${url}`));
  
  try {
    await browser.page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Take screenshot for debugging
    await browser.takeScreenshot('work_order_services_page');
    
    // Check if we need to log in
    const isLoginPage = await browser.isLoginPage();
    if (isLoginPage) {
      console.log(chalk.yellow('Redirected to login page. Logging in...'));
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
    
    console.log(chalk.green('Successfully navigated to work order services page'));
  } catch (error) {
    throw new Error(`Failed to navigate to work order services: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Interface for a service record
 */
interface ServiceRecord {
  rowId: string;         // The HTML ID of the row
  dateTime: string;      // The date and time of the service
  minutes: number;       // Duration in minutes
  description: string;   // Service description
}

/**
 * Interface for a group of duplicate services
 */
interface DuplicateGroup {
  key: string;           // Unique key for this group (dateTime + description)
  services: ServiceRecord[]; // Array of duplicate services
}

/**
 * Scan for duplicate services and delete them
 * 
 * @param browser - Browser automation instance
 * @param workOrderNumber - Work order number
 * @returns Number of duplicates deleted
 */
async function scanAndDeleteDuplicates(browser: BrowserAutomation, workOrderNumber: string): Promise<number> {
  if (!browser.page) {
    throw new Error('Browser page not initialized');
  }
  
  try {
    console.log(chalk.yellow('Scanning for duplicate services...'));
    
    // Extract all service records from the page
    const serviceRecords = await extractServiceRecords(browser);
    
    if (serviceRecords.length === 0) {
      console.log(chalk.yellow('No services found'));
      return 0;
    }
    
    console.log(chalk.green(`Found ${serviceRecords.length} total services`));
    
    // Find duplicate groups (services with the same date/time and description)
    const duplicateGroups = findDuplicateGroups(serviceRecords);
    
    if (duplicateGroups.length === 0) {
      console.log(chalk.green('No duplicate services found'));
      return 0;
    }
    
    console.log(chalk.yellow(`Found ${duplicateGroups.length} groups of duplicate services`));
    
    // Log each duplicate group
    duplicateGroups.forEach((group, index) => {
      console.log(chalk.cyan(`Group ${index + 1}: ${group.services[0].dateTime} - ${group.services[0].description}`));
      console.log(chalk.cyan(`  ${group.services.length} occurrences found`));
      group.services.forEach((service, idx) => {
        console.log(chalk.cyan(`    ${idx + 1}. Row ID: ${service.rowId}`));
      });
    });
    
    // Delete the duplicates (keeping the first one in each group)
    let totalDeleted = 0;
    
    for (const group of duplicateGroups) {
      // Skip the first service (keep it)
      const duplicatesToDelete = group.services.slice(1);
      
      console.log(chalk.yellow(`Processing group: ${group.services[0].dateTime} - ${group.services[0].description}`));
      console.log(chalk.yellow(`  Keeping first occurrence, deleting ${duplicatesToDelete.length} duplicates`));
      
      for (const service of duplicatesToDelete) {
        // Delete this duplicate
        const success = await deleteService(browser, service.rowId);
        
        if (success) {
          totalDeleted++;
          console.log(chalk.green(`  Successfully deleted duplicate (Row ID: ${service.rowId})`));
        } else {
          console.log(chalk.red(`  Failed to delete duplicate (Row ID: ${service.rowId})`));
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
  } catch (error) {
    throw new Error(`Failed to scan and delete duplicates: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract all service records from the page
 * 
 * @param browser - Browser automation instance
 * @returns Array of service records
 */
async function extractServiceRecords(browser: BrowserAutomation): Promise<ServiceRecord[]> {
  if (!browser.page) {
    throw new Error('Browser page not initialized');
  }
  
  try {
    return await browser.page.evaluate(() => {
      const records: ServiceRecord[] = [];
      
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
  } catch (error) {
    throw new Error(`Failed to extract service records: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Find groups of duplicate services
 * 
 * @param services - Array of service records
 * @returns Array of duplicate groups
 */
function findDuplicateGroups(services: ServiceRecord[]): DuplicateGroup[] {
  // Group services by date/time + description
  const groups = new Map<string, ServiceRecord[]>();
  
  services.forEach(service => {
    const key = `${service.dateTime}|${service.description}`;
    
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    
    groups.get(key)!.push(service);
  });
  
  // Convert to array of duplicate groups (only where count > 1)
  const duplicateGroups: DuplicateGroup[] = [];
  
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
 * Delete a service by its row ID using keyboard-based confirmation
 * 
 * @param browser - Browser automation instance
 * @param rowId - Row ID of the service to delete
 * @returns True if successful, false otherwise
 */
async function deleteService(browser: BrowserAutomation, rowId: string): Promise<boolean> {
  if (!browser.page) {
    throw new Error('Browser page not initialized');
  }
  
  try {
    console.log(chalk.yellow(`Deleting service with row ID: ${rowId}`));
    
    // Take screenshot before deletion
    await browser.takeScreenshot(`before_delete_${rowId}`);
    
    // Count total services before deletion for verification
    const serviceCountBefore = await countServices(browser);
    console.log(chalk.yellow(`Service count before deletion: ${serviceCountBefore}`));
    
    // 1. Click on the row to select it
    const rowSelector = `#${rowId}`;
    
    try {
      await browser.page.waitForSelector(rowSelector, { visible: true, timeout: 5000 });
    } catch (error) {
      console.log(chalk.red(`Row not found: ${rowId}`));
      return false;
    }
    
    // Click the row to select it
    await browser.page.click(rowSelector);
    console.log(chalk.yellow(`Clicked row ${rowId}`));
    
    // Wait for selection to process
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 2. Find and click the Delete button
    console.log(chalk.yellow('Looking for Delete button...'));
    
    // Try multiple selectors for the Delete button
    const deleteButtonSelectors = [
      '#ContentPlaceHolder1_pagWorkOrder_btnDeleteService', 
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
          console.log(chalk.yellow(`Found delete button: ${selector}`));
          await browser.page.click(selector);
          buttonFound = true;
          break;
        }
      } catch (error) {
        // Continue to next selector
      }
    }
    
    // If no button found by selector, try to find by text content
    if (!buttonFound) {
      console.log(chalk.yellow('Trying to find Delete button by text content...'));
      
      buttonFound = await browser.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('input, button, a, span'));
        const deleteButton = buttons.find(el => 
          (el.textContent?.trim() === 'Delete' || 
           el.getAttribute('value')?.trim() === 'Delete')
        );
        
        if (deleteButton) {
          (deleteButton as HTMLElement).click();
          return true;
        }
        return false;
      });
    }
    
    if (!buttonFound) {
      console.log(chalk.red('Delete button not found'));
      return false;
    }
    
    // 3. Wait for the dialog and then use keyboard to confirm
    console.log(chalk.yellow('Waiting for confirmation dialog...'));
    
    // Wait for the dialog to appear
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Take screenshot of dialog
    await browser.takeScreenshot(`delete_dialog_${rowId}`);
    
    // DIRECT KEYBOARD APPROACH: Press Enter multiple times to confirm
    console.log(chalk.yellow('Using keyboard to confirm deletion...'));
    
    // Press Enter key multiple times with delays to ensure it's registered
    for (let i = 0; i < 3; i++) {
      await browser.page.keyboard.press('Enter');
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Press Tab and then Enter in case the OK button isn't focused by default
    await browser.page.keyboard.press('Tab');
    await new Promise(resolve => setTimeout(resolve, 500));
    await browser.page.keyboard.press('Enter');
    
    // Wait for the page to refresh/update after confirmation
    console.log(chalk.yellow('Waiting for page to update after confirmation...'));
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Take screenshot after deletion attempt
    await browser.takeScreenshot(`after_delete_${rowId}`);
    
    // 4. Verify deletion by counting services after deletion
    const serviceCountAfter = await countServices(browser);
    console.log(chalk.yellow(`Service count after deletion: ${serviceCountAfter}`));
    
    if (serviceCountAfter < serviceCountBefore) {
      console.log(chalk.green(`Deletion successful: Service count decreased from ${serviceCountBefore} to ${serviceCountAfter}`));
      return true;
    } else {
      console.log(chalk.red(`Deletion may have failed: Service count did not decrease (before: ${serviceCountBefore}, after: ${serviceCountAfter})`));
      
      // Try one more approach - using page.evaluate to directly trigger Enter key
      console.log(chalk.yellow('Trying alternative keyboard approach...'));
      
      await browser.page.evaluate(() => {
        // Create and dispatch a keyboard event for Enter key
        const enterEvent = new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true,
          cancelable: true
        });
        
        document.dispatchEvent(enterEvent);
        
        // Also try to find and click the OK button directly
        const okButton = document.querySelector('.dxbButton_Aqua');
        if (okButton) {
          (okButton as HTMLElement).click();
        }
      });
      
      // Wait again and recheck
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const serviceCountAfterRetry = await countServices(browser);
      if (serviceCountAfterRetry < serviceCountBefore) {
        console.log(chalk.green(`Deletion successful after retry: Service count decreased from ${serviceCountBefore} to ${serviceCountAfterRetry}`));
        return true;
      }
      
      return false;
    }
  } catch (error) {
    console.log(chalk.red(`Error deleting service: ${error instanceof Error ? error.message : 'Unknown error'}`));
    return false;
  }
}

/**
 * Count the total number of services in the grid
 * 
 * @param browser - Browser automation instance
 * @returns The number of services
 */
async function countServices(browser: BrowserAutomation): Promise<number> {
  if (!browser.page) {
    throw new Error('Browser page not initialized');
  }
  
  try {
    return await browser.page.evaluate(() => {
      // Get all rows except the header row and employee row
      const rows = document.querySelectorAll('tr.dxgvDataRow_Aqua');
      
      // Count only service rows (exclude employee row)
      let count = 0;
      rows.forEach(row => {
        const text = row.textContent || '';
        if (!text.includes('(Employee)')) {
          count++;
        }
      });
      
      return count;
    });
  } catch (error) {
    console.log(chalk.red(`Error counting services: ${error instanceof Error ? error.message : 'Unknown error'}`));
    return 0;
  }
}