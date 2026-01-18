<script setup lang="ts">
import { computed } from "vue";
import { StatusEnum } from "@betterhyq/honeycomb-common";
import type { ServiceConfig } from "../api/configs";

const props = defineProps<{
	running: number;
	stopped: number;
	configs?: ServiceConfig[];
	totalTools?: number;
}>();

const total = computed(() => props.running + props.stopped);
const runningPercent = computed(() =>
	total.value > 0 ? Math.round((props.running / total.value) * 100) : 0,
);
const stoppedPercent = computed(() =>
	total.value > 0 ? Math.round((props.stopped / total.value) * 100) : 0,
);

// 饼图数据
const pieData = computed(() => {
	if (total.value === 0) {
		return [
			{ value: 100, color: "var(--el-border-color-light)", label: "暂无数据" },
		];
	}
	return [
		{
			value: runningPercent.value,
			color: "var(--el-color-success)",
			label: `运行中 (${props.running})`,
		},
		{
			value: stoppedPercent.value,
			color: "var(--el-color-warning)",
			label: `已停止 (${props.stopped})`,
		},
	].filter((item) => item.value > 0);
});

// 计算饼图路径
const getPiePath = (startPercent: number, endPercent: number, radius = 50) => {
	const startAngle = (startPercent / 100) * 2 * Math.PI - Math.PI / 2;
	const endAngle = (endPercent / 100) * 2 * Math.PI - Math.PI / 2;
	const x1 = 50 + radius * Math.cos(startAngle);
	const y1 = 50 + radius * Math.sin(startAngle);
	const x2 = 50 + radius * Math.cos(endAngle);
	const y2 = 50 + radius * Math.sin(endAngle);
	const largeArcFlag = endPercent - startPercent > 50 ? 1 : 0;
	return `M 50 50 L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
};

// 生成饼图路径
const piePaths = computed(() => {
	let currentPercent = 0;
	return pieData.value.map((item) => {
		const start = currentPercent;
		const end = currentPercent + item.value;
		currentPercent = end;
		return {
			...item,
			path: getPiePath(start, end),
			startPercent: start,
			endPercent: end,
		};
	});
});

// 工具数量分布数据
const toolsDistribution = computed(() => {
	if (!props.configs || props.configs.length === 0) return [];

	const distribution: Record<number, number> = {};
	props.configs.forEach((config) => {
		const toolCount = config.tools.length;
		distribution[toolCount] = (distribution[toolCount] || 0) + 1;
	});

	return Object.entries(distribution)
		.map(([count, num]) => ({
			toolCount: parseInt(count),
			serviceCount: num,
		}))
		.sort((a, b) => a.toolCount - b.toolCount);
});

// 工具数量最多的服务排行（Top 5）
const topServicesByTools = computed(() => {
	if (!props.configs || props.configs.length === 0) return [];

	return [...props.configs]
		.sort((a, b) => b.tools.length - a.tools.length)
		.slice(0, 5)
		.map((config) => ({
			name: config.name,
			toolCount: config.tools.length,
			status: config.status,
		}));
});

// 计算柱状图最大高度
const maxToolCount = computed(() => {
	if (toolsDistribution.value.length === 0) return 1;
	return Math.max(...toolsDistribution.value.map((d) => d.serviceCount));
});

// 计算排行最大工具数
const maxToolCountInTop = computed(() => {
	if (topServicesByTools.value.length === 0) return 1;
	return Math.max(...topServicesByTools.value.map((s) => s.toolCount));
});
</script>

<template>
	<div class="charts-container">
		<!-- 服务状态分布饼图 -->
		<el-card shadow="hover" class="chart-card">
			<template #header>
				<el-space :size="16" style="width: 100%" justify="space-between">
					<span class="el-text el-text--primary" style="font-weight: 600; font-size: 16px">服务状态分布</span>
					<el-tag type="info" size="small">总计: {{ total }}</el-tag>
				</el-space>
			</template>

		<div v-if="total === 0" class="empty-chart">
			<el-empty description="暂无数据" :image-size="80" />
		</div>

		<div v-else class="chart-container">
			<div class="pie-chart">
				<svg viewBox="0 0 100 100" class="pie-svg">
					<circle
						cx="50"
						cy="50"
						r="50"
						class="pie-background"
					/>
					<path
						v-for="(item, index) in piePaths"
						:key="index"
						:d="item.path"
						:fill="item.color"
						:stroke="item.color"
						stroke-width="0.5"
						class="pie-segment"
					/>
				</svg>
			</div>

			<div class="chart-legend">
				<div
					v-for="(item, index) in pieData"
					:key="index"
					class="legend-item"
				>
					<div class="legend-color" :style="{ backgroundColor: item.color }"></div>
					<span class="legend-label">{{ item.label }}</span>
					<span class="legend-value">{{ item.value }}%</span>
				</div>
			</div>
		</div>

		<div class="chart-stats">
			<el-row :gutter="20">
				<el-col :span="12">
					<div class="stat-item">
						<div class="stat-label">运行中</div>
						<div class="stat-bar">
						<el-progress
							:percentage="runningPercent"
							color="var(--el-color-success)"
							:stroke-width="20"
							:show-text="false"
						/>
						</div>
						<div class="stat-value">{{ props.running }} ({{ runningPercent }}%)</div>
					</div>
				</el-col>
				<el-col :span="12">
					<div class="stat-item">
						<div class="stat-label">已停止</div>
						<div class="stat-bar">
						<el-progress
							:percentage="stoppedPercent"
							color="var(--el-color-warning)"
							:stroke-width="20"
							:show-text="false"
						/>
						</div>
						<div class="stat-value">{{ props.stopped }} ({{ stoppedPercent }}%)</div>
					</div>
				</el-col>
			</el-row>
		</div>
		</el-card>

		<!-- 工具数量分布柱状图 -->
		<el-card v-if="props.configs && props.configs.length > 0" shadow="hover" class="chart-card">
			<template #header>
				<el-space :size="16" style="width: 100%" justify="space-between">
					<span class="el-text el-text--primary" style="font-weight: 600; font-size: 16px">工具数量分布</span>
					<el-tag type="info" size="small">工具总数: {{ totalTools || 0 }}</el-tag>
				</el-space>
			</template>

			<div v-if="toolsDistribution.length === 0" class="empty-chart">
				<el-empty description="暂无数据" :image-size="80" />
			</div>

			<div v-else class="bar-chart-container">
				<div class="bar-chart">
					<div
						v-for="(item, index) in toolsDistribution"
						:key="index"
						class="bar-item"
					>
						<div class="bar-wrapper">
							<div
								class="bar"
								:style="{
									height: `${(item.serviceCount / maxToolCount) * 100}%`,
								}"
							></div>
						</div>
						<div class="bar-label">{{ item.toolCount }} 个工具</div>
						<div class="bar-value">{{ item.serviceCount }}</div>
					</div>
				</div>
			</div>
		</el-card>

		<!-- 工具数量最多的服务排行 -->
		<el-card v-if="props.configs && props.configs.length > 0" shadow="hover" class="chart-card">
			<template #header>
				<span class="el-text el-text--primary" style="font-weight: 600; font-size: 16px">工具数量排行 (Top 5)</span>
			</template>

			<div v-if="topServicesByTools.length === 0" class="empty-chart">
				<el-empty description="暂无数据" :image-size="80" />
			</div>

			<div v-else class="ranking-list">
				<div
					v-for="(service, index) in topServicesByTools"
					:key="index"
					class="ranking-item"
				>
					<div class="ranking-number" :class="`rank-${index + 1}`">
						{{ index + 1 }}
					</div>
					<div class="ranking-content">
						<div class="ranking-name">{{ service.name }}</div>
						<div class="ranking-bar-wrapper">
							<div
								class="ranking-bar"
								:style="{
									width: `${(service.toolCount / maxToolCountInTop) * 100}%`,
								}"
							></div>
						</div>
					</div>
					<div class="ranking-value">
						<el-tag
							:type="service.status === StatusEnum.RUNNING ? 'success' : 'warning'"
							size="small"
						>
							{{ service.toolCount }} 个工具
						</el-tag>
					</div>
				</div>
			</div>
		</el-card>
	</div>
</template>

<style scoped>
.charts-container {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
	gap: 20px;
	margin-bottom: 20px;
}

.chart-card {
	margin-bottom: 0;
}

.empty-chart {
	display: flex;
	justify-content: center;
	align-items: center;
	min-height: 200px;
}

.chart-container {
	display: flex;
	justify-content: space-around;
	align-items: center;
	padding: 20px 0;
	gap: 40px;
}

.pie-chart {
	flex-shrink: 0;
}

.pie-svg {
	width: 200px;
	height: 200px;
}

.pie-segment {
	cursor: pointer;
}

.pie-background {
	fill: var(--el-border-color-light);
}

.bar {
	background-color: var(--el-color-primary);
}

.ranking-bar-wrapper {
	background-color: var(--el-border-color-lighter);
}

.ranking-bar {
	background-color: var(--el-color-primary);
}

.chart-legend {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 15px;
}

.legend-item {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 8px;
}

.legend-color {
	width: 16px;
	height: 16px;
	border-radius: 3px;
	flex-shrink: 0;
}

.legend-label {
	flex: 1;
	font-size: 14px;
}

.legend-value {
	font-weight: 600;
	font-size: 14px;
}

.chart-stats {
	margin-top: 20px;
	padding-top: 20px;
}

.stat-item {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.stat-label {
	font-size: 14px;
	font-weight: 500;
}

.stat-bar {
	width: 100%;
}

.stat-value {
	font-size: 16px;
	font-weight: 600;
}

/* 响应式优化 */
@media (max-width: 768px) {
	.chart-container {
		flex-direction: column;
		gap: 20px;
	}

	.pie-svg {
		width: 150px;
		height: 150px;
	}

	.chart-legend {
		width: 100%;
	}
}

/* 柱状图样式 */
.bar-chart-container {
	padding: 20px 0;
	height: 100%;
}

.bar-chart {
	display: flex;
	justify-content: space-around;
	align-items: flex-end;
	height: 100%;
	gap: 10px;
}

.bar-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	flex: 1;
	gap: 8px;
}

.bar-wrapper {
	width: 100%;
	height: 150px;
	display: flex;
	align-items: flex-end;
	justify-content: center;
}

.bar {
	width: 80%;
	min-height: 4px;
	border-radius: 4px 4px 0 0;
	cursor: pointer;
}

.bar-label {
	font-size: 12px;
	text-align: center;
}

.bar-value {
	font-size: 16px;
	font-weight: 600;
}

/* 排行列表样式 */
.ranking-list {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 10px 0;
}

.ranking-item {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 12px;
}

.ranking-number {
	width: 32px;
	height: 32px;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	font-weight: 700;
	font-size: 16px;
	color: #fff;
	flex-shrink: 0;
}

.ranking-number.rank-1 {
	background: #ffd700;
	color: #333;
}

.ranking-number.rank-2 {
	background: #c0c0c0;
	color: #333;
}

.ranking-number.rank-3 {
	background: #cd7f32;
	color: #fff;
}

.ranking-number:not(.rank-1):not(.rank-2):not(.rank-3) {
	background: #909399;
}

.ranking-content {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.ranking-name {
	font-size: 14px;
	font-weight: 500;
}

.ranking-bar-wrapper {
	width: 100%;
	height: 8px;
	border-radius: 4px;
	overflow: hidden;
}

.ranking-bar {
	height: 100%;
	border-radius: 4px;
}

.ranking-value {
	flex-shrink: 0;
}

/* 响应式优化 */
@media (max-width: 1200px) {
	.charts-container {
		grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
	}
}

@media (max-width: 768px) {
	.charts-container {
		grid-template-columns: 1fr;
	}

	.bar-chart {
		height: 150px;
	}

	.bar-wrapper {
		height: 100px;
	}
}
</style>
