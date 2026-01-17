import { ServerInfo, ToolInfo } from "./base";

interface ToolVO extends ToolInfo {
    id: number;
}

interface ServerVO extends ServerInfo {
    id: number;
    status: string;
    statusText: string;
    tools: Array<ToolVO>
}

export interface QueryConfigsVO {
    code: number;
    msg: string;
    data: Array<ServerVO>;
}
