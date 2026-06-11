import type { Metadata } from 'next'

// Unlisted demo route: not linked from the site, excluded from indexing.
export const metadata: Metadata = {
  title: 'Simulação — Operação de portfólio de flexibilidade · Data Joule',
  description:
    'Demonstração simulada da operação de um portfólio de resposta da demanda: despacho, verificação em tempo real e rateio.',
  robots: { index: false, follow: false },
}

export default function SimulacaoLayout({ children }: { children: React.ReactNode }) {
  return children
}
