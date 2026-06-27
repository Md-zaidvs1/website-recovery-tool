import { Response } from 'express';
import { Domains, Contacts } from '../models/db';
import { ExportService } from '../services/ExportService';
import { ExtractionEngine } from '../services/ExtractionEngine';
import { AuthenticatedRequest } from '../middleware/auth';

/**
 * Lists recovered contacts with full search, confidence filters, and pagination.
 */
export function listResults(req: AuthenticatedRequest, res: Response): void {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = (req.query.search as string || '').toLowerCase().trim();
    const minConfidence = parseInt(req.query.minConfidence as string) || 0;
    const source = req.query.source as 'cheerio' | 'puppeteer';

    const skip = (page - 1) * limit;

    // Filter results dynamically in-memory
    const allContacts = Contacts.find((contact) => {
      // 1. Min confidence check
      if (contact.confidence < minConfidence) return false;

      // 2. Source check
      if (source && contact.source !== source) return false;

      // Find associated domain details
      const domainObj = Domains.findById(contact.domainId);
      const domainName = domainObj?.domain || '';

      // 3. Search text checks (domain, company name, emails, phones, address)
      if (search) {
        const matchDomain = domainName.toLowerCase().includes(search);
        const matchCompany = (contact.companyName || '').toLowerCase().includes(search);
        const matchAddress = (contact.address || '').toLowerCase().includes(search);
        const matchEmail = contact.emails.some((email) => email.toLowerCase().includes(search));
        const matchPhone = contact.phones.some((phone) => phone.includes(search));
        
        if (!matchDomain && !matchCompany && !matchAddress && !matchEmail && !matchPhone) {
          return false;
        }
      }

      return true;
    });

    // Populate associated Domain object fields
    const populated = allContacts.map((contact) => {
      const domainObj = Domains.findById(contact.domainId);
      return {
        ...contact,
        domain: domainObj ? { id: domainObj.id, domain: domainObj.domain, status: domainObj.status } : null,
      };
    });

    // Sort: newest first
    populated.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
    });

    const paginated = populated.slice(skip, skip + limit);

    res.json({
      success: true,
      data: paginated,
      pagination: {
        total: populated.length,
        page,
        limit,
        pages: Math.ceil(populated.length / limit),
      },
    });
  } catch (error: any) {
    console.error('List results error:', error);
    res.status(500).json({ success: false, error: 'Internal server error listing recovered contacts' });
  }
}

/**
 * Retrieves a single contact record details.
 */
export function getResultDetails(req: AuthenticatedRequest, res: Response): void {
  const { id } = req.params;
  try {
    const contact = Contacts.findById(id);
    if (!contact) {
      res.status(404).json({ success: false, error: 'Contact record not found' });
      return;
    }

    const domain = Domains.findById(contact.domainId);

    res.json({
      success: true,
      data: {
        ...contact,
        domain: domain || null,
      },
    });
  } catch (error: any) {
    console.error('Get result details error:', error);
    res.status(500).json({ success: false, error: 'Internal server error fetching contact record' });
  }
}

/**
 * Deletes a recovered contact record (preserving the Domain queue record).
 */
export function deleteResult(req: AuthenticatedRequest, res: Response): void {
  const { id } = req.params;
  try {
    const success = Contacts.deleteById(id);
    if (!success) {
      res.status(404).json({ success: false, error: 'Contact record not found' });
      return;
    }

    res.json({
      success: true,
      message: 'Contact record deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete result error:', error);
    res.status(500).json({ success: false, error: 'Internal server error deleting contact record' });
  }
}

/**
 * Triggers reprocess/rescraping for a specific domain.
 */
export async function reprocessDomain(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { domainId } = req.body;
  
  if (!domainId) {
    res.status(400).json({ success: false, error: 'domainId is required' });
    return;
  }

  try {
    const domainRecord = Domains.findById(domainId);
    if (!domainRecord) {
      res.status(404).json({ success: false, error: 'Domain record not found' });
      return;
    }

    // Set status to processing
    Domains.findByIdAndUpdate(domainId, {
      status: 'processing',
      errorMessage: undefined,
    });

    try {
      const data = await ExtractionEngine.extract(domainRecord.domain);

      // Save/update contacts
      const existingContact = Contacts.findOne({ domainId });
      const contactPayload = {
        domainId,
        ...data,
      };

      let contactRecord;
      if (existingContact) {
        contactRecord = Contacts.findByIdAndUpdate(existingContact.id, contactPayload);
      } else {
        contactRecord = Contacts.create(contactPayload);
      }

      // Mark domain as completed
      Domains.findByIdAndUpdate(domainId, {
        status: 'completed',
        processedAt: new Date().toISOString(),
      });

      res.json({
        success: true,
        message: 'Domain reprocessed successfully',
        domain: Domains.findById(domainId),
        contact: contactRecord,
      });
    } catch (scrapingError: any) {
      const errMsg = scrapingError.message || 'Scraping failed during reprocess';
      Domains.findByIdAndUpdate(domainId, {
        status: 'failed',
        errorMessage: errMsg,
        processedAt: new Date().toISOString(),
      });
      res.status(422).json({ success: false, error: errMsg });
    }
  } catch (error: any) {
    console.error('Reprocess domain error:', error);
    res.status(500).json({ success: false, error: 'Internal server error reprocessing domain' });
  }
}

/**
 * Streams the generated Excel file containing recovered contacts for download.
 */
export async function exportToExcel(req: AuthenticatedRequest, res: Response): Promise<void> {
  const batchId = req.query.batchId as string;
  try {
    const buffer = await ExportService.generateResultsExcel(batchId);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=RecoveredContacts.xlsx');
    res.setHeader('Content-Length', buffer.length);
    
    res.send(buffer);
  } catch (error: any) {
    console.error('Excel export error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate Excel download' });
  }
}
