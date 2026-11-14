const BAR_WEIGHT = 20
const AVAILABLE_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25]

/** Décompose un poids total en plaques à charger de chaque côté d'une barre olympique de 20kg. */
export function platesPerSide(totalKg: number): number[] {
  let remaining = (totalKg - BAR_WEIGHT) / 2
  if (remaining <= 0) return []
  const result: number[] = []
  for (const plate of AVAILABLE_PLATES) {
    while (remaining + 1e-9 >= plate) {
      result.push(plate)
      remaining -= plate
    }
  }
  return result
}

export function formatPlates(totalKg: number): string | null {
  if (totalKg < BAR_WEIGHT) return null
  const plates = platesPerSide(totalKg)
  if (plates.length === 0) return `Barre seule (${BAR_WEIGHT} kg)`
  return `${plates.map((p) => (Number.isInteger(p) ? p : p.toFixed(2).replace(/0$/, ''))).join(' + ')} par côté`
}
