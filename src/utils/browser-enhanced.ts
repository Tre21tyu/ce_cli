import puppeteer, { Browser, Page } from 'puppeteer';
import chalk from 'chalk';
import path from 'path';

/**
 * Class to handle browser automation for interacting with Medimizer
 */
export class BrowserAutomation {
  public browser: Browser | null = null;
  public page: Page | null = null;
  private static instance: BrowserAutomation;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {}

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
   * Initialize the browser
   */
  public async initialize(): Promise<void> {
    if (!this.browser) {
      console.log(chalk.yellow('Starting browser...'));
      this.browser = await puppeteer.launch({
        headless: false, // Set to true for production
        defaultViewport: null, // Use default viewport size
        args: ['--start-maximized'] // Start with maximized window
      });
      
      // Create a new page
      this.page = await this.browser.newPage();
      
      // Set a longer timeout
      await this.page.setDefaultTimeout(30000);
      
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
      while (retries > 0) {
        try {
          await this.page.goto(url, { 
            waitUntil: 'networkidle2',
            timeout: 30000 // 30 second timeout
          });
          console.log(chalk.green('Navigation complete'));
          break;
        } catch (error) {
          retries--;
          if (retries === 0) throw error;
          console.log(chalk.yellow(`Navigation failed, retrying (${retries} attempts left)...`));
          await new Promise(r => setTimeout(r, 2000)); // Wait 2 seconds before retry
        }
      }

      // Check if we need to log in
      const isLoginPage = await this.isLoginPage();
      if (isLoginPage) {
        await this.login('LPOLLOCK', 'password', 'URMCCEX3');
        
        // Navigate back to the original URL after login
        await this.page.goto(url, { waitUntil: 'networkidle2' });
      }

    } catch (error) {
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
    
    return await this.page.evaluate(() => {
      return !!document.querySelector('#ContentPlaceHolder1_txtEmployeeCode_I');
    });
  }
  
  /**
   * Log in to Medimizer
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
      
      console.log(chalk.yellow(`Logging in as ${employeeCode}...`));
      
      // Fill in employee code
      await this.page.evaluate((code) => {
        const input = document.querySelector('#ContentPlaceHolder1_txtEmployeeCode_I') as HTMLInputElement;
        if (input) {
          // Clear any existing text (needed for fields with default text)
          input.value = '';
          // Set the new value
          input.value = code;
        }
      }, employeeCode);
      
      // Fill in password
      await this.page.type('#ContentPlaceHolder1_txtPassword_I', password, { delay: 50 });
      
      // Select the database
      await this.page.click('#ContentPlaceHolder1_cboDatabase_B-1');
      await this.page.waitForSelector('#ContentPlaceHolder1_cboDatabase_DDD_L_LBI2T0', { visible: true });
      
      // Map database name to selector index
      let dbSelector;
      if (database === 'ARCHIVE') {
        dbSelector = '#ContentPlaceHolder1_cboDatabase_DDD_L_LBI0T0';
      } else if (database === 'TEST') {
        dbSelector = '#ContentPlaceHolder1_cboDatabase_DDD_L_LBI1T0';
      } else if (database === 'URMCCEX3') {
        dbSelector = '#ContentPlaceHolder1_cboDatabase_DDD_L_LBI2T0';
      } else {
        throw new Error(`Unknown database: ${database}`);
      }
      
      await this.page.click(dbSelector);
      
      // Click login button
      await this.page.click('#ContentPlaceHolder1_btnLogin_CD');
      
      // Wait for navigation to complete
      await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
      
      console.log(chalk.green('Login successful'));
    } catch (error) {
      // Take screenshot on failure
      if (this.page) {
        const screenshotPath = path.join(process.cwd(), 'login_error.png');
        await this.page.screenshot({ path: screenshotPath });
        console.log(chalk.yellow(`Login screenshot saved to ${screenshotPath}`));
      }
      
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
      
      // Try both possible selectors for the notes textarea
      const selector = '#ContentPlaceHolder1_pagWorkOrder_memNotes_I, textarea.dxeMemoEditArea_Aqua';
      
      // Wait for the textarea to be present
      try {
        await this.page.waitForSelector(selector, { 
          timeout: 15000,
          visible: true 
        });
      } catch (timeoutError) {
        // Take a screenshot to help diagnose the issue
        const screenshotPath = path.join(process.cwd(), 'notes_error.png');
        await this.page.screenshot({ path: screenshotPath });
        throw new Error(`Notes textarea not found. Screenshot saved to ${screenshotPath}`);
      }
      
      // Extract the notes text with retry logic
      let notes = '';
      let attempts = 3;
      
      while (attempts > 0) {
        notes = await this.page.evaluate((sel) => {
          const textarea = document.querySelector(sel) as HTMLTextAreaElement;
          return textarea ? textarea.value : '';
        }, selector);
        
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

      console.log(chalk.green('Notes extracted'));
      return notes;

    } catch (error) {
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
