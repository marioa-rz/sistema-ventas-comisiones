import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./public-navbar.tsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');

describe('PublicNavbar', () => {
  it('dedicates the mobile navigation row to search while it is open', () => {
    expect(source).toContain("isSearchVisible ? 'hidden sm:flex' : 'flex'");
    expect(source).toContain("isSearchVisible ? 'flex-1' : ''");
    expect(source).toContain("isSearchVisible ? 'hidden sm:inline-flex' : 'inline-flex'");
    expect(source).toContain('role="search"');
    expect(source).not.toContain('w-48 sm:w-64 md:w-80');
  });

  it('keeps the mobile search controls accessible', () => {
    expect(source).toContain('aria-label="Buscar productos"');
    expect(source).toContain('aria-label="Cerrar búsqueda"');
    expect(source).toContain('focus-visible:ring-2');
  });

  it('allows dismissing search with the Escape key', () => {
    expect(source).toContain("event.key === 'Escape'");
    expect(source).toContain('onKeyDown={handleSearchKeyDown}');
  });

  it('keeps the search mounted while its closing animation finishes', () => {
    expect(source).toContain('const SEARCH_CLOSE_DURATION_MS = 220;');
    expect(source).toContain('const [isClosing, setIsClosing] = useState(false);');
    expect(source).toContain('const isSearchVisible = isOpen || isClosing;');
    expect(source).toContain("isClosing ? 'motion-search-hide' : 'motion-search-reveal'");
    expect(source).toContain('window.setTimeout(() => setIsClosing(false), closeDuration);');
    expect(styles).toContain('@keyframes customer-search-close');
    expect(styles).toContain('.motion-search-hide');
  });

  it('reveals the product section when a search starts on the catalog page', () => {
    expect(source).toContain('const startsSearching = !searchQuery.trim() && value.trim().length > 0');
    expect(source).toContain("document.getElementById('productos')?.scrollIntoView({");
    expect(source).toContain("behavior: 'smooth'");
    expect(source).toContain("block: 'start'");
  });
});
