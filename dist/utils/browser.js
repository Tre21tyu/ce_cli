"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserAutomation = void 0;
const puppeteer_1 = __importDefault(require("puppeteer"));
const chalk_1 = __importDefault(require("chalk"));
/**
 * Class to handle browser automation for interacting with Medimizer
 */
class BrowserAutomation {
    /**
     * Private constructor to enforce singleton pattern
     */
    constructor() {
        this.browser = null;
        this.page = null;
    }
    /**
     * Get the singleton instance
     */
    static getInstance() {
        if (!BrowserAutomation.instance) {
            BrowserAutomation.instance = new BrowserAutomation();
        }
        return BrowserAutomation.instance;
    }
    /**
     * Initialize the browser
     */
    async initialize() {
        if (!this.browser) {
            console.log(chalk_1.default.yellow('Starting browser...'));
            this.browser = await puppeteer_1.default.launch({
                headless: false, // Set to true for production
                defaultViewport: null, // Use default viewport size
                args: ['--start-maximized'] // Start with maximized window
            });
            console.log(chalk_1.default.green('Browser started'));
        }
    }
    /**
     * Close the browser
     */
    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.page = null;
            console.log(chalk_1.default.yellow('Browser closed'));
        }
    }
    /**
     * Navigate to a work order page in Medimizer
     *
     * @param workOrderNumber - 7-digit work order number
     * @returns A promise that resolves when navigation is complete
     */
    async navigateToWorkOrder(workOrderNumber) {
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
            console.log(chalk_1.default.yellow(`Navigating to: ${url}`));
            await this.page.goto(url, { waitUntil: 'networkidle2' });
            console.log(chalk_1.default.green('Navigation complete'));
        }
        catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to navigate to work order: ${error.message}`);
            }
            else {
                throw new Error('Failed to navigate to work order: Unknown error');
            }
        }
    }
    /**
     * Extract notes from the Medimizer work order page
     *
     * @returns A promise that resolves to the notes text
     */
    async extractNotes() {
        try {
            if (!this.browser || !this.page) {
                throw new Error('Browser or page not initialized');
            }
            console.log(chalk_1.default.yellow('Extracting notes...'));
            // Wait for the textarea to be present
            await this.page.waitForSelector('#ContentPlaceHolder1_pagWorkOrder_memNotes_I', { timeout: 10000 });
            // Extract the notes text
            const notes = await this.page.evaluate(() => {
                const textarea = document.querySelector('#ContentPlaceHolder1_pagWorkOrder_memNotes_I');
                return textarea ? textarea.value : '';
            });
            console.log(chalk_1.default.green('Notes extracted'));
            return notes;
        }
        catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to extract notes: ${error.message}`);
            }
            else {
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
    async importNotes(workOrderNumber) {
        try {
            // Navigate to the work order page
            await this.navigateToWorkOrder(workOrderNumber);
            // Extract notes
            const notes = await this.extractNotes();
            return notes;
        }
        catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to import notes: ${error.message}`);
            }
            else {
                throw new Error('Failed to import notes: Unknown error');
            }
        }
    }
}
exports.BrowserAutomation = BrowserAutomation;
