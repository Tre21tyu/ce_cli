import { spawn } from 'child_process';
import chalk from 'chalk';
import { getNotesFilePath } from './filesystem';

/**
 * Open a file in the system's default editor
 * 
 * @param filePath - Path to the file to open
 * @returns A promise that resolves when the editor is closed
 */
export async function openInEditor(filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // Determine the editor to use
      // First try the EDITOR environment variable, then fall back to vim or notepad
      const editorCommand = process.env.EDITOR || 
        (process.platform === 'win32' ? 'notepad' : 'vim');
      
      console.log(chalk.yellow(`Opening ${filePath} with ${editorCommand}...`));
      
      // Spawn the editor process
      const editor = spawn(editorCommand, [filePath], {
        stdio: 'inherit', // Inherit stdio to allow user interaction
        shell: true // Use shell to resolve editor command
      });
      
      // Handle process completion
      editor.on('close', (code) => {
        if (code === 0) {
          console.log(chalk.green(`File edited successfully`));
          resolve();
        } else {
          reject(new Error(`Editor exited with code ${code}`));
        }
      });
      
      // Handle process error
      editor.on('error', (err) => {
        reject(new Error(`Failed to start editor: ${err.message}`));
      });
    } catch (error) {
      if (error instanceof Error) {
        reject(new Error(`Failed to open editor: ${error.message}`));
      } else {
        reject(new Error('Failed to open editor: Unknown error'));
      }
    }
  });
}

/**
 * Open the notes file for a work order in the system's default editor
 * 
 * @param workOrderNumber - 7-digit work order number
 * @returns A promise that resolves when the editor is closed
 */
export async function openNotesInEditor(workOrderNumber: string): Promise<void> {
  try {
    // Get the path to the notes file
    const notesFilePath = await getNotesFilePath(workOrderNumber);
    
    // Open the file in the editor
    await openInEditor(notesFilePath);
    
    return;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to open notes in editor: ${error.message}`);
    } else {
      throw new Error('Failed to open notes in editor: Unknown error');
    }
  }
}
