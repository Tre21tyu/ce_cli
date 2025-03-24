"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeLookup = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const util_1 = require("util");
const chalk_1 = __importDefault(require("chalk"));
const papaparse_1 = __importDefault(require("papaparse"));
// Convert fs.readFile to use promises
const readFile = (0, util_1.promisify)(fs_1.default.readFile);
/**
 * Class for loading and caching verbs and nouns from CSV files
 */
class CodeLookup {
    /**
     * Private constructor to enforce singleton pattern
     */
    constructor() {
        this.verbs = new Map();
        this.nouns = new Map();
        this.initialized = false;
    }
    /**
     * Get the singleton instance
     */
    static getInstance() {
        if (!CodeLookup.instance) {
            CodeLookup.instance = new CodeLookup();
        }
        return CodeLookup.instance;
    }
    /**
     * Initialize the lookup by loading CSV files
     */
    async initialize() {
        if (this.initialized) {
            return;
        }
        try {
            // Load verbs CSV
            const verbsPath = path_1.default.join(process.cwd(), 'tables', 'verbs.csv');
            const verbsData = await readFile(verbsPath, 'utf8');
            // Parse verbs CSV
            const verbsResult = papaparse_1.default.parse(verbsData, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true
            });
            // Cache verbs in memory
            verbsResult.data.forEach(verb => {
                if (verb.verb_keyword && verb.verb_code !== undefined) {
                    this.verbs.set(verb.verb_keyword.trim(), {
                        code: verb.verb_code,
                        hasNoun: !!verb.has_noun
                    });
                }
            });
            console.log(chalk_1.default.green(`Loaded ${this.verbs.size} verbs from CSV`));
            // Load nouns CSV
            const nounsPath = path_1.default.join(process.cwd(), 'tables', 'nouns.csv');
            const nounsData = await readFile(nounsPath, 'utf8');
            // Parse nouns CSV
            const nounsResult = papaparse_1.default.parse(nounsData, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true
            });
            // Cache nouns in memory
            nounsResult.data.forEach(noun => {
                if (noun.noun_keyword && noun.noun_code !== undefined) {
                    this.nouns.set(noun.noun_keyword.trim(), noun.noun_code);
                }
            });
            console.log(chalk_1.default.green(`Loaded ${this.nouns.size} nouns from CSV`));
            this.initialized = true;
        }
        catch (error) {
            console.error(chalk_1.default.red('Error loading CSV files:'), error);
            throw new Error('Failed to load verb and noun codes');
        }
    }
    /**
     * Find a verb code by keyword
     *
     * @param verbKeyword - The verb keyword to look up
     * @returns An object containing the verb code and whether it has a noun, or null if not found
     */
    findVerb(verbKeyword) {
        const verb = this.verbs.get(verbKeyword.trim());
        return verb || null;
    }
    /**
     * Find a noun code by keyword
     *
     * @param nounKeyword - The noun keyword to look up
     * @returns The noun code, or null if not found
     */
    findNoun(nounKeyword) {
        const code = this.nouns.get(nounKeyword.trim());
        return code !== undefined ? code : null;
    }
    /**
     * Get all verb keywords
     *
     * @returns An array of all verb keywords
     */
    getAllVerbKeywords() {
        return Array.from(this.verbs.keys());
    }
    /**
     * Get all noun keywords
     *
     * @returns An array of all noun keywords
     */
    getAllNounKeywords() {
        return Array.from(this.nouns.keys());
    }
}
exports.CodeLookup = CodeLookup;
