import {
  type KeyboardEvent,
  type RefObject,
  type Dispatch,
  type SetStateAction,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { Search, X, Mic, MicOff, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';

interface SearchWithSuggestionsProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  suggestions?: string[];
  recentSearches?: string[];
  isLoading?: boolean;
  className?: string;
  enableVoice?: boolean;
}

interface SearchControlProps {
  inputRef: RefObject<HTMLInputElement>;
  placeholder: string;
  query: string;
  focused: boolean;
  loading: boolean;
  listening: boolean;
  voiceEnabled: boolean;
  hasSuggestions: boolean;
  onQueryChange: (query: string) => void;
  onFocusChange: (focused: boolean) => void;
  onKeyDown: (event: KeyboardEvent) => void;
  onClear: () => void;
  onVoice: () => void;
}

function SearchControlActions({
  loading,
  query,
  listening,
  voiceEnabled,
  onClear,
  onVoice,
}: {
  loading: boolean;
  query: string;
  listening: boolean;
  voiceEnabled: boolean;
  onClear: () => void;
  onVoice: () => void;
}) {
  return (
    <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
      {loading && (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />
      )}
      {query && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onClear}
          aria-label="Limpar busca"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
      {voiceEnabled && (
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-6 w-6', listening && 'text-destructive')}
          onClick={onVoice}
          aria-label={listening ? 'Parar gravação' : 'Buscar por voz'}
        >
          {listening ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
        </Button>
      )}
    </div>
  );
}

function SearchControl(props: SearchControlProps) {
  return (
    <div className="relative">
      <Search
        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary"
        aria-hidden="true"
      />
      <Input
        ref={props.inputRef}
        type="search"
        placeholder={props.placeholder}
        value={props.query}
        onChange={(event) => props.onQueryChange(event.target.value)}
        onFocus={() => props.onFocusChange(true)}
        onBlur={() => setTimeout(() => props.onFocusChange(false), 200)}
        onKeyDown={props.onKeyDown}
        className="pl-10 pr-20"
        aria-label="Campo de busca"
        aria-expanded={props.focused && props.hasSuggestions}
        aria-autocomplete="list"
        aria-controls="search-suggestions"
        role="combobox"
      />
      <SearchControlActions
        loading={props.loading}
        query={props.query}
        listening={props.listening}
        voiceEnabled={props.voiceEnabled}
        onClear={props.onClear}
        onVoice={props.onVoice}
      />
    </div>
  );
}

function SuggestionsList({
  query,
  suggestions,
  recentSearches,
  selectedIndex,
  onSelect,
}: {
  query: string;
  suggestions: string[];
  recentSearches: string[];
  selectedIndex: number;
  onSelect: (suggestion: string) => void;
}) {
  return (
    <div
      id="search-suggestions"
      className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border bg-popover shadow-lg"
      role="listbox"
    >
      {query.length === 0 && recentSearches.length > 0 && (
        <div className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">
          Buscas recentes
        </div>
      )}
      {suggestions.map((suggestion, index) => (
        <button
          key={suggestion}
          className={cn(
            'w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted',
            selectedIndex === index && 'bg-muted',
          )}
          onClick={() => onSelect(suggestion)}
          role="option"
          aria-selected={selectedIndex === index}
        >
          <Search className="mr-2 inline-block h-3 w-3 text-muted-foreground" aria-hidden="true" />
          {suggestion}
        </button>
      ))}
    </div>
  );
}

function useDebouncedSearch(query: string, onSearch: (query: string) => void) {
  const onSearchRef = useRef(onSearch);
  const lastSearchedRef = useRef('');
  const debouncedQuery = useDebounce(query, 300);
  useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);
  useEffect(() => {
    if (debouncedQuery === lastSearchedRef.current) return;
    lastSearchedRef.current = debouncedQuery;
    onSearchRef.current(debouncedQuery);
  }, [debouncedQuery]);
}

interface KeyboardContext {
  suggestions: string[];
  selectedIndex: number;
  setSelectedIndex: Dispatch<SetStateAction<number>>;
  setQuery: Dispatch<SetStateAction<string>>;
  setFocused: Dispatch<SetStateAction<boolean>>;
  onSearch: (query: string) => void;
  inputRef: RefObject<HTMLInputElement>;
}

function useSuggestionKeyboard(context: KeyboardContext) {
  return useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        context.setSelectedIndex((current) =>
          current < context.suggestions.length - 1 ? current + 1 : 0,
        );
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        context.setSelectedIndex((current) =>
          current > 0 ? current - 1 : context.suggestions.length - 1,
        );
        return;
      }
      if (event.key === 'Enter' && context.selectedIndex >= 0) {
        event.preventDefault();
        const selected = context.suggestions[context.selectedIndex];
        if (selected !== undefined) {
          context.setQuery(selected);
          context.onSearch(selected);
          context.setFocused(false);
        }
        return;
      }
      if (event.key === 'Escape') {
        context.setFocused(false);
        context.inputRef.current?.blur();
      }
    },
    [context],
  );
}

