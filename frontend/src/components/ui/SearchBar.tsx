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
        background: focused ? 'rgba(124,58,237,0.08)' : 'rgba(26,26,46,0.7)',
        backdropFilter: 'blur(16px)',
        border: `1.5px solid ${focused ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.1)'}`,
        borderRadius: 'var(--radius-full)',
        padding: large ? '4px 6px 4px 20px' : '2px 4px 2px 16px',
        transition: 'all 0.25s ease',
        boxShadow: focused ? '0 0 0 3px rgba(124,58,237,0.12), 0 4px 20px rgba(0,0,0,0.3)' : '0 2px 10px rgba(0,0,0,0.2)',
        gap: 12,
      }}>
        {/* Search icon */}
        <span style={{ color: focused ? 'var(--primary-400)' : 'var(--text-muted)', fontSize: large ? '1.2rem' : '1rem', flexShrink: 0 }}>
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
            color: 'var(--text-primary)',
            fontSize: large ? '1.05rem' : '0.9rem',
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
              color: 'var(--text-muted)',
              padding: '4px',
              fontSize: '1rem',
            }}
          >
            ✕
          </button>
        )}
        <button
          type="submit"
          style={{
            background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
            border: 'none',
            borderRadius: 'var(--radius-full)',
            color: '#fff',
            cursor: 'pointer',
            padding: large ? '10px 24px' : '7px 16px',
            fontWeight: 600,
            fontSize: large ? '0.95rem' : '0.85rem',
            transition: 'all 0.2s ease',
            fontFamily: 'var(--font-body)',
            boxShadow: '0 2px 12px rgba(124,58,237,0.35)',
            whiteSpace: 'nowrap',
          }}
        >
          Tìm kiếm
        </button>
      </div>
    </form>
  );
};

export default SearchBar;
