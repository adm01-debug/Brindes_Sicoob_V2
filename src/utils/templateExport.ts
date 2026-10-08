import { type QuoteTemplate } from "@/hooks/useQuoteTemplates";

export interface ExportedTemplate {
  version: string;
  exportedAt: string;
  templates: Omit<QuoteTemplate, 'id' | 'seller_id' | 'created_at' | 'updated_at'>[];
}

/**
 * Exports templates to a downloadable JSON file
 */
export function exportTemplatesToJson(
  templates: QuoteTemplate[], 
  filename?: string
): void {
  const exportData: ExportedTemplate = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    templates: templates.map(template => ({
      name: template.name,
      description: template.description,
      is_default: template.is_default,
      is_public: template.is_public,
      created_by: template.created_by,
      category: template.category,
      items_data: template.items_data,
      discount_percent: template.discount_percent,
      discount_amount: template.discount_amount,
      notes: template.notes,
      internal_notes: template.internal_notes,
      payment_terms: template.payment_terms,
      delivery_time: template.delivery_time,
      validity_days: template.validity_days,
    })),
  };

  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const defaultFilename = filename || 
    `templates-export-${new Date().toISOString().split('T')[0]}.json`;

  const link = document.createElement("a");
  link.href = url;
  link.download = defaultFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports a single template to JSON
 */
export function exportSingleTemplate(template: QuoteTemplate): void {
  const sanitizedName = template.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  
  exportTemplatesToJson([template], `template-${sanitizedName}.json`);
}

/**
 * Validates imported template data
 */
export function validateImportedTemplates(data: unknown): ExportedTemplate | null {
  if (!data || typeof data !== 'object') return null;
  
  const obj = data as Record<string, unknown>;
  
  if (!obj.version || !obj.templates || !Array.isArray(obj.templates)) {
    return null;
  }

  if (!obj.templates.every(isValidImportedTemplate)) return null;

  return data as ExportedTemplate;
}

function isValidImportedTemplate(template: unknown): boolean {
  if (typeof template !== 'object' || !template) return false;
  const name = (template as Record<string, unknown>).name;
  return typeof name === 'string' && name.length > 0;
}

/**
 * Reads a JSON file and parses template data
 */
export function readTemplateFile(file: File): Promise<ExportedTemplate | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        const validated = validateImportedTemplates(data);
        resolve(validated);
      } catch {
        resolve(null);
      }
    };
    
    reader.onerror = () => resolve(null);
    reader.readAsText(file);
  });
}
