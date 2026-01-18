<script setup lang="ts">
import { ref, computed } from "vue";
import { StatusEnum } from "@betterhyq/honeycomb-common";
import type { ServiceConfig } from "../api/configs";
import { ElMessage, ElMessageBox } from "element-plus";

const props = defineProps<{
	loading: boolean;
	data: ServiceConfig[];
}>();

const emit = defineEmits<{
	edit: [id: number];
	viewDetail: [id: number];
	start: [id: number];
	stop: [id: number];
	delete: [id: number];
}>();

// 批量选择
const selectedRows = ref<ServiceConfig[]>([]);
const isAllSelected = computed(() => {
	return (
		props.data.length > 0 && selectedRows.value.length === props.data.length
	);
});
const isIndeterminate = computed(() => {
	return (
		selectedRows.value.length > 0 &&
		selectedRows.value.length < props.data.length
	);
});

const handleSelectAll = (val: boolean) => {
	if (val) {
		selectedRows.value = [...props.data];
	} else {
		selectedRows.value = [];
	}
};

const handleSelect = (row: ServiceConfig, val: boolean) => {
	if (val) {
		if (!selectedRows.value.find((r) => r.id === row.id)) {
			selectedRows.value.push(row);
		}
	} else {
		const index = selectedRows.value.findIndex((r) => r.id === row.id);
		if (index > -1) {
			selectedRows.value.splice(index, 1);
		}
	}
};

const isRowSelected = (row: ServiceConfig) => {
	return selectedRows.value.some((r) => r.id === row.id);
};

// 批量操作
const batchLoading = ref(false);

const handleBatchStart = async () => {
	if (selectedRows.value.length === 0) {
		ElMessage.warning("请先选择要启动的服务");
		return;
	}
	const stoppedServices = selectedRows.value.filter(
		(r) => r.status === StatusEnum.STOPPED,
	);
	if (stoppedServices.length === 0) {
		ElMessage.warning("所选服务中没有已停止的服务");
		return;
	}
	try {
		await ElMessageBox.confirm(
			`确定要启动 ${stoppedServices.length} 个服务吗？`,
			"批量启动",
			{
				confirmButtonText: "确定",
				cancelButtonText: "取消",
				type: "warning",
			},
		);
		batchLoading.value = true;
		for (const service of stoppedServices) {
			emit("start", service.id);
			// 等待一小段时间，避免请求过快
			await new Promise((resolve) => setTimeout(resolve, 200));
		}
		selectedRows.value = [];
		ElMessage.success(`成功启动 ${stoppedServices.length} 个服务`);
	} catch {
		// 取消操作
	} finally {
		batchLoading.value = false;
	}
};

const handleBatchStop = async () => {
	if (selectedRows.value.length === 0) {
		ElMessage.warning("请先选择要停止的服务");
		return;
	}
	const runningServices = selectedRows.value.filter(
		(r) => r.status === StatusEnum.RUNNING,
	);
	if (runningServices.length === 0) {
		ElMessage.warning("所选服务中没有运行中的服务");
		return;
	}
	try {
		await ElMessageBox.confirm(
			`确定要停止 ${runningServices.length} 个服务吗？`,
			"批量停止",
			{
				confirmButtonText: "确定",
				cancelButtonText: "取消",
				type: "warning",
			},
		);
		batchLoading.value = true;
		for (const service of runningServices) {
			emit("stop", service.id);
			// 等待一小段时间，避免请求过快
			await new Promise((resolve) => setTimeout(resolve, 200));
		}
		selectedRows.value = [];
		ElMessage.success(`成功停止 ${runningServices.length} 个服务`);
	} catch {
		// 取消操作
	} finally {
		batchLoading.value = false;
	}
};

const handleBatchDelete = async () => {
	if (selectedRows.value.length === 0) {
		ElMessage.warning("请先选择要删除的服务");
		return;
	}
	try {
		await ElMessageBox.confirm(
			`确定要删除 ${selectedRows.value.length} 个服务吗？此操作不可恢复！`,
			"批量删除",
			{
				confirmButtonText: "确定",
				cancelButtonText: "取消",
				type: "error",
			},
		);
		const count = selectedRows.value.length;
		batchLoading.value = true;
		for (const service of selectedRows.value) {
			emit("delete", service.id);
			// 等待一小段时间，避免请求过快
			await new Promise((resolve) => setTimeout(resolve, 200));
		}
		selectedRows.value = [];
		ElMessage.success(`成功删除 ${count} 个服务`);
	} catch {
		// 取消操作
	} finally {
		batchLoading.value = false;
	}
};
</script>

