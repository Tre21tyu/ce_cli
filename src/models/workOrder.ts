/**
 * Work order model definition
 */
export interface WorkOrder {
  id?: number;              // Auto-incremented primary key
  workOrderNumber: string;  // 7-digit work order number
  controlNumber?: string;   // 8-digit control number
  open: boolean;            // Whether the work order is open
  dateOpened: Date;         // Date when the work order was opened
  dateClosed?: Date;        // Date when the work order was closed
  notes?: string;           // Optional notes
  createdAt: Date;          // Creation timestamp
  updatedAt: Date;          // Last update timestamp
}

/**
 * Service model definition
 */
export interface Service {
  id?: number;              // Auto-incremented primary key
  workOrderId: number;      // Foreign key to work order
  dateAdded: Date;          // Date when the service was added
  duration: number;         // Duration in minutes
  nounId: number;           // Foreign key to noun
  verbId: number;           // Foreign key to verb
  notes?: string;           // Optional notes
  createdAt: Date;          // Creation timestamp
  updatedAt: Date;          // Last update timestamp
}

/**
 * Part charged model definition
 */
export interface PartCharged {
  id?: number;              // Auto-incremented primary key
  serviceId: number;        // Foreign key to service
  partId: number;           // Foreign key to part
  quantity: number;         // Quantity of parts
  cost: number;             // Cost of part at time of charging
  createdAt: Date;          // Creation timestamp
  updatedAt: Date;          // Last update timestamp
}

/**
 * Part model definition
 */
export interface Part {
  id?: number;              // Auto-incremented primary key
  partNumber: string;       // Part number identifier
  description?: string;     // Optional part description
  cost: number;             // Current cost of the part
  createdAt: Date;          // Creation timestamp
  updatedAt: Date;          // Last update timestamp
}

/**
 * Verb model definition
 */
export interface Verb {
  id?: number;              // Auto-incremented primary key
  name: string;             // Verb name (e.g., "Repair")
  description?: string;     // Optional description
  createdAt: Date;          // Creation timestamp
  updatedAt: Date;          // Last update timestamp
}

/**
 * Noun model definition
 */
export interface Noun {
  id?: number;              // Auto-incremented primary key
  name: string;             // Noun name (e.g., "Engine")
  description?: string;     // Optional description
  createdAt: Date;          // Creation timestamp
  updatedAt: Date;          // Last update timestamp
}