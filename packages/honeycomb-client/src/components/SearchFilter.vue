<script setup lang="ts">
import { StatusEnum } from "@betterhyq/honeycomb-common";

defineProps<{
	loading: boolean;
	searchKeyword: string;
	statusFilter: string | null;
}>();

defineEmits<{
	"update:searchKeyword": [value: string];
	"update:statusFilter": [value: string | null];
	refresh: [];
	add: [];
}>();
</script>

<template>
  <el-card shadow="never" style="margin-bottom: 20px;">
    <el-row :gutter="16" align="middle">
      <el-col :xs="24" :sm="12" :md="12" :lg="12">
        <el-input
          :model-value="searchKeyword"
          @update:model-value="(val: string) => $emit('update:searchKeyword', val)"
          placeholder="搜索服务名称、描述、版本号或工具"
          clearable
        >
          <template #prefix>
            <el-icon>
              <svg
                viewBox="0 0 1024 1024"
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
              >
                <path
                  fill="currentColor"
                  d="m795.904 750.72 124.992 124.928a32 32 0 0 1-45.248 45.248L750.656 795.904a416 416 0 1 1 45.248-45.248zM480 832a352 352 0 1 0 0-704 352 352 0 0 0 0 704z"
                />
              </svg>
            </el-icon>
          </template>
        </el-input>
      </el-col>
      <el-col :xs="24" :sm="6" :md="6" :lg="6">
        <el-select
          :model-value="statusFilter"
          @update:model-value="(val: string | null) => $emit('update:statusFilter', val)"
          placeholder="全部状态"
          clearable
          style="width: 100%"
        >
          <el-option label="全部状态" :value="null" />
          <el-option label="运行中" :value="StatusEnum.RUNNING" />
          <el-option label="已停止" :value="StatusEnum.STOPPED" />
        </el-select>
      </el-col>
      <el-col :xs="24" :sm="6" :md="6" :lg="6">
        <el-space :wrap="true">
          <el-button :loading="loading" @click="$emit('refresh')">
            <el-icon>
              <svg
                viewBox="0 0 1024 1024"
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
              >
                <path
                  fill="currentColor"
                  d="M784.512 230.272v-50.56a32 32 0 1 1 64 0v149.056a32 32 0 0 1-32 32H667.52a32 32 0 1 1 0-64h92.992A320 320 0 1 0 524.8 833.152a320 320 0 0 0 320-320h64a384 384 0 0 1-384 384 384 384 0 0 1-384-384 384 384 0 0 1 643.712-282.88z"
                />
              </svg>
            </el-icon>
            刷新
          </el-button>
          <el-button type="primary" @click="$emit('add')">
            <el-icon>
              <svg
                viewBox="0 0 1024 1024"
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
              >
                <path
                  fill="currentColor"
                  d="M480 480V128a32 32 0 0 1 64 0v352h352a32 32 0 1 1 0 64H544v352a32 32 0 1 1-64 0V544H128a32 32 0 0 1 0-64h352z"
                />
              </svg>
            </el-icon>
            添加服务
          </el-button>
        </el-space>
      </el-col>
    </el-row>
  </el-card>
</template>

<style scoped>
</style>
