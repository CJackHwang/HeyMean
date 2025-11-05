/**
 * UI configuration constants
 */

import { 
  DEFAULT_DEBOUNCE_MS, 
  DEFAULT_THROTTLE_MS, 
  DEFAULT_TRANSITION_LOCK_MS 
} from './constants';

export { 
  DEFAULT_DEBOUNCE_MS, 
  DEFAULT_THROTTLE_MS, 
  DEFAULT_TRANSITION_LOCK_MS 
};

export const INTERACTION_GUARD_CONFIG = {
  debounce: DEFAULT_DEBOUNCE_MS,
  throttle: DEFAULT_THROTTLE_MS,
  transitionLock: DEFAULT_TRANSITION_LOCK_MS,
} as const;