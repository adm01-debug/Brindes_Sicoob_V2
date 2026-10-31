interface AutoTableState {
  lastAutoTable?: {
    finalY?: number;
  };
}

/** Lê a posição final exposta em runtime pelo plugin jspdf-autotable. */
export function getAutoTableFinalY(document: unknown, fallback: number): number {
  const finalY = (document as AutoTableState).lastAutoTable?.finalY;
  return typeof finalY === 'number' ? finalY : fallback;
}
