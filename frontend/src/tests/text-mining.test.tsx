import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TextMiningPage } from '../pages/TextMiningPage';
import { renderWithProviders } from './testUtils';

vi.mock('echarts-for-react', () => ({
  default: () => <div data-testid="echart" />,
}));

vi.mock('../hooks/useDatasetSelection', () => ({
  useDatasetSelection: () => ({ datasetId: 'sample_ir_demo_100', setDatasetId: vi.fn() }),
}));

vi.mock('../hooks/useTextMining', () => ({
  useRunTextMining: () => ({ mutate: vi.fn(), isPending: false }),
  useTextMiningSummary: () => ({
    isLoading: false,
    isError: false,
    data: { dataset_id: 'sample_ir_demo_100', run_id: 'text_1', available: true, document_count: 100, term_count: 20, edge_count: 30, rule_count: 5, summary: { communities: 3, collocations: 8, sankey_links: 4, top_terms: ['bm25', 'rag'] }, finished_at: '2026-01-01' },
  }),
  useTextTerms: () => ({ isLoading: false, isError: false, data: { dataset_id: 'sample_ir_demo_100', run_id: 'text_1', terms: [{ term: 'bm25', doc_count: 3, term_count: 10, tfidf: 2, community_id: 1, centrality: 0.3 }] } }),
  useTextNetwork: () => ({ isLoading: false, isError: false, data: { dataset_id: 'sample_ir_demo_100', run_id: 'text_1', nodes: [{ id: 'bm25', name: 'bm25', value: 10, degree: 1, weighted_degree: 3, pagerank: 0.1, community_id: 1 }], edges: [] } }),
  useTextCooccurrence: () => ({ isLoading: false, isError: false, data: { dataset_id: 'sample_ir_demo_100', run_id: 'text_1', edges: [{ source: 'bm25', target: 'rag', weight: 3, pmi: 1, jaccard: 0.2 }] } }),
  useTextCollocations: () => ({ isLoading: false, isError: false, data: { dataset_id: 'sample_ir_demo_100', run_id: 'text_1', collocations: [{ phrase: 'retrieval evaluation', n: 2, count: 3, pmi: 1.5, score: 2 }] } }),
  useTextAssociationRules: () => ({ isLoading: false, isError: false, data: { dataset_id: 'sample_ir_demo_100', run_id: 'text_1', rules: [{ antecedent: ['bm25'], consequent: ['rag'], support: 0.2, confidence: 0.8, lift: 1.5, conviction: 2 }] } }),
  useTextSankey: () => ({ isLoading: false, isError: false, data: { dataset_id: 'sample_ir_demo_100', run_id: 'text_1', nodes: [{ name: 'category:demo' }, { name: 'community:1' }], links: [{ source: 'category:demo', target: 'community:1', value: 3, stage: 'category_community' }] } }),
}));

describe('TextMiningPage', () => {
  it('renders text mining dashboard charts and rule table', () => {
    renderWithProviders(<TextMiningPage />);
    expect(screen.getByText('文本探勘')).toBeInTheDocument();
    expect(screen.getByText('共現網路工作台')).toBeInTheDocument();
    expect(screen.getByText('邊權重門檻: 1')).toBeInTheDocument();
    expect(screen.getByText('節點內容')).toBeInTheDocument();
    expect(screen.getByText('語料到失敗原因 Sankey')).toBeInTheDocument();
    expect(screen.getByText('bm25')).toBeInTheDocument();
    expect(screen.getAllByTestId('echart').length).toBeGreaterThan(0);
  });
});
