import { spawn } from 'child_process';
import chalk from 'chalk';
import { getNotesFilePath } from './filesystem';

/**
 * Open a file in nvim editor
 * 
 * @param filePath - Path to the file to open
 * @returns A promise that resolves when the editor is closed
 */
export async function openInNvim(filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // Use nvim specifically, rather than the default editor
      const editorCommand = 'nvim';
      
      console.log(chalk.yellow(`Opening ${filePath} with nvim...`));
      
      // Spawn the nvim process
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
        // If nvim is not available, try using vim
        if (err.message.includes('ENOENT')) {
          console.log(chalk.yellow('nvim not found, trying vim...'));
          
          const vimEditor = spawn('vim', [filePath], {
            stdio: 'inherit',
            shell: true
          });
          
          vimEditor.on('close', (code) => {
            if (code === 0) {
              console.log(chalk.green(`File edited successfully with vim`));
              resolve();
            } else {
              reject(new Error(`vim exited with code ${code}`));
            }
          });
          
          vimEditor.on('error', (vimErr) => {
            reject(new Error(`Failed to start vim: ${vimErr.message}`));
          });
        } else {
          reject(new Error(`Failed to start nvim: ${err.message}`));
        }
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
 * Open the notes file for a work order in nvim
 * 
 * @param workOrderNumber - 7-digit work order number
 * @returns A promise that resolves when the editor is closed
 */
export async function openNotesInNvim(workOrderNumber: string): Promise<void> {
  try {
    // Get the path to the notes file
    const notesFilePath = await getNotesFilePath(workOrderNumber);
    
    // Open the file in nvim
    await openInNvim(notesFilePath);
    
    return;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to open notes in editor: ${error.message}`);
    } else {
      throw new Error('Failed to open notes in editor: Unknown error');
    }
  }
}