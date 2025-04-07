import inquirer from 'inquirer';
import chalk from 'chalk';
import { openWorkOrder } from './commands/open';
import { pushStack } from './commands/push';
import { createLog, listLogs, openLog } from './commands/log';
import { displayBanner } from './utils/banner';
import { initWorkOrder } from './commands/init-enhanced';
import { listWorkOrders } from './commands/list';
import { getWorkOrderDetails } from './commands/details';
import { addService, addPartToService } from './commands/service';
import { closeWorkOrder } from './commands/close';
import { openNotes, importNotes } from './commands/note';
import { stackWorkOrder, displayStack, clearStack } from './commands/stack';
import { startDay, endDay, dayStatus, daysSummary } from './commands/day';

/**
 * REPL (Read-Eval-Print-Loop) class for interactive CLI
 */
export class CeCliRepl {
  private isRunning: boolean = false;
  private bannerText: string = 'ce_cli';

  /**
   * Constructor for the REPL
   * 
   * @param bannerText - Optional text to display in the ASCII banner
   */
  constructor(bannerText?: string) {
    if (bannerText) {
      this.bannerText = bannerText;
    }
  }

  /**
   * Display the welcome banner
   */
  private displayWelcomeBanner(): void {
    console.clear();

    // Display the ASCII art banner
    console.log(displayBanner(this.bannerText));

    // Display welcome message
    console.log(chalk.green('Welcome to ce_cli - Your all in one UofR biomed digital CLI tool!'));
    console.log(chalk.yellow('Type "help" to see available commands'));
    console.log(''); // Empty line for spacing
  }

  /**
   * Start the REPL loop
   */
  public async start(): Promise<void> {
    this.isRunning = true;
    this.displayWelcomeBanner();

    // Main REPL loop
    while (this.isRunning) {
      try {
        // Prompt for command
        const { command } = await inquirer.prompt([
          {
            type: 'input',
            name: 'command',
            message: chalk.cyan('ce-cli> '),
            prefix: ''
          }
        ]);

        // Process the command
        await this.processCommand(command.trim());
      } catch (error) {
        console.error(chalk.red('An error occurred:'), error);
      }
    }
  }

