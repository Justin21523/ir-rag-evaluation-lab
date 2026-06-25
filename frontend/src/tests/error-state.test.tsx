import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ErrorState } from '../components/common/ErrorState';
import { renderWithProviders } from './testUtils';

describe('ErrorState', () => {
  it('renders localized default error', () => {
    renderWithProviders(<ErrorState />);
    expect(screen.getByRole('alert')).toHaveTextContent('API 無法使用');
  });
});
