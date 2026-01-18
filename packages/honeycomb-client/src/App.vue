<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage } from "element-plus";
import consola from "consola";
import EditDrawer from "./components/EditDrawer.vue";
import StatsCards from "./components/StatsCards.vue";
import SearchFilter from "./components/SearchFilter.vue";
import ConfigTable from "./components/ConfigTable.vue";
import ConfigDetailDialog from "./components/ConfigDetailDialog.vue";
import StatusChart from "./components/StatusChart.vue";
import {
	createConfig,
	updateConfig,
	getConfigById,
	type ServiceConfig,
} from "./api/configs";
import { useConfigs } from "./composables/useConfigs";
import { useConfigActions } from "./composables/useConfigActions";

const activeIndex = ref("1");
const handleSelect = (key: string, keyPath: string[]) => {
	consola.debug(
		`[Client] 菜单选择: key=${key}, keyPath=[${keyPath.join(" > ")}]`,
	);
};

const drawer = ref(false);
const detailDialog = ref(false);
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

// 查看详情
const onViewDetail = async (id: number) => {
	consola.info(`[Client] 用户请求查看配置详情: id=${id}`);
	try {
		loading.value = true;
		const response = await getConfigById(id);
		if (response.code === 200 && response.data) {
			currentConfig.value = response.data;
			detailDialog.value = true;
		} else {
			ElMessage.error(response.msg || "获取配置详情失败");
		}
	} catch (error) {
		consola.error("[Client] 获取配置详情异常:", error);
		ElMessage.error(
			error instanceof Error ? error.message : "获取配置详情失败",
		);
	} finally {
		loading.value = false;
	}
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
      <el-header>
        <el-menu
          :default-active="activeIndex"
          class="el-menu-demo"
          mode="horizontal"
          :ellipsis="false"
          @select="handleSelect"
          :style="{ flex: 1 }"
        >
          <el-menu-item index="0">
            <img style="width: 180px; height: auto; transition: transform 0.3s;" src="/logo.svg" alt="Honeycomb Logo" class="logo-img" />
          </el-menu-item>
          <el-menu-item index="1">MCP 服务</el-menu-item>
          <el-menu-item index="2">
            <el-icon :size="30">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                x="0px"
                y="0px"
                width="100"
                height="100"
                viewBox="0 0 30 30"
              >
                <path
                  d="M15,3C8.373,3,3,8.373,3,15c0,5.623,3.872,10.328,9.092,11.63C12.036,26.468,12,26.28,12,26.047v-2.051 c-0.487,0-1.303,0-1.508,0c-0.821,0-1.551-0.353-1.905-1.009c-0.393-0.729-0.461-1.844-1.435-2.526 c-0.289-0.227-0.069-0.486,0.264-0.451c0.615,0.174,1.125,0.596,1.605,1.222c0.478,0.627,0.703,0.769,1.596,0.769 c0.433,0,1.081-0.025,1.691-0.121c0.328-0.833,0.895-1.6,1.588-1.962c-3.996-0.411-5.903-2.399-5.903-5.098 c0-1.162,0.495-2.286,1.336-3.233C9.053,10.647,8.706,8.73,9.435,8c1.798,0,2.885,1.166,3.146,1.481C13.477,9.174,14.461,9,15.495,9 c1.036,0,2.024,0.174,2.922,0.483C18.675,9.17,19.763,8,21.565,8c0.732,0.731,0.381,2.656,0.102,3.594 c0.836,0.945,1.328,2.066,1.328,3.226c0,2.697-1.904,4.684-5.894,5.097C18.199,20.49,19,22.1,19,23.313v2.734 c0,0.104-0.023,0.179-0.035,0.268C23.641,24.676,27,20.236,27,15C27,8.373,21.627,3,15,3z"
                ></path>
              </svg>
            </el-icon>
          </el-menu-item>
        </el-menu>
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
          @view-detail="onViewDetail"
          @start="handleStart"
          @stop="handleStop"
          @delete="handleDelete"
        />
        <!-- 分页 -->
        <div
          style="
            margin-top: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          "
        >
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
        </div>
      </el-main>
    </el-container>
    <el-backtop :right="100" :bottom="100" />

    <EditDrawer v-model="drawer" :config="currentConfig" @save="handleSave" />
    <ConfigDetailDialog v-model="detailDialog" :config="currentConfig" />
  </el-watermark>
</template>

<style scoped>
/* 菜单布局优化 */
.el-menu--horizontal > .el-menu-item:nth-child(1) {
  margin-right: auto;
}

.logo-img {
  transition: transform 0.3s ease;
}

.el-menu--horizontal > .el-menu-item:nth-child(1):hover .logo-img {
  transform: scale(1.05);
}

/* 主容器动画 */
.el-container {
  animation: fadeIn 0.5s ease-out;
}

/* 主内容区域优化 */
.el-main {
  animation: fadeIn 0.6s ease-out;
}

/* 统计卡片区域 */
.el-main > :deep(.el-row:first-child) {
  animation: fadeIn 0.7s ease-out;
}

/* 搜索筛选区域 */
.el-main > :deep(.el-card:first-of-type) {
  animation: slideInRight 0.8s ease-out;
}

/* 响应式优化 */
@media (max-width: 1200px) {
  .el-main {
    padding: 20px;
  }
}

@media (max-width: 768px) {
  .el-header {
    padding: 0 12px;
  }
  
  .el-menu--horizontal .el-menu-item {
    padding: 0 10px;
    font-size: 14px;
  }
  
  .el-menu--horizontal .el-menu-item:nth-child(1) .logo-img {
    width: 140px !important;
  }
  
  .el-main {
    padding: 16px;
  }
}

@media (max-width: 480px) {
  .el-header {
    padding: 0 8px;
  }
  
  .el-menu--horizontal .el-menu-item {
    padding: 0 8px;
    font-size: 12px;
  }
  
  .el-menu--horizontal .el-menu-item:nth-child(1) .logo-img {
    width: 120px !important;
  }
  
  .el-main {
    padding: 12px;
  }
}

/* 水印优化 */
:deep(.el-watermark__inner) {
  opacity: 0.03;
  font-size: 48px;
  font-weight: 600;
  color: var(--honeycomb-primary);
}

/* 返回顶部按钮位置优化 */
:deep(.el-backtop) {
  right: 40px;
  bottom: 40px;
}

@media (max-width: 768px) {
  :deep(.el-backtop) {
    right: 20px;
    bottom: 20px;
  }
}
</style>
