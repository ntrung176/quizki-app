import React, { useRef, useCallback, useEffect } from 'react';
import { Search } from 'lucide-react';

// SearchInput - Uncontrolled input to prevent re-renders
const SearchInput = React.memo(({ defaultValue, onSearchChange, placeholder }) => {
    const inputRef = useRef(null);
    const lastDefaultValueRef = useRef(defaultValue);

    // Sync with external value changes only when different
    useEffect(() => {
        if (inputRef.current && defaultValue !== lastDefaultValueRef.current) {
            inputRef.current.value = defaultValue || '';
            lastDefaultValueRef.current = defaultValue;
        }
    }, [defaultValue]);

    // Handle Enter key
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter' && inputRef.current) {
            onSearchChange(inputRef.current.value);
        }
    }, [onSearchChange]);

    // Handle search icon click
    const handleSearchClick = useCallback(() => {
        if (inputRef.current) {
            onSearchChange(inputRef.current.value);
        }
    }, [onSearchChange]);

    return (
        <div className="relative w-full md:w-96">
            <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 cursor-pointer hover:text-indigo-500 transition-colors"
                onClick={handleSearchClick}
            />
            <input
                ref={inputRef}
                type="text"
                placeholder={placeholder || "Tìm kiếm từ vựng (Enter để tìm)..."}
                defaultValue={defaultValue}
                onKeyDown={handleKeyDown}
                className="w-full pl-10 pr-4 py-2 md:py-2.5 text-sm md:text-base border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            />
        </div>
    );
}, (prevProps, nextProps) => {
    // Only re-render when defaultValue or placeholder changes
    return prevProps.defaultValue === nextProps.defaultValue &&
        prevProps.placeholder === nextProps.placeholder;
});

SearchInput.displayName = 'SearchInput';

export default SearchInput;
