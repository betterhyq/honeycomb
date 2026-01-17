export type QueryConfigDTO = {
    id: number;
}

export type CreateConfigDTO = {
    name: string;
    version: string;
    description: string;
    tools: Array<{
        name: string;
        description: string;
        input_schema: string;
        output_schema: string;
        callback: string;
    }>;
}

export type UpdateConfigDTO = {
    id: number;
    name: string;
    version: string;
    description: string;
    tools: Array<{
        name: string;
        description: string;
        input_schema: string;
        output_schema: string;
        callback: string;
    }>;
}

export type DeleteConfigDTO = {
    id: number;
}

export type StartConfigDTO = {
    id: number;
}

export type StopConfigDTO = {
    id: number;
}