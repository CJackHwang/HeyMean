export interface ToolCall {
    name: string;
    arguments?: unknown;
}

export interface ToolExecutionError {
    code: string;
    message: string;
}

export interface ToolExecutionResult {
    name: string;
    success: boolean;
    data?: unknown;
    error?: ToolExecutionError;
}

export interface ToolExecutionContext {
    origin?: string;
}

export interface ToolParameterDescription {
    key: string;
    type: string;
    description: string;
    required?: boolean;
}

export interface ToolDefinition {
    name: string;
    description: string;
    parameters: ToolParameterDescription[];
    examples?: string[];
    execute: (args: unknown, context?: ToolExecutionContext) => Promise<ToolExecutionResult>;
}
