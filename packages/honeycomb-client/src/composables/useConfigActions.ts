import { ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import consola from "consola";
import {
  getConfigById,
  deleteConfig,
  startConfig,
  stopConfig,
  type ServiceConfig,
} from "../api/configs";

/**
 * 配置操作 composable
 */
export function useConfigActions(
  reloadConfigs: () => Promise<void>,
  findConfig: (id: number) => ServiceConfig | undefined,
) {
  const loading = ref(false);

  // 启动服务
  const handleStart = async (id: number) => {
    const config = findConfig(id);
    consola.info(`[Client] 用户请求启动服务: id=${id}, name=${config?.name || "unknown"}`);

    try {
      await ElMessageBox.confirm("确定要启动该服务吗？", "提示", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      });

      const startTime = Date.now();
      consola.info(`[Client] 用户确认启动服务: id=${id}`);

      try {
        loading.value = true;
        const response = await startConfig(id);
        const duration = Date.now() - startTime;

        if (response.code === 200) {
          consola.success(
            `[Client] 服务启动成功 (耗时: ${duration}ms): id=${id}, name=${response.data?.name || "unknown"}`,
          );
          ElMessage.success("启动成功");
          await reloadConfigs(); // 重新加载列表
        } else {
          consola.error(
            `[Client] 服务启动失败: id=${id}, code=${response.code}, msg=${response.msg}`,
          );
          ElMessage.error(response.msg || "启动失败");
        }
      } catch (error) {
        const duration = Date.now() - startTime;
        consola.error(`[Client] 启动服务异常 (耗时: ${duration}ms):`, {
          id,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        ElMessage.error(error instanceof Error ? error.message : "启动失败");
      } finally {
        loading.value = false;
      }
    } catch {
      consola.debug(`[Client] 用户取消启动服务: id=${id}`);
    }
  };

  // 停止服务
  const handleStop = async (id: number) => {
    const config = findConfig(id);
    consola.info(`[Client] 用户请求停止服务: id=${id}, name=${config?.name || "unknown"}`);

    try {
      await ElMessageBox.confirm("确定要停止该服务吗？", "提示", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      });

      const startTime = Date.now();
      consola.info(`[Client] 用户确认停止服务: id=${id}`);

      try {
        loading.value = true;
        const response = await stopConfig(id);
        const duration = Date.now() - startTime;

        if (response.code === 200) {
          consola.success(
            `[Client] 服务停止成功 (耗时: ${duration}ms): id=${id}, name=${response.data?.name || "unknown"}`,
          );
          ElMessage.success("停止成功");
          await reloadConfigs(); // 重新加载列表
        } else {
          consola.error(
            `[Client] 服务停止失败: id=${id}, code=${response.code}, msg=${response.msg}`,
          );
          ElMessage.error(response.msg || "停止失败");
        }
      } catch (error) {
        const duration = Date.now() - startTime;
        consola.error(`[Client] 停止服务异常 (耗时: ${duration}ms):`, {
          id,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        ElMessage.error(error instanceof Error ? error.message : "停止失败");
      } finally {
        loading.value = false;
      }
    } catch {
      consola.debug(`[Client] 用户取消停止服务: id=${id}`);
    }
  };

  // 删除服务
  const handleDelete = async (id: number) => {
    const config = findConfig(id);
    consola.info(`[Client] 用户请求删除服务: id=${id}, name=${config?.name || "unknown"}`);

    try {
      await ElMessageBox.confirm("确定要删除该服务吗？", "提示", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      });

      const startTime = Date.now();
      consola.warn(`[Client] 用户确认删除服务: id=${id}, name=${config?.name || "unknown"}`);

      try {
        loading.value = true;
        const response = await deleteConfig(id);
        const duration = Date.now() - startTime;

        if (response.code === 200) {
          consola.success(`[Client] 服务删除成功 (耗时: ${duration}ms): id=${id}`);
          ElMessage.success("删除成功");
          await reloadConfigs(); // 重新加载列表
        } else {
          consola.error(
            `[Client] 服务删除失败: id=${id}, code=${response.code}, msg=${response.msg}`,
          );
          ElMessage.error(response.msg || "删除失败");
        }
      } catch (error) {
        const duration = Date.now() - startTime;
        consola.error(`[Client] 删除服务异常 (耗时: ${duration}ms):`, {
          id,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        ElMessage.error(error instanceof Error ? error.message : "删除失败");
      } finally {
        loading.value = false;
      }
    } catch {
      consola.debug(`[Client] 用户取消删除服务: id=${id}`);
    }
  };

  // 编辑配置
  const handleEdit = async (id: number) => {
    const config = findConfig(id);
    const startTime = Date.now();
    consola.info(`[Client] 用户请求编辑配置: id=${id}, name=${config?.name || "unknown"}`);

    try {
      loading.value = true;
      const response = await getConfigById(id);
      const duration = Date.now() - startTime;

      if (response.code === 200) {
        consola.success(
          `[Client] 配置加载成功 (耗时: ${duration}ms): id=${id}, name=${response.data?.name || "unknown"}, tools=${response.data?.tools.length || 0}`,
        );
        return response.data;
      } else {
        consola.error(
          `[Client] 获取配置失败: id=${id}, code=${response.code}, msg=${response.msg}`,
        );
        ElMessage.error(response.msg || "获取配置失败");
        return null;
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      consola.error(`[Client] 获取配置异常 (耗时: ${duration}ms):`, {
        id,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      ElMessage.error(error instanceof Error ? error.message : "获取配置失败");
      return null;
    } finally {
      loading.value = false;
    }
  };

  return {
    loading,
    handleStart,
    handleStop,
    handleDelete,
    handleEdit,
  };
}
