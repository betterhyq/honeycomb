<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage } from "element-plus";
import consola from "consola";
import EditDrawer from "./components/EditDrawer.vue";
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
		<el-header style="display: flex; align-items: center; border-bottom: 1px solid var(--el-border-color); position: fixed; top: 0; left: 0; right: 0; z-index: 1000; background-color: var(--el-bg-color);">
			<img class="logo-img" src="/logo.svg" alt="Honeycomb Logo" />
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
}
</style>
