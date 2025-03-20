import puppeteer, { Browser, Page } from 'puppeteer';

// Declare __doPostBack as a global variable
declare const __doPostBack: (eventTarget: string, eventArgument: string) => void;
import chalk from 'chalk';
import path from 'path';
import fs from 'fs';

/**
 * Class to handle browser automation for interacting with Medimizer
 */
export class BrowserAutomation {
  public browser: Browser | null = null;
  public page: Page | null = null;
  private static instance: BrowserAutomation;
  private logsDir: string;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    // Create logs directory for screenshots
    this.logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): BrowserAutomation {
    if (!BrowserAutomation.instance) {
      BrowserAutomation.instance = new BrowserAutomation();
    }
    return BrowserAutomation.instance;
  }

  /**
   * Create a timestamped filename for screenshots
   */
  private getScreenshotPath(prefix: string): string {
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
    return path.join(this.logsDir, `${prefix}_${timestamp}.png`);
  }

  /**
   * Take a screenshot for debugging
   */
  private async takeScreenshot(prefix: string): Promise<string | null> {
    if (!this.page) return null;
    
    try {
      const filePath = this.getScreenshotPath(prefix);
      await this.page.screenshot({ path: filePath, fullPage: true });
      console.log(chalk.yellow(`Screenshot saved to ${filePath}`));
      return filePath;
    } catch (error) {
      console.error(`Failed to take screenshot: ${error}`);
      return null;
    }
  }

  /**
   * Initialize the browser
   */
  public async initialize(): Promise<void> {
    if (!this.browser) {
      console.log(chalk.yellow('Starting browser...'));
      this.browser = await puppeteer.launch({
        headless: false, // Set to true for production
        defaultViewport: null, // Use default viewport size
        args: [
          '--start-maximized',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu'
        ]
      });
      
      // Create a new page
      this.page = await this.browser.newPage();
      
      // Set a longer timeout
      await this.page.setDefaultTimeout(30000);
      
      // Set up console logging to help with debugging
      this.page.on('console', msg => {
        console.log(chalk.gray(`[Browser Console] ${msg.text()}`));
      });
      
      // Set viewport
      await this.page.setViewport({ width: 1280, height: 800 });
      
      console.log(chalk.green('Browser started'));
    }
  }

  /**
   * Close the browser
   */
  public async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      console.log(chalk.yellow('Browser closed'));
    }
  }

  /**
   * Navigate to a work order page in Medimizer
   * 
   * @param workOrderNumber - 7-digit work order number
   * @param tab - Tab number (0 for general, 2 for notes)
   * @returns A promise that resolves when navigation is complete
   */
  public async navigateToWorkOrder(workOrderNumber: string, tab: number = 0): Promise<void> {
    try {
      // Initialize browser if not already initialized
      await this.initialize();

      if (!this.browser || !this.page) {
        throw new Error('Browser not initialized');
      }

      // Navigate to the work order page
      const url = `http://10.221.0.155/MMWeb/App_Pages/WOForm.aspx?wo=${workOrderNumber}&mode=Edit&tab=${tab}`;
      console.log(chalk.yellow(`Navigating to: ${url}`));
      
      // Add retry logic for navigation
      let retries = 3;
      let success = false;
      
      while (retries > 0 && !success) {
        try {
          await this.page.goto(url, { 
            waitUntil: 'networkidle2',
            timeout: 30000 // 30 second timeout
          });
          
          // Check if page loaded correctly
          const pageContent = await this.page.content();
          if (pageContent.includes('MediMizer') || pageContent.includes('Login')) {
            success = true;
            console.log(chalk.green('Navigation complete'));
          } else {
            throw new Error('Page did not load correctly');
          }
        } catch (error) {
          retries--;
          await this.takeScreenshot('navigation_error');
          
          if (retries === 0) throw error;
          
          console.log(chalk.yellow(`Navigation failed, retrying (${retries} attempts left)...`));
          await new Promise(r => setTimeout(r, 2000)); // Wait 2 seconds before retry
        }
      }

      // Check if we need to log in
      const isLoginPage = await this.isLoginPage();
      if (isLoginPage) {
        console.log(chalk.yellow('Login page detected'));
        await this.login('LPOLLOCK', 'password', 'URMCCEX3');
        
        // Navigate back to the original URL after login
        await this.page.goto(url, { waitUntil: 'networkidle2' });
      }

    } catch (error) {
      await this.takeScreenshot('navigation_failed');
      
      if (error instanceof Error) {
        throw new Error(`Failed to navigate to work order: ${error.message}`);
      } else {
        throw new Error('Failed to navigate to work order: Unknown error');
      }
    }
  }

  /**
   * Check if the current page is the login page
   * 
   * @returns true if on login page, false otherwise
   */
  private async isLoginPage(): Promise<boolean> {
    if (!this.page) return false;
    
    try {
      return await this.page.evaluate(() => {
        const employeeCodeField = document.querySelector('#ContentPlaceHolder1_txtEmployeeCode_I');
        const passwordField = document.querySelector('#ContentPlaceHolder1_txtPassword_I');
        const loginButton = document.querySelector('#ContentPlaceHolder1_btnLogin_CD');
        
        return !!(employeeCodeField && passwordField && loginButton);
      });
    } catch (error) {
      console.error('Error checking if on login page:', error);
      return false;
    }
  }
  
  /**
   * Ultra-reliable login function with multiple fallback approaches
   * 
   * @param employeeCode - Employee code
   * @param password - Password
   * @param database - Database to select
   */
  public async login(employeeCode: string, password: string, database: string): Promise<void> {
    try {
      if (!this.page) {
        throw new Error('Browser page not initialized');
      }
      
      console.log(chalk.yellow(`Logging in as ${employeeCode} to database ${database}...`));
      
      // Take a screenshot of the login page
      await this.takeScreenshot('login_start');
      
      // ========== 1. Fill employee code ==========
      console.log(chalk.yellow('Setting employee code...'));
      
      // Method 1: Direct typing
      try {
        await this.page.waitForSelector('#ContentPlaceHolder1_txtEmployeeCode_I', { visible: true, timeout: 5000 });
        await this.page.click('#ContentPlaceHolder1_txtEmployeeCode_I', { clickCount: 3 }); // Select all existing text
        await this.page.type('#ContentPlaceHolder1_txtEmployeeCode_I', employeeCode, { delay: 50 });
      } catch (error) {
        console.log(chalk.yellow('Method 1 for employee code failed, trying method 2...'));
        
        // Method 2: DOM manipulation
        await this.page.evaluate((code) => {
          const input = document.querySelector('#ContentPlaceHolder1_txtEmployeeCode_I') as HTMLInputElement;
          if (!input) throw new Error('Employee code field not found');
          input.value = code;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }, employeeCode);
      }
      
      // Verify employee code was set
      const actualEmployeeCode = await this.page.evaluate(() => {
        const input = document.querySelector('#ContentPlaceHolder1_txtEmployeeCode_I') as HTMLInputElement;
        return input ? input.value : '';
      });
      
      if (actualEmployeeCode !== employeeCode) {
        console.log(chalk.yellow(`Employee code verification failed. Expected: ${employeeCode}, Got: ${actualEmployeeCode}`));
        await this.page.evaluate((code) => {
          const input = document.querySelector('#ContentPlaceHolder1_txtEmployeeCode_I') as HTMLInputElement;
          if (input) {
            input.value = code;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }, employeeCode);
      }
      
      // ========== 2. Fill password ==========
      console.log(chalk.yellow('Setting password...'));
      
      // Method 1: Direct typing
      try {
        await this.page.waitForSelector('#ContentPlaceHolder1_txtPassword_I', { visible: true, timeout: 5000 });
        await this.page.click('#ContentPlaceHolder1_txtPassword_I', { clickCount: 3 }); // Select all existing text
        await this.page.type('#ContentPlaceHolder1_txtPassword_I', password, { delay: 50 });
      } catch (error) {
        console.log(chalk.yellow('Method 1 for password failed, trying method 2...'));
        
        // Method 2: DOM manipulation
        await this.page.evaluate((pwd) => {
          const input = document.querySelector('#ContentPlaceHolder1_txtPassword_I') as HTMLInputElement;
          if (!input) throw new Error('Password field not found');
          input.value = pwd;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }, password);
      }
      
      await this.takeScreenshot('credentials_entered');
      
      // ========== 3. Select database ==========
      console.log(chalk.yellow(`Selecting database: ${database}`));
      
      // Map database name to its value in the hidden input
      let databaseValue = '';
      if (database === 'ARCHIVE') {
        databaseValue = '3';
      } else if (database === 'TEST') {
        databaseValue = '2';
      } else if (database === 'URMCCEX3') {
        databaseValue = '1';
      } else {
        throw new Error(`Unknown database: ${database}`);
      }
      
      // Multiple methods to set the database
      let dbSelectionSuccess = false;
      
      // Method 1: Try direct manipulation of hidden inputs
      try {
        await this.page.evaluate((dbValue, dbName) => {
          // Set hidden value input
          const hiddenInput = document.querySelector('#ContentPlaceHolder1_cboDatabase_VI') as HTMLInputElement;
          if (hiddenInput) {
            hiddenInput.value = dbValue;
          } else {
            throw new Error('Hidden input not found');
          }
          
          // Set visible input text
          const visibleInput = document.querySelector('#ContentPlaceHolder1_cboDatabase_I') as HTMLInputElement;
          if (visibleInput) {
            visibleInput.value = dbName;
          } else {
            throw new Error('Visible input not found');
          }
          
          // Dispatch change events
          if (visibleInput) {
            visibleInput.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }, databaseValue, database);
        
        // Verify database was set correctly
        const selectedDb = await this.page.evaluate(() => {
          const input = document.querySelector('#ContentPlaceHolder1_cboDatabase_I') as HTMLInputElement;
          return input ? input.value : '';
        });
        
        if (selectedDb === database) {
          console.log(chalk.green(`Database selected successfully: ${selectedDb}`));
          dbSelectionSuccess = true;
        } else {
          console.log(chalk.yellow(`Method 1 for database selection failed. Got: ${selectedDb}`));
        }
      } catch (error) {
        console.log(chalk.yellow('Method 1 for database selection failed with error:', error));
      }
      
      // Method 2: Try using the dropdown UI if method 1 failed
      if (!dbSelectionSuccess) {
        console.log(chalk.yellow('Trying method 2 for database selection...'));
        
        try {
          // Click the dropdown button
          await this.page.click('#ContentPlaceHolder1_cboDatabase_B-1');
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          await this.takeScreenshot('dropdown_opened');
          
          // Wait for the dropdown items to be visible
          await this.page.waitForSelector('.dxeListBoxItem_Aqua', { visible: true, timeout: 5000 });
          
          // Find the right selector based on the database
          let itemSelector;
          if (database === 'ARCHIVE') {
            itemSelector = '#ContentPlaceHolder1_cboDatabase_DDD_L_LBI0T0';
          } else if (database === 'TEST') {
            itemSelector = '#ContentPlaceHolder1_cboDatabase_DDD_L_LBI1T0';
          } else if (database === 'URMCCEX3') {
            itemSelector = '#ContentPlaceHolder1_cboDatabase_DDD_L_LBI2T0';
          }
          
          // Click the specific item
          await this.page.waitForSelector(itemSelector!, { visible: true, timeout: 5000 });
          await this.page.click(itemSelector!);
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Verify database was set correctly
          const selectedDb = await this.page.evaluate(() => {
            const input = document.querySelector('#ContentPlaceHolder1_cboDatabase_I') as HTMLInputElement;
            return input ? input.value : '';
          });
          
          if (selectedDb === database) {
            console.log(chalk.green(`Database selected successfully: ${selectedDb}`));
            dbSelectionSuccess = true;
          } else {
            console.log(chalk.yellow(`Method 2 for database selection failed. Got: ${selectedDb}`));
          }
        } catch (error) {
          console.log(chalk.yellow('Method 2 for database selection failed with error:', error));
        }
      }
      
      // Method 3: Try using keyboard navigation if previous methods failed
      if (!dbSelectionSuccess) {
        console.log(chalk.yellow('Trying method 3 for database selection...'));
        
        try {
          // Click to focus the dropdown field
          await this.page.click('#ContentPlaceHolder1_cboDatabase_I');
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Press Tab to get to the dropdown button
          await this.page.keyboard.press('Tab');
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Press Space to open the dropdown
          await this.page.keyboard.press('Space');
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Determine how many arrow presses needed
          let arrowPresses = 0;
          if (database === 'ARCHIVE') {
            arrowPresses = 0; // First item
          } else if (database === 'TEST') {
            arrowPresses = 1; // Second item
          } else if (database === 'URMCCEX3') {
            arrowPresses = 2; // Third item
          }
          
          // Press arrow down the required number of times
          for (let i = 0; i < arrowPresses; i++) {
            await this.page.keyboard.press('ArrowDown');
          await new Promise(resolve => setTimeout(resolve, 500));
          }
          
          // Press Enter to select the highlighted option
          await this.page.keyboard.press('Enter');
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Verify database was set correctly
          const selectedDb = await this.page.evaluate(() => {
            const input = document.querySelector('#ContentPlaceHolder1_cboDatabase_I') as HTMLInputElement;
            return input ? input.value : '';
          });
          
          if (selectedDb === database) {
            console.log(chalk.green(`Database selected successfully: ${selectedDb}`));
            dbSelectionSuccess = true;
          } else {
            console.log(chalk.yellow(`Method 3 for database selection failed. Got: ${selectedDb}`));
          }
        } catch (error) {
          console.log(chalk.yellow('Method 3 for database selection failed with error:', error));
        }
      }
      
      // Final fallback - try injecting a script that explicitly sets the database value
      if (!dbSelectionSuccess) {
        console.log(chalk.yellow('Trying final fallback method for database selection...'));
        
        await this.page.evaluate((dbValueToSet, dbNameToSet) => {
          // Create a dedicated function to handle the database selection
          function setDatabaseValue(dbValue: string, dbName: string) {
            try {
              // Set value in all possible input fields
              const possibleInputIds = [
                'ContentPlaceHolder1_cboDatabase_VI',
                'ContentPlaceHolder1_cboDatabase_I',
                'ctl00_ContentPlaceHolder1_cboDatabase_VI',
                'ctl00_ContentPlaceHolder1_cboDatabase_I'
              ];
              
              let successCount = 0;
              
              possibleInputIds.forEach(id => {
                const input = document.getElementById(id) as HTMLInputElement;
                if (input) {
                  if (id.includes('_VI')) {
                    // Hidden value input
                    input.value = dbValue;
                    successCount++;
                  } else {
                    // Visible text input
                    input.value = dbName;
                    successCount++;
                  }
                  
                  // Dispatch input and change events
                  input.dispatchEvent(new Event('input', { bubbles: true }));
                  input.dispatchEvent(new Event('change', { bubbles: true }));
                }
              });
              
              return successCount > 0;
            } catch (e) {
              console.error('Error in setDatabaseValue:', e);
              return false;
            }
          }
          
          // Execute the function
          return setDatabaseValue(dbValueToSet, dbNameToSet);
        }, databaseValue, database);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Final verification
        const finalDbValue = await this.page.evaluate(() => {
          const input = document.querySelector('#ContentPlaceHolder1_cboDatabase_I') as HTMLInputElement;
          return input ? input.value : '';
        });
        
        console.log(chalk.yellow(`Final database value: ${finalDbValue}`));
      }
      
      await this.takeScreenshot('before_login_click');
      
      // ========== 4. Click login button ==========
      console.log(chalk.yellow('Submitting login form...'));
      
      // Store current URL to detect navigation
      const startUrl = this.page.url();
      
      // Multiple methods to submit the form
      let loginSubmitted = false;
      
      // Method 1: Click the login button
      try {
        await this.page.click('#ContentPlaceHolder1_btnLogin_CD');
        loginSubmitted = true;
      } catch (error) {
        console.log(chalk.yellow('Method 1 for login button failed, trying method 2...'));
      }
      
      // Method 2: JavaScript click if method 1 failed
      if (!loginSubmitted) {
        try {
          await this.page.evaluate(() => {
            const loginButton = document.querySelector('#ContentPlaceHolder1_btnLogin_CD') as HTMLElement;
            if (loginButton) {
              loginButton.click();
              return true;
            }
            return false;
          });
          loginSubmitted = true;
        } catch (error) {
          console.log(chalk.yellow('Method 2 for login button failed, trying method 3...'));
        }
      }
      
      // Method 3: Submit the form directly if previous methods failed
      if (!loginSubmitted) {
        try {
          await this.page.evaluate(() => {
            const form = document.querySelector('form') as HTMLFormElement;
            if (form) {
              form.submit();
              return true;
            }
            return false;
          });
          loginSubmitted = true;
        } catch (error) {
          console.log(chalk.yellow('Method 3 for login button failed, trying method 4...'));
        }
      }
      
      // Method 4: Use __doPostBack if all else fails
      if (!loginSubmitted) {
        try {
          await this.page.evaluate(() => {
            // Try to use __doPostBack if it's defined (common in ASP.NET WebForms)
            if (typeof __doPostBack === 'function') {
              __doPostBack('ctl00$ContentPlaceHolder1$btnLogin', '');
              return true;
            }
            return false;
          });
          loginSubmitted = true;
        } catch (error) {
          console.log(chalk.yellow('Method 4 for login button failed'));
        }
      }
      
      if (!loginSubmitted) {
        throw new Error('All login submission methods failed');
      }
      
      // ========== 5. Wait for navigation and verify login success ==========
      console.log(chalk.yellow('Waiting for navigation after login submission...'));
      
      // Try to wait for navigation
      try {
        // Wait for any of these events to occur:
        // 1. Navigation to a new page
        // 2. Error message becoming visible
        // 3. Timeout
        await Promise.race([
          this.page.waitForNavigation({ timeout: 30000, waitUntil: 'networkidle2' }),
          this.page.waitForFunction(
            () => {
              const errorMsg = document.querySelector('#ContentPlaceHolder1_lblLoginError') as HTMLElement;
              return errorMsg && window.getComputedStyle(errorMsg).display !== 'none';
            },
            { timeout: 30000 }
          )
        ]);
      } catch (error) {
        console.log(chalk.yellow('Navigation timeout or error, checking current state...'));
      }
      
      // Check if URL changed (indicating successful navigation)
      const newUrl = this.page.url();
      if (newUrl !== startUrl) {
        console.log(chalk.green(`URL changed from ${startUrl} to ${newUrl}, navigation detected`));
      } else {
        console.log(chalk.yellow('URL did not change, checking for errors...'));
      }
      
      await this.takeScreenshot('after_login_attempt');
      
      // Check if there's a visible error message
      const errorVisible = await this.page.evaluate(() => {
        const errorMsg = document.querySelector('#ContentPlaceHolder1_lblLoginError') as HTMLElement;
        return errorMsg && window.getComputedStyle(errorMsg).display !== 'none';
      });
      
      if (errorVisible) {
        const errorText = await this.page.evaluate(() => {
          const errorMsg = document.querySelector('#ContentPlaceHolder1_lblLoginError') as HTMLElement;
          return errorMsg ? errorMsg.textContent : 'Unknown error';
        });
        
        await this.takeScreenshot('login_error');
        throw new Error(`Login failed: ${errorText}`);
      }
      
      // Final verification that we're not on the login page
      const stillOnLoginPage = await this.isLoginPage();
      if (stillOnLoginPage) {
        console.log(chalk.red('Still on login page after login attempt'));
        
        // One final effort - directly navigate to the home page
        try {
          console.log(chalk.yellow('Attempting direct navigation to home page...'));
          await this.page.goto('http://10.221.0.155/MMWeb/Default.aspx', { 
            waitUntil: 'networkidle2',
            timeout: 20000
          });
          
          // Check one more time
          const finalCheck = await this.isLoginPage();
          if (finalCheck) {
            throw new Error('Login failed: Still on login page after all attempts');
          }
        } catch (error) {
          throw new Error('Login failed: Unable to navigate away from login page');
        }
      }
      
      // Success!
      console.log(chalk.green('Login successful'));
      await this.takeScreenshot('login_success');
    } catch (error) {
      // Take screenshot on failure if not already taken
      await this.takeScreenshot('login_failed');
      
      if (error instanceof Error) {
        throw new Error(`Login failed: ${error.message}`);
      } else {
        throw new Error('Login failed: Unknown error');
      }
    }
  }

  /**
   * Extract notes from the Medimizer work order page
   * 
   * @returns A promise that resolves to the notes text
   */
  public async extractNotes(): Promise<string> {
    try {
      if (!this.browser || !this.page) {
        throw new Error('Browser or page not initialized');
      }

      console.log(chalk.yellow('Extracting notes...'));
      
      // Take a screenshot before extraction
      await this.takeScreenshot('extract_notes_before');
      
      // Try multiple possible selectors for the notes textarea
      const selectors = [
        '#ContentPlaceHolder1_pagWorkOrder_memNotes_I',
        'textarea.dxeMemoEditArea_Aqua',
        'textarea[name="ctl00$ContentPlaceHolder1$pagWorkOrder$memNotes"]'
      ];
      
      // Wait for at least one of the selectors to be present
      let selectorFound = false;
      let usedSelector = '';
      
      for (const selector of selectors) {
        try {
          await this.page.waitForSelector(selector, { 
            timeout: 5000,
            visible: true 
          });
          selectorFound = true;
          usedSelector = selector;
          console.log(chalk.green(`Found notes element with selector: ${selector}`));
          break;
        } catch (error) {
          console.log(chalk.yellow(`Selector ${selector} not found, trying next...`));
        }
      }
      
      if (!selectorFound) {
        await this.takeScreenshot('notes_element_not_found');
        throw new Error('Notes textarea not found on page');
      }
      
      // Extract the notes text with retry logic
      let notes = '';
      let attempts = 3;
      
      while (attempts > 0) {
        notes = await this.page.evaluate((selector) => {
          const textarea = document.querySelector(selector) as HTMLTextAreaElement;
          return textarea ? textarea.value : '';
        }, usedSelector);
        
        if (notes !== '') {
          break;
        }
        
        // If we got empty text, retry after a short delay
        attempts--;
        if (attempts > 0) {
          console.log(chalk.yellow(`Notes extraction returned empty, retrying (${attempts} attempts left)...`));
          await new Promise(r => setTimeout(r, 1000));
        }
      }

      // Take a screenshot after extraction
      await this.takeScreenshot('extract_notes_after');

      console.log(chalk.green('Notes extracted successfully'));
      return notes;

    } catch (error) {
      await this.takeScreenshot('extract_notes_failed');
      
      if (error instanceof Error) {
        throw new Error(`Failed to extract notes: ${error.message}`);
      } else {
        throw new Error('Failed to extract notes: Unknown error');
      }
    }
  }

  /**
   * Import notes for a work order from Medimizer
   * 
   * @param workOrderNumber - 7-digit work order number
   * @returns A promise that resolves to the notes text
   */
  public async importNotes(workOrderNumber: string): Promise<string> {
    try {
      // Navigate to the work order page (using tab 2 for notes)
      await this.navigateToWorkOrder(workOrderNumber, 2);
      
      // Wait a bit for the page to fully load
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Extract notes
      const notes = await this.extractNotes();
      
      return notes;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to import notes: ${error.message}`);
      } else {
        throw new Error('Failed to import notes: Unknown error');
      }
    }
  }
/**
 * Extract services from the Medimizer services tab
 * This is a new method to add to the BrowserAutomation class
 * 
 * @param workOrderNumber - 7-digit work order number
 * @returns A promise that resolves to an array of formatted service strings
 */
public async extractServices(workOrderNumber: string): Promise<string[]> {
  try {
    if (!this.browser || !this.page) {
      throw new Error('Browser or page not initialized');
    }

    console.log(chalk.yellow('Navigating to services tab...'));
    
    // Navigate to the services tab
    const url = `http://10.221.0.155/MMWeb/App_Pages/WOForm.aspx?wo=${workOrderNumber}&mode=Edit&tab=1`;
    await this.page.goto(url, { waitUntil: 'networkidle2' });
    
    // Take a screenshot before extraction
    await this.takeScreenshot('services_tab');
    
    // Wait for the services table to load
    console.log(chalk.yellow('Waiting for services table...'));
    
    try {
      await this.page.waitForSelector('#ContentPlaceHolder1_pagWorkOrder_gvServInfo', { 
        timeout: 10000,
        visible: true 
      });
    } catch (error) {
      console.log(chalk.red('Services table not found'));
      await this.takeScreenshot('services_table_not_found');
      return []; // Return empty array if no table is found
    }
    
    // Extract all service rows
    console.log(chalk.yellow('Extracting services...'));
    
    const services = await this.page.evaluate(() => {
      // Find all service cells in the table
      const serviceCells = Array.from(document.querySelectorAll('#ContentPlaceHolder1_pagWorkOrder_gvServInfo td.dxgv'));
      
      // Filter out header cells and empty cells
      const validCells = serviceCells.filter(cell => {
        const text = cell.textContent?.trim() || '';
        return text.includes('Minutes') || text.includes('Minute');
      });
      
      // Extract the text content from each cell
      return validCells.map(cell => cell.textContent?.trim() || '');
    });
    
    console.log(chalk.green(`Found ${services.length} services`));
    
    // Format each service
    const formattedServices: string[] = [];
    
    for (const service of services) {
      try {
        const formattedService = this.formatServiceString(service);
        if (formattedService) {
          formattedServices.push(formattedService);
        }
      } catch (error) {
        console.log(chalk.yellow(`Failed to format service: ${service}`));
      }
    }
    
    console.log(chalk.green(`Formatted ${formattedServices.length} services`));
    
    // Take a screenshot after extraction
    await this.takeScreenshot('services_extracted');
    
    return formattedServices;
  } catch (error) {
    await this.takeScreenshot('extract_services_failed');
    
    if (error instanceof Error) {
      throw new Error(`Failed to extract services: ${error.message}`);
    } else {
      throw new Error('Failed to extract services: Unknown error');
    }
  }
}

/**
 * Format a service string from Medimizer format to markdown format
 * 
 * @param serviceString - Raw service string from Medimizer
 * @returns Formatted service string in markdown format
 */
private formatServiceString(serviceString: string): string | null {
  try {
    // Clean up the string
    let cleanedString = serviceString.trim();
    
    // Parse the date, time, duration, and description
    // Format: " - MM/DD/YYYY HH:MM AM/PM - XX Minutes - Description"
    
    // Parse date and time
    const dateTimeMatch = cleanedString.match(/\s*-\s*(\d{1,2}\/\d{1,2}\/\d{4})\s*(\d{1,2}:\d{2}\s*[AP]M)\s*-/i);
    if (!dateTimeMatch) return null;
    
    const dateStr = dateTimeMatch[1];
    const timeStr = dateTimeMatch[2].trim();
    
    // Parse the date into a Date object
    const [month, day, year] = dateStr.split('/').map(num => parseInt(num));
    
    // Parse time
    let hours = parseInt(timeStr.split(':')[0]);
    const minutes = parseInt(timeStr.split(':')[1].replace(/[^\d]/g, ''));
    const isPM = timeStr.toUpperCase().includes('PM');
    
    if (isPM && hours < 12) hours += 12;
    if (!isPM && hours === 12) hours = 0;
    
    // Format date and time in YYYY-MM-DD HH-MM format
    const formattedDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    const formattedTime = `${hours.toString().padStart(2, '0')}-${minutes.toString().padStart(2, '0')}`;
    
    // Parse duration
    const durationMatch = cleanedString.match(/-\s*(\d+)\s*Minute(s)?/i);
    const duration = durationMatch ? parseInt(durationMatch[1]) : 0;
    
    // Parse description (service name)
    const descriptionMatch = cleanedString.match(/Minute(s)?\s*-\s*(.*?)$/i);
    if (!descriptionMatch) return null;
    
    let description = descriptionMatch[2].trim();
    
    // Check if description has verb and noun or just verb
    // Typically, if there's a comma, it's [Verb, Noun]
    let formattedDescription: string;
    if (description.includes(',')) {
      const [verb, noun] = description.split(',').map(part => part.trim());
      formattedDescription = `[${verb}, ${noun}]`;
    } else {
      formattedDescription = `[${description}]`;
    }
    
    // Combine everything into the final format
    return `${formattedDescription} (${duration}min) (${formattedDate} ${formattedTime}) => (||)`;
  } catch (error) {
    console.log(chalk.yellow(`Error formatting service: ${serviceString}`));
    return null;
  }
}

/**
 * Import services from Medimizer for a work order
 * 
 * @param workOrderNumber - 7-digit work order number
 * @returns A promise that resolves to an array of formatted service strings
 */
public async importServices(workOrderNumber: string): Promise<string[]> {
  try {
    // Initialize browser if needed
    await this.initialize();
    
    // Navigate to the work order page first to handle any login requirements
    await this.navigateToWorkOrder(workOrderNumber, 0);
    
    // Extract services
    const services = await this.extractServices(workOrderNumber);
    
    return services;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to import services: ${error.message}`);
    } else {
      throw new Error('Failed to import services: Unknown error');
    }
  }
}
}