<template>
  <div>
    <!-- 批量操作栏 -->
    <el-card
      v-if="selectedRows.length > 0"
      shadow="never"
      style="margin-bottom: 15px"
    >
      <div style="display: flex; justify-content: space-between; align-items: center">
        <span style="color: #409eff; font-weight: 500">
          已选择 {{ selectedRows.length }} 项
        </span>
        <el-space>
          <el-button
            size="small"
            type="success"
            :loading="batchLoading"
            @click="handleBatchStart"
          >
            批量启动
          </el-button>
          <el-button
            size="small"
            type="warning"
            :loading="batchLoading"
            @click="handleBatchStop"
          >
            批量停止
          </el-button>
          <el-button
            size="small"
            type="danger"
            :loading="batchLoading"
            @click="handleBatchDelete"
          >
            批量删除
          </el-button>
          <el-button size="small" @click="selectedRows = []">取消选择</el-button>
        </el-space>
      </div>
    </el-card>

    <el-table
      v-loading="loading"
      :data="data"
      style="width: 100%"
      stripe
      empty-text="暂无数据"
      :height="480"
      @select-all="handleSelectAll"
      @select="handleSelect"
    >
      <el-table-column type="selection" width="55" fixed="left" />
      <el-table-column property="name" label="服务名" width="200" fixed="left">
        <template #default="scope">
          <el-button
            link
            type="primary"
            @click="$emit('viewDetail', scope.row.id)"
          >
            {{ scope.row.name }}
          </el-button>
        </template>
      </el-table-column>
    <el-table-column property="version" label="版本号" width="100" />
    <el-table-column property="status" label="状态" width="120">
      <template #default="scope">
        <el-tag :type="scope.row.status === StatusEnum.RUNNING ? 'success' : 'warning'">{{
          scope.row.statusText
        }}</el-tag>
      </template>
    </el-table-column>
    <el-table-column property="description" label="描述" show-overflow-tooltip width="400" />
    <el-table-column property="tools" label="工具" width="400">
      <template #default="scope">
        <el-space wrap>
          <el-popover
            v-for="tool in scope.row.tools"
            :key="tool.name"
            placement="top"
            :width="400"
            trigger="hover"
          >
            <template #reference>
              <el-tag
                type="info"
                size="small"
                effect="plain"
                style="cursor: pointer"
              >
                {{ tool.name }}
              </el-tag>
            </template>
            <div>
              <div style="margin-bottom: 8px">
                <strong>工具名称：</strong>{{ tool.name }}
              </div>
              <div style="margin-bottom: 8px">
                <strong>描述：</strong>{{ tool.description }}
              </div>
              <div v-if="tool.input_schema" style="margin-bottom: 8px">
                <strong>输入 Schema：</strong>
                <el-scrollbar height="100px">
                  <pre style="margin: 0; font-size: 12px">{{ tool.input_schema }}</pre>
                </el-scrollbar>
              </div>
              <div v-if="tool.output_schema">
                <strong>输出 Schema：</strong>
                <el-scrollbar height="100px">
                  <pre style="margin: 0; font-size: 12px">{{ tool.output_schema }}</pre>
                </el-scrollbar>
              </div>
            </div>
          </el-popover>
          <el-text v-if="scope.row.tools.length === 0" type="info" size="small">暂无工具</el-text>
        </el-space>
      </template>
    </el-table-column>
    <el-table-column property="createdAt" label="创建时间" width="200" />
    <el-table-column property="lastModified" label="最后修改时间" width="200" />

    <el-table-column fixed="right" width="200">
      <template #default="scope">
        <el-button
          link
          type="info"
          size="small"
          @click="$emit('viewDetail', scope.row.id)"
        >
          详情
        </el-button>
        <el-button link type="primary" size="small" @click="$emit('edit', scope.row.id)"
          >编辑</el-button
        >
        <el-button
          v-if="scope.row.status === StatusEnum.STOPPED"
          link
          type="success"
          size="small"
          @click="$emit('start', scope.row.id)"
          >启动</el-button
        >
        <el-button
          v-if="scope.row.status === StatusEnum.RUNNING"
          link
          type="warning"
          size="small"
          @click="$emit('stop', scope.row.id)"
          >停止</el-button
        >
        <el-button link type="danger" size="small" @click="$emit('delete', scope.row.id)"
          >删除</el-button
        >
      </template>
    </el-table-column>
  </el-table>
  </div>
</template>

<style scoped>
pre {
  background-color: #f5f7fa;
  padding: 8px;
  border-radius: 4px;
  font-family: "Courier New", monospace;
  white-space: pre-wrap;
  word-wrap: break-word;
  margin: 0;
}
</style>
