import ExcelJS from 'exceljs';
import { Domains, Contacts } from '../models/db';

export class ExportService {
  /**
   * Generates an Excel Workbook containing recovered contact results.
   */
  static async generateResultsExcel(batchId?: string): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Plant2Tree';
    workbook.lastModifiedBy = 'Plant2Tree';
    workbook.created = new Date();

    const sheet1 = workbook.addWorksheet('Extraction Results');

    // Define exactly the 11 columns in the requested order
    sheet1.columns = [
      { header: 'Domain', key: 'domain', width: 25 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Source', key: 'source', width: 25 },
      { header: 'Company Name', key: 'companyName', width: 25 },
      { header: 'Phone', key: 'phone', width: 20 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Address', key: 'address', width: 30 },
      { header: 'Facebook', key: 'facebook', width: 25 },
      { header: 'LinkedIn', key: 'linkedin', width: 25 },
      { header: 'Instagram', key: 'instagram', width: 25 },
      { header: 'WhatsApp', key: 'whatsapp', width: 20 },
    ];

    // Style the header row with Cyber Red Accent
    const styleHeader = (sheet: ExcelJS.Worksheet) => {
      const headerRow = sheet.getRow(1);
      headerRow.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF990000' }, // Cyber Red
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.height = 25;
    };

    styleHeader(sheet1);

    // Fetch domains
    let domainsToExport;
    if (batchId) {
      domainsToExport = Domains.find((d) => d.bulkBatchId === batchId);
    } else {
      domainsToExport = Domains.find();
    }

    for (const domain of domainsToExport) {
      const contact = Contacts.findOne({ domainId: domain.id });
      
      let finalStatus: 'ACTIVE' | 'ARCHIVED' | 'NO_DATA' | 'FAILED' | 'BLOCKED' = 'NO_DATA';
      let sourceVal = 'Checked Public Sources';
      let companyNameVal = 'N/A';
      let phoneVal = 'N/A';
      let emailVal = 'N/A';
      let addressVal = 'N/A';
      let facebookVal = 'N/A';
      let linkedinVal = 'N/A';
      let instagramVal = 'N/A';
      let whatsappVal = 'N/A';

      if (domain.status === 'failed') {
        finalStatus = 'FAILED';
        sourceVal = 'Checked Public Sources';
      } else if (domain.status === 'blocked' || (contact && contact.status === 'BLOCKED')) {
        finalStatus = 'BLOCKED';
        sourceVal = (contact && contact.source) || 'Checked Public Sources';
        if (contact) {
          companyNameVal = contact.companyName || 'N/A';
          phoneVal = contact.phones && contact.phones.length > 0 ? contact.phones.join(', ') : 'N/A';
          emailVal = contact.emails && contact.emails.length > 0 ? contact.emails.join(', ') : 'N/A';
          addressVal = contact.address || 'N/A';
          facebookVal = contact.socialLinks?.facebook || 'N/A';
          linkedinVal = contact.socialLinks?.linkedin || 'N/A';
          instagramVal = contact.socialLinks?.instagram || 'N/A';
          whatsappVal = contact.whatsappNumbers && contact.whatsappNumbers.length > 0 ? contact.whatsappNumbers.join(', ') : 'N/A';
        }
      } else if (domain.status === 'completed' && contact) {
        const hasContactInfo = (contact.emails && contact.emails.length > 0) ||
          (contact.phones && contact.phones.length > 0) ||
          (contact.whatsappNumbers && contact.whatsappNumbers.length > 0) ||
          (contact.socialLinks && (contact.socialLinks.facebook || contact.socialLinks.linkedin || contact.socialLinks.instagram));

        if (!hasContactInfo) {
          finalStatus = 'NO_DATA';
          sourceVal = contact.source || 'Checked Public Sources';
        } else {
          const isArchived = contact.status === 'ARCHIVED' || 
            (contact.source && (contact.source.toLowerCase().includes('wayback') || contact.source.toLowerCase().includes('archive')));
          
          if (isArchived) {
            finalStatus = 'ARCHIVED';
          } else {
            finalStatus = 'ACTIVE';
          }
          sourceVal = contact.source || 'Live Website';
        }

        companyNameVal = contact.companyName || 'N/A';
        phoneVal = contact.phones && contact.phones.length > 0 ? contact.phones.join(', ') : 'N/A';
        emailVal = contact.emails && contact.emails.length > 0 ? contact.emails.join(', ') : 'N/A';
        addressVal = contact.address || 'N/A';
        facebookVal = contact.socialLinks?.facebook || 'N/A';
        linkedinVal = contact.socialLinks?.linkedin || 'N/A';
        instagramVal = contact.socialLinks?.instagram || 'N/A';
        whatsappVal = contact.whatsappNumbers && contact.whatsappNumbers.length > 0 ? contact.whatsappNumbers.join(', ') : 'N/A';
      } else {
        // pending, processing or completed without contact record
        finalStatus = 'NO_DATA';
        sourceVal = 'Checked Public Sources';
      }

      // Check if data contains any placeholder/dummy values, and if so replace them with 'N/A'
      // Email checking
      if (emailVal !== 'N/A') {
        const emails = emailVal.split(', ').map(e => e.trim()).filter(e => {
          const lower = e.toLowerCase();
          return !lower.includes('example.com') && 
                 !lower.includes('yourdomain.com') && 
                 !lower.startsWith('test@') && 
                 !lower.startsWith('demo@') && 
                 !lower.startsWith('example@');
        });
        emailVal = emails.length > 0 ? emails.join(', ') : 'N/A';
      }

      // Phone checking
      if (phoneVal !== 'N/A') {
        const phones = phoneVal.split(', ').map(p => p.trim()).filter(p => {
          const digits = p.replace(/\D/g, '');
          const isDummy = digits === '1234567890' || 
                          digits === '9876543210' || 
                          digits.startsWith('000000') || 
                          /^(\d)\1+$/.test(digits) || 
                          '1234567890'.includes(digits) || 
                          '9876543210'.includes(digits);
          return !isDummy;
        });
        phoneVal = phones.length > 0 ? phones.join(', ') : 'N/A';
      }

      // WhatsApp checking
      if (whatsappVal !== 'N/A') {
        const whatsapps = whatsappVal.split(', ').map(p => p.trim()).filter(p => {
          const digits = p.replace(/\D/g, '');
          const isDummy = digits === '1234567890' || 
                          digits === '9876543210' || 
                          digits.startsWith('000000') || 
                          /^(\d)\1+$/.test(digits) || 
                          '1234567890'.includes(digits) || 
                          '9876543210'.includes(digits);
          return !isDummy;
        });
        whatsappVal = whatsapps.length > 0 ? whatsapps.join(', ') : 'N/A';
      }

      // Social check: make sure no Wayback / Archive URLs exist inside social media columns!
      const cleanSocial = (url: string) => {
        if (!url || url === 'N/A') return 'N/A';
        const lower = url.toLowerCase();
        if (lower.includes('web.archive.org') || lower.includes('wayback') || lower.includes('archive.today') || lower.includes('archive.is') || lower.includes('memento')) {
          // Attempt to strip archive prefix
          let cleaned = url.replace(/^https?:\/\/web\.archive\.org\/web\/\d+[a-z0-9_]*\//i, '');
          cleaned = cleaned.replace(/^\/?web\/\d+[a-z0-9_]*\//i, '');
          cleaned = cleaned.replace(/^https?:\/\/(archive\.today|archive\.is|memento\.timedate\.org|cachedview\.com)[^\/]*\//i, '');
          if (cleaned.includes('facebook.com') || cleaned.includes('fb.com') || cleaned.includes('linkedin.com') || cleaned.includes('instagram.com')) {
            if (!cleaned.startsWith('http')) {
              cleaned = `https://${cleaned.replace(/^\/+/, '')}`;
            }
            return cleaned;
          }
          return 'N/A';
        }
        return url;
      };

      facebookVal = cleanSocial(facebookVal);
      linkedinVal = cleanSocial(linkedinVal);
      instagramVal = cleanSocial(instagramVal);

      sheet1.addRow({
        domain: domain.domain,
        status: finalStatus,
        source: sourceVal,
        companyName: companyNameVal,
        phone: phoneVal,
        email: emailVal,
        address: addressVal,
        facebook: facebookVal,
        linkedin: linkedinVal,
        instagram: instagramVal,
        whatsapp: whatsappVal,
      });
    }

    // Apply alignment & font formatting
    const formatRows = (sheet: ExcelJS.Worksheet) => {
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        row.alignment = { vertical: 'middle', horizontal: 'left' };
        row.font = { name: 'Segoe UI', size: 10 };
        row.height = 20;
      });
    };

    formatRows(sheet1);

    const buffer = await workbook.xlsx.writeBuffer() as Buffer;
    return buffer;
  }
}
