interface AsyncOperationState {
    loading: boolean;
    error: string | null;
    success: boolean;
}
interface AsyncOperationReturn extends AsyncOperationState {
    execute: <T>(operation: () => Promise<T>) => Promise<T | null>;
    reset: () => void;
    setError: (error: string) => void;
    setSuccess: (success: boolean) => void;
}
export declare function useAsyncOperation(): AsyncOperationReturn;
export {};
