import figlet from 'figlet';
import chalk from 'chalk';

/**
 * Displays an ASCII banner at the top of the CLI
 * 
 * @param text - Text to convert to ASCII art banner
 * @param color - Color for the banner (defaults to blue)
 * @returns The ASCII banner as a string
 */
export function displayBanner(text: string, color: string = 'blue'): string {
  // Create the ASCII art banner using figlet
  const bannerText = figlet.textSync(text, { 
    font: 'Standard',  // You can change this to any figlet font
    horizontalLayout: 'default',
    verticalLayout: 'default'
  });

  // Apply color using chalk
  // Fix the type issue by using a type-safe approach
  let coloredBanner: string;
  
  if (color === 'blue') {
    coloredBanner = chalk.blue(bannerText);
  } else if (color === 'green') {
    coloredBanner = chalk.green(bannerText);
  } else if (color === 'red') {
    coloredBanner = chalk.red(bannerText);
  } else if (color === 'yellow') {
    coloredBanner = chalk.yellow(bannerText);
  } else if (color === 'cyan') {
    coloredBanner = chalk.cyan(bannerText);
  } else if (color === 'magenta') {
    coloredBanner = chalk.magenta(bannerText);
  } else {
    // Default to blue if color isn't recognized
    coloredBanner = chalk.blue(bannerText);
  }
  
  // Return the colored banner
  return coloredBanner;
}
