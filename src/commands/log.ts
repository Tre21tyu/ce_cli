import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { openInNvim } from '../utils/editor';

// Convert callback-based fs functions to Promise-based

/**
 * Center text in a fixed width
 * @param text Text to center
 * @param width Total width
 * @returns Centered text padded with spaces
 */
function centerText(text: string, width: number): string {
  if (text.length >= width) return text;
  const leftPadding = Math.floor((width - text.length) / 2);
  const rightPadding = width - text.length - leftPadding;
  return ' '.repeat(leftPadding) + text + ' '.repeat(rightPadding);
}
const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const exists = promisify(fs.exists);

/**
 * Create and open a daily journal log
 * 
 * @param logName - Name for the log entry (max 50 chars)
 * @returns A promise that resolves to a success message
 */
export async function createLog(logName: string): Promise<string> {
  try {
    // Validate log name
    if (!logName || logName.trim() === '') {
      throw new Error('Log name is required');
    }

    if (logName.length > 50) {
      throw new Error('Log name must be 50 characters or less');
    }

    // Process log name (lowercase, replace spaces with underscores, remove invalid chars)
    const processedName = logName.trim().toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_-]/g, ''); // Remove any characters that aren't safe for filenames
    
    // Check if journal directory exists, create if needed
    const journalDir = path.join(process.cwd(), 'journal');
    
    if (!fs.existsSync(journalDir)) {
      const { createDir } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'createDir',
          message: chalk.yellow('Journal directory does not exist. Create it?'),
          default: true
        }
      ]);
      
      if (createDir) {
        await mkdir(journalDir, { recursive: true });
        console.log(chalk.green('Journal directory created successfully'));
      } else {
        return 'Operation canceled: Journal directory is required';
      }
    }
    
    // Generate current date for filename and content
    const now = new Date();
    const dateString = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeString = now.toTimeString().split(' ')[0]; // HH:MM:SS
    const dateTimeString = `${dateString} ${timeString}`;
    
    // Create filename
    const filename = `${dateString}_${processedName}.md`;
    const filePath = path.join(journalDir, filename);
    
    // Check if file already exists
    const fileExists = await exists(filePath);
    
    if (fileExists) {
      const { openExisting } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'openExisting',
          message: chalk.yellow(`Log file "${filename}" already exists. Open it?`),
          default: true
        }
      ]);
      
      if (openExisting) {
        await openInNvim(filePath);
        return `Opened existing log file: ${filename}`;
      } else {
        return 'Operation canceled';
      }
    }
    
    // Custom ASCII art header
    const customHeader = `/*
                                          oooo   o8o            
                                          \`888   \`"'            
 .ooooo.   .ooooo.               .ooooo.   888  oooo            
d88' \`"Y8 d88' \`88b             d88' \`"Y8  888  \`888            
888       888ooo888             888        888   888            
888   .o8 888    .o             888   .o8  888   888            
\`Y8bod8P' \`Y8bod8P' ooooooooooo \`Y8bod8P' o888o o888o           
oooooooooo.              o8o  oooo                              
\`888'   \`Y8b             \`"'  \`888                              
 888      888  .oooo.   oooo   888  oooo    ooo                 
 888      888 \`P  )88b  \`888   888   \`88.  .8'                  
 888      888  .oP"888   888   888    \`88..8'                   
 888     d88' d8(  888   888   888     \`888'                    
o888bood8P'   \`Y888""8o o888o o888o     .8'                     
ooooo                               .o..P'                      
\`888'                               \`Y8P'                       
 888          .ooooo.   .oooooooo                               
 888         d88' \`88b 888' \`88b                                
 888         888   888 888   888                                
 888       o 888   888 \`88bod8P'                                
o888ooooood8 \`Y8bod8P' \`8oooooo.                                
                       d"     YD                                
                       "Y88888P'                                
                                                                
*/`;
    
    // Create template
    const template = `
=====================================================================
---------------------------------------------------------------------
${customHeader}
     -------------------------------------------------------------    
     |${centerText(`~${dateTimeString}~`, 59)}|
    -------------------------------------------------------------    
=====================================================================

`;
    
    // Write template to file
    await writeFile(filePath, template, 'utf8');
    console.log(chalk.green(`Created log file: ${filename}`));
    
    // Open file in nvim
    await openInNvim(filePath);
    
    return `Log file created and opened: ${filename}`;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to create log: ${error.message}`);
    } else {
      throw new Error('Failed to create log: Unknown error');
    }
  }
}

/**
 * List all journal logs
 * 
 * @returns A promise that resolves to a formatted string with all logs
 */
export async function listLogs(): Promise<string> {
  try {
    const journalDir = path.join(process.cwd(), 'journal');
    
    if (!fs.existsSync(journalDir)) {
      return 'Journal directory does not exist. Create one with the log command.';
    }
    
    const files = fs.readdirSync(journalDir)
      .filter(file => file.endsWith('.md'))
      .sort((a, b) => b.localeCompare(a)); // Sort in reverse chronological order
    
    if (files.length === 0) {
      return 'No log files found in the journal directory.';
    }
    
    // Format the list
    let result = '\n';
    result += chalk.cyan('=============================================================\n');
    result += chalk.cyan('                      JOURNAL LOGS                           \n');
    result += chalk.cyan('=============================================================\n\n');
    
    files.forEach(file => {
      // Extract date and name from filename
      const [date, ...nameParts] = file.replace('.md', '').split('_');
      const name = nameParts.join('_');
      
      // Get file stats
      const stats = fs.statSync(path.join(journalDir, file));
      const modified = stats.mtime.toLocaleString();
      
      result += chalk.white(`${date}: ${name.replace(/_/g, ' ')}\n`);
      result += `  Last modified: ${modified}\n`;
      result += `  File: ${file}\n\n`;
    });
    
    result += chalk.cyan('=============================================================\n');
    result += `Total: ${files.length} log file(s)\n`;
    
    return result;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to list logs: ${error.message}`);
    } else {
      throw new Error('Failed to list logs: Unknown error');
    }
  }
}

/**
 * Open a specific log file
 * 
 * @param logIdentifier - Date or name to identify the log
 * @returns A promise that resolves to a success message
 */
export async function openLog(logIdentifier: string): Promise<string> {
  try {
    const journalDir = path.join(process.cwd(), 'journal');
    
    if (!fs.existsSync(journalDir)) {
      return 'Journal directory does not exist. Create one with the log command.';
    }
    
    const files = fs.readdirSync(journalDir).filter(file => file.endsWith('.md'));
    
    if (files.length === 0) {
      return 'No log files found in the journal directory.';
    }
    
    // Try to find a match by date or name
    const matchingFiles = files.filter(file => 
      file.includes(logIdentifier.toLowerCase().replace(/\s+/g, '_'))
    );
    
    if (matchingFiles.length === 0) {
      return `No log files found matching "${logIdentifier}"`;
    }
    
    if (matchingFiles.length > 1) {
      // Multiple matches, ask user to select one
      console.log(chalk.yellow(`Found ${matchingFiles.length} matching logs:`));
      
      const { selectedFile } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedFile',
          message: 'Select a log file to open:',
          choices: matchingFiles
        }
      ]);
      
      const filePath = path.join(journalDir, selectedFile);
      await openInNvim(filePath);
      return `Opened log file: ${selectedFile}`;
    } else {
      // Single match, open it directly
      const filePath = path.join(journalDir, matchingFiles[0]);
      await openInNvim(filePath);
      return `Opened log file: ${matchingFiles[0]}`;
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to open log: ${error.message}`);
    } else {
      throw new Error('Failed to open log: Unknown error');
    }
  }
}