
import fs from 'fs';

const externalTables = [
  'products', 'categories', 'suppliers', 'tags', 'product_images', 'product_videos',
  'product_variants', 'product_materials', 'product_tags', 'product_categories',
  'product_category_assignments', 'product_suppliers', 'product_print_areas',
  'product_kit_components', 'product_attributes', 'color_groups', 'color_nuances',
  'color_equivalences', 'color_variations', 'supplier_colors', 'material_groups',
  'material_types', 'material_variations', 'supplier_materials', 'supplier_attribute_definitions',
  'supplier_product_attributes', 'category_attributes', 'price_lists', 'variant_cost_tiers',
  'variant_sale_prices', 'variation_types', 'variation_values', 'stock_movements',
  'variant_supplier_sources', 'supplier_branches', 'collections', 'collection_products',
  'ramo_atividade', 'ramo_atividade_filho', 'produto_ramo_atividade', 'personalization_techniques',
  'customization_price_tables', 'customization_price_tiers', 'tecnicas_gravacao',
  'print_area_techniques', 'tabela_preco_gravacao_oficial', 'tabela_preco_gravacao_oficial_faixa',
  'organization_markup_customization', 'category_area_techniques', 'tabela_preco_fornecedores_gravacao',
  'price_history', 'stock_snapshots', 'stock_daily_summary', 'product_groups',
  'product_group_members', 'product_relationships', 'bitrix_clients', 'client_contacts',
  'client_notes', 'organizations', 'user_organizations', 'business_sectors', 'bitrix_deals', 'bitrix_sync_logs',
  'v_products_with_techniques', 'v_products_with_stock', 'v_products_with_tags', 'v_products_min_price',
  'v_products_without_images', 'v_products_without_videos', 'v_products_missing_primary_image',
  'v_product_print_areas_complete', 'v_product_images_cdn', 'v_product_videos_cdn',
  'v_product_attributes_formatted', 'v_kit_with_components', 'v_kit_component_print_areas',
  'v_customization_price_summary', 'v_variant_pricing_complete', 'v_technique_stats',
  'v_techniques_stricker_mapping', 'v_media_stats', 'v_n8n_sync_summary', 'v_n8n_sync_errors',
  'v_n8n_sync_success_recent', 'mv_product_compositions', 'mv_material_group_stats',
  'materials_complete', 'products_with_materials', 'categories_tree_visual',
  'mv_stock_velocity', 'mv_product_intelligence', 'v_commemorative_dates_with_colors'
];

const publicTables = fs.readFileSync('/tmp/tables.txt', 'utf8')
  .split('\n')
  .map(t => t.trim())
  .filter(t => t.length > 0);

const publicViews = ['v_sicoob_hierarchy', 'v_full_scope_grants', 'v_sicoob_budget_audit'];

const allKnown = new Set([...externalTables, ...publicTables, ...publicViews]);

// Add some known auth tables/schemas that might be accessed
allKnown.add('users'); 
allKnown.add('audit_log');

const findings = fs.readFileSync('/tmp/extracted_refs.txt', 'utf8')
  .split('\n')
  .filter(line => line.includes(':'))
  .map(line => {
    const [file, table] = line.split(':');
    return { file, table: table.trim() };
  });

const missing = findings.filter(f => !allKnown.has(f.table));

console.log('--- MISSING TABLES DETECTED ---');
missing.forEach(m => {
  console.log(`${m.file}: ${m.table}`);
});
