import { ref, computed } from "vue";
import consola from "consola";
import { ElMessage } from "element-plus";
import { getConfigs, type ServiceConfig } from "../api/configs";
import { StatusEnum } from "@betterhyq/honeycomb-common";

/**
 * 配置列表管理 composable
 */
export function useConfigs() {
	const loading = ref(false);
	const configs = ref<ServiceConfig[]>([]);
	const total = ref(0);
	const page = ref(1);
	const pageSize = ref(10);
	const searchKeyword = ref("");
	const statusFilter = ref<string | null>(null);

	// 统计数据（从server端获取）
	const stats = ref({
		running: 0,
		stopped: 0,
		totalTools: 0,
	});
	const totalServices = computed(() => total.value);
	const runningServices = computed(() => stats.value.running);
	const stoppedServices = computed(() => stats.value.stopped);

	// 过滤后的数据（基于当前页的数据）
	const filteredData = computed(() => {
		let result = configs.value;

		// 搜索过滤
		if (searchKeyword.value) {
			const keyword = searchKeyword.value.toLowerCase();
			result = result.filter(
				(item) =>
					item.name.toLowerCase().includes(keyword) ||
					item.description.toLowerCase().includes(keyword) ||
					item.version.toLowerCase().includes(keyword) ||
					item.tools.some(
						(tool) =>
							tool.name.toLowerCase().includes(keyword) ||
							tool.description.toLowerCase().includes(keyword),
					),
			);
		}

		// 状态过滤
		if (statusFilter.value) {
			result = result.filter((item) => item.status === statusFilter.value);
		}

		return result;
	});

	// 加载配置列表
	const loadConfigs = async (targetPage?: number) => {
		const startTime = Date.now();
		loading.value = true;
		const currentPage = targetPage ?? page.value;
		consola.info(`[Client] 开始加载配置列表 (页码: ${currentPage})`);

		try {
			const response = await getConfigs(currentPage, pageSize.value);
			const duration = Date.now() - startTime;

			if (response.code === 200) {
				configs.value = response.data.data;
				total.value = response.data.total;
				page.value = response.data.page;
				pageSize.value = response.data.pageSize;

				// 更新统计数据
				if (response.data.stats) {
					stats.value = response.data.stats;
				}

				const running = response.data.data.filter(
					(c: ServiceConfig) => c.status === StatusEnum.RUNNING,
				).length;
				const stopped = response.data.data.filter(
					(c: ServiceConfig) => c.status === StatusEnum.STOPPED,
				).length;
				const totalTools = response.data.data.reduce(
					(sum: number, c: ServiceConfig) => sum + c.tools.length,
					0,
				);

				consola.success(`[Client] 配置列表加载成功 (耗时: ${duration}ms)`);
				consola.info(
					`[Client] 统计: 总数=${response.data.total}, 当前页=${response.data.page}, 每页=${response.data.pageSize}, 返回=${response.data.data.length}条, 运行中=${running}, 已停止=${stopped}, 工具数=${totalTools}`,
				);
			} else {
				consola.error(
					`[Client] 获取配置列表失败: code=${response.code}, msg=${response.msg}`,
				);
				ElMessage.error(response.msg || "获取配置列表失败");
			}
		} catch (error) {
			const duration = Date.now() - startTime;
			consola.error(`[Client] 加载配置列表异常 (耗时: ${duration}ms):`, {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			});
			ElMessage.error(
				error instanceof Error ? error.message : "加载配置列表失败",
			);
		} finally {
			loading.value = false;
		}
	};

	// 切换页码
	const handlePageChange = (newPage: number) => {
		consola.info(`[Client] 切换页码: ${page.value} -> ${newPage}`);
		loadConfigs(newPage);
	};

	return {
		loading,
		configs,
		searchKeyword,
		statusFilter,
		totalServices,
		runningServices,
		stoppedServices,
		filteredData,
		total,
		page,
		pageSize,
		loadConfigs,
		handlePageChange,
	};
}
