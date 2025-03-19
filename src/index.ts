#!/usr/bin/env node

import { WorkCliRepl } from './repl';

/**
 * Main entry point for the Work CLI application
 */
async function main() {
  try {
    // Create a new REPL instance
    // You can customize the banner text by passing a string to the constructor
    const repl = new WorkCliRepl('Work CLI');
    
    // Start the REPL
    await repl.start();
    
    // Exit with success code
    process.exit(0);
  } catch (error) {
    // Log error and exit with error code
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run the main function
main();
