/**
 * Client Service
 * Handles all client-related Firebase operations
 */

import { createFirebaseService, QueryOptions } from './firebase.service';

export interface Client {
  id?: string;
  clientNumber?: string; // CLN001, CLN002, etc.
  serialNumber?: string; // Manual S.No field
  clientName: string;
  businessName?: string;
  taxIdentifiers?: {
    pan?: string;
    tan?: string;
    gstin?: string;
  };
  contact?: {
    email?: string;
    phone?: string;
  };
  address?: {
    line1?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };
  compliance?: {
    roc: boolean;
    gstr1: boolean;
    gst3b: boolean;
    iff: boolean;
    itr: boolean;
    taxAudit: boolean;
    accounting: boolean;
    clientVisit: boolean;
    bank: boolean;
    tcs: boolean;
    tds: boolean;
    statutoryAudit: boolean;
  };
  status: 'active' | 'inactive';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ClientFormData {
  clientName: string;
  serialNumber?: string;
  businessName?: string;
  pan?: string;
  tan?: string;
  gstin?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  complianceRoc?: boolean;
  complianceGstr1?: boolean;
  complianceGst3b?: boolean;
  complianceIff?: boolean;
  complianceItr?: boolean;
  complianceTaxAudit?: boolean;
  complianceAccounting?: boolean;
  complianceClientVisit?: boolean;
  complianceBank?: boolean;
  complianceTcs?: boolean;
  complianceTds?: boolean;
  complianceStatutoryAudit?: boolean;
}

export interface ClientImportRow {
  'S.No'?: string;
  'Client Name': string;
  'Business Name'?: string;
  'P.A.N.'?: string;
  'T.A.N.'?: string;
  GSTIN?: string;
  Email?: string;
  Phone?: string;
  Address?: string;
  City?: string;
  State?: string;
  Country?: string;
  'Zip Code'?: string;
  ROC?: string;
  GSTR1?: string;
  GST3B?: string;
  IFF?: string;
  ITR?: string;
  'Tax Audit'?: string;
  Accounting?: string;
  'Client Visit'?: string;
  Bank?: string;
  TCS?: string;
  TDS?: string;
  'Statutory Audit'?: string;
}

// Create the Firebase service instance for clients
const clientFirebaseService = createFirebaseService<Client>('clients');

/**
 * Client Service API
 */
export const clientService = {
  /**
   * Get all clients with optional filters
   */
  async getAll(filters?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<Client[]> {
    const options: QueryOptions = {};

    // Add status filter
    if (filters?.status) {
      options.filters = [
        {
          field: 'status',
          operator: '==',
          value: filters.status,
        },
      ];
    }

    // Add pagination
    if (filters?.limit) {
      options.pagination = {
        pageSize: filters.limit,
      };
    }

    // Add default ordering
    options.orderByField = 'createdAt';
    options.orderDirection = 'desc';

    let clients = await clientFirebaseService.getAll(options);

    // Apply search filter (client-side)
    if (filters?.search) {
      clients = await clientFirebaseService.searchMultipleFields(
        ['clientName', 'businessName', 'contact.email', 'contact.phone', 'taxIdentifiers.gstin', 'taxIdentifiers.pan'],
        filters.search,
        options
      );
    }

    return clients;
  },

  /**
   * Get paginated clients
   */
  async getPaginated(
    pageSize: number = 20,
    lastDoc?: any
  ): Promise<{ data: Client[]; lastDoc: any; hasMore: boolean }> {
    return clientFirebaseService.getPaginated({
      orderByField: 'createdAt',
      orderDirection: 'desc',
      pagination: {
        pageSize,
        lastDoc,
      },
    });
  },

  /**
   * Get a client by ID
   */
  async getById(id: string): Promise<Client | null> {
    return clientFirebaseService.getById(id);
  },

  /**
   * Create a new client
   */
  async create(data: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Promise<Client> {
    // No longer auto-generate client number
    return clientFirebaseService.create(data);
  },

  /**
   * Generate next client number (CLN001, CLN002, etc.)
   */
  async generateClientNumber(): Promise<string> {
    const clients = await this.getAll();
    
    // Find the highest existing client number
    let maxNumber = 0;
    clients.forEach(client => {
      if (client.clientNumber) {
        const match = client.clientNumber.match(/^CLN(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNumber) {
            maxNumber = num;
          }
        }
      }
    });
    
    // Generate next number
    const nextNumber = maxNumber + 1;
    return `CLN${String(nextNumber).padStart(3, '0')}`;
  },

  /**
   * Update a client
   */
  async update(id: string, data: Partial<Omit<Client, 'id'>>): Promise<Client> {
    return clientFirebaseService.update(id, data);
  },

  /**
   * Delete a client
   */
  async delete(id: string): Promise<void> {
    return clientFirebaseService.delete(id);
  },

  /**
   * Search clients
   */
  async search(query: string): Promise<Client[]> {
    return clientFirebaseService.searchMultipleFields(
      ['clientName', 'businessName', 'contact.email', 'contact.phone', 'taxIdentifiers.gstin', 'taxIdentifiers.pan'],
      query
    );
  },

  /**
   * Bulk import clients from CSV data
   */
  async bulkImport(clients: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<{
    success: number;
    failed: number;
    errors: Array<{ row: number; error: string; data: any }>;
  }> {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ row: number; error: string; data: any }>,
    };

    for (let i = 0; i < clients.length; i++) {
      try {
        // No longer auto-generate client number
        await clientFirebaseService.create(clients[i]);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          row: i + 1,
          error: error instanceof Error ? error.message : 'Unknown error',
          data: clients[i],
        });
      }
    }

    return results;
  },

  /**
   * Get next available client number
   */
  async getNextClientNumber(): Promise<number> {
    const clients = await this.getAll();
    
    let maxNumber = 0;
    clients.forEach(client => {
      if (client.clientNumber) {
        const match = client.clientNumber.match(/^CLN(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNumber) {
            maxNumber = num;
          }
        }
      }
    });
    
    return maxNumber + 1;
  },

  /**
   * Count clients
   */
  async count(filters?: { status?: string }): Promise<number> {
    const options: QueryOptions = {};

    if (filters?.status) {
      options.filters = [
        {
          field: 'status',
          operator: '==',
          value: filters.status,
        },
      ];
    }

    return clientFirebaseService.count(options);
  },
};
