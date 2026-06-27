import { Response } from 'express';
import { Domains, Contacts, History } from '../models/db';
import { ExtractionEngine, cleanDomainName } from '../services/ExtractionEngine';
import { BulkService } from '../services/BulkService';
import { AuthenticatedRequest } from '../middleware/auth';

/**
 * Triggers single domain extraction synchronously (max 30s as per SRS).
 */
export async function processSingle(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { domain, mode, timeout, waybackFallback, geminiGrounding } = req.body;
  if (!domain) {
    res.status(400).json({ success: false, error: 'Domain name is required' });
    return;
  }

  const hostname = cleanDomainName(domain);
  if (!hostname || hostname.length < 3 || !hostname.includes('.')) {
    res.status(400).json({ success: false, error: 'Please enter a valid domain format (e.g., example.com)' });
    return;
  }

  try {
    // Check if domain is already being processed or completed
    let domainRecord = Domains.findOne({ domain: hostname });
    
    if (domainRecord && domainRecord.status === 'processing') {
      res.status(409).json({ success: false, error: 'This domain is currently being processed' });
      return;
    }

    if (!domainRecord) {
      domainRecord = Domains.create({
        domain: hostname,
        status: 'processing',
        processedBy: req.user?.id,
        isBulk: false,
        retryCount: 0,
      });
    } else {
      // Reprocess existing: Reset status to processing
      Domains.findByIdAndUpdate(domainRecord.id, {
        status: 'processing',
        errorMessage: undefined,
        retryCount: 0,
      });
    }

    // Trigger extraction
    let contactData;
    try {
      contactData = await ExtractionEngine.extract(hostname, undefined, { mode, timeout, waybackFallback, geminiGrounding });
    } catch (scrapingError: any) {
      const errMsg = scrapingError.message || 'Scraping failed';
      Domains.findByIdAndUpdate(domainRecord.id, {
        status: 'failed',
        errorMessage: errMsg,
        processedAt: new Date().toISOString(),
      });
      res.status(422).json({ success: false, error: errMsg });
      return;
    }

    // Save contact details
    const existingContact = Contacts.findOne({ domainId: domainRecord.id });
    const contactPayload = {
      domainId: domainRecord.id,
      ...contactData,
    };

    let contactRecord;
    if (existingContact) {
      contactRecord = Contacts.findByIdAndUpdate(existingContact.id, contactPayload);
    } else {
      contactRecord = Contacts.create(contactPayload);
    }

    // Mark domain as completed or blocked
    Domains.findByIdAndUpdate(domainRecord.id, {
      status: contactData.status === 'BLOCKED' ? 'blocked' : 'completed',
      processedAt: new Date().toISOString(),
    });

    // Save search history log
    if (req.user) {
      History.create({
        userId: req.user.id,
        domain: hostname,
        resultId: contactRecord?.id,
        searchedAt: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      domain: Domains.findById(domainRecord.id),
      contact: contactRecord,
      logs: contactData.logs,
    });
  } catch (error: any) {
    console.error('Single domain recovery error:', error);
    res.status(500).json({ success: false, error: 'Internal server error during extraction' });
  }
}

/**
 * Uploads list of domains for bulk background extraction.
 */
export function bulkUpload(req: AuthenticatedRequest, res: Response): void {
  const { domains, mode, timeout, waybackFallback, geminiGrounding, concurrency } = req.body;
  
  if (!domains || !Array.isArray(domains) || domains.length === 0) {
    res.status(400).json({ success: false, error: 'An array of domains in request body is required' });
    return;
  }

  const userId = req.user?.id || 'anonymous';
  const batchId = Math.random().toString(36).substring(2, 11);

  try {
    // Initiate background processing worker asynchronously
    BulkService.addBatch(domains, userId, batchId, { mode, timeout, waybackFallback, geminiGrounding, concurrency });

    res.status(202).json({
      success: true,
      message: 'Bulk job received and added to queue',
      batchId,
      totalCount: domains.length,
    });
  } catch (error: any) {
    console.error('Bulk upload error:', error);
    res.status(500).json({ success: false, error: 'Internal server error starting bulk job' });
  }
}

/**
 * Returns list of processed/queued domains (paginated, sorted, filterable).
 */
export function listDomains(req: AuthenticatedRequest, res: Response): void {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const status = req.query.status as string;
    const batchId = req.query.batchId as string;

    const skip = (page - 1) * limit;

    let filter: (d: any) => boolean = () => true;

    if (status && batchId) {
      filter = (d) => d.status === status && d.bulkBatchId === batchId;
    } else if (status) {
      filter = (d) => d.status === status;
    } else if (batchId) {
      filter = (d) => d.bulkBatchId === batchId;
    }

    const allDomains = Domains.find(filter)
      .sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
      });

    const paginated = allDomains.slice(skip, skip + limit);

    res.json({
      success: true,
      data: paginated,
      pagination: {
        total: allDomains.length,
        page,
        limit,
        pages: Math.ceil(allDomains.length / limit),
      },
    });
  } catch (error: any) {
    console.error('List domains error:', error);
    res.status(500).json({ success: false, error: 'Internal server error listing domains' });
  }
}

/**
 * Retrieves full details for a domain, including any scraped contacts.
 */
export function getDomainDetails(req: AuthenticatedRequest, res: Response): void {
  const { id } = req.params;
  try {
    const domain = Domains.findById(id);
    if (!domain) {
      res.status(404).json({ success: false, error: 'Domain record not found' });
      return;
    }

    const contact = Contacts.findOne({ domainId: id });

    res.json({
      success: true,
      domain,
      contact: contact || null,
    });
  } catch (error: any) {
    console.error('Get domain details error:', error);
    res.status(500).json({ success: false, error: 'Internal server error fetching domain details' });
  }
}

/**
 * Deletes a domain and its associated contact results.
 */
export function deleteDomain(req: AuthenticatedRequest, res: Response): void {
  const { id } = req.params;
  try {
    const domain = Domains.findById(id);
    if (!domain) {
      res.status(404).json({ success: false, error: 'Domain record not found' });
      return;
    }

    // Delete domain, contact, and any history
    Domains.deleteById(id);
    Contacts.deleteMany({ domainId: id });

    res.json({
      success: true,
      message: 'Domain and associated results deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete domain error:', error);
    res.status(500).json({ success: false, error: 'Internal server error deleting domain' });
  }
}

/**
 * Returns bulk progress state for batchId.
 */
export function getBatchProgress(req: AuthenticatedRequest, res: Response): void {
  const { batchId } = req.params;
  try {
    const stats = BulkService.getBatchProgress(batchId);
    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('Batch progress error:', error);
    res.status(500).json({ success: false, error: 'Internal server error fetching batch progress' });
  }
}
