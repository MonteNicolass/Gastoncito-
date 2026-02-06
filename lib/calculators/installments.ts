export interface InstallmentResult {
  presentValue: number
  totalNominal: number
  monthlyRate: number
  contado: number | null
  differenceVsCash: number | null
  differencePercent: number | null
  label: 'cuotas_mejor' | 'contado_mejor' | 'similar' | null
}

export function calculateInstallments(
  cuotaValue: number,
  numCuotas: number,
  inflacionAnual: number,
  precioContado?: number,
): InstallmentResult {
  // Monthly inflation rate: i_m = (1 + i_anual)^(1/12) - 1
  const iAnual = inflacionAnual / 100
  const iMensual = Math.pow(1 + iAnual, 1 / 12) - 1

  // Present value: PV = Σ_{k=1..n} cuota / (1 + i_m)^k
  let presentValue = 0
  for (let k = 1; k <= numCuotas; k++) {
    presentValue += cuotaValue / Math.pow(1 + iMensual, k)
  }
  presentValue = Math.round(presentValue)

  const totalNominal = Math.round(cuotaValue * numCuotas)

  const contado = precioContado && precioContado > 0 ? precioContado : null
  let differenceVsCash: number | null = null
  let differencePercent: number | null = null
  let label: InstallmentResult['label'] = null

  if (contado !== null) {
    differenceVsCash = Math.round(presentValue - contado)
    differencePercent = Math.round(((presentValue - contado) / contado) * 100)

    if (Math.abs(differencePercent) <= 3) {
      label = 'similar'
    } else if (presentValue < contado) {
      label = 'cuotas_mejor'
    } else {
      label = 'contado_mejor'
    }
  }

  return {
    presentValue,
    totalNominal,
    monthlyRate: Math.round(iMensual * 10000) / 100,
    contado,
    differenceVsCash,
    differencePercent,
    label,
  }
}
