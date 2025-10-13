import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import LoadingSpinner from '../LoadingSpinner'

describe('LoadingSpinner', () => {
  it('renders with default props', () => {
    render(<LoadingSpinner />)
    
    expect(screen.getByText('Carregando...')).toBeInTheDocument()
    expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument()
  })

  it('renders with custom text', () => {
    render(<LoadingSpinner text="Aguarde..." />)
    
    expect(screen.getByText('Aguarde...')).toBeInTheDocument()
  })

  it('renders with different sizes', () => {
    const { rerender } = render(<LoadingSpinner size="sm" />)
    const icon = screen.getByRole('status', { hidden: true }).querySelector('svg')
    expect(icon).toHaveClass('h-4', 'w-4')

    rerender(<LoadingSpinner size="md" />)
    const iconMd = screen.getByRole('status', { hidden: true }).querySelector('svg')
    expect(iconMd).toHaveClass('h-6', 'w-6')

    rerender(<LoadingSpinner size="lg" />)
    const iconLg = screen.getByRole('status', { hidden: true }).querySelector('svg')
    expect(iconLg).toHaveClass('h-8', 'w-8')
  })

  it('applies custom className', () => {
    render(<LoadingSpinner className="custom-class" />)
    
    expect(screen.getByRole('status', { hidden: true })).toHaveClass('custom-class')
  })
})
