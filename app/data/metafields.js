// Metafields REALES del catálogo de Picafili.
//
// Se verificaron contra la Storefront API sondeando identifiers candidatos: de
// todo lo que pedía el fork (lumens, CRI, protection_index… del vertical de
// iluminación) NINGUNO existe en esta tienda. Los únicos con datos son:
//
//   custom.material        texto plano — "Babycotton", "Gabardina", "Silicona"
//   (shopify.material existe pero se serializa como gid y colisiona en key
//    con custom.material: no se pide)
//   shopify.color-pattern  taxonomía de color (lista de metaobjects)
//
// Pedir identifiers que no existen no rompe nada (vuelven null), pero infla la
// query y hace creer que la ficha tiene datos que nunca va a mostrar.
// La lista larga del fork quedó abajo como `legacyLightingMetafields`, sin uso:
// sirve de referencia si alguna vez se reusa este código en aquel vertical.

export const allProductMetafields = [
  {
    key: 'material',
    namespace: 'custom',
  },
  {
    key: 'color-pattern',
    namespace: 'shopify',
  },
];

export const legacyLightingMetafields = [
  {
    key: 'grouped',
    namespace: 'product',
  },
  {
    key: 'lumens',
    namespace: 'product',
  },
  {
    key: 'temperature',
    namespace: 'product',
  },
  {
    key: 'watts',
    namespace: 'product',
  },
  {
    key: 'CRI',
    namespace: 'product',
  },
  {
    key: 'Opening',
    namespace: 'product',
  },
  {
    key: 'Power',
    namespace: 'product',
  },
  {
    key: 'sku_parent_Code',
    namespace: 'product',
  },
  {
    key: 'family',
    namespace: 'product',
  },
  {
    key: 'sku',
    namespace: 'product',
  },
  {
    key: 'finishings',
    namespace: 'product',
  },
  {
    key: 'finishings_meta',
    namespace: 'product',
  },
  {
    key: 'accesories',
    namespace: 'product',
  },
  {
    key: 'dimming',
    namespace: 'product',
  },
  {
    key: 'autodesk_3d',
    namespace: 'downloads',
  },
  {
    key: 'beam_angle',
    namespace: 'product',
  },
  {
    key: 'kelvin',
    namespace: 'product',
  },
  {
    key: 'efficience',
    namespace: 'product',
  },
  {
    key: 'class',
    namespace: 'details',
  },
  {
    key: 'cut_value',
    namespace: 'details',
  },
  {
    key: 'cut_type',
    namespace: 'details',
  },
  {
    key: 'inclination_angle',
    namespace: 'details',
  },
  {
    key: 'protection_index',
    namespace: 'details',
  },
  {
    key: 'electrical',
    namespace: 'details',
  },
  {
    key: 'led',
    namespace: 'details',
  },
  {
    key: 'data_sheet',
    namespace: 'tech_docs',
  },
  {
    key: 'assembly_manual',
    namespace: 'tech_docs',
  },
  {
    key: '2d_drawing',
    namespace: 'tech_docs',
  },
  {
    key: 'photometric_curve',
    namespace: 'tech_docs',
  },
  {
    key: 'diagram',
    namespace: 'tech_docs',
  },
  {
    key: 'ldt',
    namespace: 'tech_docs',
  },
];

// metafields are:
// lumens, temperature, CRI, Opening, Power, sku_parent_Code, family, sku, photometric_curve
// diagram, finishings, accesories, dimming, autodesk_3d, efficience, class
// cut_value, cut_type, inclination_angle, protection_index

export const metafields = [
  {
    key: 'grouped',
    label: 'Grouped',
    namespace: 'product',
    type: 'boolean',
  },
  {
    key: 'lumens',
    label: 'Lumens',
    namespace: 'product',
    type: 'single-line-text',
  },
  {
    key: 'temperature',
    label: 'Temperature',
    namespace: 'product',
    type: 'single-line-text',
  },
  {
    key: 'electrical',
    label: 'Electrical',
    namespace: 'details',
    type: 'single-line-text',
  },
  {
    key: 'CRI',
    label: 'CRI',
    namespace: 'product',
    type: 'single-line-text',
  },
  {
    key: 'Opening',
    label: 'Opening',
    namespace: 'product',
    type: 'single-line-text',
  },
  {
    key: 'Power',
    label: 'Power',
    namespace: 'product',
    type: 'single-line-text',
  },
  {
    key: 'sku_parent_Code',
    label: 'SKU Parent Code',
    namespace: 'product',
    type: 'single-line-text',
  },
  {
    key: 'family',
    label: 'Family',
    namespace: 'product',
    type: 'single-line-text',
  },
  {
    key: 'sku',
    label: 'SKU',
    namespace: 'product',
    type: 'single-line-text',
  },
  {
    key: 'finishings',
    label: 'Finishings',
    namespace: 'product',
    type: 'single-line-text',
  },
  {
    key: 'accesories',
    label: 'Accesories',
    namespace: 'product',
    type: 'single-line-text',
  },
  {
    key: 'dimming',
    label: 'Dimming',
    namespace: 'product',
    type: 'single-line-text',
  },
  {
    key: 'autodesk_3d',
    label: 'Autodesk 3D',
    namespace: 'product',
    type: 'url',
  },
  {
    key: 'efficience',
    label: 'Efficience',
    namespace: 'product',
    type: 'single-line-text',
  },
  {
    key: 'class',
    label: 'Class',
    namespace: 'details',
    type: 'single-line-text',
  },
  {
    key: 'cut_value',
    label: 'Cut Value',
    namespace: 'details',
    type: 'single-line-text',
  },
  {
    key: 'cut_type',
    label: 'Cut Type',
    namespace: 'details',
    type: 'single-line-text',
  },
  {
    key: 'inclination_angle',
    label: 'Inclination Angle',
    namespace: 'products',
    type: 'single-line-text',
  },
  {
    key: 'protection_index',
    label: 'Protection Index',
    namespace: 'products',
    type: 'single-line-text',
  },
  {
    key: 'led',
    label: 'LED/Optic',
    namespace: 'details',
    type: 'single-line-text',
  },
  {
    key: 'led',
    label: 'LED/Optic',
    namespace: 'details',
    type: 'single-line-text',
  },
  {
    key: 'data_sheet',
    label: 'Data sheet',
    namespace: 'tech_docs',
    type: 'url',
  },
  {
    key: 'assembly_manual',
    label: 'Assembly manual',
    namespace: 'tech_docs',
    type: 'url',
  },
  {
    key: '2d_drawing',
    label: '2D Drawing',
    namespace: 'tech_docs',
    type: 'url',
  },
  {
    key: 'photometric_curve',
    label: 'Photometric Curve',
    namespace: 'tech_docs',
    type: 'url',
  },
  {
    key: 'diagram',
    label: 'Diagram',
    namespace: 'tech_docs',
    type: 'url',
  },
  {
    key: 'ldt',
    label: 'Ldt',
    namespace: 'tech_docs',
    type: 'url',
  },
];

export const finishingsCode = {
  'Black Smooth Matte': '#000000',
  'White Smooth Matte': '#FFFFFF',
  White: '#FFFFFF',
  'Black Textured Matte': '#1C1C1C',
  'Mocha Textured Matte': '#3B2F2F',
  'Oliva Textured Matte': '#3A4E3A',
  'Terracota Textured Matte': '#E2725B',
  'White Textured Matte': '#F5F5F5',
  'Black Smooth MatteMatte': '#000000',
};
