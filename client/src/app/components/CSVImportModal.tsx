import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, AlertCircle, CheckCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (leads: any[]) => void;
}

interface CSVRow {
  rowNumber: number;
  data: any;
  status: 'valid' | 'duplicate' | 'error';
  message?: string;
}

const REQUIRED_FIELDS = ['name', 'email'];

export const CSVImportModal = ({
  isOpen,
  onClose,
  onConfirm
}: CSVImportModalProps) => {
  const [csvData, setCSVData] = useState<CSVRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (content: string): CSVRow[] => {
    const lines = content.trim().split('\n');
    if (lines.length < 2) {
      toast.error('CSV must have header row and at least one data row');
      return [];
    }

    // Parse header
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

    // Validate headers
    const missingRequired = REQUIRED_FIELDS.filter(
      field => !headers.includes(field)
    );

    if (missingRequired.length > 0) {
      toast.error(
        `CSV must include these columns: ${missingRequired.join(', ')}`
      );
      return [];
    }

    // Parse data rows
    const rows: CSVRow[] = [];
    const seenEmails = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());

      if (values.length !== headers.length) {
        continue; // Skip malformed rows
      }

      const row: any = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });

      // Validate required fields
      const errors: string[] = [];
      if (!row.name || row.name.length < 2) {
        errors.push('Invalid name');
      }
      if (!row.email || !row.email.includes('@')) {
        errors.push('Invalid email');
      }

      // Check for duplicates
      if (seenEmails.has(row.email.toLowerCase())) {
        rows.push({
          rowNumber: i + 1,
          data: row,
          status: 'duplicate',
          message: 'Duplicate email in CSV'
        });
        continue;
      }

      if (errors.length > 0) {
        rows.push({
          rowNumber: i + 1,
          data: row,
          status: 'error',
          message: errors.join('; ')
        });
      } else {
        seenEmails.add(row.email.toLowerCase());
        rows.push({
          rowNumber: i + 1,
          data: row,
          status: 'valid'
        });
      }
    }

    return rows;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const parsed = parseCSV(content);
      setCSVData(parsed);

      if (parsed.length === 0) {
        setCSVData([]);
      }
    };
    reader.readAsText(file);
  };

  const handleConfirm = async () => {
    const validLeads = csvData
      .filter(row => row.status === 'valid')
      .map(row => ({
        name: row.data.name,
        email: row.data.email,
        phone: row.data.phone || '',
        company: row.data.company || '',
        status: row.data.status || 'new',
        source: row.data.source || 'import',
        estimatedValue: row.data.value ? parseInt(row.data.value) : 0
      }));

    if (validLeads.length === 0) {
      toast.error('No valid leads to import');
      return;
    }

    setIsLoading(true);
    try {
      // Call the onConfirm callback with the leads data
      await onConfirm(validLeads);
      setCSVData([]);
      onClose();
    } catch (error) {
      toast.error('Failed to import leads');
    } finally {
      setIsLoading(false);
    }
  };

  const validCount = csvData.filter(r => r.status === 'valid').length;
  const duplicateCount = csvData.filter(r => r.status === 'duplicate').length;
  const errorCount = csvData.filter(r => r.status === 'error').length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[200]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[200]"
          >
            <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-gradient-to-r from-blue-50 to-indigo-50 px-8 py-6 border-b border-blue-100 flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Upload size={24} className="text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">
                      Import Leads from CSV
                    </h2>
                    <p className="text-slate-600 mt-1">
                      Upload a CSV file with your leads. Required: name, email
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              {/* Content */}
              <div className="p-8 space-y-6">
                {csvData.length === 0 ? (
                  // File Upload Area
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-blue-300 rounded-2xl p-12 text-center cursor-pointer hover:bg-blue-50 transition-colors"
                  >
                    <FileText size={48} className="mx-auto text-blue-400 mb-4" />
                    <h3 className="font-bold text-slate-900 mb-2">
                      Click to upload CSV or drag and drop
                    </h3>
                    <p className="text-slate-600 text-sm mb-4">
                      CSV file (max 5MB)
                    </p>
                    <p className="text-slate-500 text-xs">
                      Columns needed: name, email<br />
                      Optional: phone, company, status, source, value
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>
                ) : (
                  // Results Preview
                  <div className="space-y-4">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle size={20} className="text-green-600" />
                          <span className="font-bold text-green-900">
                            {validCount} Valid
                          </span>
                        </div>
                        <p className="text-xs text-green-700">Ready to import</p>
                      </div>

                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle size={20} className="text-yellow-600" />
                          <span className="font-bold text-yellow-900">
                            {duplicateCount} Duplicates
                          </span>
                        </div>
                        <p className="text-xs text-yellow-700">Same email in CSV</p>
                      </div>

                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle size={20} className="text-red-600" />
                          <span className="font-bold text-red-900">
                            {errorCount} Errors
                          </span>
                        </div>
                        <p className="text-xs text-red-700">Missing required fields</p>
                      </div>
                    </div>

                    {/* Data Preview */}
                    <div className="max-h-[300px] overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-100 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left">Row</th>
                            <th className="px-3 py-2 text-left">Name</th>
                            <th className="px-3 py-2 text-left">Email</th>
                            <th className="px-3 py-2 text-left">Company</th>
                            <th className="px-3 py-2 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {csvData.map((row) => (
                            <tr
                              key={row.rowNumber}
                              className={`border-b ${
                                row.status === 'valid'
                                  ? 'bg-green-50'
                                  : row.status === 'duplicate'
                                    ? 'bg-yellow-50'
                                    : 'bg-red-50'
                              }`}
                            >
                              <td className="px-3 py-2 text-slate-600">
                                {row.rowNumber}
                              </td>
                              <td className="px-3 py-2 font-medium">
                                {row.data.name}
                              </td>
                              <td className="px-3 py-2 text-slate-600">
                                {row.data.email}
                              </td>
                              <td className="px-3 py-2 text-slate-600">
                                {row.data.company}
                              </td>
                              <td className="px-3 py-2 text-center">
                                {row.status === 'valid' && (
                                  <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded">
                                    ✓ Valid
                                  </span>
                                )}
                                {row.status === 'duplicate' && (
                                  <span
                                    className="text-xs font-bold text-yellow-600 bg-yellow-100 px-2 py-1 rounded"
                                    title={row.message}
                                  >
                                    ⚠ Dup
                                  </span>
                                )}
                                {row.status === 'error' && (
                                  <span
                                    className="text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded"
                                    title={row.message}
                                  >
                                    ✗ Error
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Change File Button */}
                    <button
                      onClick={() => {
                        setCSVData([]);
                        fileInputRef.current?.click();
                      }}
                      className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                    >
                      ← Choose different file
                    </button>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-slate-50 px-8 py-4 border-t border-slate-200 flex gap-3 justify-end">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                {csvData.length > 0 && (
                  <button
                    onClick={handleConfirm}
                    disabled={validCount === 0 || isLoading}
                    className={`px-6 py-2.5 rounded-lg font-bold text-white transition-all ${
                      validCount > 0 && !isLoading
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : 'bg-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {isLoading ? 'Importing...' : `Import ${validCount} Leads`}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
