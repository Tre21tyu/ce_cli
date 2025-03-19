"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkDatabase = void 0;
const knex_1 = __importDefault(require("knex"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
/**
 * Database class for handling all database operations
 */
class WorkDatabase {
    /**
     * Private constructor to enforce singleton pattern
     */
    constructor() {
        // Ensure the data directory exists
        const dataDir = path_1.default.join(process.cwd(), 'data');
        if (!fs_1.default.existsSync(dataDir)) {
            fs_1.default.mkdirSync(dataDir, { recursive: true });
        }
        // Initialize SQLite database with Knex
        this.db = (0, knex_1.default)({
            client: 'better-sqlite3',
            connection: {
                filename: path_1.default.join(dataDir, 'work-cli.sqlite')
            },
            useNullAsDefault: true
        });
        // Initialize database schema
        this.initDatabase();
    }
    /**
     * Get the singleton instance of the database
     */
    static getInstance() {
        if (!WorkDatabase.instance) {
            WorkDatabase.instance = new WorkDatabase();
        }
        return WorkDatabase.instance;
    }
    /**
     * Initialize database tables if they don't exist
     */
    async initDatabase() {
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
        }
        catch (error) {
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
    async addWorkOrder(workOrderNumber, controlNumber) {
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
            const newWorkOrder = {
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
        }
        catch (error) {
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
    async getWorkOrder(workOrderNumber) {
        return await this.db('WOs')
            .where({ workOrderNumber })
            .first();
    }
    /**
     * Get all work orders from the database
     *
     * @returns Array of all work orders
     */
    async getAllWorkOrders() {
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
    async addNoun(name, description) {
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
            const newNoun = {
                name,
                description,
                createdAt: now,
                updatedAt: now
            };
            // Insert into database
            const [id] = await this.db('Nouns').insert(newNoun);
            // Return the created noun with ID
            return { ...newNoun, id };
        }
        catch (error) {
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
    async addVerb(name, description) {
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
            const newVerb = {
                name,
                description,
                createdAt: now,
                updatedAt: now
            };
            // Insert into database
            const [id] = await this.db('Verbs').insert(newVerb);
            // Return the created verb with ID
            return { ...newVerb, id };
        }
        catch (error) {
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
    async addPart(partNumber, cost = 0, description) {
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
            const newPart = {
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
        }
        catch (error) {
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
    async addService(workOrderId, verbName, nounName, duration = 0, dateAdded = new Date()) {
        try {
            // Get or create verb
            const verb = await this.addVerb(verbName);
            // Get or create noun
            const noun = await this.addNoun(nounName);
            // Create new service
            const now = new Date();
            const newService = {
                workOrderId,
                verbId: verb.id,
                nounId: noun.id,
                duration,
                dateAdded,
                createdAt: now,
                updatedAt: now
            };
            // Insert into database
            const [id] = await this.db('Services').insert(newService);
            // Return the created service with ID
            return { ...newService, id };
        }
        catch (error) {
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
    async addPartToService(serviceId, partNumber, quantity = 1, cost) {
        try {
            // Get or create part
            const part = await this.addPart(partNumber, cost || 0);
            // Use the provided cost or the part's current cost
            const finalCost = cost !== undefined ? cost : part.cost;
            // Create new part charged
            const now = new Date();
            const newPartCharged = {
                serviceId,
                partId: part.id,
                quantity,
                cost: finalCost,
                createdAt: now,
                updatedAt: now
            };
            // Insert into database
            const [id] = await this.db('PartsCharged').insert(newPartCharged);
            // Return the created part charged with ID
            return { ...newPartCharged, id };
        }
        catch (error) {
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
    async getWorkOrderDetails(workOrderNumber) {
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
        }
        catch (error) {
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
    async closeWorkOrder(workOrderNumber) {
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
        }
        catch (error) {
            console.error('Error closing work order:', error);
            throw error;
        }
    }
}
exports.WorkDatabase = WorkDatabase;
