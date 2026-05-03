// ===== DADOS MOCKADOS - SISTEMA DE RECOMENDAÇÃO PROMO BRINDES =====

// Tipos
export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  price: number;
  minQuantity: number;
  category: Category;
  subcategory?: string;
  groups?: Category[];  // Grupos/categorias adicionais que o produto pertence
  colors: ProductColor[];
  materials: string[];
  supplier: Supplier;
  stock: number;
  stockStatus: 'in-stock' | 'low-stock' | 'out-of-stock';
  isKit: boolean;
  kitItems?: KitItem[];
  images: string[];
  video?: string;
  tags: {
    publicoAlvo: string[];
    datasComemorativas: string[];
    endomarketing: string[];
    ramo: string[];
    nicho: string[];
  };
  variations?: ProductVariation[];
  featured?: boolean;
  newArrival?: boolean;
  onSale?: boolean;
}

export interface ProductVariation {
  id: string;
  sku: string;
  color: ProductColor;
  stock: number;
  image: string;            // Imagem principal (retrocompatibilidade)
  images?: string[];        // Múltiplas fotos da variação
  videos?: string[];        // Vídeos da variação
}

export interface ProductColor {
  name: string;
  hex: string;
  group: string;
  images?: string[];        // Múltiplas fotos por cor
  videos?: string[];        // Vídeos por cor
}

export interface KitItem {
  productId: string;
  productName: string;
  quantity: number;
  sku: string;
}

export interface Category {
  id: number;
  name: string;
  parentId?: number;
  icon?: string;
}

export interface Supplier {
  id: string;
  name: string;
  logo?: string;
}

export interface Client {
  id: string;
  name: string;
  logo?: string;
  primaryColor: ProductColor;
  secondaryColors: ProductColor[];
  ramo: string;
  nicho: string;
  cnpj?: string;
  email?: string;
  phone?: string;
  address?: string;
  purchaseHistory?: PurchaseHistory[];
  totalSpent?: number;
  lastPurchase?: string;
  registeredAt?: string;
}

export interface PurchaseHistory {
  id: string;
  date: string;
  products: PurchaseItem[];
  total: number;
  status: 'completed' | 'pending' | 'cancelled';
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  color: ProductColor;
}

// Cores disponíveis
export const COLORS: ProductColor[] = [
  { name: 'Vermelho', hex: '#EF4444', group: 'VERMELHO' },
  { name: 'Azul', hex: '#3B82F6', group: 'AZUL' },
  { name: 'Verde', hex: '#22C55E', group: 'VERDE' },
  { name: 'Branco', hex: '#FFFFFF', group: 'BRANCO' },
  { name: 'Preto', hex: '#1F2937', group: 'PRETO' },
  { name: 'Laranja', hex: '#F97316', group: 'LARANJA' },
  { name: 'Amarelo', hex: '#EAB308', group: 'AMARELO' },
  { name: 'Rosa', hex: '#EC4899', group: 'ROSA' },
  { name: 'Cinza', hex: '#6B7280', group: 'CINZA' },
  { name: 'Prata', hex: '#C0C0C0', group: 'PRATA' },
  { name: 'Marrom', hex: '#78350F', group: 'MARROM' },
  { name: 'Roxo', hex: '#8B5CF6', group: 'ROXO' },
  { name: 'Dourado', hex: '#D4AF37', group: 'DOURADO' },
  { name: 'Transparente', hex: 'transparent', group: 'TRANSPARENTE' },
];

// Categorias principais de Produtos Sicoob
export const CATEGORIES: Category[] = [
  { id: 560, name: 'BRINDES SICOOB', icon: '💚' },
  { id: 1001, name: 'PAPELARIA E ESCRITÓRIO', icon: '📝' },
  { id: 1002, name: 'MATERIAIS IMPRESSOS', icon: '📄' },
  { id: 1003, name: 'UNIFORMES E VESTUÁRIO', icon: '👕' },
  { id: 1004, name: 'TECNOLOGIA E ACESSÓRIOS', icon: '💻' },
  { id: 1005, name: 'EVENTOS E CAMPANHAS', icon: '🎉' },
  { id: 1006, name: 'SINALIZAÇÃO E PDV', icon: '🚩' },
  { id: 196, name: 'ECOLOGIA E SUSTENTABILIDADE', icon: '🌿' },
  { id: 124, name: 'COPA E COZINHA', icon: '☕' },
  { id: 138, name: 'EMBALAGENS', icon: '📦' },
  { id: 202, name: 'VIAGEM E LAZER', icon: '✈️' },
  { id: 566, name: 'PERSONALIZAÇÃO ESPECIAL', icon: '✨' },
];

