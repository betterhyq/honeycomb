<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import EditDrawer from './EditDrawer.vue'
import {
  getConfigs,
  getConfigById,
  createConfig,
  updateConfig,
  deleteConfig,
  startConfig,
  stopConfig,
  type ServiceConfig,
} from './api/configs'
import { StatusEnum } from '@jd-wmfe/honeycomb-type'

const activeIndex = ref('1')
const handleSelect = (key: string, keyPath: string[]) => {
  console.log(key, keyPath)
}

const drawer = ref(false)
const currentConfig = ref<ServiceConfig | null>(null)

// 搜索和筛选
const searchKeyword = ref('')
const statusFilter = ref<string | null>(null)
const loading = ref(false)
const configs = ref<ServiceConfig[]>([])

// 统计数据
const totalServices = computed(() => configs.value.length)
const runningServices = computed(() => configs.value.filter(item => item.status === StatusEnum.RUNNING).length)
const stoppedServices = computed(() => configs.value.filter(item => item.status === StatusEnum.STOPPED).length)

// 过滤后的数据
const filteredData = computed(() => {
  let result = configs.value

  // 搜索过滤
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(item => 
      item.name.toLowerCase().includes(keyword) ||
      item.description.toLowerCase().includes(keyword) ||
      item.version.toLowerCase().includes(keyword) ||
      item.tools.some(tool => 
        tool.name.toLowerCase().includes(keyword) ||
        tool.description.toLowerCase().includes(keyword)
      )
    )
  }

  // 状态过滤
  if (statusFilter.value) {
    result = result.filter(item => item.status === statusFilter.value)
  }

  return result
})

// 加载配置列表
const loadConfigs = async () => {
  loading.value = true
  try {
    const response = await getConfigs()
    if (response.code === 200) {
      configs.value = response.data
    } else {
      ElMessage.error(response.msg || '获取配置列表失败')
    }
  } catch (error) {
    console.error('加载配置列表失败:', error)
    ElMessage.error(error instanceof Error ? error.message : '加载配置列表失败')
  } finally {
    loading.value = false
  }
}

// 刷新数据
const handleRefresh = async () => {
  await loadConfigs()
  ElMessage.success('刷新成功')
}

// 启动服务
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
    .then(async () => {
      try {
        const response = await startConfig(id)
        if (response.code === 200) {
          ElMessage.success('启动成功')
          await loadConfigs() // 重新加载列表
        } else {
          ElMessage.error(response.msg || '启动失败')
        }
      } catch (error) {
        console.error('启动服务失败:', error)
        ElMessage.error(error instanceof Error ? error.message : '启动失败')
      }
    })
    .catch(() => {
      // 用户取消
    })
}

// 停止服务
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
    .then(async () => {
      try {
        const response = await stopConfig(id)
        if (response.code === 200) {
          ElMessage.success('停止成功')
          await loadConfigs() // 重新加载列表
        } else {
          ElMessage.error(response.msg || '停止失败')
        }
      } catch (error) {
        console.error('停止服务失败:', error)
        ElMessage.error(error instanceof Error ? error.message : '停止失败')
      }
    })
    .catch(() => {
      // 用户取消
    })
}

// 删除服务
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
    .then(async () => {
      try {
        const response = await deleteConfig(id)
        if (response.code === 200) {
          ElMessage.success('删除成功')
          await loadConfigs() // 重新加载列表
        } else {
          ElMessage.error(response.msg || '删除失败')
        }
      } catch (error) {
        console.error('删除服务失败:', error)
        ElMessage.error(error instanceof Error ? error.message : '删除失败')
      }
    })
    .catch(() => {
      // 用户取消
    })
}

// 编辑配置
const onEdit = async (id: number) => {
  try {
    loading.value = true
    const response = await getConfigById(id)
    if (response.code === 200) {
      currentConfig.value = response.data
      drawer.value = true
    } else {
      ElMessage.error(response.msg || '获取配置失败')
    }
  } catch (error) {
    console.error('获取配置失败:', error)
    ElMessage.error(error instanceof Error ? error.message : '获取配置失败')
  } finally {
    loading.value = false
  }
}

