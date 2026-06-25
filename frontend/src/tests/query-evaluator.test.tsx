import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { QueryEvaluatorPage } from '../pages/QueryEvaluatorPage';
import { renderWithProviders } from './testUtils';

describe('QueryEvaluatorPage', () => {
  it('renders query input, modes, and alpha slider', () => {
    renderWithProviders(<QueryEvaluatorPage />);
    expect(screen.getByText('查詢評估器')).toBeInTheDocument();
    expect(screen.getByText('BM25')).toBeInTheDocument();
    expect(screen.getByText('Hybrid')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText(/BM25/), { target: { value: 'hybrid search' } });
    expect(screen.getByDisplayValue('hybrid search')).toBeInTheDocument();
  });
});
