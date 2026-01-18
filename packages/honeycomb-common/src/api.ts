import type {
	CreateConfigDTO,
	DeleteConfigDTO,
	QueryConfigDTO,
	QueryConfigsDTO,
	StartConfigDTO,
	StopConfigDTO,
	UpdateConfigDTO,
} from "./dto";
import type { ApiEnum } from "./enum";
import type { QueryConfigsPageVO, QueryConfigVO } from "./vo";

type Response<T> = {
	code: number;
	msg: string;
	data: T;
};

export type ApiType = {
	[ApiEnum.QUERY_CONFIGS]: {
		dto: QueryConfigsDTO;
		vo: Response<QueryConfigsPageVO>;
	};
} & {
	[ApiEnum.QUERY_CONFIG]: {
		dto: QueryConfigDTO;
		vo: Response<QueryConfigVO>;
	};
} & {
	[ApiEnum.CREATE_CONFIG]: {
		dto: CreateConfigDTO;
		vo: Response<void>;
	};
} & {
	[ApiEnum.UPDATE_CONFIG]: {
		dto: UpdateConfigDTO;
		vo: Response<void>;
	};
} & {
	[ApiEnum.DELETE_CONFIG]: {
		dto: DeleteConfigDTO;
		vo: Response<void>;
	};
} & {
	[ApiEnum.START_CONFIG]: {
		dto: StartConfigDTO;
		vo: Response<void>;
	};
} & {
	[ApiEnum.STOP_CONFIG]: {
		dto: StopConfigDTO;
		vo: Response<void>;
	};
};
