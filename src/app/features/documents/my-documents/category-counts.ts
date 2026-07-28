export interface CategoryCounts {
  kyc: number;
  fica: number;
  tax: number;
  other: number;
}

export function countDocumentsByCategory(documents: Array<{ documentTypeName?: string; fileName?: string }>): CategoryCounts {
  const counts: CategoryCounts = { kyc: 0, fica: 0, tax: 0, other: 0 };

  documents.forEach((doc) => {
    const name = `${doc.documentTypeName ?? ''} ${doc.fileName ?? ''}`.toLowerCase();

    if (name.includes('kyc') || name.includes('id') || name.includes('passport') || name.includes('proof of address') || name.includes('residence') || name.includes('identity')) {
      counts.kyc += 1;
    } else if (name.includes('tax') || name.includes('vat') || name.includes('tax clearance') || name.includes('tax certificate')) {
      counts.tax += 1;
    } else if (name.includes('fica') || name.includes('incorporation') || name.includes('company') || name.includes('bank') || name.includes('registration') || name.includes('shareholder') || name.includes('trust')) {
      counts.fica += 1;
    } else {
      counts.other += 1;
    }
  });

  return counts;
}
