export type QueryConfigsVO = Array<{
	id: number;
	name: string;
	version: string;
	status: string;
	statusText: string;
	description: string;
	createdAt: string;
	lastModified: string;
	tools: Array<{
		name: string;
		description: string;
		input_schema: string;
		output_schema: string;
		callback: string;
	}>;
}>;

export type QueryConfigsPageVO = {
	data: QueryConfigsVO;
	total: number;
	page: number;
	pageSize: number;
	stats?: {
		running: number;
		stopped: number;
		totalTools: number;
	};
};

export type QueryConfigVO = {
	id: number;
	name: string;
	version: string;
	status: string;
	statusText: string;
	description: string;
	createdAt: string;
	lastModified: string;
	tools: Array<{
		name: string;
		description: string;
		input_schema: string;
		output_schema: string;
		callback: string;
	}>;
};
