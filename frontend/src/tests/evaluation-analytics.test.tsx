import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EvaluationAnalyticsPage } from '../pages/EvaluationAnalyticsPage';
import { renderWithProviders } from './testUtils';

vi.mock('../hooks/useDatasetSelection', () => ({
  useDatasetSelection: () => ({ datasetId: 'sample_default', setDatasetId: vi.fn() }),
}));

vi.mock('../hooks/useAnalytics', () => ({
  useAnalyticsOverview: () => ({
    isLoading: false,
    isError: false,
    data: {
      dataset_id: 'sample_default',
      leaderboard: [{ experiment_id: 'exp_1', retriever_name: 'bm25', 'recall@10': 1, 'ndcg@10': 0.9, mrr: 1, latency_ms: 3, zero_result_rate: 0 }],
      curves: {
        recall: [{ retriever_name: 'bm25', k: 10, value: 1 }],
        ndcg: [{ retriever_name: 'bm25', k: 10, value: 0.9 }],
        precision: [{ retriever_name: 'bm25', k: 10, value: 0.2 }],
      },
      difficulty: [{ difficulty_label: 'easy', query_count: 3 }],
      bad_cases: [{ case_type: 'none', count: 3 }],
      rank_histogram: [{ rank: 1, count: 3 }],
      latency_recall: [{ retriever_name: 'bm25', query_id: 'q1', latency_ms: 3, recall: 1 }],
    },
  }),
  useAnalyticsQueryMetrics: () => ({
    isLoading: false,
    isError: false,
    data: [{ experiment_id: 'exp_1', retriever_name: 'bm25', query_id: 'q1', k: 10, recall: 0, ndcg: 0, latency_ms: 3, bad_case_type: 'zero_result' }],
  }),
  useDatasetProfile: () => ({
    isLoading: false,
    isError: false,
    data: {
      dataset_id: 'sample_default',
      document_lengths: [{ bucket: 10, count: 2 }],
      query_lengths: [{ bucket: 10, count: 1 }],
      metadata_treemap: [{ name: 'demo', value: 2 }],
      year_distribution: [],
      label_density: [{ bucket: 1, count: 1 }],
    },
  }),
}));

describe('EvaluationAnalyticsPage', () => {
  it('renders analytics charts and per-query table', () => {
    renderWithProviders(<EvaluationAnalyticsPage />);
    expect(screen.getByText('評估分析')).toBeInTheDocument();
    expect(screen.getByText('檢索器排行榜')).toBeInTheDocument();
    expect(screen.getByText('逐查詢失敗分析表')).toBeInTheDocument();
    expect(screen.getByText('q1')).toBeInTheDocument();
  });
});
