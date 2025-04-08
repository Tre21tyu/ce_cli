import chalk from 'chalk';
import { StackManager } from '../utils/stack-manager';
import { BrowserAutomation } from '../utils/browser-enhanced';
import { StackableService } from '../utils/service-parser';

/**
 * Push services from the stack to Medimizer with improved validation
 * 
 * @param dryRun - If true, simulate without actually pushing to Medimizer
 * @returns A promise that resolves to a success message
 */
export async function pushStack(dryRun: boolean = false): Promise<string> {
  try {
    // Get stack manager instance
    const stackManager = StackManager.getInstance();
    
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
    
    console.log(chalk.yellow(`Preparing to push ${unpushedServices} service(s) to Medimizer...`));
    
    if (dryRun) {
      console.log(chalk.yellow('DRY RUN: No actual changes will be made to Medimizer.'));
      return await simulatePush(stack);
    }
    
    // Get browser automation instance
    const browser = BrowserAutomation.getInstance();
    
    try {
      // Initialize browser and ensure login
      await browser.initialize();
      
      // Check if login is needed and perform login
      console.log(chalk.yellow('Checking if login is required...'));
      const isLoginPage = await browser.isLoginPage();
      
      if (isLoginPage) {
        console.log(chalk.yellow('Login page detected. Logging in...'));
        await browser.login('LPOLLOCK', '890piojkl!@#$98', 'URMCCEX3');
      } else {
        console.log(chalk.green('Already logged in.'));
      }
      
      // Push each work order's services
      let successCount = 0;
      let failureCount = 0;
      let skippedCount = 0;
      
      for (const workOrder of stack) {
        console.log(chalk.cyan(`Processing work order ${workOrder.workOrderNumber}...`));
        
        // Get unpushed services for this work order
        const unpushedServices = workOrder.services.filter(service => !service.pushedToMM);
        
        if (unpushedServices.length === 0) {
          console.log(chalk.green(`No unpushed services for work order ${workOrder.workOrderNumber}.`));
          continue;
        }
        
        // First check for existing services to avoid duplicates
        console.log(chalk.yellow(`Checking for existing services in Medimizer...`));
        
        // Navigate to services tab to get existing services
        await navigateToServicesTab(browser, workOrder.workOrderNumber);
        
        // Get existing services from the page
        const existingServices = await getExistingServices(browser, workOrder.workOrderNumber);
        console.log(chalk.cyan(`Found ${existingServices.length} existing services in Medimizer`));
        
        // For debugging
        if (existingServices.length > 0) {
          console.log(chalk.cyan(`Sample of existing services:`));
          existingServices.slice(0, 3).forEach((service, idx) => {
            console.log(chalk.cyan(`  ${idx+1}. Date: ${service.date}, Code: ${service.code}, Description: ${service.description}`));
          });
        }
        
        // Process each unpushed service
        for (let i = 0; i < unpushedServices.length; i++) {
          const service = unpushedServices[i];
          console.log(chalk.yellow(`Processing service ${i + 1}/${unpushedServices.length}: Verb ${service.verb_code}${service.noun_code ? `, Noun ${service.noun_code}` : ''}`));
          
          // Parse datetime for duplicate checking
          const [datePart, timePart] = parseDatetime(service.datetime);
          
          // Check if service already exists
          const isDuplicate = checkForDuplicateService(existingServices, service, datePart);
          
          if (isDuplicate) {
            console.log(chalk.yellow(`Service appears to already exist in Medimizer. Marking as pushed and skipping.`));
            service.pushedToMM = 1;
            skippedCount++;
            continue;
          }
          
          console.log(chalk.yellow(`Pushing service to Medimizer...`));
          
          try {
            // Push the service to Medimizer
            await pushServiceToMedimizer(browser, workOrder.workOrderNumber, service);
            
            // Verify the service was added successfully
            const wasAdded = await verifyServiceAdded(browser, workOrder.workOrderNumber, service);
            
            if (wasAdded) {
              // Mark service as pushed
              service.pushedToMM = 1;
              successCount++;
              
              console.log(chalk.green(`Service pushed and verified successfully.`));
            } else {
              console.error(chalk.red(`Service was not found after pushing. Marking as not pushed.`));
              failureCount++;
            }
          } catch (error) {
            console.error(chalk.red(`Failed to push service: ${error instanceof Error ? error.message : 'Unknown error'}`));
            failureCount++;
          }
        }
      }
      
      // Save updated stack
      await stackManager.saveStack();
      
      // Close browser
      await browser.close();
      
      // Return summary
      return `Push completed. ${successCount} service(s) pushed successfully, ${skippedCount} skipped (already exist), ${failureCount} failed.`;
    } catch (error) {
      // Make sure to close the browser even if there's an error
      try {
        await browser.close();
      } catch (closeError) {
        console.log(chalk.yellow(`Warning: Could not close browser properly: ${closeError instanceof Error ? closeError.message : 'Unknown error'}`));
      }
      
      throw error;
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to push stack: ${error.message}`);
    } else {
      throw new Error('Failed to push stack: Unknown error');
    }
  }
}

/**
 * Navigate to the services tab of a work order
 * 
 * @param browser - Browser automation instance
 * @param workOrderNumber - Work order number
 */
async function navigateToServicesTab(browser: BrowserAutomation, workOrderNumber: string): Promise<void> {
  if (!browser.page) {
    throw new Error('Browser page not initialized');
  }
  
  // URL for the services tab (tab=1)
  const servicesUrl = `http://sqlmedimizer1/MMWeb/App_Pages/WOForm.aspx?wo=${workOrderNumber}&mode=Edit&tab=1`;
  
  console.log(chalk.yellow(`Navigating to services tab: ${servicesUrl}`));
  
  try {
    await browser.page.goto(servicesUrl, { waitUntil: 'networkidle2' });
    
    // Check if we were redirected to login page
    const isLoginPage = await browser.isLoginPage();
    if (isLoginPage) {
      console.log(chalk.yellow('Redirected to login page. Logging in...'));
      await browser.login('LPOLLOCK', '890piojkl!@#$98', 'URMCCEX3');
      
      // Navigate back to services tab after login
      await browser.page.goto(servicesUrl, { waitUntil: 'networkidle2' });
    }
    
    // Take screenshot for debugging
    await browser.takeScreenshot('services_tab');
    
    // Wait for the page to fully load
    await new Promise(resolve => setTimeout(resolve, 1000));
  } catch (error) {
    await browser.takeScreenshot('services_tab_navigation_error');
    if (error instanceof Error) {
      throw new Error(`Failed to navigate to services tab: ${error.message}`);
    } else {
      throw new Error('Failed to navigate to services tab: Unknown error');
    }
  }
}

/**
 * Interface for existing services from Medimizer
 */
interface ExistingService {
  date: string;
  time?: string;
  code: string;
  description: string;
}

/**
 * Extract existing services from the services tab
 * 
 * @param browser - Browser automation instance
 * @param workOrderNumber - Work order number
 * @returns Array of existing service objects
 */
async function getExistingServices(browser: BrowserAutomation, workOrderNumber: string): Promise<ExistingService[]> {
  if (!browser.page) {
    throw new Error('Browser page not initialized');
  }
  
  try {
    // Wait for the services table to load
    try {
      // Wait for any service-related content
      await Promise.race([
        browser.page.waitForSelector('#ContentPlaceHolder1_pagWorkOrder_gvServInfo', { timeout: 5000 }),
        browser.page.waitForSelector('td.dxgv', { timeout: 5000 })
      ]);
    } catch (error) {
      console.log(chalk.yellow('Services table not found or empty.'));
      return [];
    }
    
    // Take screenshot for debugging
    await browser.takeScreenshot('existing_services');
    
    // Extract service information from the table
    const existingServices = await browser.page.evaluate(() => {
      const services: ExistingService[] = [];
      
      // Helper function to extract text from cell
      const extractText = (cell: Element): string => {
        return cell.textContent?.trim() || '';
      };
      
      // Try to get rows from the table
      const rows = Array.from(document.querySelectorAll('tr.dxgvDataRow_Aqua'));
      
      if (rows.length > 0) {
        // Process rows from the grid
        rows.forEach(row => {
          const cells = Array.from(row.querySelectorAll('td'));
          if (cells.length >= 3) {
            // In the Medimizer grid, typically:
            // First cell: Service date/time and code
            // Second cell: Description
            const firstCellText = extractText(cells[0]);
            const descriptionText = extractText(cells[1]);
            
            // Extract date, time, and code
            // Example format: "3/20/2025 9:00 AM - SERVICE CODE 109"
            const dateTimeMatch = firstCellText.match(/(\d{1,2}\/\d{1,2}\/\d{4})\s+(\d{1,2}:\d{2}\s*[AP]M)/i);
            const codeMatch = firstCellText.match(/CODE\s+(\d+)/i);
            
            if (dateTimeMatch && codeMatch) {
              services.push({
                date: dateTimeMatch[1],
                time: dateTimeMatch[2],
                code: codeMatch[1],
                description: descriptionText
              });
            }
          }
        });
      } else {
        // Alternative approach if rows aren't found
        // Look for any cells that might contain service information
        const cells = Array.from(document.querySelectorAll('td.dxgv'));
        cells.forEach(cell => {
          const text = extractText(cell);
          
          // Look for patterns that suggest service entries
          const dateMatch = text.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
          const codeMatch = text.match(/CODE\s+(\d+)/i);
          
          if (dateMatch && codeMatch) {
            // Extract time if present
            const timeMatch = text.match(/(\d{1,2}:\d{2}\s*[AP]M)/i);
            
            services.push({
              date: dateMatch[0],
              time: timeMatch ? timeMatch[0] : undefined,
              code: codeMatch[1],
              description: text.replace(/(\d{1,2}\/\d{1,2}\/\d{4})/, '')
                           .replace(/(\d{1,2}:\d{2}\s*[AP]M)/i, '')
                           .replace(/CODE\s+(\d+)/i, '')
                           .trim()
            });
          }
        });
      }
      
      return services;
    });
    
    return existingServices;
  } catch (error) {
    await browser.takeScreenshot('get_existing_services_error');
    console.log(chalk.red(`Error extracting existing services: ${error instanceof Error ? error.message : 'Unknown error'}`));
    return [];
  }
}

/**
 * Check if a service already exists in Medimizer to avoid duplicates
 * 
 * @param existingServices - Array of existing services
 * @param service - Service to check
 * @param dateStr - Formatted date string for comparison
 * @returns True if a matching service is found
 */
function checkForDuplicateService(
  existingServices: ExistingService[],
  service: StackableService,
  dateStr: string
): boolean {
  // Convert MM/DD/YYYY to a date object for comparison
  const getDateObj = (dateStr: string): Date | null => {
    try {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const month = parseInt(parts[0], 10) - 1;  // JS months are 0-based
        const day = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);
        return new Date(year, month, day);
      }
      return null;
    } catch (error) {
      return null;
    }
  };
  
  // Convert date strings to Date objects for comparison
  const serviceDate = getDateObj(dateStr);
  
  if (!serviceDate) {
    console.log(chalk.yellow(`Could not parse service date: ${dateStr}`));
    return false; 
  }
  
  // Check each existing service for potential match
  for (const existingService of existingServices) {
    // Convert existing service date to Date object
    const existingDate = getDateObj(existingService.date);
    
    if (!existingDate) continue;
    
    // Compare dates (within 1 day to account for timezone differences)
    const dateDiff = Math.abs(serviceDate.getTime() - existingDate.getTime());
    const oneDayMs = 24 * 60 * 60 * 1000;
    const datesMatch = dateDiff <= oneDayMs;
    
    // Compare service codes
    const verbCodeMatch = existingService.code.includes(service.verb_code.toString());
    
    // If both date and verb code match, likely a duplicate
    if (datesMatch && verbCodeMatch) {
      console.log(chalk.yellow(`Potential duplicate found:`));
      console.log(chalk.yellow(`- Existing: Date=${existingService.date}, Code=${existingService.code}, Description=${existingService.description}`));
      console.log(chalk.yellow(`- Current: Date=${dateStr}, Verb Code=${service.verb_code}, Noun Code=${service.noun_code || 'none'}`));
      return true;
    }
  }
  
  return false;
}

