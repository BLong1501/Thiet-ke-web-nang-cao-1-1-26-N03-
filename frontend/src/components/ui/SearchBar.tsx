import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface SearchBarProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  large?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Tìm kiếm chiến dịch...',
  onSearch,
  large = false,
}) => {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) onSearch(query);
    else navigate(`/campaigns?search=${encodeURIComponent(query)}`);
  };

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        background: 'var(--surface-container-lowest)',
        border: `1.5px solid ${focused ? 'var(--primary-container)' : 'var(--outline-variant)'}`,
        borderRadius: 'var(--radius-full)',
        padding: large ? '4px 6px 4px 20px' : '2px 4px 2px 16px',
        transition: 'all 0.18s ease',
        boxShadow: focused ? '0 0 0 3px rgba(37,99,235,0.12), var(--shadow-sm)' : 'var(--shadow-xs)',
        gap: 12,
      }}>
        {/* Search icon */}
        <span style={{ color: focused ? 'var(--primary)' : 'var(--outline)', fontSize: large ? '1.1rem' : '0.95rem', flexShrink: 0 }}>
          🔍
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--on-surface)',
            fontSize: large ? '1rem' : '0.9rem',
            padding: large ? '10px 0' : '7px 0',
            fontFamily: 'var(--font-body)',
          }}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--outline)',
              padding: '4px',
              fontSize: '0.9rem',
            }}
          >
            ✕
          </button>
        )}
        <button
          type="submit"
          style={{
            background: 'var(--primary-container)',
            border: 'none',
            borderRadius: 'var(--radius-full)',
            color: '#fff',
            cursor: 'pointer',
            padding: large ? '10px 24px' : '7px 18px',
            fontWeight: 600,
            fontSize: large ? '0.9375rem' : '0.875rem',
            transition: 'all 0.18s ease',
            fontFamily: 'var(--font-body)',
            boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => (e.currentTarget as HTMLButtonElement).style.background = 'var(--primary)'}
          onMouseLeave={(e) => (e.currentTarget as HTMLButtonElement).style.background = 'var(--primary-container)'}
        >
          Tìm kiếm
        </button>
      </div>
    </form>
  );
};

export default SearchBar;
