"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.displayBanner = displayBanner;
const figlet_1 = __importDefault(require("figlet"));
const chalk_1 = __importDefault(require("chalk"));
/**
 * Displays an ASCII banner at the top of the CLI
 *
 * @param text - Text to convert to ASCII art banner
 * @param color - Color for the banner (defaults to blue)
 * @returns The ASCII banner as a string
 */
function displayBanner(text, color = 'blue') {
    // Create the ASCII art banner using figlet
    const bannerText = figlet_1.default.textSync(text, {
        font: 'Standard', // You can change this to any figlet font
        horizontalLayout: 'default',
        verticalLayout: 'default'
    });
    // Apply color using chalk
    // Fix the type issue by using a type-safe approach
    let coloredBanner;
    if (color === 'blue') {
        coloredBanner = chalk_1.default.blue(bannerText);
    }
    else if (color === 'green') {
        coloredBanner = chalk_1.default.green(bannerText);
    }
    else if (color === 'red') {
        coloredBanner = chalk_1.default.red(bannerText);
    }
    else if (color === 'yellow') {
        coloredBanner = chalk_1.default.yellow(bannerText);
    }
    else if (color === 'cyan') {
        coloredBanner = chalk_1.default.cyan(bannerText);
    }
    else if (color === 'magenta') {
        coloredBanner = chalk_1.default.magenta(bannerText);
    }
    else {
        // Default to blue if color isn't recognized
        coloredBanner = chalk_1.default.blue(bannerText);
    }
    // Return the colored banner
    return coloredBanner;
}
