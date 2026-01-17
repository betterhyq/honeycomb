<script setup lang="ts">
import { StatusEnum } from "@jd-wmfe/honeycomb-common";
import type { ServiceConfig } from "../api/configs";

defineProps<{
  loading: boolean;
  data: ServiceConfig[];
}>();

const emit = defineEmits<{
  edit: [id: number];
  start: [id: number];
  stop: [id: number];
  delete: [id: number];
}>();
</script>

<template>
  <el-table v-loading="loading" :data="data" style="width: 100%" stripe empty-text="暂无数据">
    <el-table-column property="name" label="服务名" width="200" fixed="left" />
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
          <el-tag
            v-for="tool in scope.row.tools"
            :key="tool.name"
            type="info"
            size="small"
            effect="plain"
            :title="tool.description"
          >
            {{ tool.name }}
          </el-tag>
          <el-text v-if="scope.row.tools.length === 0" type="info" size="small">暂无工具</el-text>
        </el-space>
      </template>
    </el-table-column>
    <el-table-column property="createdAt" label="创建时间" width="200" />
    <el-table-column property="lastModified" label="最后修改时间" width="200" />

    <el-table-column fixed="right" width="160">
      <template #default="scope">
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
</template>
