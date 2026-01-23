import { useState, useEffect } from 'react';

/**
 * 입력값의 디바운스를 처리하는 훅
 * @param value 디바운스할 값
 * @param delay 지연 시간 (ms)
 * @returns 디바운스된 값
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * 검색 입력값 관리를 위한 훅
 * @param onSearch 검색 콜백
 * @param delay 디바운스 지연 시간 (ms)
 */
export function useSearchInput(delay: number = 300) {
  const [inputValue, setInputValue] = useState('');
  const debouncedValue = useDebounce(inputValue, delay);

  return {
    inputValue,
    setInputValue,
    debouncedValue,
  };
}