// Fornecedores
export const SUPPLIERS: Supplier[] = [
  { id: 'xbz', name: 'XBZ Brindes' },
  { id: 'stricker', name: 'Stricker Brasil' },
  { id: 'asia', name: 'Asia Import' },
  { id: 'somarcas', name: 'Só Marcas' },
];

// Público-alvo
export const PUBLICO_ALVO = [
  'HOMEM', 'MULHER', 'CRIANÇA', 'UNISSEX', 'MÉDICO', 'ADVOGADO',
  'ENGENHEIRO', 'CONTADOR', 'SECRETÁRIA', 'EXECUTIVO', 'PROFESSOR',
  'ENFERMEIRO', 'PRODUTOR RURAL', 'VETERINÁRIO', 'DENTISTA',
];

// Datas comemorativas
export const DATAS_COMEMORATIVAS = [
  'DIA DOS PAIS', 'DIA DAS MÃES', 'DIA DAS CRIANÇAS', 'NATAL', 'PÁSCOA',
  'ANO NOVO', 'DIA DO MÉDICO', 'DIA DO ADVOGADO', 'DIA DO ENGENHEIRO',
  'DIA DA SECRETÁRIA', 'DIA DO PROFESSOR', 'DIA DO CONTADOR',
  'DIA DO TRABALHADOR', 'DIA DA MULHER', 'DIA DO HOMEM', 'NOVEMBRO AZUL',
  'OUTUBRO ROSA', 'SETEMBRO AMARELO', 'CARNAVAL', 'FESTA JUNINA',
  'DIA DOS NAMORADOS',
];

// Endomarketing
export const ENDOMARKETING = [
  'ONBOARDING | KIT BOAS-VINDAS', 'TEMPO DE CASA | ANIVERSÁRIO EMPRESA',
  'CIPA | SIPAT', 'PREMIAÇÃO | INCENTIVO', 'RECONHECIMENTO',
  'INTEGRAÇÃO | TEAM BUILDING', 'TREINAMENTO | CAPACITAÇÃO',
  'FIM DE ANO | CONFRATERNIZAÇÃO', 'QUALIDADE DE VIDA',
  'CAMPANHA INTERNA', 'CONVENÇÃO DE VENDAS',
];

// Nichos
export const NICHOS = [
  'Agro', 'Celulose', 'Companhia Aérea', 'Educação', 'Energia', 'Financeiro',
  'Ferramentas e Ferragens', 'Holdings', 'Indústria Alimentícia',
  'Indústria Automobilística', 'Indústria Construção', 'Indústria Embalagens',
  'Indústria Eletrônicos', 'Indústria Farmacêutica', 'Indústria Química',
  'Indústria Moveleira', 'Indústria Pneus', 'Indústria Têxtil',
  'Indústria Siderúrgica', 'Logística', 'Metalúrgica', 'Mineração',
  'Petróleo', 'Saúde', 'Siderurgia', 'Saneamento', 'TI',
];

// Faixas de preço
export const FAIXAS_PRECO = [
  { label: 'Até R$ 10,00', min: 0, max: 10 },
  { label: 'R$ 10,01 a R$ 25,00', min: 10.01, max: 25 },
  { label: 'R$ 25,01 a R$ 50,00', min: 25.01, max: 50 },
  { label: 'R$ 50,01 a R$ 100,00', min: 50.01, max: 100 },
  { label: 'R$ 100,01 a R$ 200,00', min: 100.01, max: 200 },
  { label: 'Acima de R$ 200,00', min: 200.01, max: Infinity },
];

// Materiais
export const MATERIAIS = [
  'ALUMÍNIO', 'AÇO INOX', 'METAL', 'PLÁSTICO', 'PLÁSTICO RÍGIDO',
  'PLÁSTICO FLEXÍVEL', 'BAMBU', 'MADEIRA', 'VIDRO', 'CERÂMICA',
  'PORCELANA', 'TECIDO', 'ALGODÃO', 'POLIÉSTER', 'COURO',
  'COURO SINTÉTICO', 'SILICONE', 'BORRACHA', 'PAPEL', 'CORTIÇA',
];

