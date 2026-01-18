<script setup lang="ts">
import { computed } from "vue";
import { StatusEnum } from "@betterhyq/honeycomb-common";

const props = defineProps<{
	running: number;
	stopped: number;
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
		return [{ value: 100, color: "#e4e7ed", label: "暂无数据" }];
	}
	return [
		{
			value: runningPercent.value,
			color: "#67c23a",
			label: `运行中 (${props.running})`,
		},
		{
			value: stoppedPercent.value,
			color: "#e6a23c",
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
</script>

<template>
	<el-card shadow="hover" class="chart-card">
		<template #header>
			<div style="display: flex; justify-content: space-between; align-items: center">
				<span style="font-weight: 600; font-size: 16px">服务状态分布</span>
				<el-tag type="info" size="small">总计: {{ total }}</el-tag>
			</div>
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
						fill="#e4e7ed"
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
								:color="'#67c23a'"
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
								:color="'#e6a23c'"
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
</template>

<style scoped>
.chart-card {
	margin-bottom: 20px;
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
	transition: opacity 0.3s;
	cursor: pointer;
}

.pie-segment:hover {
	opacity: 0.8;
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
	border-radius: 4px;
	transition: background-color 0.3s;
}

.legend-item:hover {
	background-color: #f5f7fa;
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
	color: #606266;
}

.legend-value {
	font-weight: 600;
	color: #303133;
	font-size: 14px;
}

.chart-stats {
	margin-top: 20px;
	padding-top: 20px;
	border-top: 1px solid #ebeef5;
}

.stat-item {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.stat-label {
	font-size: 14px;
	color: #909399;
	font-weight: 500;
}

.stat-bar {
	width: 100%;
}

.stat-value {
	font-size: 16px;
	font-weight: 600;
	color: #303133;
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
</style>
