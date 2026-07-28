import { describe, expect, it } from 'vitest';
import { countDocumentsByCategory } from './category-counts';

describe('countDocumentsByCategory', () => {
  it('groups real uploaded document types into KYC, FICA, Tax, and Other buckets', () => {
    const result = countDocumentsByCategory([
      { documentTypeName: 'Proof of Identity', fileName: 'id.pdf' },
      { documentTypeName: 'Proof of Address', fileName: 'address.pdf' },
      { documentTypeName: 'Company Registration', fileName: 'registration.pdf' },
      { documentTypeName: 'Tax Clearance Certificate', fileName: 'tax.pdf' },
      { documentTypeName: 'Bank Statement', fileName: 'bank.pdf' },
    ]);

    expect(result).toEqual({
      kyc: 2,
      fica: 2,
      tax: 1,
      other: 0,
    });
  });

  it('falls back to the file name when document type is missing', () => {
    const result = countDocumentsByCategory([
      { fileName: 'passport.jpg' },
      { fileName: 'vat_certificate.pdf' },
      { fileName: 'notes.txt' },
    ]);

    expect(result).toEqual({
      kyc: 1,
      fica: 0,
      tax: 1,
      other: 1,
    });
  });
});
