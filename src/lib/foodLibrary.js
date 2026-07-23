import { supabase } from './supabase'
import { LIMITS, cleanText, clampNumber } from './validation'

function safeMacro(value) {
  return clampNumber(value || 0, LIMITS.macroGrams.min, LIMITS.macroGrams.max, 0)
}

function safeKcal(value) {
  return clampNumber(value || 0, LIMITS.calories.min, LIMITS.calories.max, 0)
}

export async function listFoods(userId) {
  const { data, error } = await supabase.from('hrani_lista').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100)
  if (error) throw error
  return (data || []).filter(f =>
    safeKcal(f.kcal) === Number(f.kcal || 0) &&
    safeMacro(f.proteini) === Number(f.proteini || 0) &&
    safeMacro(f.jaglehidrati) === Number(f.jaglehidrati || 0) &&
    safeMacro(f.masti) === Number(f.masti || 0)
  )
}

export async function upsertBarcodeFood(userId, product) {
  const label = cleanText([product.brand, product.name].filter(Boolean).join(' — ') || product.name || product.barcode, 120)
  const { error } = await supabase.from('hrani_lista').upsert({
    user_id: userId,
    naziv: label || 'Food item',
    kcal: safeKcal(product.per100g.kcal),
    proteini: safeMacro(product.per100g.proteini),
    jaglehidrati: safeMacro(product.per100g.jaglehidrati),
    masti: safeMacro(product.per100g.masti),
    per_100g: true,
    barcode: cleanText(product.barcode, 80),
  }, { onConflict: 'user_id,barcode' })
  if (error) throw error
}

export async function saveManualFood(userId, { naziv, kcal, proteini, jaglehidrati, masti }) {
  const cleanName = cleanText(naziv, 120)
  if (!cleanName) return
  const { error } = await supabase.from('hrani_lista').insert({
    user_id: userId,
    naziv: cleanName,
    kcal: safeKcal(kcal),
    proteini: safeMacro(proteini),
    jaglehidrati: safeMacro(jaglehidrati),
    masti: safeMacro(masti),
    per_100g: false,
  })
  if (error) throw error
}

export async function deleteFood(id) {
  const { error } = await supabase.from('hrani_lista').delete().eq('id', id)
  if (error) throw error
}
