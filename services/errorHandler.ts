/**
 * Custom error class for application-specific errors.
 * Contains a user-friendly message and an error code for programmatic handling.
 */
export class AppError extends Error {
    constructor(
        public readonly code: string,
        public readonly userMessage: string,
        public readonly originalError?: unknown
    ) {
        super(userMessage);
        this.name = 'AppError';
    }
}

/**
 * A record of known API error messages and their user-friendly translations.
 */
const KNOWN_API_ERROR_MESSAGES: Record<string, string> = {
    'api key not valid': 'Your API key is not valid. Please check it in Settings.',
    'quota exceeded': 'You have exceeded your API quota. Please check your account.',
    'rate limit exceeded': 'You are sending requests too quickly. Please wait a moment and try again.',
    'failed to fetch': 'Could not connect to the API server. Please check your network connection and Base URL in Settings.',
};


/**
 * Analyzes an error and returns a structured AppError. This is the global handler.
 * @param error The error caught.
 * @param context A string to provide context (e.g., 'api', 'db', 'file') for more specific messages.
 * @returns An AppError instance with a user-friendly message.
 */
export const handleError = (error: unknown, context: 'api' | 'db' | 'settings' | 'file' | 'general' = 'general'): AppError => {
    // Log the full error for developers
    console.error(`[Error Context: ${context}]`, error);
    
    // If it's already an AppError, just return it.
    if (error instanceof AppError) {
        return error;
    }

    let errorMessage = 'An unexpected error occurred. Please try again.';
    if (error instanceof Error) {
        errorMessage = error.message;
    } else if (typeof error === 'string') {
        errorMessage = error;
    }

    const lowerCaseErrorMessage = errorMessage.toLowerCase();

    // --- API Specific Error Handling ---
    if (context === 'api') {
        for (const key in KNOWN_API_ERROR_MESSAGES) {
            if (lowerCaseErrorMessage.includes(key)) {
                return new AppError('API_KNOWN_ERROR', KNOWN_API_ERROR_MESSAGES[key], error);
            }
        }
        if (lowerCaseErrorMessage.includes('401') || lowerCaseErrorMessage.includes('authentication')) {
            return new AppError('API_AUTH_ERROR', 'Authentication failed. Please check your API key in Settings.', error);
        }
        if (lowerCaseErrorMessage.includes('404')) {
            return new AppError('API_NOT_FOUND', 'The API endpoint was not found. Please check the Base URL in Settings.', error);
        }
        if (lowerCaseErrorMessage.includes('429')) {
            return new AppError('API_RATE_LIMIT', 'You are sending requests too quickly. Please wait a moment and try again.', error);
        }
        return new AppError('API_UNKNOWN_ERROR', `An API error occurred: ${errorMessage}. Please check your settings or try again.`, error);
    }
    
    // --- DB Specific Error Handling ---
    if (context === 'db') {
         return new AppError('DB_ERROR', `A database operation failed. Your data might not be saved correctly. Please try refreshing the page.`, error);
    }

    // --- File Specific Error Handling ---
    if (context === 'file') {
        return new AppError('FILE_ERROR', `There was an error processing a file. Details: ${errorMessage}`, error);
    }
    
    // --- General Fallback ---
    return new AppError(
        'UNKNOWN_ERROR',
        errorMessage,
        error
    );
};
