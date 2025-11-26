import chalk from 'chalk';
import { BrowserAutomation } from '../utils/browser-enhanced';

/**
 * delete-month command: Delete services from specific month/year for LONNIE POLLOCKS
 *
 * @param month - Month (01-12 or 1-12)
 * @param year - Year (YYYY)
 * @param workOrders - Single WO number or array format [wo1,wo2,wo3]
 * @returns A promise that resolves to a success message
 */
export async function deleteMonth(month: string, year: string, workOrders: string): Promise<string> {
  // Validate month
  const monthNum = parseInt(month, 10);
  if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
    return chalk.red('Please provide a valid month (1-12)');
  }

  // Validate year
  const yearNum = parseInt(year, 10);
  if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
    return chalk.red('Please provide a valid year (YYYY)');
  }

  // Parse work orders
  let woList: string[] = [];

  if (workOrders.startsWith('[') && workOrders.endsWith(']')) {
    // Multiple WOs: [1111111,1111112,1111113]
    const woString = workOrders.slice(1, -1); // Remove brackets
    woList = woString.split(',').map(wo => wo.trim()).filter(wo => wo.length > 0);
  } else {
    // Single WO
    woList = [workOrders.trim()];
  }

  // Validate all WOs
  for (const wo of woList) {
    if (!/^\d{7}$/.test(wo)) {
      return chalk.red(`Invalid work order number: ${wo}. Must be 7 digits.`);
    }
  }

  console.log(chalk.yellow(`Deleting LONNIE POLLOCKS services from ${month}/${year} for ${woList.length} work order(s)...`));
  console.log(chalk.cyan(`Work orders: ${woList.join(', ')}`));

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

    // Process each work order
    let totalDeleted = 0;
    let totalZeroedOut = 0;
    const results: Array<{ wo: string; deleted: number; zeroedOut: number; error?: string }> = [];

    for (const wo of woList) {
      console.log(chalk.cyan(`\nProcessing work order ${wo}...`));

      try {
        // Navigate to work order services tab
        await navigateToWorkOrderServices(browser, wo);

        // Process services for this work order
        const result = await processServicesForMonth(browser, wo, monthNum, yearNum);

        totalDeleted += result.deleted;
        totalZeroedOut += result.zeroedOut;

        results.push({
          wo,
          deleted: result.deleted,
          zeroedOut: result.zeroedOut
        });

        console.log(chalk.green(`✓ WO ${wo}: Deleted ${result.deleted}, Zeroed out ${result.zeroedOut}`));

      } catch (error) {
        console.log(chalk.red(`✗ Error processing WO ${wo}: ${error instanceof Error ? error.message : 'Unknown error'}`));
        results.push({
          wo,
          deleted: 0,
          zeroedOut: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // Small delay between WOs
      if (woList.indexOf(wo) < woList.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Cleanup
    await browser.close();

    // Generate summary
    console.log(chalk.cyan('\n' + '='.repeat(60)));
    console.log(chalk.cyan('DELETE MONTH SUMMARY'));
    console.log(chalk.cyan('='.repeat(60)));
    console.log(chalk.green(`Month/Year: ${month}/${year}`));
    console.log(chalk.green(`Work Orders Processed: ${woList.length}`));
    console.log(chalk.green(`Total Services Deleted: ${totalDeleted}`));
    console.log(chalk.green(`Total Services Zeroed Out: ${totalZeroedOut}`));
    console.log(chalk.cyan('='.repeat(60)));

    return chalk.green(`Successfully processed ${woList.length} work order(s). Deleted ${totalDeleted}, zeroed out ${totalZeroedOut} services.`);

  } catch (error) {
    // Cleanup on error
    try {
      await browser.close();
    } catch (closeError) {
      console.log(chalk.yellow(`Warning: Could not close browser: ${closeError instanceof Error ? closeError.message : 'Unknown error'}`));
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
    await browser.takeScreenshot(`delete_month_wo_${workOrderNumber}`);

    // Check if we need to log in
    const isLoginPage = await browser.isLoginPage();
    if (isLoginPage) {
      console.log(chalk.yellow('Redirected to login page. Logging in...'));
      await browser.login('LPOLLOCK', '890piojkl!@#$98', 'URMCCEX3');

      // Navigate again after login
      await browser.page.goto(url, { waitUntil: 'networkidle2' });
      await browser.takeScreenshot(`delete_month_wo_${workOrderNumber}_after_login`);
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
 * Interface for a service record with parts information
 */
interface ServiceRecord {
  rowId: string;
  serviceId: string | null; // The actual service ID from DXKVInput
  servicer: string;
  dateTime: string;
  minutes: number;
  description: string;
  hasParts: boolean;
  partRowIds: string[];
}

/**
 * Extract all service records from the page grouped by servicer
 */
async function extractServicesWithParts(browser: BrowserAutomation): Promise<ServiceRecord[]> {
  if (!browser.page) {
    throw new Error('Browser page not initialized');
  }

  try {
    return await browser.page.evaluate(() => {
      const records: ServiceRecord[] = [];

      // Get all service rows from the grid - SIMPLE APPROACH
      const rows = document.querySelectorAll('tr.dxgvDataRow_Aqua, tr.dxgvSelectedRow_Aqua');

      // Extract service IDs from DXKVInput using simple regex (not JSON parsing)
      const serviceIdMap = new Map<number, string>();
      const dxkvInput = document.querySelector('#ContentPlaceHolder1_pagWorkOrder_gvServInfo_DXKVInput') as HTMLInputElement;

      if (dxkvInput && dxkvInput.value) {
        // Use regex to extract service IDs: "2|Service|4586776|False|4586776|"
        // Captures: row number (2) and service ID (4586776)
        const servicePattern = /'(\d+)\|Service\|(\d+)\|/g;
        let match;

        while ((match = servicePattern.exec(dxkvInput.value)) !== null) {
          const rowNum = parseInt(match[1], 10);
          const serviceId = match[2];
          serviceIdMap.set(rowNum - 1, serviceId); // Convert to 0-based index
          console.log(`Extracted: row ${rowNum - 1} -> service ID ${serviceId}`);
        }
      }

      let currentServicer = '';
      let currentService: ServiceRecord | null = null;
      let rowIndex = 0;

      rows.forEach(row => {
        const cellText = row.querySelector('td.dxgv')?.textContent || '';
        const rowId = row.id || '';

        // Check if this is a servicer row (contains "Employee")
        if (cellText.includes('(Employee)')) {
          currentServicer = cellText.replace('(Employee)', '').trim();
          rowIndex++;
          return;
        }

        // Check if this is a service row (starts with single hyphen "-")
        const serviceMatch = cellText.match(/^\s*-\s+([\d/]+\s+[\d:]+\s*[APM]+)\s*-\s*(\d+)\s*Minutes\s*-\s*(.+?)\s*$/i);

        if (serviceMatch) {
          // Save previous service if exists
          if (currentService) {
            records.push(currentService);
          }

          // Get service ID from the map (we need this for editing)
          const serviceId = serviceIdMap.get(rowIndex) || null;

          // Create new service record
          currentService = {
            rowId,
            serviceId: serviceId,
            servicer: currentServicer,
            dateTime: serviceMatch[1].trim(),
            minutes: parseInt(serviceMatch[2], 10),
            description: serviceMatch[3].trim(),
            hasParts: false, // Will be set to true if we find "--" rows
            partRowIds: []
          };
          rowIndex++;
          return;
        }

        // Check if this is a part row (starts with double hyphen "--")
        const partMatch = cellText.match(/^\s*--\s+/);

        if (partMatch && currentService) {
          // Mark current service as having parts
          currentService.hasParts = true;
          if (rowId) {
            currentService.partRowIds.push(rowId);
          }
          rowIndex++;
        }
      });

      // Don't forget to add the last service
      if (currentService) {
        records.push(currentService);
      }

      return records;
    });
  } catch (error) {
    throw new Error(`Failed to extract service records: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if a service date falls within the specified month/year
 */
function isInMonth(dateTimeStr: string, month: number, year: number): boolean {
  try {
    // Parse date like "10/2/2025 9:30 AM"
    const dateMatch = dateTimeStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (!dateMatch) {
      return false;
    }

    const serviceMonth = parseInt(dateMatch[1], 10);
    const serviceYear = parseInt(dateMatch[3], 10);

    return serviceMonth === month && serviceYear === year;
  } catch (error) {
    return false;
  }
}

/**
 * Process services for a specific month/year
 */
async function processServicesForMonth(
  browser: BrowserAutomation,
  workOrderNumber: string,
  month: number,
  year: number
): Promise<{ deleted: number; zeroedOut: number }> {
  if (!browser.page) {
    throw new Error('Browser page not initialized');
  }

  let deleted = 0;
  let zeroedOut = 0;

  try {
    console.log(chalk.yellow('Extracting services from page...'));

    // Extract all services with parts information
    const allServices = await extractServicesWithParts(browser);

    console.log(chalk.green(`Found ${allServices.length} total services`));

    // Filter for LONNIE POLLOCKS services in the specified month/year
    const targetServices = allServices.filter(service => {
      return service.servicer === 'LONNIE POLLOCKS' && isInMonth(service.dateTime, month, year);
    });

    if (targetServices.length === 0) {
      console.log(chalk.yellow('No LONNIE POLLOCKS services found for this month/year'));
      return { deleted: 0, zeroedOut: 0 };
    }

    console.log(chalk.cyan(`Found ${targetServices.length} LONNIE POLLOCKS services in ${month}/${year}:`));
    targetServices.forEach((service, idx) => {
      console.log(chalk.cyan(`  ${idx + 1}. ${service.dateTime} - ${service.minutes} min - ${service.description}`));
      console.log(chalk.cyan(`     Parts: ${service.hasParts ? 'YES' : 'NO'}`));
    });

    // Process services in REVERSE order to avoid row ID shifting issues
    // When you delete a row, subsequent rows get renumbered, so we process from bottom to top
    const reversedServices = [...targetServices].reverse();

    // Process each target service
    for (const service of reversedServices) {
      if (service.hasParts) {
        // Has parts: Set time to 0 instead of deleting
        if (!service.serviceId) {
          console.log(chalk.red(`Service ${service.rowId} has no service ID, cannot edit`));
          continue;
        }

        console.log(chalk.yellow(`Service has parts, setting time to 0: ${service.serviceId}`));
        const success = await setServiceTimeToZero(browser, service.serviceId, workOrderNumber);
        if (success) {
          zeroedOut++;
          console.log(chalk.green(`  Successfully zeroed out service`));
        } else {
          console.log(chalk.red(`  Failed to zero out service`));
        }
      } else {
        // No parts: Delete the service
        console.log(chalk.yellow(`Service has no parts, deleting: ${service.rowId}`));
        const success = await deleteService(browser, service.rowId);
        if (success) {
          deleted++;
          console.log(chalk.green(`  Successfully deleted service`));
        } else {
          console.log(chalk.red(`  Failed to delete service`));
        }
      }

      // Wait between operations
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Refresh page after each operation to get updated DOM
      await navigateToWorkOrderServices(browser, workOrderNumber);
    }

    return { deleted, zeroedOut };

  } catch (error) {
    throw new Error(`Failed to process services: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete a service by clicking it and pressing the delete button
 */
async function deleteService(browser: BrowserAutomation, rowId: string): Promise<boolean> {
  if (!browser.page) {
    throw new Error('Browser page not initialized');
  }

  try {
    // Set up dialog handler to automatically accept confirmation dialogs
    let dialogHandled = false;
    const dialogHandler = (dialog: any) => {
      console.log(chalk.yellow(`Dialog appeared: ${dialog.message()}`));
      dialog.accept();
      dialogHandled = true;
    };

    browser.page.on('dialog', dialogHandler);

    try {
      // Click on the row to select it
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

      // Find and click the Delete button
      const deleteButtonSelector = '#ContentPlaceHolder1_pagWorkOrder_btnDelete';

      const buttonExists = await browser.page.$(deleteButtonSelector);
      if (!buttonExists) {
        console.log(chalk.red('Delete button not found'));
        return false;
      }

      await browser.page.click(deleteButtonSelector);

      // Wait for dialog to be handled
      let waitCount = 0;
      while (!dialogHandled && waitCount < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        waitCount++;
      }

      if (dialogHandled) {
        console.log(chalk.green('Dialog handled successfully'));
      }

      // Wait for page to update
      await new Promise(resolve => setTimeout(resolve, 3000));

      return true;

    } finally {
      browser.page.off('dialog', dialogHandler);
    }

  } catch (error) {
    console.log(chalk.red(`Error deleting service: ${error instanceof Error ? error.message : 'Unknown error'}`));
    return false;
  }
}

/**
 * Set service time to 0 by editing the service
 */
async function setServiceTimeToZero(browser: BrowserAutomation, serviceId: string, workOrderNumber: string): Promise<boolean> {
  if (!browser.page) {
    throw new Error('Browser page not initialized');
  }

  try {
    console.log(chalk.yellow(`Setting service time to 0 for service ID: ${serviceId}`));

    // Navigate to edit service page (identical to add service form)
    const editUrl = `http://sqlmedimizer1/MMWeb/App_Pages/ServiceForm.aspx?WO=${workOrderNumber}&Service=${serviceId}`;
    console.log(chalk.yellow(`Navigating to: ${editUrl}`));

    await browser.page.goto(editUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await browser.takeScreenshot(`edit_service_${serviceId}`);

    // Check if we need to log in
    const isLoginPage = await browser.isLoginPage();
    if (isLoginPage) {
      console.log(chalk.yellow('Redirected to login page. Logging in...'));
      await browser.login('LPOLLOCK', '890piojkl!@#$98', 'URMCCEX3');
      await browser.page.goto(editUrl, { waitUntil: 'networkidle2' });
      await browser.takeScreenshot(`edit_service_${serviceId}_after_login`);
    }

    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Verify the employee is LPOLLOCK
    const employeeSelector = '#ContentPlaceHolder1_pagService_cboEmployees_I';
    const currentEmployee = await browser.page.evaluate((sel) => {
      const input = document.querySelector(sel) as HTMLInputElement;
      return input ? input.value : '';
    }, employeeSelector);

    console.log(chalk.cyan(`Current employee: ${currentEmployee}`));

    if (!currentEmployee.includes('LPOLLOCK')) {
      console.log(chalk.red(`Service is not by LPOLLOCK (found: ${currentEmployee}), skipping`));
      return false;
    }

    // Find and set the time field to 0
    const timeUsedSelectors = [
      '#ContentPlaceHolder1_pagService_cbpRateInfo_spnTimeUsed_I',
      '#ContentPlaceHolder1_pagService_meTime_I',
      '#ContentPlaceHolder1_pagService_txtTime_I'
    ];

    let timeFieldFound = false;
    for (const selector of timeUsedSelectors) {
      try {
        const exists = await browser.page.$(selector);

        if (exists) {
          console.log(chalk.green(`Found time field with selector: ${selector}`));

          // Clear and set to 0
          await browser.page.click(selector, { clickCount: 3 });
          await browser.page.keyboard.press('Backspace');
          await new Promise(resolve => setTimeout(resolve, 200));
          await browser.page.type(selector, '0', { delay: 50 });
          await browser.page.keyboard.press('Enter');

          // Verify it was set to 0
          const timeValue = await browser.page.evaluate((sel) => {
            const input = document.querySelector(sel) as HTMLInputElement;
            return input ? input.value : '';
          }, selector);

          console.log(chalk.cyan(`Time field value after setting: ${timeValue}`));

          timeFieldFound = true;
          break;
        }
      } catch (error) {
        continue;
      }
    }

    if (!timeFieldFound) {
      console.log(chalk.red('Could not find time field to set to 0'));
      await browser.takeScreenshot(`time_field_not_found_${serviceId}`);
      return false;
    }

    // Submit the form
    console.log(chalk.yellow('Submitting edit form...'));
    await browser.takeScreenshot(`before_edit_submit_${serviceId}`);

    const submitButtonSelector = '#ContentPlaceHolder1_btnWorkOrderForm';
    await browser.page.waitForSelector(submitButtonSelector, { visible: true, timeout: 10000 });
    await browser.page.click(submitButtonSelector);

    // Wait for navigation back to work order form
    await browser.page.waitForNavigation({ waitUntil: 'networkidle2' });
    await browser.takeScreenshot(`after_edit_submit_${serviceId}`);

    console.log(chalk.green('Successfully set service time to 0'));
    return true;

  } catch (error) {
    console.log(chalk.red(`Error setting time to zero: ${error instanceof Error ? error.message : 'Unknown error'}`));
    await browser.takeScreenshot(`error_set_time_zero_${serviceId}`);
    return false;
  }
}
