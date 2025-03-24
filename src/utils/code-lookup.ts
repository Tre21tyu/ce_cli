import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import chalk from 'chalk';
import Papa from 'papaparse';

// Convert fs.readFile to use promises
const readFile = promisify(fs.readFile);

/**
 * Interface for a verb from the CSV
 */
interface Verb {
  verb_keyword: string;
  verb_code: number;
  has_noun: boolean;
}

/**
 * Interface for a noun from the CSV
 */
interface Noun {
  noun_keyword: string;
  noun_code: number;
}

/**
 * Class for loading and caching verbs and nouns from CSV files
 */
export class CodeLookup {
  private static instance: CodeLookup;
  private verbs: Map<string, { code: number, hasNoun: boolean }> = new Map();
  private nouns: Map<string, number> = new Map();
  private initialized: boolean = false;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {}

  /**
   * Get the singleton instance
   */
  public static getInstance(): CodeLookup {
    if (!CodeLookup.instance) {
      CodeLookup.instance = new CodeLookup();
    }
    return CodeLookup.instance;
  }

  /**
   * Initialize the lookup by loading CSV files
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Load verbs CSV
      const verbsPath = path.join(process.cwd(), 'tables', 'verbs.csv');
      const verbsData = await readFile(verbsPath, 'utf8');
      
      // Parse verbs CSV
      const verbsResult = Papa.parse<Verb>(verbsData, {
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

      console.log(chalk.green(`Loaded ${this.verbs.size} verbs from CSV`));

      // Load nouns CSV
      const nounsPath = path.join(process.cwd(), 'tables', 'nouns.csv');
      const nounsData = await readFile(nounsPath, 'utf8');
      
      // Parse nouns CSV
      const nounsResult = Papa.parse<Noun>(nounsData, {
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

      console.log(chalk.green(`Loaded ${this.nouns.size} nouns from CSV`));

      this.initialized = true;
    } catch (error) {
      console.error(chalk.red('Error loading CSV files:'), error);
      throw new Error('Failed to load verb and noun codes');
    }
  }

  /**
   * Find a verb code by keyword
   * 
   * @param verbKeyword - The verb keyword to look up
   * @returns An object containing the verb code and whether it has a noun, or null if not found
   */
  public findVerb(verbKeyword: string): { code: number, hasNoun: boolean } | null {
    const verb = this.verbs.get(verbKeyword.trim());
    return verb || null;
  }

  /**
   * Find a noun code by keyword
   * 
   * @param nounKeyword - The noun keyword to look up
   * @returns The noun code, or null if not found
   */
  public findNoun(nounKeyword: string): number | null {
    const code = this.nouns.get(nounKeyword.trim());
    return code !== undefined ? code : null;
  }

  /**
   * Get all verb keywords
   * 
   * @returns An array of all verb keywords
   */
  public getAllVerbKeywords(): string[] {
    return Array.from(this.verbs.keys());
  }

  /**
   * Get all noun keywords
   * 
   * @returns An array of all noun keywords
   */
  public getAllNounKeywords(): string[] {
    return Array.from(this.nouns.keys());
  }
}