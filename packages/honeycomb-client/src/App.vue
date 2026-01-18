<script setup lang="ts">
import { ref, onMounted, defineAsyncComponent } from "vue";
import { ElMessage } from "element-plus";
import consola from "consola";
// 使用动态导入延迟加载大型组件
const EditDrawer = defineAsyncComponent(
	() => import("./components/EditDrawer.vue"),
);
import StatsCards from "./components/StatsCards.vue";
import SearchFilter from "./components/SearchFilter.vue";
import ConfigTable from "./components/ConfigTable.vue";
import StatusChart from "./components/StatusChart.vue";
import { createConfig, updateConfig, type ServiceConfig } from "./api/configs";
import { useConfigs } from "./composables/useConfigs";
import { useConfigActions } from "./composables/useConfigActions";

const drawer = ref(false);
const currentConfig = ref<ServiceConfig | null>(null);

// 使用 composables
const {
	loading,
	configs,
	searchKeyword,
	statusFilter,
	totalServices,
	runningServices,
	stoppedServices,
	totalTools,
	filteredData,
	total,
	page,
	pageSize,
	loadConfigs,
	handlePageChange,
} = useConfigs();

const { handleStart, handleStop, handleDelete, handleEdit } = useConfigActions(
	loadConfigs,
	(id) => configs.value.find((c) => c.id === id),
);

// 刷新数据
const handleRefresh = async () => {
	const startTime = Date.now();
	consola.info("[Client] 用户触发刷新操作");
	await loadConfigs();
	const duration = Date.now() - startTime;
	consola.success(`[Client] 刷新操作完成 (耗时: ${duration}ms)`);
	ElMessage.success("刷新成功");
};

// 编辑配置
const onEdit = async (id: number) => {
	const config = await handleEdit(id);
	if (config) {
		currentConfig.value = config;
		drawer.value = true;
	}
};

// 保存配置
const handleSave = async (config: ServiceConfig) => {
	const startTime = Date.now();
	const isUpdate = !!config.id;
	const action = isUpdate ? "更新" : "创建";

	consola.info(`[Client] 用户请求${action}配置:`, {
		id: config.id || "new",
		name: config.name,
		version: config.version,
		toolsCount: config.tools.length,
	});

	try {
		loading.value = true;
		let response;

		if (config.id) {
			// 更新配置
			consola.debug(`[Client] 执行更新配置: id=${config.id}`);
			response = await updateConfig(config.id, {
				name: config.name,
				version: config.version,
				description: config.description,
				tools: config.tools.map((tool) => ({
					name: tool.name,
					description: tool.description,
					input_schema: tool.input_schema,
					output_schema: tool.output_schema,
					callback: tool.callback,
				})),
			});
		} else {
			// 创建配置
			consola.debug(`[Client] 执行创建配置: name=${config.name}`);
			response = await createConfig({
				name: config.name,
				version: config.version,
				description: config.description,
				tools: config.tools.map((tool) => ({
					name: tool.name,
					description: tool.description,
					input_schema: tool.input_schema,
					output_schema: tool.output_schema,
					callback: tool.callback,
				})),
			});
		}

		const duration = Date.now() - startTime;

		if (response.code === 200) {
			const resultId = response.data?.id || config.id || "unknown";
			consola.success(
				`[Client] 配置${action}成功 (耗时: ${duration}ms): id=${resultId}, name=${response.data?.name || config.name}`,
			);
			ElMessage.success("保存成功");
			drawer.value = false;
			await loadConfigs(); // 重新加载列表
		} else {
			consola.error(
				`[Client] 配置${action}失败: id=${config.id || "new"}, code=${response.code}, msg=${response.msg}`,
			);
			ElMessage.error(response.msg || "保存失败");
		}
	} catch (error) {
		const duration = Date.now() - startTime;
		consola.error(`[Client] 配置${action}异常 (耗时: ${duration}ms):`, {
			id: config.id || "new",
			name: config.name,
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});
		ElMessage.error(error instanceof Error ? error.message : "保存失败");
	} finally {
		loading.value = false;
	}
};

// 添加配置
const onAdd = () => {
	consola.info("[Client] 用户请求添加新配置");
	currentConfig.value = null;
	drawer.value = true;
};

// 组件挂载时加载数据
onMounted(() => {
	consola.info("[Client] 组件已挂载，开始加载初始数据");
	loadConfigs();
});
</script>

