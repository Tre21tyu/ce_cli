import puppeteer, { Browser, Page } from 'puppeteer';
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
   * Log in to Medimizer using a more reliable approach
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
      await this.takeScreenshot('login_before');
      
      // Fill in employee code using page.evaluate for more direct control
      await this.page.evaluate((code) => {
        const input = document.querySelector('#ContentPlaceHolder1_txtEmployeeCode_I') as HTMLInputElement;
        if (input) {
          // Clear any existing value
          input.value = '';
          input.focus();
          input.value = code;
          
          // Create and dispatch input event
          const event = new Event('input', { bubbles: true });
          input.dispatchEvent(event);
          
          // Create and dispatch change event
          const changeEvent = new Event('change', { bubbles: true });
          input.dispatchEvent(changeEvent);
        } else {
          throw new Error('Employee code field not found');
        }
      }, employeeCode);
      
      // Wait a bit for any dynamic changes
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Fill in password using page.evaluate
      await this.page.evaluate((pwd) => {
        const input = document.querySelector('#ContentPlaceHolder1_txtPassword_I') as HTMLInputElement;
        if (input) {
          input.value = '';
          input.focus();
          input.value = pwd;
          
          // Create and dispatch events
          const event = new Event('input', { bubbles: true });
          input.dispatchEvent(event);
          
          const changeEvent = new Event('change', { bubbles: true });
          input.dispatchEvent(changeEvent);
        } else {
          throw new Error('Password field not found');
        }
      }, password);
      
      // Wait a bit for any dynamic changes
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Click the dropdown using page.evaluate
      await this.page.evaluate(() => {
        const dropdown = document.querySelector('#ContentPlaceHolder1_cboDatabase_B-1');
        if (dropdown) {
          dropdown.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        } else {
          throw new Error('Database dropdown button not found');
        }
      });
      
      // Wait for dropdown to appear
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Take a screenshot to verify dropdown is open
      await this.takeScreenshot('login_dropdown');
      
      // Select database option based on string
      let dbOptionId;
      if (database === 'ARCHIVE') {
        dbOptionId = '#ContentPlaceHolder1_cboDatabase_DDD_L_LBI0T0';
      } else if (database === 'TEST') {
        dbOptionId = '#ContentPlaceHolder1_cboDatabase_DDD_L_LBI1T0';
      } else if (database === 'URMCCEX3') {
        dbOptionId = '#ContentPlaceHolder1_cboDatabase_DDD_L_LBI2T0';
      } else {
        throw new Error(`Unknown database: ${database}`);
      }
      
      // Select the database option
      await this.page.evaluate((optionId) => {
        const option = document.querySelector(optionId);
        if (option) {
          option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        } else {
          throw new Error(`Database option ${optionId} not found`);
        }
      }, dbOptionId);
      
      // Wait for selection to be registered
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Take a screenshot after database selection
      await this.takeScreenshot('login_db_selected');
      
      // Click login button using JavaScript click
      await this.page.evaluate(() => {
        const loginButton = document.querySelector('#ContentPlaceHolder1_btnLogin_CD');
        if (loginButton) {
          loginButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        } else {
          throw new Error('Login button not found');
        }
      });
      
      // Wait for navigation to complete (either redirect or error message)
      await this.page.waitForNavigation({ timeout: 30000, waitUntil: 'networkidle2' })
        .catch(async () => {
          // If navigation fails, check if error message is displayed
          const errorVisible = this.page && await this.page.evaluate(() => {
            const errorMsg = document.querySelector('#ContentPlaceHolder1_lblLoginError') as HTMLElement;
            return errorMsg && window.getComputedStyle(errorMsg).display !== 'none';
          });
          
          if (errorVisible) {
            const errorText = await this.page?.evaluate(() => {
              const errorMsg = document.querySelector('#ContentPlaceHolder1_lblLoginError') as HTMLElement;
              return errorMsg ? errorMsg.textContent : 'Unknown error';
            });
            
            await this.takeScreenshot('login_error');
            throw new Error(`Login failed: ${errorText}`);
          }
        });
      
      // Take a screenshot after login attempt
      await this.takeScreenshot('login_after');
      
      // Verify we're not still on the login page
      const stillOnLoginPage = await this.isLoginPage();
      if (stillOnLoginPage) {
        throw new Error('Login failed: Still on login page after login attempt');
      }
      
      console.log(chalk.green('Login successful'));
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
}