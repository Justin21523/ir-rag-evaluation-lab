import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EvaluationAnalyticsPage } from '../pages/EvaluationAnalyticsPage';
import { renderWithProviders } from './testUtils';

vi.mock('echarts-for-react', () => ({
  default: () => <div data-testid="echart" />,
}));

vi.mock('../hooks/useDatasetSelection', () => ({
  useDatasetSelection: () => ({ datasetId: 'sample_default', setDatasetId: vi.fn() }),
}));

vi.mock('../hooks/useAnalytics', () => ({
  useAnalyticsOverview: () => ({
    isLoading: false,
    isError: false,
    data: {
      dataset_id: 'sample_default',
      experiment_ids: ['exp_1', 'exp_2'],
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
  useCorrelations: () => ({
    isLoading: false,
    isError: false,
    data: {
      dataset_id: 'sample_default',
      recall_latency: [{ retriever_name: 'bm25', query_id: 'q1', recall: 1, latency_ms: 3 }],
      ndcg_zero_result: [{ retriever_name: 'bm25', ndcg: 0.9, zero_result_rate: 0 }],
      query_length_failure: [{ retriever_name: 'bm25', query_id: 'q1', query_length: 3, failed: 1 }],
      label_count_recall: [{ retriever_name: 'bm25', query_id: 'q1', label_count: 1, recall: 1 }],
    },
  }),
  useInsights: () => ({
    isLoading: false,
    isError: false,
    data: {
      dataset_id: 'sample_default',
      cards: [{ kind: 'best_retriever', title: 'Best retriever', value: 'bm25', details: {} }],
      dense_beats_bm25_queries: [],
    },
  }),
  useMetricMatrix: () => ({
    isLoading: false,
    isError: false,
    data: {
      dataset_id: 'sample_default',
      retrievers: ['bm25', 'dense'],
      metrics: ['recall@10', 'ndcg@10', 'mrr', 'latency_ms', 'zero_result_rate'],
      rows: [
        { experiment_id: 'exp_1', retriever_name: 'bm25', 'recall@10': 1, 'ndcg@10': 0.9, mrr: 1, latency_ms: 3, zero_result_rate: 0 },
        { experiment_id: 'exp_2', retriever_name: 'dense', 'recall@10': 0.8, 'ndcg@10': 0.7, mrr: 0.8, latency_ms: 6, zero_result_rate: 0.1 },
      ],
    },
  }),
  useFailureHeatmap: () => ({
    isLoading: false,
    isError: false,
    data: {
      dataset_id: 'sample_default',
      rows: [
        { query_id: 'q1', query: 'query', retriever_name: 'bm25', recall: 0, ndcg: 0, first_relevant_rank: null, bad_case_type: 'zero_result', difficulty_label: 'hard', latency_ms: 3 },
      ],
    },
  }),
  useRankMovement: () => ({
    isLoading: false,
    isError: false,
    data: {
      dataset_id: 'sample_default',
      rows: [
        { query_id: 'q1', query: 'query', retriever_name: 'bm25', first_relevant_rank: 1, recall: 1, ndcg: 0.9, latency_ms: 3 },
        { query_id: 'q1', query: 'query', retriever_name: 'dense', first_relevant_rank: 3, recall: 0.5, ndcg: 0.5, latency_ms: 6 },
      ],
    },
  }),
  useRetrieverBattle: () => ({
    isLoading: false,
    isError: false,
    data: {
      dataset_id: 'sample_default',
      pairs: [
        {
          left_experiment_id: 'exp_1',
          right_experiment_id: 'exp_2',
          left_retriever: 'bm25',
          right_retriever: 'dense',
          wins: 1,
          losses: 0,
          ties: 0,
          avg_recall_delta: 0.2,
          avg_ndcg_delta: 0.1,
          avg_latency_delta_ms: -1,
        },
      ],
    },
  }),
  usePairwiseComparison: () => ({
    isLoading: false,
    isError: false,
    data: {
      dataset_id: 'sample_default',
      left: { experiment_id: 'exp_1', retriever_name: 'bm25', name: 'bm25' },
      right: { experiment_id: 'exp_2', retriever_name: 'dense', name: 'dense' },
      summary: { wins: 1, losses: 0, ties: 0, avg_recall_delta: 0.2, avg_ndcg_delta: 0.1, avg_latency_delta_ms: -1 },
      hybrid_summary: { left_is_hybrid: false, right_is_hybrid: false, hybrid_uplift_queries: 0 },
      queries: [{ query_id: 'q1', query: 'query', outcome: 'win', recall_delta: 0.2, ndcg_delta: 0.1, latency_delta_ms: -1, rank_delta: -1, left_only_relevant_doc_ids: [], right_only_relevant_doc_ids: [], left: {}, right: {} }],
    },
  }),
  useQueryDiagnostics: () => ({ isLoading: false, isError: false, data: undefined }),
}));

vi.mock('../hooks/useExperiments', () => ({
  useExperiments: () => ({
    data: [
      { experiment_id: 'exp_1', dataset_id: 'sample_default', retriever_name: 'bm25', name: 'bm25', status: 'completed', config_json: '{}' },
      { experiment_id: 'exp_2', dataset_id: 'sample_default', retriever_name: 'dense', name: 'dense', status: 'completed', config_json: '{}' },
    ],
  }),
  useEvaluationSuites: () => ({
    data: [{ suite_id: 'suite_1', dataset_id: 'sample_default', name: 'Test suite', status: 'completed', config: {}, summary: {}, started_at: '2026-01-01', finished_at: '2026-01-01' }],
  }),
}));

describe('EvaluationAnalyticsPage', () => {
  it('renders analytics charts and per-query table', () => {
    renderWithProviders(<EvaluationAnalyticsPage />);
    expect(screen.getByText('評估分析')).toBeInTheDocument();
    expect(screen.getByText('檢索器排行榜')).toBeInTheDocument();
    expect(screen.getByText('兩兩檢索器比較')).toBeInTheDocument();
    expect(screen.getByText('逐查詢失敗分析表')).toBeInTheDocument();
    expect(screen.getAllByText('q1').length).toBeGreaterThan(0);
  });
});
