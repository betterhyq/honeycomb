<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { DrawerProps } from 'element-plus'

interface Tool {
  name: string
  description: string
  inputSchema: string
  outputSchema: string
  callback: string
}

interface ServiceConfig {
  id: number
  name: string
  version: string
  status: 'running' | 'stopped'
  statusText: string
  description: string
  tools: Tool[]
  createdAt: string
  lastModified: string
}

const props = defineProps<{
  modelValue: boolean
  config?: ServiceConfig | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'save': [config: ServiceConfig]
}>()

const direction = ref<DrawerProps['direction']>('rtl')

// 表单数据
const formData = ref<ServiceConfig>({
  id: 0,
  name: '',
  version: '',
  status: 'stopped',
  statusText: '已停止',
  description: '',
  tools: [],
  createdAt: '',
  lastModified: ''
})

// 当前编辑的工具索引
const editingToolIndex = ref<number | null>(null)
const toolForm = ref<Partial<Tool>>({
  name: '',
  description: '',
  inputSchema: '',
  outputSchema: '',
  callback: ''
})

// 监听配置变化，初始化表单
watch(() => props.config, (newConfig) => {
  if (newConfig) {
    formData.value = {
      ...newConfig,
      tools: newConfig.tools.map(tool => ({ ...tool }))
    }
  } else {
    // 新建模式
    formData.value = {
      id: 0,
      name: '',
      version: '',
      status: 'stopped',
      statusText: '已停止',
      description: '',
      tools: [],
      createdAt: new Date().toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/\//g, '-'),
      lastModified: new Date().toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/\//g, '-')
    }
  }
}, { immediate: true })

// 状态选项
const statusOptions = [
  { label: '运行中', value: 'running', text: '运行中' },
  { label: '已停止', value: 'stopped', text: '已停止' }
]

// 计算属性：是否显示抽屉
const drawerVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 关闭抽屉
const handleClose = (done: () => void) => {
  ElMessageBox.confirm('确定要关闭吗？未保存的更改将丢失。', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(() => {
      done()
    })
    .catch(() => {
      // 取消关闭
    })
}

// 添加工具
const addTool = () => {
  editingToolIndex.value = formData.value.tools.length
  toolForm.value = {
    name: '',
    description: '',
    inputSchema: '',
    outputSchema: '',
    callback: ''
  }
}

// 编辑工具
const editTool = (index: number) => {
  if (index < 0 || index >= formData.value.tools.length) return
  editingToolIndex.value = index
  const tool = formData.value.tools[index]
  toolForm.value = {
    name: tool?.name,
    description: tool?.description,
    inputSchema: tool?.inputSchema,
    outputSchema: tool?.outputSchema,
    callback: tool?.callback
  }
}

// 保存工具
const saveTool = () => {
  if (!toolForm.value.name || !toolForm.value.description) {
    ElMessage.warning('请填写工具名称和描述')
    return
  }
  
  if (editingToolIndex.value === null) return
  
  const tool: Tool = {
    name: toolForm.value.name || '',
    description: toolForm.value.description || '',
    inputSchema: toolForm.value.inputSchema || '',
    outputSchema: toolForm.value.outputSchema || '',
    callback: toolForm.value.callback || ''
  }
  
  if (editingToolIndex.value === formData.value.tools.length) {
    // 新增
    formData.value.tools.push(tool)
  } else {
    // 编辑
    formData.value.tools[editingToolIndex.value] = tool
  }
  
  editingToolIndex.value = null
  toolForm.value = {
    name: '',
    description: '',
    inputSchema: '',
    outputSchema: '',
    callback: ''
  }
  ElMessage.success('工具保存成功')
}

// 取消编辑工具
const cancelEditTool = () => {
  editingToolIndex.value = null
  toolForm.value = {
    name: '',
    description: '',
    inputSchema: '',
    outputSchema: '',
    callback: ''
  }
}

// 删除工具
const deleteTool = (index: number) => {
  ElMessageBox.confirm('确定要删除该工具吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(() => {
      formData.value.tools.splice(index, 1)
      ElMessage.success('删除成功')
    })
    .catch(() => {})
}

