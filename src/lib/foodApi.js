// Пребарување производи по бар-код преку Open Food Facts (бесплатна, отворена база).
// docs: https://world.openfoodfacts.org/data

export async function lookupBarcode(code) {
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json`)
  if (!res.ok) throw new Error('network')
  const data = await res.json()

  if (data.status !== 1 || !data.product) return null

  const p = data.product
  const n = p.nutriments || {}

  // Вредностите во Open Food Facts се секогаш нормализирани на 100g/100ml
  return {
    barcode: code,
    name: p.product_name || p.product_name_en || p.generic_name || null,
    brand: p.brands || null,
    imageUrl: p.image_front_small_url || p.image_small_url || null,
    per100g: {
      kcal: round1(n['energy-kcal_100g']),
      proteini: round1(n['proteins_100g']),
      jaglehidrati: round1(n['carbohydrates_100g']),
      masti: round1(n['fat_100g']),
    },
    servingSize: p.serving_size || null,
  }
}

function round1(v) {
  if (v === undefined || v === null || Number.isNaN(Number(v))) return 0
  return Math.round(Number(v) * 10) / 10
}

// Пресметај ги вредностите за внесена количина (во грамови) врз основа на вредностите на 100g
export function scaleToGrams(per100g, grams) {
  const factor = (Number(grams) || 0) / 100
  return {
    kcal: Math.round((per100g.kcal || 0) * factor),
    proteini: Math.round((per100g.proteini || 0) * factor * 10) / 10,
    jaglehidrati: Math.round((per100g.jaglehidrati || 0) * factor * 10) / 10,
    masti: Math.round((per100g.masti || 0) * factor * 10) / 10,
  }
}
