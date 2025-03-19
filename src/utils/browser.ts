import puppeteer, { Browser, Page } from 'puppeteer';
import chalk from 'chalk';

/**
 * Class to handle browser automation for interacting with Medimizer
 */
export class BrowserAutomation {
  private browser: Browser | null = null;
  private page: Page | null = null;
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
   * @returns A promise that resolves when navigation is complete
   */
  public async navigateToWorkOrder(workOrderNumber: string): Promise<void> {
    try {
      // Initialize browser if not already initialized
      await this.initialize();

      if (!this.browser) {
        throw new Error('Browser not initialized');
      }

      // Create a new page if one doesn't exist
      if (!this.page) {
        this.page = await this.browser.newPage();
      }

      // Navigate to the work order page
      const url = `http://10.221.0.155/MMWeb/App_Pages/WOForm.aspx?wo=${workOrderNumber}&mode=Edit&tab=0`;
      console.log(chalk.yellow(`Navigating to: ${url}`));
      
      await this.page.goto(url, { waitUntil: 'networkidle2' });
      console.log(chalk.green('Navigation complete'));

    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to navigate to work order: ${error.message}`);
      } else {
        throw new Error('Failed to navigate to work order: Unknown error');
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
      
      // Wait for the textarea to be present
      await this.page.waitForSelector('#ContentPlaceHolder1_pagWorkOrder_memNotes_I', { timeout: 10000 });
      
      // Extract the notes text
      const notes = await this.page.evaluate(() => {
        const textarea = document.querySelector('#ContentPlaceHolder1_pagWorkOrder_memNotes_I') as HTMLTextAreaElement;
        return textarea ? textarea.value : '';
      });

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
      // Navigate to the work order page
      await this.navigateToWorkOrder(workOrderNumber);
      
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