// 保存配置
const handleSave = async (config: ServiceConfig) => {
  try {
    loading.value = true
    let response
    
    if (config.id) {
      // 更新配置
      response = await updateConfig(config.id, {
        name: config.name,
        version: config.version,
        description: config.description,
        tools: config.tools.map(tool => ({
          name: tool.name,
          description: tool.description,
          input_schema: tool.input_schema,
          output_schema: tool.output_schema,
          callback: tool.callback,
        })),
      })
    } else {
      // 创建配置
      response = await createConfig({
        name: config.name,
        version: config.version,
        description: config.description,
        tools: config.tools.map(tool => ({
          name: tool.name,
          description: tool.description,
          input_schema: tool.input_schema,
          output_schema: tool.output_schema,
          callback: tool.callback,
        })),
      })
    }
    
    if (response.code === 200) {
      ElMessage.success('保存成功')
      drawer.value = false
      await loadConfigs() // 重新加载列表
    } else {
      ElMessage.error(response.msg || '保存失败')
    }
  } catch (error) {
    console.error('保存配置失败:', error)
    ElMessage.error(error instanceof Error ? error.message : '保存失败')
  } finally {
    loading.value = false
  }
}

// 添加配置
const onAdd = () => {
  currentConfig.value = null
  drawer.value = true
}

