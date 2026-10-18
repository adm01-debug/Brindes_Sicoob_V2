import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const persistenceWriters = [
  'src/services/OrderService.ts',
  'src/lib/mockup-storage.ts',
  'src/components/mockup/approval/OffscreenLayoutCapture.tsx',
  'src/components/mockup/ArtFileUpload.tsx',
  'src/components/admin/products/new-supplier/useNewSupplierForm.ts',
  'src/components/admin/suppliers-manager/useSuppliersManager.ts',
  'src/components/admin/products/video-gallery/useProductVideoGallery.ts',
  'src/components/admin/products/image-gallery/useProductImageGallery.ts',
];

describe('contrato de persistência do Storage privado', () => {
  it.each(persistenceWriters)('%s não persiste URL pública ou assinatura nova', (file) => {
    const source = readFileSync(file, 'utf8');
    expect(source).not.toContain('.getPublicUrl(');
    expect(source).toContain('createPrivateStorageReference');
  });

  it.each([
    'src/pages/admin/AdminProductFormPage.tsx',
    'src/hooks/mockup/mockupGenerationService.ts',
  ])('%s recanonicaliza valores temporários antes de salvar', (file) => {
    expect(readFileSync(file, 'utf8')).toContain('canonicalPrivateStorageValue');
  });

  it('a função de upload seguro devolve referência estável em vez de URL pública', () => {
    const source = readFileSync('supabase/functions/secure-upload/index.ts', 'utf8');
    expect(source).not.toContain('.getPublicUrl(');
    expect(source).toContain('supabase-storage://${bucket}/');
  });

  it('o upload de área de personalização renderiza e remove pela referência canônica', () => {
    const source = readFileSync('src/components/admin/ImageUploadButton.tsx', 'utf8');
    expect(source).toContain('PrivateStorageImage');
    expect(source).toContain('privateStoragePathFromUrl');
  });
});
