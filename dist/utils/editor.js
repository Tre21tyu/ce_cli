"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openInEditor = openInEditor;
exports.openNotesInEditor = openNotesInEditor;
const child_process_1 = require("child_process");
const chalk_1 = __importDefault(require("chalk"));
const filesystem_1 = require("./filesystem");
/**
 * Open a file in the system's default editor
 *
 * @param filePath - Path to the file to open
 * @returns A promise that resolves when the editor is closed
 */
async function openInEditor(filePath) {
    return new Promise((resolve, reject) => {
        try {
            // Determine the editor to use
            // First try the EDITOR environment variable, then fall back to vim or notepad
            const editorCommand = process.env.EDITOR ||
                (process.platform === 'win32' ? 'notepad' : 'vim');
            console.log(chalk_1.default.yellow(`Opening ${filePath} with ${editorCommand}...`));
            // Spawn the editor process
            const editor = (0, child_process_1.spawn)(editorCommand, [filePath], {
                stdio: 'inherit', // Inherit stdio to allow user interaction
                shell: true // Use shell to resolve editor command
            });
            // Handle process completion
            editor.on('close', (code) => {
                if (code === 0) {
                    console.log(chalk_1.default.green(`File edited successfully`));
                    resolve();
                }
                else {
                    reject(new Error(`Editor exited with code ${code}`));
                }
            });
            // Handle process error
            editor.on('error', (err) => {
                reject(new Error(`Failed to start editor: ${err.message}`));
            });
        }
        catch (error) {
            if (error instanceof Error) {
                reject(new Error(`Failed to open editor: ${error.message}`));
            }
            else {
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
async function openNotesInEditor(workOrderNumber) {
    try {
        // Get the path to the notes file
        const notesFilePath = await (0, filesystem_1.getNotesFilePath)(workOrderNumber);
        // Open the file in the editor
        await openInEditor(notesFilePath);
        return;
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to open notes in editor: ${error.message}`);
        }
        else {
            throw new Error('Failed to open notes in editor: Unknown error');
        }
    }
}
