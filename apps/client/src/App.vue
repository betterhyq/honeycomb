<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import mockData from '../../mocks/api.v1.queryConfigs.mock.json'
import EditDrawer from './EditDrawer.vue'

const activeIndex = ref('1')
const handleSelect = (key: string, keyPath: string[]) => {
  console.log(key, keyPath)
}

const drawer = ref(false)
const currentConfig = ref<any>(null)

const onStart = (id: number) => {
  ElMessageBox.confirm(
    '确定要启动该服务吗？',
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
    .then(() => {
      ElMessage({
        type: 'success',
        message: '启动成功',
      })
    })
    .catch(() => {
      ElMessage({
        type: 'info',
        message: '启动失败',
      })
    })
}

const onStop = (id: number) => {
  ElMessageBox.confirm(
    '确定要停止该服务吗？',
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
    .then(() => {
      ElMessage({
        type: 'success',
        message: '停止成功',
      })
    })
    .catch(() => {
      ElMessage({
        type: 'info',
        message: '停止失败',
      })
    })
}

const onDelete = (id: number) => {
  ElMessageBox.confirm(
    '确定要删除该服务吗？',
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
    .then(() => {
      ElMessage({
        type: 'success',
        message: '删除成功',
      })
    })
    .catch(() => {
      ElMessage({
        type: 'info',
        message: '删除失败',
      })
    })
}

const onEdit = (id: number) => {
  const config = mockData.data.find(item => item.id === id)
  currentConfig.value = config || null
  drawer.value = true
}

const handleSave = (config: any) => {
  // 这里可以调用 API 保存配置
  console.log('保存配置:', config)
  // 更新 mockData 中的数据
  const index = mockData.data.findIndex(item => item.id === config.id)
  if (index !== -1) {
    mockData.data[index] = config
  } else {
    // 新建
    config.id = Math.max(...mockData.data.map(item => item.id)) + 1
    mockData.data.push(config)
  }
}
</script>

<template>
  <el-watermark content="honeycomb">
    <el-container>
      <el-header>
        <el-menu :default-active="activeIndex" class="el-menu-demo" mode="horizontal" :ellipsis="false"
          @select="handleSelect" :style="{ flex: 1 }">
          <el-menu-item index="0">
            <img style="width: 100px" src="https://element-plus.org/images/element-plus-logo.svg" alt="Element logo" />
          </el-menu-item>
          <el-menu-item index="1">MCP 服务</el-menu-item>
          <el-menu-item index="2">
            <el-icon :size="30">
              <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="100" height="100" viewBox="0 0 30 30">
                <path
                  d="M15,3C8.373,3,3,8.373,3,15c0,5.623,3.872,10.328,9.092,11.63C12.036,26.468,12,26.28,12,26.047v-2.051 c-0.487,0-1.303,0-1.508,0c-0.821,0-1.551-0.353-1.905-1.009c-0.393-0.729-0.461-1.844-1.435-2.526 c-0.289-0.227-0.069-0.486,0.264-0.451c0.615,0.174,1.125,0.596,1.605,1.222c0.478,0.627,0.703,0.769,1.596,0.769 c0.433,0,1.081-0.025,1.691-0.121c0.328-0.833,0.895-1.6,1.588-1.962c-3.996-0.411-5.903-2.399-5.903-5.098 c0-1.162,0.495-2.286,1.336-3.233C9.053,10.647,8.706,8.73,9.435,8c1.798,0,2.885,1.166,3.146,1.481C13.477,9.174,14.461,9,15.495,9 c1.036,0,2.024,0.174,2.922,0.483C18.675,9.17,19.763,8,21.565,8c0.732,0.731,0.381,2.656,0.102,3.594 c0.836,0.945,1.328,2.066,1.328,3.226c0,2.697-1.904,4.684-5.894,5.097C18.199,20.49,19,22.1,19,23.313v2.734 c0,0.104-0.023,0.179-0.035,0.268C23.641,24.676,27,20.236,27,15C27,8.373,21.627,3,15,3z">
                </path>
              </svg>
            </el-icon>
          </el-menu-item>
        </el-menu>
      </el-header>
      <el-main>
        <el-table :data="mockData.data" style="width: 100%" stripe>
          <el-table-column property="name" label="服务名" width="200" fixed="left" />
          <el-table-column property="version" label="版本号" width="100" />
          <el-table-column property="status" label="状态" width="120">
            <template #default="scope">
              <el-tag :type="scope.row.status === 'running' ? 'success' : 'warning'">{{ scope.row.statusText }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column property="description" label="描述" show-overflow-tooltip width="400" />
          <el-table-column property="tools" label="工具" width="400">
            <template #default="scope">
              <template v-for="tool in scope.row.tools" :key="tool.name">
                <div>
                  <el-tag type="info" size="small">{{ tool.name }}</el-tag>
                  <el-divider direction="vertical" />
                  <el-text>{{ tool.description }}</el-text>
                </div>
              </template>
            </template>
          </el-table-column>
          <el-table-column property="createdAt" label="创建时间" width="200" />
          <el-table-column property="lastModified" label="最后修改时间" width="200" />


          <el-table-column fixed="right" width="160">
            <template #default="scope">
              <el-button link type="primary" size="small" @click="onEdit(scope.row.id)">编辑</el-button>
              <el-button v-if="scope.row.status === 'stopped'" link type="success" size="small"
                @click="onStart(scope.row.id)">启动</el-button>
              <el-button v-if="scope.row.status === 'running'" link type="warning" size="small"
                @click="onStop(scope.row.id)">停止</el-button>
              <el-button link type="danger" size="small" @click="onDelete(scope.row.id)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-pagination background layout="prev, pager, next" :total="1000" :style="{ 'justify-content': 'flex-end' }" />
      </el-main>
    </el-container>
    <el-backtop :right="100" :bottom="100" />

    <EditDrawer
      v-model="drawer"
      :config="currentConfig"
      @save="handleSave"
    />
  </el-watermark>
</template>

<style scoped>
.el-menu--horizontal>.el-menu-item:nth-child(1) {
  margin-right: auto;
}
</style>