/**
 * Push a service to Medimizer using browser automation
 * 
 * @param browser - Browser automation instance
 * @param workOrderNumber - Work order number
 * @param service - Service to push
 */
async function pushServiceToMedimizer(
  browser: BrowserAutomation,
  workOrderNumber: string,
  service: StackableService
): Promise<void> {
  if (!browser.page) {
    throw new Error('Browser page not initialized');
  }
  
  try {
    // Navigate to service add page
    const serviceAddUrl = `http://sqlmedimizer1/MMWeb/App_Pages/ServiceForm.aspx?WO=${workOrderNumber}&Service=add`;
    console.log(chalk.yellow(`Navigating to ${serviceAddUrl}...`));
    
    await browser.page.goto(serviceAddUrl, { waitUntil: 'networkidle2' });
    await browser.takeScreenshot('service_add_page');
    
    // Check if we were redirected to login page
    const isLoginPage = await browser.isLoginPage();
    if (isLoginPage) {
      console.log(chalk.yellow('Redirected to login page. Logging in...'));
      await browser.login('LPOLLOCK', '890piojkl!@#$98', 'URMCCEX3');
      
      // Navigate back to service add page after login
      await browser.page.goto(serviceAddUrl, { waitUntil: 'networkidle2' });
      await browser.takeScreenshot('service_add_page_after_login');
    }
    
    // Enter Verb Code
    await enterTextWithRetry(
      browser,
      '#ContentPlaceHolder1_pagService_cboServiceCode_I',
      service.verb_code.toString()
    );
    
    // Wait for dropdown and select first option
    await new Promise(resolve => setTimeout(resolve, 750));
    await browser.page.keyboard.press('ArrowDown');
    await browser.page.keyboard.press('Enter');
    
    // Enter Noun Code if applicable
    if (service.noun_code !== undefined) {
      await enterTextWithRetry(
        browser,
        '#ContentPlaceHolder1_pagService_cboServiceNoun_I',
        service.noun_code.toString()
      );
      
      // Wait for dropdown and select first option
      await new Promise(resolve => setTimeout(resolve, 750));
      await browser.page.keyboard.press('ArrowDown');
      await browser.page.keyboard.press('Enter');
    }
    
    // Parse datetime
    const [datePart, timePart] = parseDatetime(service.datetime);
    
    // Enter Date
    await enterTextWithRetry(
      browser,
      '#ContentPlaceHolder1_pagService_datCompletedOn_I',
      datePart
    );
    // Press Enter after entering date
    await browser.page.keyboard.press('Enter');
    
    // Enter Time - simplified format with no colon or space
    // Format time as "800am" or "1118pm" and press Enter
    const timeFormatted = formatTimeForInput(timePart);
    await enterTextWithRetry(
      browser,
      '#ContentPlaceHolder1_pagService_timCompletedOn_I',
      timeFormatted
    );
    // Press Enter after entering time
    await browser.page.keyboard.press('Enter');
    
    // Enter Time Used from the calculated service time
    // Use the time we've calculated rather than a default of 0
    const timeUsed = service.serviceTimeCalculated !== undefined ? 
      service.serviceTimeCalculated.toString() : '0';
    
    console.log(chalk.cyan(`Using calculated time: ${timeUsed} minutes for service`));
    
    // Try multiple possible selectors for the time used field
    const timeUsedSelectors = [
      '#ContentPlaceHolder1_pagService_cbpRateInfo_spnTimeUsed_I', // New selector based on HTML
      '#ContentPlaceHolder1_pagService_meTime_I',
      '#ContentPlaceHolder1_pagService_txtTime_I',
      'input[name="ctl00$ContentPlaceHolder1$pagService$cbpRateInfo$spnTimeUsed"]', // Name-based selector
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
          await enterTextWithRetry(browser, selector, timeUsed);
          // Press Enter after entering time used
          await browser.page.keyboard.press('Enter');
          timeFieldFound = true;
          console.log(chalk.green(`Found time field with selector: ${selector}`));
          break;
        }
      } catch (error) {
        console.log(chalk.yellow(`Time used selector ${selector} not found, trying next...`));
      }
    }
    
    if (!timeFieldFound) {
      console.log(chalk.yellow('Could not find time used field, continuing anyway...'));
      // Take screenshot for debugging
      await browser.takeScreenshot('time_field_not_found');
    }
    
    // Enter Employee (LPOLLOCK) - last field before submission
    const employeeSelector = '#ContentPlaceHolder1_pagService_cboEmployees_I';
    try {
      await enterTextWithRetry(browser, employeeSelector, 'LPOLLOCK');
      // Press Enter after entering employee
      await browser.page.keyboard.press('Enter');
      console.log(chalk.green('Successfully entered employee information'));
    } catch (error) {
      console.log(chalk.yellow(`Could not enter employee information: ${error instanceof Error ? error.message : 'Unknown error'}`));
      // Continue anyway - the field might have a default value
    }
    
    // Screenshot before submission
    await browser.page.screenshot({ path: browser.getScreenshotPath('before_service_submit'), fullPage: true });
    
    // Submit the form
    console.log(chalk.yellow('Submitting service form...'));
    
    // Look for the "Work Order Form" button
    const workOrderFormButtonSelector = '#ContentPlaceHolder1_btnWorkOrderForm';
    
    await browser.page.waitForSelector(workOrderFormButtonSelector, { visible: true, timeout: 10000 });
    await browser.page.click(workOrderFormButtonSelector);
    
    // Wait for navigation back to the work order form
    await browser.page.waitForNavigation({ waitUntil: 'networkidle2' });
    
    // Take screenshot after submission
    await browser.takeScreenshot('after_service_submit');
  } catch (error) {
    await browser.takeScreenshot('service_push_error');
    
    if (error instanceof Error) {
      throw new Error(`Failed to push service: ${error.message}`);
    } else {
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
async function enterTextWithRetry(
  browser: BrowserAutomation,
  selector: string,
  text: string
): Promise<void> {
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
        const input = document.querySelector(sel) as HTMLInputElement;
        return input ? input.value : '';
      }, selector);
      
      // For time fields, AM/PM might be automatically set by the form,
      // so we check if the text is contained rather than exact match
      if (text.includes(':') || text.toLowerCase().includes('am') || text.toLowerCase().includes('pm')) {
        // For time fields, check if the important parts match
        const timeMatch = compareTimeValues(enteredText, text);
        if (timeMatch) {
          success = true;
          console.log(chalk.green(`Successfully entered time value similar to "${text}" into ${selector}`));
        } else {
          console.log(chalk.yellow(`Failed to enter time correctly. Expected "${text}", got "${enteredText}". Retrying...`));
          retries++;
        }
      } else if (enteredText.includes(text) || text.includes(enteredText)) {
        // For other fields, check if the text is contained
        success = true;
        console.log(chalk.green(`Successfully entered "${text}" into ${selector}`));
      } else {
        console.log(chalk.yellow(`Failed to enter text. Expected "${text}", got "${enteredText}". Retrying...`));
        retries++;
      }
    } catch (error) {
      console.log(chalk.yellow(`Error entering text (${retries + 1}/${maxRetries}): ${error instanceof Error ? error.message : 'Unknown error'}`));
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
async function verifyServiceAdded(
  browser: BrowserAutomation,
  workOrderNumber: string,
  service: StackableService
): Promise<boolean> {
  if (!browser.page) {
    throw new Error('Browser page not initialized');
  }
  
  try {
    // Navigate to the services tab
    await navigateToServicesTab(browser, workOrderNumber);
    
    // Parse datetime for matching
    const [datePart] = parseDatetime(service.datetime);
    
    // Take screenshot of the services page
    await browser.takeScreenshot('service_verification');
    
    // Check existing services to see if our service appears
    const existingServices = await getExistingServices(browser, workOrderNumber);
    
    // Look for a match in the existing services
    for (const existingService of existingServices) {
      // Check for date match (allowing for format differences)
      const dateMatch = areDatesEquivalent(existingService.date, datePart);
      
      // Check for verb code match
      const codeMatch = existingService.code.includes(service.verb_code.toString());
      
      if (dateMatch && codeMatch) {
        console.log(chalk.green(`Service verification successful: Found matching service with date ${existingService.date} and code ${existingService.code}`));
        return true;
      }
    }
    
    console.log(chalk.red(`Service verification failed: Could not find service with date ${datePart} and verb code ${service.verb_code}`));
    console.log(chalk.red(`Existing services: ${JSON.stringify(existingServices)}`));
    return false;
  } catch (error) {
    console.log(chalk.red(`Error verifying service: ${error instanceof Error ? error.message : 'Unknown error'}`));
    return false;
  }
}

/**
 * Check if two date strings represent the same date, despite format differences
 * 
 * @param date1 - First date string (e.g., "3/15/2023")
 * @param date2 - Second date string (e.g., "03/15/2023")
 * @returns True if dates are equivalent
 */
function areDatesEquivalent(date1: string, date2: string): boolean {
  try {
    // Helper function to parse date string to Date object
    const parseDate = (dateStr: string): Date | null => {
      // Try MM/DD/YYYY format
      let match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (match) {
        const month = parseInt(match[1], 10) - 1; // JS months are 0-based
        const day = parseInt(match[2], 10);
        const year = parseInt(match[3], 10);
        return new Date(year, month, day);
      }
      
      // Try YYYY-MM-DD format
      match = dateStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (match) {
        const year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1; // JS months are 0-based
        const day = parseInt(match[3], 10);
        return new Date(year, month, day);
      }
      
      return null;
    };
    
    const d1 = parseDate(date1);
    const d2 = parseDate(date2);
    
    if (!d1 || !d2) {
      console.log(chalk.yellow(`Could not parse one or both dates: "${date1}", "${date2}"`));
      return false;
    }
    
    // Compare dates
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  } catch (error) {
    console.log(chalk.yellow(`Error comparing dates: ${error instanceof Error ? error.message : 'Unknown error'}`));
    return false;
  }
}

/**
 * Format time from "HH:MM AM/PM" to compact format "HHMMam/pm" for input fields
 * 
 * @param timeString - Time string in format "HH:MM AM/PM"
 * @returns Formatted time string like "800am" or "1118pm"
 */
function formatTimeForInput(timeString: string): string {
  try {
    // Extract hours, minutes, and period (AM/PM)
    const matches = timeString.match(/(\d+):(\d+)\s*(AM|PM)/i);
    
    if (!matches) {
      console.log(chalk.yellow(`Could not parse time string: ${timeString}, using as is`));
      return timeString;
    }
    
    const hours = parseInt(matches[1], 10);
    const minutes = matches[2];
    const period = matches[3].toLowerCase();
    
    // Combine without colon or space
    return `${hours}${minutes}${period}`;
  } catch (error) {
    console.log(chalk.yellow(`Error formatting time: ${error instanceof Error ? error.message : 'Unknown error'}`));
    return timeString;
  }
}

/**
 * Compare time values to see if they're equivalent, ignoring formatting differences
 * 
 * @param actual - Actual time value from the form
 * @param expected - Expected time value
 * @returns True if time values are equivalent
 */
function compareTimeValues(actual: string, expected: string): boolean {
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
  } catch (error) {
    console.log(chalk.yellow(`Error comparing time values: ${error instanceof Error ? error.message : 'Unknown error'}`));
    return false;
  }
}

