import React from 'react';

interface TerminalSearchBarProps {
  isSearchOpen: boolean;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  searchText: string;
  setSearchText: (text: string) => void;
  searchCaseSensitive: boolean;
  setSearchCaseSensitive: (val: boolean) => void;
  searchWholeWord: boolean;
  setSearchWholeWord: (val: boolean) => void;
  searchIsRegex: boolean;
  setSearchIsRegex: (val: boolean) => void;
  searchResultCount: string;
  setSearchResultCount: (count: string) => void;
  searchAddonRef: React.MutableRefObject<any>;
  handleSearchPrev: () => void;
  handleSearchNext: () => void;
  closeSearch: () => void;
}

export function TerminalSearchBar({
  isSearchOpen,
  searchInputRef,
  searchText,
  setSearchText,
  searchCaseSensitive,
  setSearchCaseSensitive,
  searchWholeWord,
  setSearchWholeWord,
  searchIsRegex,
  setSearchIsRegex,
  searchResultCount,
  setSearchResultCount,
  searchAddonRef,
  handleSearchPrev,
  handleSearchNext,
  closeSearch,
}: TerminalSearchBarProps) {
  if (!isSearchOpen) return null;

  return (
    <div className="absolute top-3 right-3 flex items-center space-x-1.5 bg-[#252526] border border-[#2b2b2b] shadow-2xl rounded px-2.5 py-1.5 z-40 animate-in fade-in slide-in-from-top-2 duration-150">
      <div className="relative flex items-center">
        <input 
          ref={searchInputRef as any}
          type="text"
          placeholder="搜索终端内容 (Enter / Shift+Enter)..."
          value={searchText}
          onChange={(e) => {
            setSearchText(e.target.value);
            if (searchAddonRef.current && e.target.value) {
              const found = searchAddonRef.current.findNext(e.target.value, { 
                regex: searchIsRegex, 
                caseSensitive: searchCaseSensitive,
                wholeWord: searchWholeWord 
              });
              setSearchResultCount(found ? '匹配中' : '无结果');
            } else {
              setSearchResultCount('');
              searchAddonRef.current?.clearDecorations();
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (e.shiftKey) {
                handleSearchPrev();
              } else {
                handleSearchNext();
              }
            }
            if (e.key === 'Escape') {
              closeSearch();
            }
          }}
          className="w-60 px-2.5 py-1 text-xs bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded outline-none text-[#cccccc] font-mono placeholder-[#858585]"
        />
      </div>

      <div className="flex items-center space-x-0.5 bg-[#1e1e1e] p-0.5 rounded border border-[#3c3c3c]">
        <button
          type="button"
          onClick={() => {
            const nextVal = !searchCaseSensitive;
            setSearchCaseSensitive(nextVal);
            if (searchAddonRef.current && searchText) {
              searchAddonRef.current.findNext(searchText, { regex: searchIsRegex, caseSensitive: nextVal, wholeWord: searchWholeWord });
            }
          }}
          className={`px-1.5 py-0.5 text-[10px] font-mono rounded font-semibold transition-colors ${
            searchCaseSensitive ? 'bg-[#0078d4] text-white' : 'text-[#858585] hover:text-[#cccccc]'
          }`}
          title="区分大小写 (Case Sensitive)"
        >
          Aa
        </button>
        <button
          type="button"
          onClick={() => {
            const nextVal = !searchWholeWord;
            setSearchWholeWord(nextVal);
            if (searchAddonRef.current && searchText) {
              searchAddonRef.current.findNext(searchText, { regex: searchIsRegex, caseSensitive: searchCaseSensitive, wholeWord: nextVal });
            }
          }}
          className={`px-1.5 py-0.5 text-[10px] font-mono rounded font-semibold transition-colors ${
            searchWholeWord ? 'bg-[#0078d4] text-white' : 'text-[#858585] hover:text-[#cccccc]'
          }`}
          title="全字匹配 (Whole Word)"
        >
          \b
        </button>
        <button
          type="button"
          onClick={() => {
            const nextVal = !searchIsRegex;
            setSearchIsRegex(nextVal);
            if (searchAddonRef.current && searchText) {
              searchAddonRef.current.findNext(searchText, { regex: nextVal, caseSensitive: searchCaseSensitive, wholeWord: searchWholeWord });
            }
          }}
          className={`px-1.5 py-0.5 text-[10px] font-mono rounded font-semibold transition-colors ${
            searchIsRegex ? 'bg-[#0078d4] text-white' : 'text-[#858585] hover:text-[#cccccc]'
          }`}
          title="正则表达式 (Regular Expression)"
        >
          .*
        </button>
      </div>

      {searchResultCount && (
        <span className={`text-[11px] font-medium shrink-0 px-1.5 py-0.5 rounded ${searchResultCount === '无结果' ? 'text-[#f48771] bg-[#5a1d1d]/40 border border-[#be1100]/40' : 'text-[#89d185] bg-[#1e3a1e]/40 border border-[#3fb950]/30'}`}>
          {searchResultCount}
        </span>
      )}
      <button 
        onClick={handleSearchPrev}
        className="p-1 text-[#858585] hover:text-[#cccccc] hover:bg-[#2a2d2e] rounded transition-colors"
        title="上一个 (Shift+Enter)"
      >
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7"/></svg>
      </button>
      <button 
        onClick={handleSearchNext}
        className="p-1 text-[#858585] hover:text-[#cccccc] hover:bg-[#2a2d2e] rounded transition-colors"
        title="下一个 (Enter)"
      >
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
      </button>
      <button 
        onClick={closeSearch}
        className="p-1 text-[#858585] hover:text-[#cccccc] hover:bg-[#2a2d2e] rounded transition-colors"
        title="关闭搜索 (Esc)"
      >
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
    </div>
  );
}
