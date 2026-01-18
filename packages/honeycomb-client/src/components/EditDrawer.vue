<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import type { DrawerProps } from "element-plus";
import type { ServiceConfig } from "../api/configs";
import { StatusEnum, StatusTextMap } from "@betterhyq/honeycomb-common";
import { useToolEditor } from "../composables/useToolEditor";
import hljs from "highlight.js";
import "highlight.js/styles/github.min.css";

const props = defineProps<{
	modelValue: boolean;
	config?: ServiceConfig | null;
}>();

const emit = defineEmits<{
	"update:modelValue": [value: boolean];
	save: [config: ServiceConfig];
}>();

const direction = ref<DrawerProps["direction"]>("rtl");

// 表单数据
const formData = ref<ServiceConfig>({
	id: 0,
	name: "",
	version: "",
	status: StatusEnum.STOPPED,
	statusText: StatusTextMap.get(StatusEnum.STOPPED) || "已停止",
	description: "",
	tools: [],
	createdAt: "",
	lastModified: "",
});

// 使用工具编辑 composable
const {
	editingToolIndex,
	toolForm,
	addTool: addToolHelper,
	editTool: editToolHelper,
	saveTool: saveToolHelper,
	cancelEditTool,
	deleteTool: deleteToolHelper,
} = useToolEditor();