// 组件挂载时加载数据
onMounted(() => {
  loadConfigs()
})
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
        <!-- 统计信息卡片 -->
        <el-row :gutter="20" style="margin-bottom: 20px">
          <el-col :span="8">
            <el-card shadow="hover" class="stat-card">
              <div class="stat-content">
                <div class="stat-value">{{ totalServices }}</div>
                <div class="stat-label">总服务数</div>
              </div>
              <el-icon class="stat-icon" :size="40" color="#409EFF">
                <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
                  <path fill="currentColor" d="M832 384H576V128H192v768h640V384zm-26.496-64L640 154.496V320h165.504zM160 64h448l256 256v608a32 32 0 0 1-32 32H160a32 32 0 0 1-32-32V96a32 32 0 0 1 32-32z"/>
                  <path fill="currentColor" d="M240 512h544v64H240v-64zm0 192h544v64H240v-64zm0 128h320v64H240v-64z"/>
                </svg>
              </el-icon>
            </el-card>
          </el-col>
          <el-col :span="8">
            <el-card shadow="hover" class="stat-card stat-card-success">
              <div class="stat-content">
                <div class="stat-value">{{ runningServices }}</div>
                <div class="stat-label">运行中</div>
              </div>
              <el-icon class="stat-icon" :size="40" color="#67C23A">
                <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
                  <path fill="currentColor" d="M512 64a448 448 0 1 1 0 896 448 448 0 0 1 0-896zm23.744 191.488c-52.096 0-92.928 14.784-123.2 44.352-30.976 29.568-45.76 70.4-45.76 122.496 0 48.576 14.08 88.704 41.216 120.384 27.84 32.384 67.328 47.36 116.352 47.36 3.584 0 7.168-.128 10.752-.256a32 32 0 1 1 2.048 64c-4.608.128-9.216.256-13.824.256-139.264 0-244.608-78.336-244.608-231.488 0-70.4 22.144-128.512 65.024-172.032 43.584-44.224 101.888-66.048 176.128-66.048 3.584 0 7.168.128 10.752.256a32 32 0 1 1-2.048 64c-4.608-.256-9.216-.384-13.824-.384zm-12.8 383.36a32 32 0 0 1-22.656-54.656l128-128a32 32 0 0 1 45.312 45.312l-128 128a31.936 31.936 0 0 1-22.656 9.344z"/>
                </svg>
              </el-icon>
            </el-card>
          </el-col>
          <el-col :span="8">
            <el-card shadow="hover" class="stat-card stat-card-warning">
              <div class="stat-content">
                <div class="stat-value">{{ stoppedServices }}</div>
                <div class="stat-label">已停止</div>
              </div>
              <el-icon class="stat-icon" :size="40" color="#E6A23C">
                <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
                  <path fill="currentColor" d="M512 64a448 448 0 1 1 0 896 448 448 0 0 1 0-896zm0 192a32 32 0 0 0-32 32v256a32 32 0 0 0 64 0V288a32 32 0 0 0-32-32zm0 512a32 32 0 1 0 0-64 32 32 0 0 0 0 64z"/>
                </svg>
              </el-icon>
            </el-card>
          </el-col>
        </el-row>

        <!-- 搜索和筛选区域 -->
        <el-card shadow="never" style="margin-bottom: 20px">
          <el-row :gutter="16" align="middle">
            <el-col :span="12">
              <el-input
                v-model="searchKeyword"
                placeholder="搜索服务名称、描述、版本号或工具"
                clearable
                style="width: 100%"
              >
                <template #prefix>
                  <el-icon>
                    <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
                      <path fill="currentColor" d="m795.904 750.72 124.992 124.928a32 32 0 0 1-45.248 45.248L750.656 795.904a416 416 0 1 1 45.248-45.248zM480 832a352 352 0 1 0 0-704 352 352 0 0 0 0 704z"/>
                    </svg>
                  </el-icon>
                </template>
              </el-input>
            </el-col>
            <el-col :span="6">
              <el-select
                v-model="statusFilter"
                placeholder="全部状态"
                clearable
                style="width: 100%"
              >
                <el-option label="全部状态" :value="null" />
                <el-option label="运行中" :value="StatusEnum.RUNNING" />
                <el-option label="已停止" :value="StatusEnum.STOPPED" />
              </el-select>
            </el-col>
            <el-col :span="6">
              <el-space>
                <el-button
                  :loading="loading"
                  @click="handleRefresh"
                >
                  <el-icon style="margin-right: 5px">
                    <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
                      <path fill="currentColor" d="M784.512 230.272v-50.56a32 32 0 1 1 64 0v149.056a32 32 0 0 1-32 32H667.52a32 32 0 1 1 0-64h92.992A320 320 0 1 0 524.8 833.152a320 320 0 0 0 320-320h64a384 384 0 0 1-384 384 384 384 0 0 1-384-384 384 384 0 0 1 643.712-282.88z"/>
                    </svg>
                  </el-icon>
                  刷新
                </el-button>
                <el-button type="primary" @click="onAdd">添加服务</el-button>
              </el-space>
            </el-col>
          </el-row>
        </el-card>

        <!-- 数据表格 -->
        <el-table
          v-loading="loading"
          :data="filteredData"
          style="width: 100%"
          stripe
          empty-text="暂无数据"
        >
          <el-table-column property="name" label="服务名" width="200" fixed="left" />
          <el-table-column property="version" label="版本号" width="100" />
          <el-table-column property="status" label="状态" width="120">
            <template #default="scope">
              <el-tag :type="scope.row.status === StatusEnum.RUNNING ? 'success' : 'warning'">{{ scope.row.statusText }}</el-tag>
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
              <el-button link type="primary" size="small" @click="onEdit(scope.row.id)">编辑</el-button>
              <el-button v-if="scope.row.status === StatusEnum.STOPPED" link type="success" size="small"
                @click="onStart(scope.row.id)">启动</el-button>
              <el-button v-if="scope.row.status === StatusEnum.RUNNING" link type="warning" size="small"
                @click="onStop(scope.row.id)">停止</el-button>
              <el-button link type="danger" size="small" @click="onDelete(scope.row.id)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <!-- 分页 -->
        <div style="margin-top: 20px; display: flex; justify-content: space-between; align-items: center">
          <el-text type="info" size="small">
            共 {{ filteredData.length }} 条记录
            <template v-if="searchKeyword || statusFilter">
              （已过滤）
            </template>
          </el-text>
          <el-pagination
            background
            layout="prev, pager, next"
            :total="filteredData.length"
            :page-size="10"
            :current-page="1"
          />
        </div>
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

.stat-card {
  position: relative;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.stat-content {
  position: relative;
  z-index: 1;
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

.stat-icon {
  position: absolute;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0.3;
}

.stat-card-success .stat-value {
  color: #67C23A;
}

.stat-card-warning .stat-value {
  color: #E6A23C;
}
</style>
