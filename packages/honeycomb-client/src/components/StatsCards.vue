<script setup lang="ts">
defineProps<{
	totalServices: number;
	runningServices: number;
	stoppedServices: number;
	totalTools?: number;
}>();
</script>

<template>
  <el-row :gutter="20" style="margin-bottom: 20px">
    <el-col :xs="24" :sm="12" :md="6" :lg="6">
      <el-card shadow="hover">
        <div>
          <div style="font-size: 36px; font-weight: 700; color: #303133; margin-bottom: 8px;">{{ totalServices }}</div>
          <div style="font-size: 14px; color: #909399;">总服务数</div>
        </div>
        <el-icon :size="40" color="#409EFF" style="position: absolute; right: 20px; top: 50%; transform: translateY(-50%); opacity: 0.25;">
          <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
            <path
              fill="currentColor"
              d="M832 384H576V128H192v768h640V384zm-26.496-64L640 154.496V320h165.504zM160 64h448l256 256v608a32 32 0 0 1-32 32H160a32 32 0 0 1-32-32V96a32 32 0 0 1 32-32z"
            />
            <path
              fill="currentColor"
              d="M240 512h544v64H240v-64zm0 192h544v64H240v-64zm0 128h320v64H240v-64z"
            />
          </svg>
        </el-icon>
      </el-card>
    </el-col>
    <el-col :xs="24" :sm="12" :md="6" :lg="6">
      <el-card shadow="hover">
        <div>
          <div style="font-size: 36px; font-weight: 700; color: #67C23A; margin-bottom: 8px;">{{ runningServices }}</div>
          <div style="font-size: 14px; color: #909399;">运行中</div>
        </div>
        <el-icon :size="40" color="#67C23A" style="position: absolute; right: 20px; top: 50%; transform: translateY(-50%); opacity: 0.25;">
          <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
            <path
              fill="currentColor"
              d="M512 64a448 448 0 1 1 0 896 448 448 0 0 1 0-896zm23.744 191.488c-52.096 0-92.928 14.784-123.2 44.352-30.976 29.568-45.76 70.4-45.76 122.496 0 48.576 14.08 88.704 41.216 120.384 27.84 32.384 67.328 47.36 116.352 47.36 3.584 0 7.168-.128 10.752-.256a32 32 0 1 1 2.048 64c-4.608.128-9.216.256-13.824.256-139.264 0-244.608-78.336-244.608-231.488 0-70.4 22.144-128.512 65.024-172.032 43.584-44.224 101.888-66.048 176.128-66.048 3.584 0 7.168.128 10.752.256a32 32 0 1 1-2.048 64c-4.608-.256-9.216-.384-13.824-.384zm-12.8 383.36a32 32 0 0 1-22.656-54.656l128-128a32 32 0 0 1 45.312 45.312l-128 128a31.936 31.936 0 0 1-22.656 9.344z"
            />
          </svg>
        </el-icon>
      </el-card>
    </el-col>
    <el-col :xs="24" :sm="12" :md="6" :lg="6">
      <el-card shadow="hover">
        <div>
          <div style="font-size: 36px; font-weight: 700; color: #E6A23C; margin-bottom: 8px;">{{ stoppedServices }}</div>
          <div style="font-size: 14px; color: #909399;">已停止</div>
        </div>
        <el-icon :size="40" color="#E6A23C" style="position: absolute; right: 20px; top: 50%; transform: translateY(-50%); opacity: 0.25;">
          <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
            <path
              fill="currentColor"
              d="M512 64a448 448 0 1 1 0 896 448 448 0 0 1 0-896zm0 192a32 32 0 0 0-32 32v256a32 32 0 0 0 64 0V288a32 32 0 0 0-32-32zm0 512a32 32 0 1 0 0-64 32 32 0 0 0 0 64z"
            />
          </svg>
        </el-icon>
      </el-card>
    </el-col>
    <el-col :xs="24" :sm="12" :md="6" :lg="6">
      <el-card shadow="hover">
        <div>
          <div style="font-size: 36px; font-weight: 700; color: #909399; margin-bottom: 8px;">{{ totalTools ?? 0 }}</div>
          <div style="font-size: 14px; color: #909399;">工具总数</div>
        </div>
        <el-icon :size="40" color="#909399" style="position: absolute; right: 20px; top: 50%; transform: translateY(-50%); opacity: 0.25;">
          <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
            <path
              fill="currentColor"
              d="M765.7 486.8L314.9 134.7A7.97 7.97 0 0 0 302 141v77.3c0 4.9 2.3 9.6 6.1 12.6l360 281.1-360 281.1c-3.9 3-6.1 7.7-6.1 12.6V883c0 6.7 7.7 10.4 12.9 6.3l450.8-352.1a31.96 31.96 0 0 0 0-50.4z"
            />
          </svg>
        </el-icon>
      </el-card>
    </el-col>
  </el-row>
</template>

<style scoped>
.el-card {
  position: relative;
}
</style>