// 监听配置变化，初始化表单
watch(
	() => props.config,
	(newConfig) => {
		if (newConfig) {
			formData.value = {
				...newConfig,
				tools: newConfig.tools.map((tool) => ({ ...tool })),
			};
		} else {
			// 新建模式
			formData.value = {
				id: 0,
				name: "",
				version: "",
				status: StatusEnum.STOPPED,
				statusText: StatusTextMap.get(StatusEnum.STOPPED) || "已停止",
				description: "",
				tools: [],
				createdAt: new Date()
					.toLocaleString("zh-CN", {
						year: "numeric",
						month: "2-digit",
						day: "2-digit",
						hour: "2-digit",
						minute: "2-digit",
						second: "2-digit",
					})
					.replace(/\//g, "-"),
				lastModified: new Date()
					.toLocaleString("zh-CN", {
						year: "numeric",
						month: "2-digit",
						day: "2-digit",
						hour: "2-digit",
						minute: "2-digit",
						second: "2-digit",
					})
					.replace(/\//g, "-"),
			};
		}
	},
	{ immediate: true },
);

// 状态选项
const statusOptions = [
	{
		label: "运行中",
		value: StatusEnum.RUNNING,
		text: StatusTextMap.get(StatusEnum.RUNNING) || "运行中",
	},
	{
		label: "已停止",
		value: StatusEnum.STOPPED,
		text: StatusTextMap.get(StatusEnum.STOPPED) || "已停止",
	},
];

// 计算属性：是否显示抽屉
const drawerVisible = computed({
	get: () => props.modelValue,
	set: (value) => emit("update:modelValue", value),
});

// 关闭抽屉
const handleClose = (done: () => void) => {
	ElMessageBox.confirm("确定要关闭吗？未保存的更改将丢失。", "提示", {
		confirmButtonText: "确定",
		cancelButtonText: "取消",
		type: "warning",
	})
		.then(() => {
			done();
		})
		.catch(() => {
			// 取消关闭
		});
};

// 添加工具
const addTool = () => {
	addToolHelper(formData.value.tools);
};

// 编辑工具
const editTool = (index: number) => {
	editToolHelper(index, formData.value.tools);
};

// 保存工具
const saveTool = () => {
	saveToolHelper(formData.value.tools);
};

// 删除工具
const deleteTool = (index: number) => {
	deleteToolHelper(index, formData.value.tools);
};

// 保存配置
const saveConfig = () => {
	if (
		!formData.value.name ||
		!formData.value.version ||
		!formData.value.description
	) {
		ElMessage.warning("请填写服务名称、版本号和描述");
		return;
	}

	// 更新状态文本
	const statusOption = statusOptions.find(
		(opt) => opt.value === formData.value.status,
	);
	if (statusOption) {
		formData.value.statusText = statusOption.text;
	}

	// 更新最后修改时间
	formData.value.lastModified = new Date()
		.toLocaleString("zh-CN", {
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		})
		.replace(/\//g, "-");

	emit("save", { ...formData.value });
	// 注意：不在这里关闭抽屉和显示消息，由父组件处理（因为涉及异步 API 调用）
};

// 取消
const cancel = () => {
	drawerVisible.value = false;
};

// 格式化 JSON
const formatJSON = (str: string): string => {
	if (!str || !str.trim()) return "";
	try {
		// 先尝试直接解析 JSON
		const parsed = JSON.parse(str);
		return JSON.stringify(parsed, null, 2);
	} catch {
		// 如果不是有效的 JSON，尝试作为 JavaScript 对象字面量解析
		try {
			// 使用 Function 构造器安全地解析对象字面量
			const cleaned = str.trim();
			if (cleaned.startsWith("{") || cleaned.startsWith("[")) {
				const parsed = new Function("return " + cleaned)();
				return JSON.stringify(parsed, null, 2);
			}
			return str;
		} catch {
			// 如果都失败了，返回原字符串
			return str;
		}
	}
};

// 格式化 JavaScript 代码（简单版本）
const formatJavaScript = (code: string): string => {
	if (!code || !code.trim()) return "";
	// 基本的代码格式化：处理常见的代码结构
	let formatted = code.trim();

	// 在函数声明后添加换行
	formatted = formatted.replace(/(function\s+\w+\s*\([^)]*\)\s*\{)/g, "$1\n  ");
	// 在箭头函数后添加换行
	formatted = formatted.replace(/(\([^)]*\)\s*=>\s*\{)/g, "$1\n  ");
	// 在 if/for/while 等语句后添加换行
	formatted = formatted.replace(
		/(if|for|while|switch)\s*\([^)]*\)\s*\{/g,
		"$1\n  ",
	);
	// 在 return 语句后添加换行（如果不是单行）
	formatted = formatted.replace(/return\s+([^;]+);/g, (match, expr) => {
		if (expr.includes("{") || expr.includes("(")) {
			return "return " + expr + ";\n";
		}
		return match;
	});

	return formatted;
};

// 高亮代码
const highlightCode = (
	code: string,
	language: "json" | "javascript",
): string => {
	if (!code) return "";
	try {
		return hljs.highlight(code, { language }).value;
	} catch {
		return code;
	}
};

// 获取格式化的 Schema 显示
const getFormattedSchema = (schema: string): string => {
	if (!schema) return "未设置";
	try {
		return formatJSON(schema);
	} catch {
		return schema;
	}
};

// 获取格式化的回调函数显示
const getFormattedCallback = (callback: string): string => {
	if (!callback) return "未设置";
	return formatJavaScript(callback);
};
</script>

<template>
  <el-drawer v-model="drawerVisible" :direction="direction" size="60%" :before-close="handleClose">
    <template #header>
      <h3>{{ config ? "编辑服务配置" : "新建服务配置" }}</h3>
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
            <el-radio :label="StatusEnum.RUNNING">运行中</el-radio>
            <el-radio :label="StatusEnum.STOPPED">已停止</el-radio>
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
          <el-button type="primary" size="small" style="margin-left: 10px" @click="addTool">
            添加工具
          </el-button>
        </el-divider>

        <!-- 工具编辑表单 -->
        <el-card v-if="editingToolIndex !== null" style="margin-bottom: 20px" shadow="hover">
          <template #header>
            <div style="display: flex; justify-content: space-between; align-items: center">
              <span>{{
                editingToolIndex === formData.tools.length ? "新增工具" : "编辑工具"
              }}</span>
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
                v-model="toolForm.input_schema"
                type="textarea"
                :rows="8"
                placeholder="例如: JSON 格式的 Schema"
                style="font-family: 'Courier New', monospace;"
              />
            </el-form-item>

            <el-form-item label="输出Schema">
              <el-input
                v-model="toolForm.output_schema"
                type="textarea"
                :rows="8"
                placeholder="例如: JSON 格式的 Schema"
                style="font-family: 'Courier New', monospace;"
              />
            </el-form-item>

            <el-form-item label="回调函数">
              <el-input
                v-model="toolForm.callback"
                type="textarea"
                :rows="10"
                placeholder="请输入回调函数代码"
                style="font-family: 'Courier New', monospace;"
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
                <el-button type="primary" size="small" link @click="editTool(index)">
                  编辑
                </el-button>
                <el-button type="danger" size="small" link @click="deleteTool(index)">
                  删除
                </el-button>
              </div>
            </div>
          </template>

          <div style="font-size: 12px;">
            <div style="margin-bottom: 15px">
              <div style="margin-bottom: 5px; font-weight: 600; color: #303133;">输入Schema:</div>
              <div v-if="tool.input_schema" class="code-block">
                <pre><code class="language-json" v-html="highlightCode(getFormattedSchema(tool.input_schema), 'json')"></code></pre>
              </div>
              <div v-else style="color: #999;">未设置</div>
            </div>
            <div style="margin-bottom: 15px">
              <div style="margin-bottom: 5px; font-weight: 600; color: #303133;">输出Schema:</div>
              <div v-if="tool.output_schema" class="code-block">
                <pre><code class="language-json" v-html="highlightCode(getFormattedSchema(tool.output_schema), 'json')"></code></pre>
              </div>
              <div v-else style="color: #999;">未设置</div>
            </div>
            <div>
              <div style="margin-bottom: 5px; font-weight: 600; color: #303133;">回调函数:</div>
              <div v-if="tool.callback" class="code-block">
                <pre><code class="language-javascript" v-html="highlightCode(getFormattedCallback(tool.callback), 'javascript')"></code></pre>
              </div>
              <div v-else style="color: #999;">未设置</div>
            </div>
          </div>
        </el-card>

        <el-empty
          v-if="formData.tools.length === 0 && editingToolIndex === null"
          description="暂无工具，点击上方按钮添加"
        />
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
.code-block {
  background-color: #f6f8fa;
  border: 1px solid #e1e4e8;
  border-radius: 4px;
  padding: 12px;
  overflow-x: auto;
  max-height: 300px;
  overflow-y: auto;
}

.code-block pre {
  margin: 0;
  padding: 0;
  background: transparent;
  font-family: 'Courier New', 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  line-height: 1.5;
  color: #24292e;
}

.code-block code {
  display: block;
  white-space: pre;
  word-wrap: normal;
  overflow-x: auto;
}

.code-block :deep(.hljs) {
  background: transparent;
  padding: 0;
}
</style>