  /**
   * Process a command entered by the user
   * 
   * @param commandLine - The command line entered by the user
   */
  private async processCommand(commandLine: string): Promise<void> {
    // Skip empty commands
    if (!commandLine) return;

    // Split command line into command and arguments
    const parts = commandLine.split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    // Process commands
    switch (command) {
      case 'init':
        if (args.length === 0) {
          console.log(chalk.red('Error: Work order number is required'));
          console.log(chalk.yellow('Usage: init <7-digit-work-order-number> [8-digit-control-number]'));
        } else {
          try {
            const workOrderNumber = args[0];
            const controlNumber = args.length > 1 ? args[1] : undefined;
            const result = await initWorkOrder(workOrderNumber, controlNumber);
            console.log(chalk.green(result));
          } catch (error) {
            if (error instanceof Error) {
              console.log(chalk.red(error.message));
            } else {
              console.log(chalk.red('An unknown error occurred'));
            }
          }
        }
        break;
      
      case 'open':
        if (args.length === 0) {
          console.log(chalk.red('Error: Work order number is required'));
          console.log(chalk.yellow('Usage: open <7-digit-work-order-number>'));
        } else {
          try {
            const result = await openWorkOrder(args[0]);
            console.log(chalk.green(result));
          } catch (error) {
            if (error instanceof Error) {
              console.log(chalk.red(error.message));
            } else {
              console.log(chalk.red('An unknown error occurred'));
            }
          }
        }
        break;
      
      case 'push-stack':
      case 'push':
        try {
          // Check for dry-run flag
          const dryRun = args.includes('--dry-run') || args.includes('-d');
          const result = await pushStack(dryRun);
          console.log(chalk.green(result));
        } catch (error) {
          if (error instanceof Error) {
            console.log(chalk.red(error.message));
          } else {
            console.log(chalk.red('An unknown error occurred'));
          }
        }
        break;
      
      case 'list':
      case 'ls':
        try {
          const result = await listWorkOrders();
          console.log(result);
        } catch (error) {
          if (error instanceof Error) {
            console.log(chalk.red(error.message));
          } else {
            console.log(chalk.red('An unknown error occurred'));
          }
        }
        break;

      case 'log':
        if (args.length === 0) {
          console.log(chalk.red('Error: Log name is required'));
          console.log(chalk.yellow('Usage: log <log-name>'));
        } else {
          try {
            const logName = args.join(' '); // Combine all args to allow spaces in log name
            const result = await createLog(logName);
            console.log(chalk.green(result));
          } catch (error) {
            if (error instanceof Error) {
              console.log(chalk.red(error.message));
            } else {
              console.log(chalk.red('An unknown error occurred'));
            }
          }
        }
        break;

      case 'list-logs':
      case 'logs':
        try {
          const result = await listLogs();
          console.log(result);
        } catch (error) {
          if (error instanceof Error) {
            console.log(chalk.red(error.message));
          } else {
            console.log(chalk.red('An unknown error occurred'));
          }
        }
        break;

      case 'open-log':
        if (args.length === 0) {
          console.log(chalk.red('Error: Log identifier is required'));
          console.log(chalk.yellow('Usage: open-log <date-or-name>'));
        } else {
          try {
            const logIdentifier = args.join(' '); // Combine all args
            const result = await openLog(logIdentifier);
            console.log(chalk.green(result));
          } catch (error) {
            if (error instanceof Error) {
              console.log(chalk.red(error.message));
            } else {
              console.log(chalk.red('An unknown error occurred'));
            }
          }
        }
        break;
      
      case 'show':
      case 'details':
        if (args.length === 0) {
          console.log(chalk.red('Error: Work order number is required'));
          console.log(chalk.yellow('Usage: details <7-digit-work-order-number>'));
        } else {
          try {
            const result = await getWorkOrderDetails(args[0]);
            console.log(result);
          } catch (error) {
            if (error instanceof Error) {
              console.log(chalk.red(error.message));
            } else {
              console.log(chalk.red('An unknown error occurred'));
            }
          }
        }
        break;
      
      case 'service':
      case 'add-service':
        if (args.length < 3) {
          console.log(chalk.red('Error: Required parameters missing'));
          console.log(chalk.yellow('Usage: service <wo-number> <verb> <noun> [duration]'));
        } else {
          try {
            const workOrderNumber = args[0];
            const verb = args[1];
            const noun = args[2];
            const duration = args.length > 3 ? parseInt(args[3], 10) : 0;

            const result = await addService(workOrderNumber, verb, noun, duration);
            console.log(result);
          } catch (error) {
            if (error instanceof Error) {
              console.log(chalk.red(error.message));
            } else {
              console.log(chalk.red('An unknown error occurred'));
            }
          }
        }
        break;

      case 'part':
      case 'add-part':
        if (args.length < 3) {
          console.log(chalk.red('Error: Required parameters missing'));
          console.log(chalk.yellow('Usage: part <wo-number> <service-index> <part-number> [quantity] [cost]'));
        } else {
          try {
            const workOrderNumber = args[0];
            const serviceIndex = parseInt(args[1], 10);
            const partNumber = args[2];
            const quantity = args.length > 3 ? parseInt(args[3], 10) : 1;
            const cost = args.length > 4 ? parseFloat(args[4]) : undefined;

            const result = await addPartToService(workOrderNumber, serviceIndex, partNumber, quantity, cost);
            console.log(result);
          } catch (error) {
            if (error instanceof Error) {
              console.log(chalk.red(error.message));
            } else {
              console.log(chalk.red('An unknown error occurred'));
            }
          }
        }
        break;
      
      case 'close':
        if (args.length === 0) {
          console.log(chalk.red('Error: Work order number is required'));
          console.log(chalk.yellow('Usage: close <7-digit-work-order-number>'));
        } else {
          try {
            const result = await closeWorkOrder(args[0]);
            console.log(result);
          } catch (error) {
            if (error instanceof Error) {
              console.log(chalk.red(error.message));
            } else {
              console.log(chalk.red('An unknown error occurred'));
            }
          }
        }
        break;

      case 'note':
        if (args.length === 0) {
          console.log(chalk.red('Error: Work order number is required'));
          console.log(chalk.yellow('Usage: note <7-digit-work-order-number>'));
        } else {
          try {
            const result = await openNotes(args[0]);
            console.log(chalk.green(result));
          } catch (error) {
            if (error instanceof Error) {
              console.log(chalk.red(error.message));
            } else {
              console.log(chalk.red('An unknown error occurred'));
            }
          }
        }
        break;

      case 'import':
        if (args.length === 0) {
          console.log(chalk.red('Error: Work order number is required'));
          console.log(chalk.yellow('Usage: import <7-digit-work-order-number>'));
        } else {
          try {
            const result = await importNotes(args[0]);
            console.log(chalk.green(result));
          } catch (error) {
            if (error instanceof Error) {
              console.log(chalk.red(error.message));
            } else {
              console.log(chalk.red('An unknown error occurred'));
            }
          }
        }
        break;

      case 'stack':
        if (args.length === 0) {
          try {
            // If no arguments, display the stack
            const result = await displayStack();
            console.log(result);
          } catch (error) {
            if (error instanceof Error) {
              console.log(chalk.red(error.message));
            } else {
              console.log(chalk.red('An unknown error occurred'));
            }
          }
        } else {
          try {
            // If argument is provided, stack the work order
            const result = await stackWorkOrder(args[0]);
            console.log(chalk.green(result));
          } catch (error) {
            if (error instanceof Error) {
              console.log(chalk.red(error.message));
            } else {
              console.log(chalk.red('An unknown error occurred'));
            }
          }
        }
        break;

      case 'clear-stack':
        try {
          const result = await clearStack();
          console.log(chalk.green(result));
        } catch (error) {
          if (error instanceof Error) {
            console.log(chalk.red(error.message));
          } else {
            console.log(chalk.red('An unknown error occurred'));
          }
        }
        break;

      // New day tracking commands
      case 'start-day':
        try {
          const result = await startDay();
          console.log(result);
        } catch (error) {
          if (error instanceof Error) {
            console.log(chalk.red(error.message));
          } else {
            console.log(chalk.red('An unknown error occurred'));
          }
        }
        break;

      case 'end-day':
        try {
          const result = await endDay();
          console.log(result);
        } catch (error) {
          if (error instanceof Error) {
            console.log(chalk.red(error.message));
          } else {
            console.log(chalk.red('An unknown error occurred'));
          }
        }
        break;

      case 'day-status':
        try {
          const result = await dayStatus();
          console.log(result);
        } catch (error) {
          if (error instanceof Error) {
            console.log(chalk.red(error.message));
          } else {
            console.log(chalk.red('An unknown error occurred'));
          }
        }
        break;

      case 'days-summary':
        try {
          // Check if there's a numeric argument for number of days
          const days = args.length > 0 && !isNaN(parseInt(args[0])) ? 
            parseInt(args[0]) : 7;
          
          const result = await daysSummary(days);
          console.log(result);
        } catch (error) {
          if (error instanceof Error) {
            console.log(chalk.red(error.message));
          } else {
            console.log(chalk.red('An unknown error occurred'));
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
        console.log(chalk.green('Goodbye!'));
        this.isRunning = false;
        break;

      default:
        console.log(chalk.red(`Unknown command: ${command}`));
        console.log(chalk.yellow('Type "help" to see available commands'));
    }

    // Add an empty line for better readability
    console.log('');
  }

  /**
   * Display help information
   */
  private displayHelp(): void {
    console.log(chalk.yellow('Available commands:'));
    
    // Work order management
    console.log(chalk.green('\nWork Order Management:'));
    console.log(chalk.cyan('  init <wo-number> [control-number]') + ' - Initialize a new work order');
    console.log(chalk.cyan('  list, ls') + ' - List all existing work orders');
    console.log(chalk.cyan('  details, show <wo-number>') + ' - Show detailed information for a work order');
    console.log(chalk.cyan('  service <wo-number> <verb> <noun> [duration]') + ' - Add a service to a work order');
    console.log(chalk.cyan('  part <wo-number> <service-index> <part-number> [quantity] [cost]') + ' - Add a part to a service');
    console.log(chalk.cyan('  close <wo-number>') + ' - Close a work order');
    console.log(chalk.cyan('  note <wo-number>') + ' - Open notes for a work order');
    console.log(chalk.cyan('  import <wo-number>') + ' - Import notes from Medimizer');
    console.log(chalk.cyan('  open <wo-number>') + ' - Open a work order in Medimizer (browser stays open)');
    
    // Day tracking
    console.log(chalk.green('\nDay Tracking:'));
    console.log(chalk.cyan('  start-day') + ' - Start a new work day');
    console.log(chalk.cyan('  end-day') + ' - End the current work day and show summary');
    console.log(chalk.cyan('  day-status') + ' - Show status of the current day');
    console.log(chalk.cyan('  days-summary [count]') + ' - Show summary of recent days (default: 7)');
    
    // Stack management
    console.log(chalk.green('\nStack Management:'));
    console.log(chalk.cyan('  stack [wo-number]') + ' - Add a work order to the stack or display the current stack');
    console.log(chalk.cyan('  clear-stack') + ' - Clear all work orders from the stack');
    console.log(chalk.cyan('  push-stack, push [--dry-run]') + ' - Push services to Medimizer');
    
    // Journal logs
    console.log(chalk.green('\nJournal Logs:'));
    console.log(chalk.cyan('  log <log-name>') + ' - Create a new journal log entry');
    console.log(chalk.cyan('  list-logs, logs') + ' - List all journal log entries');
    console.log(chalk.cyan('  open-log <date-or-name>') + ' - Open a specific log entry');
    
    // General commands
    console.log(chalk.green('\nGeneral Commands:'));
    console.log(chalk.cyan('  help') + ' - Display this help information');
    console.log(chalk.cyan('  clear') + ' - Clear the screen');
    console.log(chalk.cyan('  exit') + ' - Exit the application');
  }
}