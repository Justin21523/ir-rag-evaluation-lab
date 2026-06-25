import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RetrievalComparisonPage } from '../pages/RetrievalComparisonPage';
import { renderWithProviders } from './testUtils';

describe('RetrievalComparisonPage', () => {
  it('renders comparison controls', () => {
    renderWithProviders(<RetrievalComparisonPage />);
    expect(screen.getByText('檢索比較')).toBeInTheDocument();
    expect(screen.getByText(/BM25/)).toBeInTheDocument();
  });
});
