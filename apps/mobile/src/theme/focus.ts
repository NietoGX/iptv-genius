import type { ViewStyle } from 'react-native';

// A single, unmistakable focus style reused across every focusable element in
// the app — Android TV has no cursor/hover, so the border is the only signal
// a user has of where they are. Keep this the same everywhere so focus is
// always recognizable regardless of which screen/component it's on.
export const focusRingStyle: ViewStyle = {
  borderWidth: 3,
  borderColor: '#5ce0a0',
};
