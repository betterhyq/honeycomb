export enum ApiEnum {
    QUERY_CONFIGS = "/api/configs",
    QUERY_CONFIG = "/api/configs/:id",
    CREATE_CONFIG = "/api/config",
    UPDATE_CONFIG = "/api/config/:id",
    DELETE_CONFIG = "/api/config/:id",
    START_CONFIG = "/api/config/:id/start",
    STOP_CONFIG = "/api/config/:id/stop",
}

export enum StatusEnum {
    RUNNING = "running",
    STOPPED = "stopped",
}

export const StatusTextMap = new Map<StatusEnum, string>([
    [StatusEnum.RUNNING, "运行中"],
    [StatusEnum.STOPPED, "已停止"],
]);
