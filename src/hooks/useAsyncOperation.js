import { useState, useCallback } from 'react';
export function useAsyncOperation() {
    const [state, setState] = useState({
        loading: false,
        error: null,
        success: false,
    });
    const execute = useCallback(async (operation) => {
        setState({ loading: true, error: null, success: false });
        try {
            const result = await operation();
            setState({ loading: false, error: null, success: true });
            return result;
        }
        catch (error) {
            const errorMessage = error?.message || 'Ocorreu um erro inesperado';
            setState({ loading: false, error: errorMessage, success: false });
            return null;
        }
    }, []);
    const reset = useCallback(() => {
        setState({ loading: false, error: null, success: false });
    }, []);
    const setError = useCallback((error) => {
        setState(prev => ({ ...prev, error, loading: false }));
    }, []);
    const setSuccess = useCallback((success) => {
        setState(prev => ({ ...prev, success, loading: false }));
    }, []);
    return {
        ...state,
        execute,
        reset,
        setError,
        setSuccess,
    };
}