// Produtos mockados
export const PRODUCTS: Product[] = [
  {
    id: 'prod-001',
    sku: 'SQ-700-PLAS',
    name: 'Squeeze Plástico 700ml',
    description: 'Squeeze de plástico resistente com tampa rosqueável e bico dosador. Capacidade 700ml. Ideal para academias, esportes e uso diário.',
    price: 12.90,
    minQuantity: 100,
    category: CATEGORIES.find(c => c.id === 202)!, // ESPORTES | AVENTURA | LAZER
    subcategory: 'Squeezes',
    groups: [
      CATEGORIES.find(c => c.id === 222)!, // SAÚDE | BELEZA | BEM ESTAR
      CATEGORIES.find(c => c.id === 196)!, // ECOLOGIA
    ],
    colors: [COLORS[0], COLORS[1], COLORS[2], COLORS[3], COLORS[4]],
    materials: ['PLÁSTICO'],
    supplier: SUPPLIERS[0],
    stock: 5420,
    stockStatus: 'in-stock',
    isKit: false,
    images: [
      'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400',
      'https://images.unsplash.com/photo-1523362628745-0c100150b504?w=400',
    ],
    tags: {
      publicoAlvo: ['UNISSEX', 'ESPORTISTA'],
      datasComemorativas: ['DIA DO TRABALHADOR'],
      endomarketing: ['QUALIDADE DE VIDA', 'CIPA | SIPAT'],
      ramo: ['Indústria'],
      nicho: ['Saúde'],
    },
    variations: [
      { id: 'var-001-1', sku: 'SQ-700-PLAS-PRT', color: COLORS[4], stock: 1500, image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400' },
      { id: 'var-001-2', sku: 'SQ-700-PLAS-BRC', color: COLORS[3], stock: 2300, image: 'https://images.unsplash.com/photo-1523362628745-0c100150b504?w=400' },
      { id: 'var-001-3', sku: 'SQ-700-PLAS-AZL', color: COLORS[1], stock: 800, image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400' },
      { id: 'var-001-4', sku: 'SQ-700-PLAS-VRM', color: COLORS[0], stock: 450, image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400' },
      { id: 'var-001-5', sku: 'SQ-700-PLAS-VRD', color: COLORS[2], stock: 320, image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400' },
    ],
    featured: true,
  },
  {
    id: 'prod-002',
    sku: 'CAN-MET-350',
    name: 'Caneca Metal 350ml',
    description: 'Caneca de metal com acabamento brilhante. Capacidade 350ml. Perfeita para café, chá e bebidas quentes.',
    price: 28.50,
    minQuantity: 50,
    category: CATEGORIES.find(c => c.id === 124)!, // BAR | COZINHA
    subcategory: 'Canecas',
    groups: [
      CATEGORIES.find(c => c.id === 214)!, // PAPELARIA | ESCRITÓRIO
      CATEGORIES.find(c => c.id === 226)!, // UTENSÍLIOS | DECORAÇÃO
    ],
    colors: [COLORS[3], COLORS[4], COLORS[8], COLORS[9]],
    materials: ['METAL', 'AÇO INOX'],
    supplier: SUPPLIERS[1],
    stock: 1850,
    stockStatus: 'in-stock',
    isKit: false,
    images: [
      'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400',
      'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400',
    ],
    tags: {
      publicoAlvo: ['UNISSEX', 'EXECUTIVO'],
      datasComemorativas: ['NATAL', 'DIA DO TRABALHADOR'],
      endomarketing: ['ONBOARDING | KIT BOAS-VINDAS', 'RECONHECIMENTO'],
      ramo: ['Escritório'],
      nicho: ['Financeiro', 'TI'],
    },
    newArrival: true,
  },
  {
    id: 'prod-003',
    sku: 'KIT-CHUR-10P',
    name: 'Kit Churrasco Premium 10 Peças',
    description: 'Kit completo para churrasco com 10 peças em aço inox. Inclui faca, garfo, chaira, pegador, espetos e avental em estojo de madeira.',
    price: 189.90,
    minQuantity: 20,
    category: CATEGORIES.find(c => c.id === 124)!, // BAR | COZINHA
    subcategory: 'Kit Churrasco',
    groups: [
      CATEGORIES.find(c => c.id === 210)!, // KIT GOURMET
      CATEGORIES.find(c => c.id === 192)!, // AGRO
      CATEGORIES.find(c => c.id === 126)!, // FERRAMENTAS | UTILIDADES
    ],
    colors: [COLORS[4], COLORS[10]],
    materials: ['AÇO INOX', 'MADEIRA', 'COURO'],
    supplier: SUPPLIERS[0],
    stock: 340,
    stockStatus: 'in-stock',
    isKit: true,
    kitItems: [
      { productId: 'kit-item-1', productName: 'Faca Churrasco 8"', quantity: 1, sku: 'FAC-CHUR-8' },
      { productId: 'kit-item-2', productName: 'Garfo Trinchante', quantity: 1, sku: 'GAR-TRIN' },
      { productId: 'kit-item-3', productName: 'Chaira Afiar', quantity: 1, sku: 'CHA-AFI' },
      { productId: 'kit-item-4', productName: 'Pegador Carne Inox', quantity: 1, sku: 'PEG-INX' },
      { productId: 'kit-item-5', productName: 'Espeto Inox 65cm', quantity: 4, sku: 'ESP-INX-65' },
      { productId: 'kit-item-6', productName: 'Avental Couro', quantity: 1, sku: 'AVE-COU' },
      { productId: 'kit-item-7', productName: 'Maleta Madeira', quantity: 1, sku: 'MAL-MAD' },
    ],
    images: [
      // [0] = foto principal com TODAS as cores juntas
      'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
      // demais = imagens gerais do produto
      'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=800',
    ],
    video: 'https://www.w3schools.com/html/mov_bbb.mp4', // Vídeo geral do produto
    tags: {
      publicoAlvo: ['HOMEM', 'EXECUTIVO'],
      datasComemorativas: ['DIA DOS PAIS', 'NATAL'],
      endomarketing: ['PREMIAÇÃO | INCENTIVO', 'RECONHECIMENTO'],
      ramo: ['Agropecuária'],
      nicho: ['Agro'],
    },
    featured: true,
    variations: [
      { 
        id: 'var-003-1', 
        color: COLORS[4], 
        sku: 'KIT-CHUR-10P-PRT', 
        stock: 120, 
        image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600',
        images: [
          'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600',
          'https://images.unsplash.com/photo-1558030006-450675393462?w=600',
          'https://images.unsplash.com/photo-1544025162-d76978e8e3f2?w=600',
        ],
        videos: ['https://www.w3schools.com/html/mov_bbb.mp4']
      },
      { 
        id: 'var-003-2', 
        color: COLORS[10], 
        sku: 'KIT-CHUR-10P-INX', 
        stock: 3, 
        image: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=600',
        images: [
          'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=600',
          'https://images.unsplash.com/photo-1506354666786-959d6d497f1a?w=600',
        ],
        videos: []
      },
      { 
        id: 'var-003-3', 
        color: { name: 'Madeira', hex: '#8B4513', group: 'Marrom' }, 
        sku: 'KIT-CHUR-10P-MAD', 
        stock: 0, 
        image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600',
        images: [
          'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600',
          'https://images.unsplash.com/photo-1559847844-5315695dadae?w=600',
          'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600',
        ],
        videos: ['https://www.w3schools.com/html/movie.mp4']
      },
    ],
  },
  {
    id: 'prod-004',
    sku: 'PEN-USB-32',
    name: 'Pen Drive 32GB Giratório',
    description: 'Pen drive 32GB com sistema giratório em metal. Compatível com USB 3.0. Alta velocidade de transferência.',
    price: 35.00,
    minQuantity: 50,
    category: CATEGORIES.find(c => c.id === 224)!,
    subcategory: 'Pen Drives',
    colors: [COLORS[0], COLORS[1], COLORS[2], COLORS[4], COLORS[9]],
    materials: ['METAL', 'PLÁSTICO'],
    supplier: SUPPLIERS[2],
    stock: 2800,
    stockStatus: 'in-stock',
    isKit: false,
    images: [
      'https://images.unsplash.com/photo-1597673030062-0a0f1a801a31?w=400',
      'https://images.unsplash.com/photo-1618410320928-25228d811631?w=400',
    ],
    tags: {
      publicoAlvo: ['UNISSEX', 'EXECUTIVO'],
      datasComemorativas: ['NATAL'],
      endomarketing: ['ONBOARDING | KIT BOAS-VINDAS', 'TREINAMENTO | CAPACITAÇÃO'],
      ramo: ['Tecnologia'],
      nicho: ['TI'],
    },
  },
  {
    id: 'prod-005',
    sku: 'CAM-ALG-PP',
    name: 'Camiseta Algodão Premium',
    description: 'Camiseta 100% algodão penteado, 180g/m². Corte regular, gola reforçada. Disponível em diversos tamanhos.',
    price: 42.00,
    minQuantity: 30,
    category: CATEGORIES.find(c => c.id === 220)!,
    subcategory: 'Camisetas',
    colors: [COLORS[3], COLORS[4], COLORS[1], COLORS[0], COLORS[8]],
    materials: ['ALGODÃO'],
    supplier: SUPPLIERS[3],
    stock: 4500,
    stockStatus: 'in-stock',
    isKit: false,
    images: [
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
      'https://images.unsplash.com/photo-1503341733017-1901578f9f1e?w=400',
    ],
    tags: {
      publicoAlvo: ['UNISSEX'],
      datasComemorativas: ['DIA DO TRABALHADOR'],
      endomarketing: ['ONBOARDING | KIT BOAS-VINDAS', 'CONVENÇÃO DE VENDAS'],
      ramo: ['Indústria'],
      nicho: ['Indústria Têxtil'],
    },
    onSale: true,
  },
  {
    id: 'prod-006',
    sku: 'MOC-NOT-15',
    name: 'Mochila Notebook 15"',
    description: 'Mochila executiva para notebook até 15". Compartimento acolchoado, bolsos organizadores, alças ergonômicas.',
    price: 89.90,
    minQuantity: 25,
    category: CATEGORIES.find(c => c.id === 214)!,
    subcategory: 'Mochilas',
    colors: [COLORS[4], COLORS[8], COLORS[1]],
    materials: ['POLIÉSTER', 'PLÁSTICO'],
    supplier: SUPPLIERS[0],
    stock: 680,
    stockStatus: 'in-stock',
    isKit: false,
    images: [
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400',
      'https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=400',
    ],
    tags: {
      publicoAlvo: ['UNISSEX', 'EXECUTIVO'],
      datasComemorativas: ['NATAL'],
      endomarketing: ['ONBOARDING | KIT BOAS-VINDAS', 'PREMIAÇÃO | INCENTIVO'],
      ramo: ['Tecnologia'],
      nicho: ['TI', 'Financeiro'],
    },
    featured: true,
  },
  {
    id: 'prod-007',
    sku: 'GAR-TER-500',
    name: 'Garrafa Térmica 500ml',
    description: 'Garrafa térmica de aço inox com parede dupla. Mantém bebidas quentes por 12h e frias por 24h.',
    price: 65.00,
    minQuantity: 30,
    category: CATEGORIES.find(c => c.id === 124)!,
    subcategory: 'Garrafas Térmicas',
    colors: [COLORS[4], COLORS[3], COLORS[1], COLORS[0], COLORS[2]],
    materials: ['AÇO INOX'],
    supplier: SUPPLIERS[1],
    stock: 1200,
    stockStatus: 'in-stock',
    isKit: false,
    images: [
      'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400',
      'https://images.unsplash.com/photo-1570831739435-6601aa3fa4fb?w=400',
    ],
    tags: {
      publicoAlvo: ['UNISSEX'],
      datasComemorativas: ['DIA DO TRABALHADOR', 'NATAL'],
      endomarketing: ['QUALIDADE DE VIDA', 'CIPA | SIPAT'],
      ramo: ['Escritório'],
      nicho: ['Saúde'],
    },
  },
  {
    id: 'prod-008',
    sku: 'CAD-ECO-A5',
    name: 'Caderno Ecológico A5',
    description: 'Caderno A5 com capa em papel reciclado e caneta de bambu. 80 folhas pautadas. Produto ecológico.',
    price: 18.90,
    minQuantity: 100,
    category: CATEGORIES.find(c => c.id === 196)!,
    subcategory: 'Cadernos',
    colors: [COLORS[2], COLORS[10]],
    materials: ['PAPEL', 'BAMBU'],
    supplier: SUPPLIERS[2],
    stock: 3200,
    stockStatus: 'in-stock',
    isKit: false,
    images: [
      'https://images.unsplash.com/photo-1544816155-12df9643f363?w=400',
      'https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=400',
    ],
    tags: {
      publicoAlvo: ['UNISSEX'],
      datasComemorativas: ['DIA DO MEIO AMBIENTE'],
      endomarketing: ['ONBOARDING | KIT BOAS-VINDAS'],
      ramo: ['Educação'],
      nicho: ['Educação'],
    },
    newArrival: true,
  },
  {
    id: 'prod-009',
    sku: 'BON-5P-ALG',
    name: 'Boné 5 Painéis Algodão',
    description: 'Boné 5 painéis em algodão com fechamento em velcro. Aba curva pré-formada.',
    price: 15.50,
    minQuantity: 100,
    category: CATEGORIES.find(c => c.id === 220)!,
    subcategory: 'Bonés',
    colors: COLORS.slice(0, 8),
    materials: ['ALGODÃO'],
    supplier: SUPPLIERS[3],
    stock: 5800,
    stockStatus: 'in-stock',
    isKit: false,
    images: [
      'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400',
      'https://images.unsplash.com/photo-1521369909029-2afed882baee?w=400',
    ],
    tags: {
      publicoAlvo: ['UNISSEX'],
      datasComemorativas: ['CARNAVAL', 'FESTA JUNINA'],
      endomarketing: ['CONVENÇÃO DE VENDAS', 'INTEGRAÇÃO | TEAM BUILDING'],
      ramo: ['Esportes'],
      nicho: ['Agro'],
    },
  },
  {
    id: 'prod-010',
    sku: 'POW-10K-SLM',
    name: 'Power Bank 10000mAh Slim',
    description: 'Carregador portátil 10000mAh com 2 saídas USB. Design slim e leve. Indicador LED de carga.',
    price: 75.00,
    minQuantity: 25,
    category: CATEGORIES.find(c => c.id === 224)!,
    subcategory: 'Power Banks',
    colors: [COLORS[3], COLORS[4], COLORS[1], COLORS[0]],
    materials: ['PLÁSTICO', 'METAL'],
    supplier: SUPPLIERS[2],
    stock: 890,
    stockStatus: 'in-stock',
    isKit: false,
    images: [
      'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=400',
      'https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=400',
    ],
    tags: {
      publicoAlvo: ['UNISSEX', 'EXECUTIVO'],
      datasComemorativas: ['NATAL'],
      endomarketing: ['PREMIAÇÃO | INCENTIVO', 'ONBOARDING | KIT BOAS-VINDAS'],
      ramo: ['Tecnologia'],
      nicho: ['TI'],
    },
    featured: true,
  },
  {
    id: 'prod-011',
    sku: 'UMB-AUT-PRE',
    name: 'Guarda-Chuva Automático Premium',
    description: 'Guarda-chuva automático com abertura e fechamento por botão. Estrutura reforçada, tecido impermeável.',
    price: 48.00,
    minQuantity: 50,
    category: CATEGORIES.find(c => c.id === 220)!,
    subcategory: 'Guarda-Chuvas',
    colors: [COLORS[4], COLORS[1], COLORS[0], COLORS[8]],
    materials: ['POLIÉSTER', 'METAL'],
    supplier: SUPPLIERS[1],
    stock: 420,
    stockStatus: 'low-stock',
    isKit: false,
    images: [
      'https://images.unsplash.com/photo-1534309466160-70b22cc6252c?w=400',
      'https://images.unsplash.com/photo-1517483000871-1dbf64a6e1c6?w=400',
    ],
    tags: {
      publicoAlvo: ['UNISSEX', 'EXECUTIVO'],
      datasComemorativas: [],
      endomarketing: ['ONBOARDING | KIT BOAS-VINDAS'],
      ramo: ['Escritório'],
      nicho: ['Financeiro'],
    },
  },
  {
    id: 'prod-012',
    sku: 'KIT-ESC-5P',
    name: 'Kit Escritório 5 Peças',
    description: 'Kit escritório com porta-canetas, bloco de notas, caneta, clips e borracha. Organização elegante para sua mesa.',
    price: 55.00,
    minQuantity: 30,
    category: CATEGORIES.find(c => c.id === 214)!,
    subcategory: 'Kits Escritório',
    colors: [COLORS[4], COLORS[3], COLORS[1]],
    materials: ['PLÁSTICO', 'PAPEL', 'METAL'],
    supplier: SUPPLIERS[0],
    stock: 560,
    stockStatus: 'in-stock',
    isKit: true,
    kitItems: [
      { productId: 'kit-esc-1', productName: 'Porta-Canetas', quantity: 1, sku: 'PTC-001' },
      { productId: 'kit-esc-2', productName: 'Bloco de Notas', quantity: 1, sku: 'BLN-001' },
      { productId: 'kit-esc-3', productName: 'Caneta Metal', quantity: 1, sku: 'CAN-MET' },
      { productId: 'kit-esc-4', productName: 'Porta Clips', quantity: 1, sku: 'PTC-002' },
      { productId: 'kit-esc-5', productName: 'Borracha', quantity: 1, sku: 'BOR-001' },
    ],
    images: [
      'https://images.unsplash.com/photo-1456735190827-d1262f71b8a3?w=400',
      'https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?w=400',
    ],
    tags: {
      publicoAlvo: ['UNISSEX', 'SECRETÁRIA', 'EXECUTIVO'],
      datasComemorativas: ['DIA DA SECRETÁRIA'],
      endomarketing: ['ONBOARDING | KIT BOAS-VINDAS'],
      ramo: ['Escritório'],
      nicho: ['Financeiro', 'TI'],
    },
    newArrival: true,
  },
];

// Clientes mockados com histórico de compras
export const CLIENTS: Client[] = [
  {
    id: 'cli-001',
    name: 'SICOOB COOPERATIVA',
    primaryColor: COLORS[2],
    secondaryColors: [COLORS[1], COLORS[3]],
    ramo: 'Cooperativas de Crédito',
    nicho: 'Financeiro',
    cnpj: '02.038.232/0001-64',
    email: 'compras@sicoob.com.br',
    phone: '(31) 3333-4444',
    address: 'Av. Brasil, 1500 - Centro, Belo Horizonte/MG',
    totalSpent: 45890.50,
    lastPurchase: '2024-01-10',
    registeredAt: '2022-03-15',
    purchaseHistory: [
      {
        id: 'pur-001',
        date: '2024-01-10',
        products: [
          { productId: 'prod-001', productName: 'Squeeze Plástico 700ml', quantity: 500, unitPrice: 12.90, color: COLORS[2] },
          { productId: 'prod-005', productName: 'Camiseta Algodão Premium', quantity: 200, unitPrice: 42.00, color: COLORS[3] },
        ],
        total: 14850.00,
        status: 'completed',
      },
      {
        id: 'pur-002',
        date: '2023-11-20',
        products: [
          { productId: 'prod-006', productName: 'Mochila Notebook 15"', quantity: 100, unitPrice: 89.90, color: COLORS[4] },
        ],
        total: 8990.00,
        status: 'completed',
      },
      {
        id: 'pur-003',
        date: '2023-08-05',
        products: [
          { productId: 'prod-002', productName: 'Caneca Metal 350ml', quantity: 300, unitPrice: 28.50, color: COLORS[3] },
          { productId: 'prod-004', productName: 'Pen Drive 32GB Giratório', quantity: 200, unitPrice: 35.00, color: COLORS[2] },
        ],
        total: 15550.00,
        status: 'completed',
      },
    ],
  },
  {
    id: 'cli-002',
    name: 'VALE MINERAÇÃO',
    primaryColor: COLORS[2],
    secondaryColors: [COLORS[5], COLORS[3]],
    ramo: 'Mineradoras',
    nicho: 'Mineração',
    cnpj: '33.592.510/0001-54',
    email: 'marketing@vale.com',
    phone: '(21) 3485-3000',
    address: 'Praia de Botafogo, 186 - Botafogo, Rio de Janeiro/RJ',
    totalSpent: 128450.00,
    lastPurchase: '2024-01-05',
    registeredAt: '2021-06-20',
    purchaseHistory: [
      {
        id: 'pur-004',
        date: '2024-01-05',
        products: [
          { productId: 'prod-003', productName: 'Kit Churrasco Premium 10 Peças', quantity: 150, unitPrice: 189.90, color: COLORS[4] },
          { productId: 'prod-009', productName: 'Boné 5 Painéis Algodão', quantity: 1000, unitPrice: 15.50, color: COLORS[2] },
        ],
        total: 43985.00,
        status: 'completed',
      },
      {
        id: 'pur-005',
        date: '2023-12-01',
        products: [
          { productId: 'prod-007', productName: 'Garrafa Térmica 500ml', quantity: 500, unitPrice: 65.00, color: COLORS[2] },
        ],
        total: 32500.00,
        status: 'completed',
      },
    ],
  },
  {
    id: 'cli-003',
    name: 'UNIMED SAÚDE',
    primaryColor: COLORS[2],
    secondaryColors: [COLORS[3]],
    ramo: 'Planos de Saúde',
    nicho: 'Saúde',
    cnpj: '04.547.479/0001-37',
    email: 'compras@unimed.com.br',
    phone: '(11) 3111-2222',
    address: 'Alameda Santos, 2000 - Cerqueira César, São Paulo/SP',
    totalSpent: 67320.00,
    lastPurchase: '2023-12-15',
    registeredAt: '2022-01-10',
    purchaseHistory: [
      {
        id: 'pur-006',
        date: '2023-12-15',
        products: [
          { productId: 'prod-001', productName: 'Squeeze Plástico 700ml', quantity: 1000, unitPrice: 12.90, color: COLORS[2] },
          { productId: 'prod-008', productName: 'Caderno Ecológico A5', quantity: 500, unitPrice: 18.90, color: COLORS[2] },
        ],
        total: 22350.00,
        status: 'completed',
      },
    ],
  },
  {
    id: 'cli-004',
    name: 'BANCO ITAÚ',
    primaryColor: COLORS[5],
    secondaryColors: [COLORS[1], COLORS[3]],
    ramo: 'Bancos Comerciais e Múltiplos',
    nicho: 'Financeiro',
    cnpj: '60.701.190/0001-04',
    email: 'brindes@itau.com.br',
    phone: '(11) 4004-4828',
    address: 'Praça Alfredo Egydio de Souza Aranha, 100 - Jabaquara, São Paulo/SP',
    totalSpent: 215780.00,
    lastPurchase: '2024-01-12',
    registeredAt: '2020-08-05',
    purchaseHistory: [
      {
        id: 'pur-007',
        date: '2024-01-12',
        products: [
          { productId: 'prod-010', productName: 'Power Bank 10000mAh Slim', quantity: 500, unitPrice: 75.00, color: COLORS[5] },
          { productId: 'prod-006', productName: 'Mochila Notebook 15"', quantity: 300, unitPrice: 89.90, color: COLORS[1] },
        ],
        total: 64470.00,
        status: 'completed',
      },
      {
        id: 'pur-008',
        date: '2023-10-20',
        products: [
          { productId: 'prod-005', productName: 'Camiseta Algodão Premium', quantity: 2000, unitPrice: 42.00, color: COLORS[5] },
        ],
        total: 84000.00,
        status: 'completed',
      },
    ],
  },
  {
    id: 'cli-005',
    name: 'PETROBRAS',
    primaryColor: COLORS[2],
    secondaryColors: [COLORS[6], COLORS[3]],
    ramo: 'Petróleo',
    nicho: 'Petróleo',
    cnpj: '33.000.167/0001-01',
    email: 'comunicacao@petrobras.com.br',
    phone: '(21) 3224-4477',
    address: 'Av. República do Chile, 65 - Centro, Rio de Janeiro/RJ',
    totalSpent: 342150.00,
    lastPurchase: '2024-01-08',
    registeredAt: '2019-11-12',
    purchaseHistory: [
      {
        id: 'pur-009',
        date: '2024-01-08',
        products: [
          { productId: 'prod-003', productName: 'Kit Churrasco Premium 10 Peças', quantity: 200, unitPrice: 189.90, color: COLORS[4] },
          { productId: 'prod-007', productName: 'Garrafa Térmica 500ml', quantity: 800, unitPrice: 65.00, color: COLORS[2] },
          { productId: 'prod-009', productName: 'Boné 5 Painéis Algodão', quantity: 2000, unitPrice: 15.50, color: COLORS[6] },
        ],
        total: 120980.00,
        status: 'completed',
      },
    ],
  },
];
