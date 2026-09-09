import { useState } from 'react';

// TextInput doesn't get the Pressable-style `focused` render prop, so
// wire the same visible focus signal manually via onFocus/onBlur.
export function useFocusRing() {
  const [isFocused, setIsFocused] = useState(false);
  return {
    isFocused,
    focusHandlers: {
      onFocus: () => setIsFocused(true),
      onBlur: () => setIsFocused(false)
    }
  };
}
