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
 * Handle the custom confirmation dialog by specifically targeting the OK button
 * 
 * @param browser - Browser automation instance
 * @returns True if button was clicked successfully
 */
async function handleConfirmationDialog(browser: BrowserAutomation): Promise<boolean> {
  if (!browser.page) {
    throw new Error('Browser page not initialized');
  }
  
  try {
    console.log(chalk.yellow('Handling confirmation dialog...'));
    
    // Wait for the dialog to appear
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Take a screenshot of the dialog for debugging
    await browser.takeScreenshot('confirmation_dialog');
    
    // Directly target the OK button based on your screenshot
    // Exact selector for the blue OK button visible in your screenshot
    const success = await browser.page.evaluate(() => {
      // Try various methods to find and click the OK button
      
      // Method 1: Try clicking by CSS class (visible in your screenshot)
      const okButtonByClass = document.querySelector('.dxbButton_Aqua');
      if (okButtonByClass) {
        console.log('Found OK button by class .dxbButton_Aqua');
        (okButtonByClass as HTMLElement).click();
        return true;
      }
      
      // Method 2: Try clicking by element ID
      const okButtonById = document.querySelector('#OK, #OK_CD');
      if (okButtonById) {
        console.log('Found OK button by ID');
        (okButtonById as HTMLElement).click();
        return true;
      }
      
      // Method 3: Find buttons in any dialog-like container
      const dialogContainers = document.querySelectorAll('.dxpcContentWrapper, .dxpcLite, .ui-dialog-content');
      for (const container of Array.from(dialogContainers)) {
        const buttons = container.querySelectorAll('button, input[type="button"]');
        for (const button of Array.from(buttons)) {
          // If button text is OK, or it's the first/leftmost button
          if (button.textContent?.trim() === 'OK' || 
              button.getAttribute('value') === 'OK') {
            console.log('Found OK button in dialog container');
            (button as HTMLElement).click();
            return true;
          }
        }
        
        // If we found a container but no specific OK button, click the first button
        if (buttons.length > 0) {
          console.log('Clicking first button in dialog container');
          (buttons[0] as HTMLElement).click();
          return true;
        }
      }
      
      // Method 4: Find any element with OK text
      const okElements = Array.from(document.querySelectorAll('*')).filter(el => 
        el.textContent?.trim() === 'OK'
      );
      
      if (okElements.length > 0) {
        console.log('Found element with OK text');
        (okElements[0] as HTMLElement).click();
        return true;
      }
      
      // Method 5: Look for elements inside the specific dialog shown in screenshot
      // The screenshot shows a white dialog box with blue OK button
      const visibleButtons = Array.from(document.querySelectorAll('button, input[type="button"]')).filter(el => {
        const style = window.getComputedStyle(el);
        // Only consider visible buttons
        return style.display !== 'none' && style.visibility !== 'hidden';
      });
      
      // Click the first visible button we find
      if (visibleButtons.length > 0) {
        console.log('Clicking first visible button');
        (visibleButtons[0] as HTMLElement).click();
        return true;
      }
      
      console.log('Could not find OK button by any method');
      return false;
    });
    
    if (!success) {
      console.log(chalk.yellow('Could not find OK button with JavaScript, trying Puppeteer click methods...'));
      
      // If JavaScript methods failed, try Puppeteer's click methods with specific coordinates
      
      // Method 1: Try clicking specific coordinates where OK button appears based on screenshot
      // This targets the blue OK button in the dialog
      try {
        // First try to get the viewport size to calculate center
        const viewportSize = await browser.page.viewport();
        if (viewportSize) {
          // Assume dialog is centered - click center-right where OK button would be
          // These values are estimates based on your screenshot
          const x = Math.floor(viewportSize.width / 2) + 50; // Slightly to the right of center
          const y = Math.floor(viewportSize.height / 2) + 25; // Slightly below center
          
          console.log(chalk.yellow(`Trying to click at coordinates: x=${x}, y=${y}`));
          await browser.page.mouse.click(x, y);
          
          // Wait to see if click had effect
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Take screenshot after click
          await browser.takeScreenshot('after_coordinate_click');
        }
      } catch (error) {
        console.log(chalk.yellow(`Error clicking coordinates: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
      
      // Method 2: Try to find and click on specific selectors that might be part of the button
      const buttonSelectors = [
        'div.dxbButton_Aqua',
        'div.dxbButtonHover_Aqua',
        'div[id*="OK"]',
        'div.dxpcFooter .dxbButton',
        'div.dxbButton',
        'button[onclick*="OK"]'
      ];
      
      for (const selector of buttonSelectors) {
        try {
          const element = await browser.page.$(selector);
          if (element) {
            console.log(chalk.yellow(`Found element with selector: ${selector}`));
            await element.click();
            break;
          }
        } catch (error) {
          // Continue to next selector
        }
      }
      
      // Method 3: As a last resort, press Enter key
      console.log(chalk.yellow('As last resort, pressing Enter key...'));
      await browser.page.keyboard.press('Enter');
    }
    
    // Wait after attempting to click OK
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if dialog is still visible
    const dialogStillVisible = await browser.page.evaluate(() => {
      const dialog = document.querySelector('.dxpcModalBackLite, .dxpcContentWrapper, .ui-dialog');
      return !!dialog && window.getComputedStyle(dialog).display !== 'none';
    });
    
    if (dialogStillVisible) {
      console.log(chalk.red('Dialog still visible after clicking, dialog was not closed'));
      return false;
    }
    
    console.log(chalk.green('Successfully closed confirmation dialog'));
    return true;
  } catch (error) {
    console.log(chalk.red(`Error handling confirmation dialog: ${error instanceof Error ? error.message : 'Unknown error'}`));
    return false;
  }
}

/**
 * Improved delete service function that correctly handles the dialog
 */
async function deleteService(browser: BrowserAutomation, rowId: string): Promise<boolean> {
  if (!browser.page) {
    throw new Error('Browser page not initialized');
  }
  
  try {
    console.log(chalk.yellow(`Deleting service with row ID: ${rowId}`));
    
    // Take screenshot before deletion
    await browser.takeScreenshot(`before_delete_${rowId}`);
    
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
    
    // 3. Handle the custom confirmation dialog with our specialized function
    const dialogHandled = await handleConfirmationDialog(browser);
    
    if (!dialogHandled) {
      console.log(chalk.red('Failed to handle confirmation dialog'));
    }
    
    // Wait for the page to update after confirmation
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Take screenshot after deletion attempt
    await browser.takeScreenshot(`after_delete_${rowId}`);
    
    // 4. Verify the row was deleted
    const rowStillExists = await browser.page.evaluate((id) => {
      return !!document.getElementById(id);
    }, rowId);
    
    if (rowStillExists) {
      console.log(chalk.red(`Row ${rowId} still exists after deletion attempt`));
      return false;
    }
    
    console.log(chalk.green(`Successfully deleted service ${rowId}`));
    return true;
  } catch (error) {
    console.log(chalk.red(`Error deleting service: ${error instanceof Error ? error.message : 'Unknown error'}`));
    return false;
  }
}