<template>
  <el-watermark content="honeycomb">
    <el-container>
		<div style="width: 100%; height: 60px;"></div>
		<el-header style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--el-border-color); position: fixed; top: 0; left: 0; right: 0; z-index: 1000; background-color: var(--el-bg-color);">
			<img class="logo-img" src="/logo.svg" alt="Honeycomb Logo" />
			<el-space>
				<el-link href="https://github.com/betterhyq/honeycomb" target="_blank" underline="never">
					<el-icon :size="24">
						<svg width="24" height="24" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M29.3444 30.4765C31.7481 29.977 33.9292 29.1108 35.6247 27.8391C38.5202 25.6676 40 22.3136 40 18.9999C40 16.6752 39.1187 14.505 37.5929 12.6668C36.7427 11.6425 39.2295 3.99989 37.02 5.02919C34.8105 6.05848 31.5708 8.33679 29.8726 7.83398C28.0545 7.29565 26.0733 6.99989 24 6.99989C22.1992 6.99989 20.4679 7.22301 18.8526 7.6344C16.5046 8.23237 14.2591 5.99989 12 5.02919C9.74086 4.05848 10.9736 11.9632 10.3026 12.7944C8.84119 14.6051 8 16.7288 8 18.9999C8 22.3136 9.79086 25.6676 12.6863 27.8391C14.6151 29.2857 17.034 30.2076 19.7401 30.6619" stroke="#000" stroke-width="4" stroke-linecap="round"/><path d="M19.7397 30.6619C18.5812 31.937 18.002 33.1478 18.002 34.2944C18.002 35.441 18.002 38.3464 18.002 43.0106" stroke="#000" stroke-width="4" stroke-linecap="round"/><path d="M29.3446 30.4766C30.4423 31.9174 30.9912 33.211 30.9912 34.3576C30.9912 35.5042 30.9912 38.3885 30.9912 43.0107" stroke="#000" stroke-width="4" stroke-linecap="round"/><path d="M6 31.2155C6.89887 31.3254 7.56554 31.7387 8 32.4554C8.65169 33.5303 11.0742 37.518 13.8251 37.518C15.6591 37.518 17.0515 37.518 18.0024 37.518" stroke="#000" stroke-width="4" stroke-linecap="round"/></svg>
					</el-icon>
				</el-link>
			</el-space>
		</el-header>
      <el-main>
        <!-- 统计信息卡片 -->
        <StatsCards
          :total-services="totalServices"
          :running-services="runningServices"
          :stopped-services="stoppedServices"
          :total-tools="totalTools"
        />

        <!-- 状态分布图表 -->
        <StatusChart
          :running="runningServices"
          :stopped="stoppedServices"
          :configs="configs"
          :total-tools="totalTools"
        />

        <!-- 搜索和筛选区域 -->
        <SearchFilter
          :search-keyword="searchKeyword"
          :status-filter="statusFilter"
          :loading="loading"
          @update:search-keyword="(val) => (searchKeyword = val)"
          @update:status-filter="(val) => (statusFilter = val)"
          @refresh="handleRefresh"
          @add="onAdd"
        />

        <!-- 数据表格 -->
        <ConfigTable
          :loading="loading"
          :data="filteredData"
          @edit="onEdit"
          @start="handleStart"
          @stop="handleStop"
          @delete="handleDelete"
        />
        <!-- 分页 -->
        <el-space :size="16" style="width: 100%; margin-top: 20px" justify="space-between">
          <el-text type="info" size="small">
            共 {{ total }} 条记录
            <template v-if="searchKeyword || statusFilter"> （已过滤） </template>
          </el-text>
          <el-pagination
            background
            layout="prev, pager, next"
            :total="total"
            :page-size="pageSize"
            :current-page="page"
            @current-change="handlePageChange"
          />
        </el-space>
      </el-main>
    </el-container>
    <el-backtop :right="100" :bottom="100" />

    <EditDrawer v-model="drawer" :config="currentConfig" @save="handleSave" />
  </el-watermark>
</template>

<style scoped>
.el-menu--horizontal > .el-menu-item:nth-child(1) {
  margin-right: auto;
}

.logo-img {
  width: 180px;
  height: auto;
  transition: all 0.3s ease;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

.logo-img:hover {
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15));
  transform: scale(1.02);
}

:deep(.el-header) {
  backdrop-filter: blur(10px);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.98) 100%);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

:deep(.el-main) {
  background: var(--honeycomb-bg-gradient);
  min-height: calc(100vh - 60px);
  padding: 20px;
}

:deep(.el-watermark) {
  background: var(--honeycomb-bg-gradient);
}
</style>