function useVoiceSearch(
  onSearch: (query: string) => void,
  setQuery: Dispatch<SetStateAction<string>>,
) {
  const [isListening, setIsListening] = useState(false);
  const start = useCallback(() => {
    const Recognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    if (!Recognition) return;
    const recognition = new Recognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (!transcript) return;
      setQuery(transcript);
      onSearch(transcript);
    };
    recognition.start();
  }, [onSearch, setQuery]);
  return { isListening, start };
}

function useSearchSuggestionsController(
  onSearch: (query: string) => void,
  suggestions: string[],
  recentSearches: string[],
) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const allSuggestions = query ? suggestions : recentSearches.slice(0, 5);
  useDebouncedSearch(query, onSearch);
  const keyboardContext: KeyboardContext = {
    suggestions: allSuggestions,
    selectedIndex,
    setSelectedIndex,
    setQuery,
    setFocused,
    onSearch,
    inputRef,
  };
  const onKeyDown = useSuggestionKeyboard(keyboardContext);
  const voice = useVoiceSearch(onSearch, setQuery);
  const clear = () => {
    setQuery('');
    onSearch('');
    inputRef.current?.focus();
  };
  const select = (suggestion: string) => {
    setQuery(suggestion);
    onSearch(suggestion);
    setFocused(false);
  };
  return {
    query,
    setQuery,
    focused,
    setFocused,
    selectedIndex,
    inputRef,
    allSuggestions,
    onKeyDown,
    voice,
    clear,
    select,
  };
}

export function SearchWithSuggestions({
  placeholder = 'Buscar...',
  onSearch,
  suggestions = [],
  recentSearches = [],
  isLoading = false,
  className,
  enableVoice = false,
}: SearchWithSuggestionsProps) {
  const controller = useSearchSuggestionsController(onSearch, suggestions, recentSearches);
  const voiceEnabled =
    enableVoice && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
  const showSuggestions = controller.focused && controller.allSuggestions.length > 0;
  return (
    <div className={cn('relative', className)}>
      <SearchControl
        inputRef={controller.inputRef}
        placeholder={placeholder}
        query={controller.query}
        focused={controller.focused}
        loading={isLoading}
        listening={controller.voice.isListening}
        voiceEnabled={voiceEnabled}
        hasSuggestions={controller.allSuggestions.length > 0}
        onQueryChange={controller.setQuery}
        onFocusChange={controller.setFocused}
        onKeyDown={controller.onKeyDown}
        onClear={controller.clear}
        onVoice={controller.voice.start}
      />
      {showSuggestions && (
        <SuggestionsList
          query={controller.query}
          suggestions={controller.allSuggestions}
          recentSearches={recentSearches}
          selectedIndex={controller.selectedIndex}
          onSelect={controller.select}
        />
      )}
    </div>
  );
}
