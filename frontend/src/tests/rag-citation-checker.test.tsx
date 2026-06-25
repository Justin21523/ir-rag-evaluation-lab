import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RagCitationCheckerPage } from '../pages/RagCitationCheckerPage';
import { renderWithProviders } from './testUtils';

describe('RagCitationCheckerPage', () => {
  it('renders citation checker query panel', () => {
    renderWithProviders(<RagCitationCheckerPage />);
    expect(screen.getByText('RAG 引用檢查')).toBeInTheDocument();
    expect(screen.getByText('搜尋')).toBeInTheDocument();
  });
});