/**
 * Simulate pushing services without actually doing it (dry run)
 * 
 * @param stack - The current stack of work orders
 * @returns A simulation summary message
 */
async function simulatePush(stack: any[]): Promise<string> {
  let totalServices = 0;
  
  for (const workOrder of stack) {
    const unpushedServices = workOrder.services.filter((service: any) => !service.pushedToMM);
    
    if (unpushedServices.length > 0) {
      console.log(chalk.cyan(`Would push ${unpushedServices.length} service(s) for work order ${workOrder.workOrderNumber}:`));
      
      unpushedServices.forEach((service: any, index: number) => {
        // Parse datetime into MM/DD/YYYY and HH:MM AM/PM format
        const [datePart, timePart] = parseDatetime(service.datetime);
        
        console.log(chalk.white(`  ${index + 1}. Verb: ${service.verb_code}${service.noun_code ? `, Noun: ${service.noun_code}` : ''}`));
        console.log(chalk.white(`     Date: ${datePart}, Time: ${timePart}`));
        console.log(chalk.white(`     Notes: ${service.notes.substring(0, 50)}${service.notes.length > 50 ? '...' : ''}`));
      });
      
      totalServices += unpushedServices.length;
    }
  }
  
  return `Simulation complete. Would push ${totalServices} service(s) to Medimizer.`;
}

/**
 * Split datetime string into date and time parts
 * 
 * @param datetime - Datetime string from service
 * @returns Tuple of [datePart, timePart]
 */
function parseDatetime(datetime: string): [string, string] {
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
    let hours: number;
    let minutes: number;
    
    // Check if time part uses colon or hyphen
    if (timePart.includes(':')) {
      [hours, minutes] = timePart.split(':').map(part => parseInt(part, 10));
    } else if (timePart.includes('-')) {
      [hours, minutes] = timePart.split('-').map(part => parseInt(part, 10));
    } else {
      throw new Error(`Invalid time format: ${timePart}`);
    }
    
    // Format time as HH:MM AM/PM
    const isPM = hours >= 12;
    const hour12 = hours % 12 || 12; // Convert 0 to 12
    const formattedTime = `${hour12}:${minutes.toString().padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;
    
    return [formattedDate, formattedTime];
  } catch (error) {
    console.error(chalk.red(`Error parsing datetime ${datetime}: ${error instanceof Error ? error.message : 'Unknown error'}`));
    // Return defaults in case of error
    return ['01/01/2025', '12:00 PM'];
  }
}