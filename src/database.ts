import Database from 'better-sqlite3';
import knex, { Knex } from 'knex';
import path from 'path';
import fs from 'fs';
import { 
  WorkOrder, 
  Service, 
  PartCharged, 
  Part, 
  Verb, 
  Noun 
} from './models/workOrder';

/**
 * Database class for handling all database operations
 */
export class WorkDatabase {
  public db: Knex;
  private static instance: WorkDatabase;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    // Ensure the data directory exists
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Initialize SQLite database with Knex
    this.db = knex({
      client: 'better-sqlite3',
      connection: {
        filename: path.join(dataDir, 'work-cli.sqlite')
      },
      useNullAsDefault: true
    });

    // Initialize database schema
    this.initDatabase();
  }

  /**
   * Get the singleton instance of the database
   */
  public static getInstance(): WorkDatabase {
    if (!WorkDatabase.instance) {
      WorkDatabase.instance = new WorkDatabase();
    }
    return WorkDatabase.instance;
  }

  /**
   * Initialize database tables if they don't exist
   */
  private async initDatabase(): Promise<void> {
    try {
      // Create WOs table if it doesn't exist
      if (!(await this.db.schema.hasTable('WOs'))) {
        await this.db.schema.createTable('WOs', (table) => {
          table.increments('id').primary();
          table.string('workOrderNumber', 7).notNullable().unique();
          table.string('controlNumber', 8);
          table.boolean('open').notNullable().defaultTo(true);
          table.datetime('dateOpened').notNullable();
          table.datetime('dateClosed');
          table.text('notes');
          table.timestamp('createdAt').defaultTo(this.db.raw('CURRENT_TIMESTAMP'));
          table.timestamp('updatedAt').defaultTo(this.db.raw('CURRENT_TIMESTAMP'));
        });
        console.log('Created WOs table');
      }

      // Create Nouns table if it doesn't exist
      if (!(await this.db.schema.hasTable('Nouns'))) {
        await this.db.schema.createTable('Nouns', (table) => {
          table.increments('id').primary();
          table.string('name').notNullable().unique();
          table.text('description');
          table.timestamp('createdAt').defaultTo(this.db.raw('CURRENT_TIMESTAMP'));
          table.timestamp('updatedAt').defaultTo(this.db.raw('CURRENT_TIMESTAMP'));
        });
        console.log('Created Nouns table');
      }

      // Create Verbs table if it doesn't exist
      if (!(await this.db.schema.hasTable('Verbs'))) {
        await this.db.schema.createTable('Verbs', (table) => {
          table.increments('id').primary();
          table.string('name').notNullable().unique();
          table.text('description');
          table.timestamp('createdAt').defaultTo(this.db.raw('CURRENT_TIMESTAMP'));
          table.timestamp('updatedAt').defaultTo(this.db.raw('CURRENT_TIMESTAMP'));
        });
        console.log('Created Verbs table');
      }

      // Create Parts table if it doesn't exist
      if (!(await this.db.schema.hasTable('Parts'))) {
        await this.db.schema.createTable('Parts', (table) => {
          table.increments('id').primary();
          table.string('partNumber').notNullable().unique();
          table.text('description');
          table.decimal('cost', 10, 2).notNullable().defaultTo(0);
          table.timestamp('createdAt').defaultTo(this.db.raw('CURRENT_TIMESTAMP'));
          table.timestamp('updatedAt').defaultTo(this.db.raw('CURRENT_TIMESTAMP'));
        });
        console.log('Created Parts table');
      }

      // Create Services table if it doesn't exist
      if (!(await this.db.schema.hasTable('Services'))) {
        await this.db.schema.createTable('Services', (table) => {
          table.increments('id').primary();
          table.integer('workOrderId').notNullable()
            .references('id').inTable('WOs')
            .onDelete('CASCADE');
          table.datetime('dateAdded').notNullable();
          table.integer('duration').notNullable().defaultTo(0);
          table.integer('nounId').notNullable()
            .references('id').inTable('Nouns');
          table.integer('verbId').notNullable()
            .references('id').inTable('Verbs');
          table.text('notes');
          table.timestamp('createdAt').defaultTo(this.db.raw('CURRENT_TIMESTAMP'));
          table.timestamp('updatedAt').defaultTo(this.db.raw('CURRENT_TIMESTAMP'));
        });
        console.log('Created Services table');
      }

      // Create PartsCharged table if it doesn't exist
      if (!(await this.db.schema.hasTable('PartsCharged'))) {
        await this.db.schema.createTable('PartsCharged', (table) => {
          table.increments('id').primary();
          table.integer('serviceId').notNullable()
            .references('id').inTable('Services')
            .onDelete('CASCADE');
          table.integer('partId').notNullable()
            .references('id').inTable('Parts');
          table.integer('quantity').notNullable().defaultTo(1);
          table.decimal('cost', 10, 2).notNullable();
          table.timestamp('createdAt').defaultTo(this.db.raw('CURRENT_TIMESTAMP'));
          table.timestamp('updatedAt').defaultTo(this.db.raw('CURRENT_TIMESTAMP'));
        });
        console.log('Created PartsCharged table');
      }
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  }

  /**
   * Add a new work order to the database
   * 
   * @param workOrderNumber - 7-digit work order number
   * @param controlNumber - Optional 8-digit control number
   * @returns The created work order object
   */
  public async addWorkOrder(workOrderNumber: string, controlNumber?: string): Promise<WorkOrder> {
    try {
      // Validate work order number (7 digits)
      if (!/^\d{7}$/.test(workOrderNumber)) {
        throw new Error('Work order number must be exactly 7 digits');
      }

      // Validate control number if provided (8 digits)
      if (controlNumber && !/^\d{8}$/.test(controlNumber)) {
        throw new Error('Control number must be exactly 8 digits');
      }

      // Check if work order already exists
      const existingWO = await this.db('WOs')
        .where({ workOrderNumber })
        .first();

      if (existingWO) {
        throw new Error(`Work order ${workOrderNumber} already exists`);
      }

      // Create new work order
      const now = new Date();
      const newWorkOrder: WorkOrder = {
        workOrderNumber,
        controlNumber,
        open: true,
        dateOpened: now,
        createdAt: now,
        updatedAt: now
      };

      // Insert into database
      const [id] = await this.db('WOs').insert(newWorkOrder);
      
      // Return the created work order with ID
      return { ...newWorkOrder, id };
    } catch (error) {
      console.error('Error adding work order:', error);
      throw error;
    }
  }

  /**
   * Get a work order by its number
   * 
   * @param workOrderNumber - 7-digit work order number
   * @returns The work order if found, undefined otherwise
   */
  public async getWorkOrder(workOrderNumber: string): Promise<WorkOrder | undefined> {
    return await this.db('WOs')
      .where({ workOrderNumber })
      .first();
  }

  /**
   * Get all work orders from the database
   * 
   * @returns Array of all work orders
   */
  public async getAllWorkOrders(): Promise<WorkOrder[]> {
    return await this.db('WOs')
      .select('*')
      .orderBy('createdAt', 'desc');
  }

  /**
   * Add a new noun to the database
   * 
   * @param name - Noun name
   * @param description - Optional description
   * @returns The created noun object
   */
  public async addNoun(name: string, description?: string): Promise<Noun> {
    try {
      // Check if noun already exists
      const existingNoun = await this.db('Nouns')
        .where({ name })
        .first();

      if (existingNoun) {
        return existingNoun;
      }

      // Create new noun
      const now = new Date();
      const newNoun: Noun = {
        name,
        description,
        createdAt: now,
        updatedAt: now
      };

      // Insert into database
      const [id] = await this.db('Nouns').insert(newNoun);
      
      // Return the created noun with ID
      return { ...newNoun, id };
    } catch (error) {
      console.error('Error adding noun:', error);
      throw error;
    }
  }

  /**
   * Add a new verb to the database
   * 
   * @param name - Verb name
   * @param description - Optional description
   * @returns The created verb object
   */
  public async addVerb(name: string, description?: string): Promise<Verb> {
    try {
      // Check if verb already exists
      const existingVerb = await this.db('Verbs')
        .where({ name })
        .first();

      if (existingVerb) {
        return existingVerb;
      }

      // Create new verb
      const now = new Date();
      const newVerb: Verb = {
        name,
        description,
        createdAt: now,
        updatedAt: now
      };

      // Insert into database
      const [id] = await this.db('Verbs').insert(newVerb);
      
      // Return the created verb with ID
      return { ...newVerb, id };
    } catch (error) {
      console.error('Error adding verb:', error);
      throw error;
    }
  }

  /**
   * Add a new part to the database
   * 
   * @param partNumber - Part number
   * @param cost - Cost of the part
   * @param description - Optional description
   * @returns The created part object
   */
  public async addPart(partNumber: string, cost: number = 0, description?: string): Promise<Part> {
    try {
      // Check if part already exists
      const existingPart = await this.db('Parts')
        .where({ partNumber })
        .first();

      if (existingPart) {
        // Update cost if part exists
        await this.db('Parts')
          .where({ partNumber })
          .update({ 
            cost,
            updatedAt: new Date()
          });
        
        return {
          ...existingPart,
          cost,
          updatedAt: new Date()
        };
      }

      // Create new part
      const now = new Date();
      const newPart: Part = {
        partNumber,
        cost,
        description,
        createdAt: now,
        updatedAt: now
      };

      // Insert into database
      const [id] = await this.db('Parts').insert(newPart);
      
      // Return the created part with ID
      return { ...newPart, id };
    } catch (error) {
      console.error('Error adding part:', error);
      throw error;
    }
  }

  /**
   * Add a service to a work order
   * 
   * @param workOrderId - ID of the work order
   * @param verbName - Name of the verb
   * @param nounName - Name of the noun
   * @param duration - Duration in minutes
   * @param dateAdded - Date when the service was added
   * @returns The created service object
   */
  public async addService(
    workOrderId: number,
    verbName: string,
    nounName: string,
    duration: number = 0,
    dateAdded: Date = new Date()
  ): Promise<Service> {
    try {
      // Get or create verb
      const verb = await this.addVerb(verbName);
      
      // Get or create noun
      const noun = await this.addNoun(nounName);

      // Create new service
      const now = new Date();
      const newService: Service = {
        workOrderId,
        verbId: verb.id!,
        nounId: noun.id!,
        duration,
        dateAdded,
        createdAt: now,
        updatedAt: now
      };

      // Insert into database
      const [id] = await this.db('Services').insert(newService);
      
      // Return the created service with ID
      return { ...newService, id };
    } catch (error) {
      console.error('Error adding service:', error);
      throw error;
    }

  }

  /**
   * Add a part to a service
   * 
   * @param serviceId - ID of the service
   * @param partNumber - Part number
   * @param quantity - Quantity of parts
   * @param cost - Cost per part
   * @returns The created part charged object
   */
  public async addPartToService(
    serviceId: number,
    partNumber: string,
    quantity: number = 1,
    cost?: number
  ): Promise<PartCharged> {
    try {
      // Get or create part
      const part = await this.addPart(partNumber, cost || 0);
      
      // Use the provided cost or the part's current cost
      const finalCost = cost !== undefined ? cost : part.cost;

      // Create new part charged
      const now = new Date();
      const newPartCharged: PartCharged = {
        serviceId,
        partId: part.id!,
        quantity,
        cost: finalCost,
        createdAt: now,
        updatedAt: now
      };

      // Insert into database
      const [id] = await this.db('PartsCharged').insert(newPartCharged);
      
      // Return the created part charged with ID
      return { ...newPartCharged, id };
    } catch (error) {
      console.error('Error adding part to service:', error);
      throw error;
    }
  }

  /**
   * Get a work order with all its services and parts
   * 
   * @param workOrderNumber - 7-digit work order number
   * @returns The work order with services and parts in JSON format
   */
  public async getWorkOrderDetails(workOrderNumber: string): Promise<any> {
    try {
      // Get work order
      const workOrder = await this.db('WOs')
        .where({ workOrderNumber })
        .first();

      if (!workOrder) {
        throw new Error(`Work order ${workOrderNumber} not found`);
      }

      // Get services for this work order
      const services = await this.db('Services')
        .where({ workOrderId: workOrder.id })
        .orderBy('dateAdded', 'desc');

      // For each service, get the associated noun, verb, and parts
      const servicesWithDetails = await Promise.all(services.map(async (service) => {
        const noun = await this.db('Nouns').where({ id: service.nounId }).first();
        const verb = await this.db('Verbs').where({ id: service.verbId }).first();
        
        const partsCharged = await this.db('PartsCharged')
          .where({ serviceId: service.id });
        
        const partsWithDetails = await Promise.all(partsCharged.map(async (partCharged) => {
          const part = await this.db('Parts').where({ id: partCharged.partId }).first();
          
          return {
            partNumber: part.partNumber,
            cost: partCharged.cost,
            quantity: partCharged.quantity
          };
        }));

        return {
          dateAdded: service.dateAdded,
          duration: service.duration,
          noun: noun.name,
          verb: verb.name,
          partsCharged: partsWithDetails,
          notes: service.notes
        };
      }));

      // Format work order for return
      return {
        workOrderNumber: workOrder.workOrderNumber,
        controlNumber: workOrder.controlNumber,
        open: workOrder.open,
        dateOpened: workOrder.dateOpened,
        dateClosed: workOrder.dateClosed,
        services: servicesWithDetails,
        notes: workOrder.notes
      };
    } catch (error) {
      console.error('Error getting work order details:', error);
      throw error;
    }
  }

  /**
   * Close a work order
   * 
   * @param workOrderNumber - 7-digit work order number
   * @returns Success message
   */
  public async closeWorkOrder(workOrderNumber: string): Promise<string> {
    try {
      // Find the work order
      const workOrder = await this.db('WOs')
        .where({ workOrderNumber })
        .first();

      if (!workOrder) {
        throw new Error(`Work order ${workOrderNumber} not found`);
      }

      if (!workOrder.open) {
        return `Work order ${workOrderNumber} is already closed`;
      }

      // Update work order to closed
      await this.db('WOs')
        .where({ workOrderNumber })
        .update({
          open: false,
          dateClosed: new Date(),
          updatedAt: new Date()
        });

      return `Work order ${workOrderNumber} closed successfully`;
    } catch (error) {
      console.error('Error closing work order:', error);
      throw error;
    }
  }
}
