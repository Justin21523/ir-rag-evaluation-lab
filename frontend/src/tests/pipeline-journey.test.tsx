import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PipelineJourneyPage } from '../pages/PipelineJourneyPage';
import { renderWithProviders } from './testUtils';

describe('PipelineJourneyPage', () => {
  it('renders the upload panel and guided pipeline tabs in zh-TW', () => {
    renderWithProviders(<PipelineJourneyPage />);
    expect(screen.getByText('資料上傳區')).toBeInTheDocument();
    expect(screen.getByText('逐步 pipeline tabs')).toBeInTheDocument();
    expect(screen.getAllByText('Raw JSONL 標準化').length).toBeGreaterThan(0);
    expect(screen.getByText('上傳並建立資料集')).toBeInTheDocument();
  });
});
