"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CeCliRepl = void 0;
const inquirer_1 = __importDefault(require("inquirer"));
const chalk_1 = __importDefault(require("chalk"));
const push_1 = require("./commands/push");
const log_1 = require("./commands/log");
const banner_1 = require("./utils/banner");
const init_enhanced_1 = require("./commands/init-enhanced");
const list_1 = require("./commands/list");
const details_1 = require("./commands/details");
const service_1 = require("./commands/service");
const close_1 = require("./commands/close");
const note_1 = require("./commands/note");
const stack_1 = require("./commands/stack");
const day_1 = require("./commands/day");
/**
 * REPL (Read-Eval-Print-Loop) class for interactive CLI
 */
class CeCliRepl {
    /**
     * Constructor for the REPL
     *
     * @param bannerText - Optional text to display in the ASCII banner
     */
    constructor(bannerText) {
        this.isRunning = false;
        this.bannerText = 'ce_cli';
        if (bannerText) {
            this.bannerText = bannerText;
        }
    }
    /**
     * Display the welcome banner
     */
    displayWelcomeBanner() {
        console.clear();
        // Display the ASCII art banner
        console.log((0, banner_1.displayBanner)(this.bannerText));
        // Display welcome message
        console.log(chalk_1.default.green('Welcome to ce_cli - Your all in one UofR biomed digital CLI tool!'));
        console.log(chalk_1.default.yellow('Type "help" to see available commands'));
        console.log(''); // Empty line for spacing
    }
    /**
     * Start the REPL loop
     */
    async start() {
        this.isRunning = true;
        this.displayWelcomeBanner();
        // Main REPL loop
        while (this.isRunning) {
            try {
                // Prompt for command
                const { command } = await inquirer_1.default.prompt([
                    {
                        type: 'input',
                        name: 'command',
                        message: chalk_1.default.cyan('ce-cli> '),
                        prefix: ''
                    }
                ]);
                // Process the command
                await this.processCommand(command.trim());
            }
            catch (error) {
                console.error(chalk_1.default.red('An error occurred:'), error);
            }
        }
    }
    /**
     * Process a command entered by the user
     *
     * @param commandLine - The command line entered by the user
     */
    async processCommand(commandLine) {
        // Skip empty commands
        if (!commandLine)
            return;
        // Split command line into command and arguments
        const parts = commandLine.split(' ');
        const command = parts[0].toLowerCase();
        const args = parts.slice(1);
        // Process commands
        switch (command) {
            case 'init':
                if (args.length === 0) {
                    console.log(chalk_1.default.red('Error: Work order number is required'));
                    console.log(chalk_1.default.yellow('Usage: init <7-digit-work-order-number> [8-digit-control-number]'));
                }
                else {
                    try {
                        const workOrderNumber = args[0];
                        const controlNumber = args.length > 1 ? args[1] : undefined;
                        const result = await (0, init_enhanced_1.initWorkOrder)(workOrderNumber, controlNumber);
                        console.log(chalk_1.default.green(result));
                    }
                    catch (error) {
                        if (error instanceof Error) {
                            console.log(chalk_1.default.red(error.message));
                        }
                        else {
                            console.log(chalk_1.default.red('An unknown error occurred'));
                        }
                    }
                }
                break;
            case 'push-stack':
            case 'push':
                try {
                    // Check for dry-run flag
                    const dryRun = args.includes('--dry-run') || args.includes('-d');
                    const result = await (0, push_1.pushStack)(dryRun);
                    console.log(chalk_1.default.green(result));
                }
                catch (error) {
                    if (error instanceof Error) {
                        console.log(chalk_1.default.red(error.message));
                    }
                    else {
                        console.log(chalk_1.default.red('An unknown error occurred'));
                    }
                }
                break;
            case 'list':
            case 'ls':
                try {
                    const result = await (0, list_1.listWorkOrders)();
                    console.log(result);
                }
                catch (error) {
                    if (error instanceof Error) {
                        console.log(chalk_1.default.red(error.message));
                    }
                    else {
                        console.log(chalk_1.default.red('An unknown error occurred'));
                    }
                }
                break;
            case 'log':
                if (args.length === 0) {
                    console.log(chalk_1.default.red('Error: Log name is required'));
                    console.log(chalk_1.default.yellow('Usage: log <log-name>'));
                }
                else {
                    try {
                        const logName = args.join(' '); // Combine all args to allow spaces in log name
                        const result = await (0, log_1.createLog)(logName);
                        console.log(chalk_1.default.green(result));
                    }
                    catch (error) {
                        if (error instanceof Error) {
                            console.log(chalk_1.default.red(error.message));
                        }
                        else {
                            console.log(chalk_1.default.red('An unknown error occurred'));
                        }
                    }
                }
                break;
            case 'list-logs':
            case 'logs':
                try {
                    const result = await (0, log_1.listLogs)();
                    console.log(result);
                }
                catch (error) {
                    if (error instanceof Error) {
                        console.log(chalk_1.default.red(error.message));
                    }
                    else {
                        console.log(chalk_1.default.red('An unknown error occurred'));
                    }
                }
                break;
            case 'open-log':
                if (args.length === 0) {
                    console.log(chalk_1.default.red('Error: Log identifier is required'));
                    console.log(chalk_1.default.yellow('Usage: open-log <date-or-name>'));
                }
                else {
                    try {
                        const logIdentifier = args.join(' '); // Combine all args
                        const result = await (0, log_1.openLog)(logIdentifier);
                        console.log(chalk_1.default.green(result));
                    }
                    catch (error) {
                        if (error instanceof Error) {
                            console.log(chalk_1.default.red(error.message));
                        }
                        else {
                            console.log(chalk_1.default.red('An unknown error occurred'));
                        }
                    }
                }
                break;
            case 'show':
            case 'details':
                if (args.length === 0) {
                    console.log(chalk_1.default.red('Error: Work order number is required'));
                    console.log(chalk_1.default.yellow('Usage: details <7-digit-work-order-number>'));
                }
                else {
                    try {
                        const result = await (0, details_1.getWorkOrderDetails)(args[0]);
                        console.log(result);
                    }
                    catch (error) {
                        if (error instanceof Error) {
                            console.log(chalk_1.default.red(error.message));
                        }
                        else {
                            console.log(chalk_1.default.red('An unknown error occurred'));
                        }
                    }
                }
                break;
            case 'service':
            case 'add-service':
                if (args.length < 3) {
                    console.log(chalk_1.default.red('Error: Required parameters missing'));
                    console.log(chalk_1.default.yellow('Usage: service <wo-number> <verb> <noun> [duration]'));
                }
                else {
                    try {
                        const workOrderNumber = args[0];
                        const verb = args[1];
                        const noun = args[2];
                        const duration = args.length > 3 ? parseInt(args[3], 10) : 0;
                        const result = await (0, service_1.addService)(workOrderNumber, verb, noun, duration);
                        console.log(result);
                    }
                    catch (error) {
                        if (error instanceof Error) {
                            console.log(chalk_1.default.red(error.message));
                        }
                        else {
                            console.log(chalk_1.default.red('An unknown error occurred'));
                        }
                    }
                }
                break;
            case 'part':
            case 'add-part':
                if (args.length < 3) {
                    console.log(chalk_1.default.red('Error: Required parameters missing'));
                    console.log(chalk_1.default.yellow('Usage: part <wo-number> <service-index> <part-number> [quantity] [cost]'));
                }
                else {
                    try {
                        const workOrderNumber = args[0];
                        const serviceIndex = parseInt(args[1], 10);
                        const partNumber = args[2];
                        const quantity = args.length > 3 ? parseInt(args[3], 10) : 1;
                        const cost = args.length > 4 ? parseFloat(args[4]) : undefined;
                        const result = await (0, service_1.addPartToService)(workOrderNumber, serviceIndex, partNumber, quantity, cost);
                        console.log(result);
                    }
                    catch (error) {
                        if (error instanceof Error) {
                            console.log(chalk_1.default.red(error.message));
                        }
                        else {
                            console.log(chalk_1.default.red('An unknown error occurred'));
                        }
                    }
                }
                break;
            case 'stack':
                if (args.length === 0) {
                    try {
                        // If no arguments, display the stack
                        const result = await (0, stack_1.displayStack)();
                        console.log(result);
                    }
                    catch (error) {
                        if (error instanceof Error) {
                            console.log(chalk_1.default.red(error.message));
                        }
                        else {
                            console.log(chalk_1.default.red('An unknown error occurred'));
                        }
                    }
                }
                else {
                    try {
                        // If argument is provided, stack the work order
                        const result = await (0, stack_1.stackWorkOrder)(args[0]);
                        console.log(chalk_1.default.green(result));
                    }
                    catch (error) {
                        if (error instanceof Error) {
                            console.log(chalk_1.default.red(error.message));
                        }
                        else {
                            console.log(chalk_1.default.red('An unknown error occurred'));
                        }
                    }
                }
                break;
            case 'clear-stack':
                try {
                    const result = await (0, stack_1.clearStack)();
                    console.log(chalk_1.default.green(result));
                }
                catch (error) {
                    if (error instanceof Error) {
                        console.log(chalk_1.default.red(error.message));
                    }
                    else {
                        console.log(chalk_1.default.red('An unknown error occurred'));
                    }
                }
                break;
            case 'close':
                if (args.length === 0) {
                    console.log(chalk_1.default.red('Error: Work order number is required'));
                    console.log(chalk_1.default.yellow('Usage: close <7-digit-work-order-number>'));
                }
                else {
                    try {
                        const result = await (0, close_1.closeWorkOrder)(args[0]);
                        console.log(result);
                    }
                    catch (error) {
                        if (error instanceof Error) {
                            console.log(chalk_1.default.red(error.message));
                        }
                        else {
                            console.log(chalk_1.default.red('An unknown error occurred'));
                        }
                    }
                }
                break;
            case 'note':
                if (args.length === 0) {
                    console.log(chalk_1.default.red('Error: Work order number is required'));
                    console.log(chalk_1.default.yellow('Usage: note <7-digit-work-order-number>'));
                }
                else {
                    try {
                        const result = await (0, note_1.openNotes)(args[0]);
                        console.log(chalk_1.default.green(result));
                    }
                    catch (error) {
                        if (error instanceof Error) {
                            console.log(chalk_1.default.red(error.message));
                        }
                        else {
                            console.log(chalk_1.default.red('An unknown error occurred'));
                        }
                    }
                }
                break;
            case 'import':
                if (args.length === 0) {
                    console.log(chalk_1.default.red('Error: Work order number is required'));
                    console.log(chalk_1.default.yellow('Usage: import <7-digit-work-order-number>'));
                }
                else {
                    try {
                        const result = await (0, note_1.importNotes)(args[0]);
                        console.log(chalk_1.default.green(result));
                    }
                    catch (error) {
                        if (error instanceof Error) {
                            console.log(chalk_1.default.red(error.message));
                        }
                        else {
                            console.log(chalk_1.default.red('An unknown error occurred'));
                        }
                    }
                }
                break;
            // Time tracking commands
            case 'start-day':
            case 'start':
                try {
                    const result = await (0, day_1.startDay)();
                    console.log(result);
                }
                catch (error) {
                    if (error instanceof Error) {
                        console.log(chalk_1.default.red(error.message));
                    }
                    else {
                        console.log(chalk_1.default.red('An unknown error occurred'));
                    }
                }
                break;
            case 'end-day':
            case 'end':
                try {
                    const result = await (0, day_1.endDay)();
                    console.log(result);
                }
                catch (error) {
                    if (error instanceof Error) {
                        console.log(chalk_1.default.red(error.message));
                    }
                    else {
                        console.log(chalk_1.default.red('An unknown error occurred'));
                    }
                }
                break;
            case 'status':
            case 'day-status':
                try {
                    const result = await (0, day_1.getDaySummary)();
                    console.log(result);
                }
                catch (error) {
                    if (error instanceof Error) {
                        console.log(chalk_1.default.red(error.message));
                    }
                    else {
                        console.log(chalk_1.default.red('An unknown error occurred'));
                    }
                }
                break;
            case 'help':
                this.displayHelp();
                break;
            case 'clear':
            case 'cls':
                console.clear();
                this.displayWelcomeBanner();
                break;
            case 'exit':
            case 'quit':
                console.log(chalk_1.default.green('Goodbye!'));
                this.isRunning = false;
                break;
            default:
                console.log(chalk_1.default.red(`Unknown command: ${command}`));
                console.log(chalk_1.default.yellow('Type "help" to see available commands'));
        }
        // Add an empty line for better readability
        console.log('');
    }
    /**
     * Display help information
     */
    displayHelp() {
        console.log(chalk_1.default.yellow('Available commands:'));
        // Work order management
        console.log(chalk_1.default.cyan('\nWork Order Management:'));
        console.log(chalk_1.default.cyan('  init <wo-number> [control-number]') + ' - Initialize a new work order');
        console.log(chalk_1.default.cyan('  list, ls') + ' - List all existing work orders');
        console.log(chalk_1.default.cyan('  details, show <wo-number>') + ' - Show detailed information for a work order');
        console.log(chalk_1.default.cyan('  close <wo-number>') + ' - Close a work order');
        // Service and part management
        console.log(chalk_1.default.cyan('\nService & Part Management:'));
        console.log(chalk_1.default.cyan('  service <wo-number> <verb> <noun> [duration]') + ' - Add a service to a work order');
        console.log(chalk_1.default.cyan('  part <wo-number> <service-index> <part-number> [quantity] [cost]') + ' - Add a part to a service');
        // Notes management
        console.log(chalk_1.default.cyan('\nNotes Management:'));
        console.log(chalk_1.default.cyan('  note <wo-number>') + ' - Open notes for a work order');
        console.log(chalk_1.default.cyan('  import <wo-number>') + ' - Import notes from Medimizer');
        // Stack management
        console.log(chalk_1.default.cyan('\nStack Management:'));
        console.log(chalk_1.default.cyan('  stack [wo-number]') + ' - Stack a work order or display the stack');
        console.log(chalk_1.default.cyan('  clear-stack') + ' - Clear the stack');
        console.log(chalk_1.default.cyan('  push-stack, push [--dry-run]') + ' - Push services to Medimizer');
        // Time tracking
        console.log(chalk_1.default.cyan('\nTime Tracking:'));
        console.log(chalk_1.default.cyan('  start-day, start') + ' - Start a new work day for time tracking');
        console.log(chalk_1.default.cyan('  end-day, end') + ' - End the current work day and see summary');
        console.log(chalk_1.default.cyan('  status, day-status') + ' - Display current day status and productivity');
        // Journal management
        console.log(chalk_1.default.cyan('\nJournal Management:'));
        console.log(chalk_1.default.cyan('  log <log-name>') + ' - Create a new journal log entry');
        console.log(chalk_1.default.cyan('  list-logs, logs') + ' - List all journal log entries');
        console.log(chalk_1.default.cyan('  open-log <date-or-name>') + ' - Open a specific log entry');
        // General commands
        console.log(chalk_1.default.cyan('\nGeneral Commands:'));
        console.log(chalk_1.default.cyan('  help') + ' - Display this help information');
        console.log(chalk_1.default.cyan('  clear, cls') + ' - Clear the screen');
        console.log(chalk_1.default.cyan('  exit, quit') + ' - Exit the application');
    }
}
exports.CeCliRepl = CeCliRepl;