// 保存配置
const saveConfig = () => {
  if (!formData.value.name || !formData.value.version || !formData.value.description) {
    ElMessage.warning('请填写服务名称、版本号和描述')
    return
  }
  
  // 更新状态文本
  const statusOption = statusOptions.find(opt => opt.value === formData.value.status)
  if (statusOption) {
    formData.value.statusText = statusOption.text
  }
  
  // 更新最后修改时间
  formData.value.lastModified = new Date().toLocaleString('zh-CN', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit', 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  }).replace(/\//g, '-')
  
  emit('save', { ...formData.value })
  drawerVisible.value = false
  ElMessage.success('保存成功')
}

// 取消
const cancel = () => {
  drawerVisible.value = false
}
</script>

<template>
  <el-drawer
    v-model="drawerVisible"
    :direction="direction"
    size="60%"
    :before-close="handleClose"
  >
    <template #header>
      <h3>{{ config ? '编辑服务配置' : '新建服务配置' }}</h3>
    </template>
    
    <template #default>
      <el-form :model="formData" label-width="120px" label-position="left">
        <!-- 基本信息 -->
        <el-divider content-position="left">基本信息</el-divider>
        
        <el-form-item label="服务名称" required>
          <el-input v-model="formData.name" placeholder="请输入服务名称" />
        </el-form-item>
        
        <el-form-item label="版本号" required>
          <el-input v-model="formData.version" placeholder="例如: 1.0.0" />
        </el-form-item>
        
        <el-form-item label="状态">
          <el-radio-group v-model="formData.status">
            <el-radio label="running">运行中</el-radio>
            <el-radio label="stopped">已停止</el-radio>
          </el-radio-group>
        </el-form-item>
        
        <el-form-item label="描述" required>
          <el-input
            v-model="formData.description"
            type="textarea"
            :rows="3"
            placeholder="请输入服务描述"
          />
        </el-form-item>
        
        <!-- 工具列表 -->
        <el-divider content-position="left">
          <span>工具列表</span>
          <el-button
            type="primary"
            size="small"
            style="margin-left: 10px"
            @click="addTool"
          >
            添加工具
          </el-button>
        </el-divider>
        
        <!-- 工具编辑表单 -->
        <el-card v-if="editingToolIndex !== null" style="margin-bottom: 20px" shadow="hover">
          <template #header>
            <div style="display: flex; justify-content: space-between; align-items: center">
              <span>{{ editingToolIndex === formData.tools.length ? '新增工具' : '编辑工具' }}</span>
              <div>
                <el-button size="small" @click="cancelEditTool">取消</el-button>
                <el-button type="primary" size="small" @click="saveTool">保存</el-button>
              </div>
            </div>
          </template>
          
          <el-form :model="toolForm" label-width="100px">
            <el-form-item label="工具名称" required>
              <el-input v-model="toolForm.name" placeholder="请输入工具名称" />
            </el-form-item>
            
            <el-form-item label="工具描述" required>
              <el-input
                v-model="toolForm.description"
                type="textarea"
                :rows="2"
                placeholder="请输入工具描述"
              />
            </el-form-item>
            
            <el-form-item label="输入Schema">
              <el-input
                v-model="toolForm.inputSchema"
                type="textarea"
                :rows="4"
                placeholder="例如: {pattern: z.string().describe('文件搜索模式')}"
              />
            </el-form-item>
            
            <el-form-item label="输出Schema">
              <el-input
                v-model="toolForm.outputSchema"
                type="textarea"
                :rows="4"
                placeholder="例如: {files: z.array(z.string()).describe('文件列表')}"
              />
            </el-form-item>
            
            <el-form-item label="回调函数">
              <el-input
                v-model="toolForm.callback"
                type="textarea"
                :rows="6"
                placeholder="请输入回调函数代码"
              />
            </el-form-item>
          </el-form>
        </el-card>
        
        <!-- 工具列表展示 -->
        <el-card
          v-for="(tool, index) in formData.tools"
          :key="index"
          style="margin-bottom: 15px"
          shadow="hover"
        >
          <template #header>
            <div style="display: flex; justify-content: space-between; align-items: center">
              <div>
                <el-tag type="info" size="small">{{ tool.name }}</el-tag>
                <span style="margin-left: 10px; color: #666">{{ tool.description }}</span>
              </div>
              <div>
                <el-button
                  type="primary"
                  size="small"
                  link
                  @click="editTool(index)"
                >
                  编辑
                </el-button>
                <el-button
                  type="danger"
                  size="small"
                  link
                  @click="deleteTool(index)"
                >
                  删除
                </el-button>
              </div>
            </div>
          </template>
          
          <div style="font-size: 12px; color: #999">
            <div style="margin-bottom: 5px">
              <strong>输入Schema:</strong> {{ tool.inputSchema || '未设置' }}
            </div>
            <div style="margin-bottom: 5px">
              <strong>输出Schema:</strong> {{ tool.outputSchema || '未设置' }}
            </div>
            <div>
              <strong>回调函数:</strong> {{ tool.callback ? '已设置' : '未设置' }}
            </div>
          </div>
        </el-card>
        
        <el-empty v-if="formData.tools.length === 0 && editingToolIndex === null" description="暂无工具，点击上方按钮添加" />
      </el-form>
    </template>
    
    <template #footer>
      <div style="display: flex; justify-content: flex-end; gap: 10px">
        <el-button @click="cancel">取消</el-button>
        <el-button type="primary" @click="saveConfig">保存</el-button>
      </div>
    </template>
  </el-drawer>
</template>

<style scoped>
.el-divider {
  margin: 20px 0;
}

.el-form-item {
  margin-bottom: 20px;
}
</style>
