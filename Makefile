# ==============================================================================
# Wizard Chess (3D 巫师棋) - 自动化构建与远程部署 Makefile
# ==============================================================================

# ------------------------------------------------------------------------------
# 远程部署配置变量（支持在命令行或环境变量中直接覆盖）
# 例如: make deploy REMOTE_HOST=book-vpn.softether.net REMOTE_PORT=22
# ------------------------------------------------------------------------------
REMOTE_USER ?= root
REMOTE_HOST ?= book-vpn.softether.net
REMOTE_PORT ?= 22
REMOTE_DIR  ?= /web/wizard-chess/
SSH_KEY     ?=

# 本地打包目录与包管理器
BUILD_DIR   ?= dist
PM          ?= npm

# 构造 SSH / SCP 端口与密钥参数
SSH_OPTS    := -p $(REMOTE_PORT)
SCP_OPTS    := -P $(REMOTE_PORT)

ifneq ($(strip $(SSH_KEY)),)
    SSH_OPTS += -i $(SSH_KEY)
    SCP_OPTS += -i $(SSH_KEY)
endif

.PHONY: all help install dev build lint clean preview deploy deploy-clean reload-nginx show-config

# 默认目标：输出使用帮助
all: help

## help: 显示所有可用命令与配置说明
help:
	@echo "========================================================================"
	@echo "🧙‍♂️ Wizard Chess 自动化构建与部署工具 (Makefile)"
	@echo "========================================================================"
	@echo "常用操作命令:"
	@echo "  make install        - 安装前端依赖包"
	@echo "  make dev            - 启动本地开发服务器 (http://localhost:3000)"
	@echo "  make lint           - 运行 TypeScript 类型检查"
	@echo "  make build          - 编译生产环境产物 (生成 dist/ 目录)"
	@echo "  make preview        - 本地预览生产环境构建产物"
	@echo "  make clean          - 清理 dist/ 构建目录"
	@echo ""
	@echo "远程部署命令:"
	@echo "  make deploy         - 自动编译并通过 scp 部署到远程服务器"
	@echo "  make deploy-clean   - 远程清空旧目录后再通过 scp 部署 (全新全量同步)"
	@echo "  make reload-nginx   - 远程测试并重新加载 Nginx 服务"
	@echo "  make show-config    - 查看当前远程部署的目标配置信息"
	@echo ""
	@echo "自定义参数用法示例:"
	@echo "  make deploy REMOTE_HOST=book-vpn.softether.net REMOTE_PORT=22"
	@echo "  make deploy REMOTE_USER=root REMOTE_DIR=/web/wizard-chess/"
	@echo "  make deploy SSH_KEY=~/.ssh/id_rsa"
	@echo "========================================================================"

## show-config: 查看当前远程部署配置
show-config:
	@echo "--------------------------------------------------"
	@echo "当前部署配置:"
	@echo "  远程主机 (REMOTE_HOST) : $(REMOTE_HOST)"
	@echo "  远程用户 (REMOTE_USER) : $(REMOTE_USER)"
	@echo "  SSH 端口 (REMOTE_PORT) : $(REMOTE_PORT)"
	@echo "  远程目录 (REMOTE_DIR)  : $(REMOTE_DIR)"
	@echo "  SSH 密钥 (SSH_KEY)     : $(if $(SSH_KEY),$(SSH_KEY),(默认系统密钥))"
	@echo "  本地产物 (BUILD_DIR)   : $(BUILD_DIR)"
	@echo "--------------------------------------------------"

## install: 安装依赖
install:
	@echo "📦 正在安装依赖..."
	@$(PM) install

## dev: 本地开发
dev:
	@echo "🚀 启动本地开发服务..."
	@$(PM) run dev

## lint: 类型检查
lint:
	@echo "🔍 执行 TypeScript 类型检查..."
	@$(PM) run lint

## build: 编译打包
build: lint
	@echo "🔨 正在编译生产版本 (dist)..."
	@$(PM) run build
	@echo "✅ 编译完成！产物位于: $(BUILD_DIR)/"

## preview: 本地预览
preview:
	@$(PM) run preview

## clean: 清除构建产物
clean:
	@echo "🧹 清除本地 $(BUILD_DIR) 产物..."
	@rm -rf $(BUILD_DIR)
	@echo "✅ 清理完成！"

## deploy: 编译并直接执行 scp 拷贝到远程机器
deploy: build
	@echo "🚀 开始远程部署到 $(REMOTE_USER)@$(REMOTE_HOST):$(REMOTE_DIR) ..."
	@echo "📁 确保远程目录存在..."
	@ssh $(SSH_OPTS) $(REMOTE_USER)@$(REMOTE_HOST) "mkdir -p $(REMOTE_DIR)"
	@echo "📤 正在通过 scp 同步静态文件..."
	@scp $(SCP_OPTS) -r $(BUILD_DIR)/* $(REMOTE_USER)@$(REMOTE_HOST):$(REMOTE_DIR)
	@echo "🔒 修正远程目录权限..."
	@ssh $(SSH_OPTS) $(REMOTE_USER)@$(REMOTE_HOST) "chmod -R 755 $(REMOTE_DIR)"
	@echo "🎉 部署成功！访问地址: https://$(REMOTE_HOST):4433/wizard-chess/"

## deploy-clean: 先清空远程目录，再编译并执行 scp
deploy-clean: build
	@echo "⚠️ 准备清理远程目录并全新部署..."
	@ssh $(SSH_OPTS) $(REMOTE_USER)@$(REMOTE_HOST) "rm -rf $(REMOTE_DIR)* && mkdir -p $(REMOTE_DIR)"
	@echo "📤 正在通过 scp 上传全新构建产物..."
	@scp $(SCP_OPTS) -r $(BUILD_DIR)/* $(REMOTE_USER)@$(REMOTE_HOST):$(REMOTE_DIR)
	@ssh $(SSH_OPTS) $(REMOTE_USER)@$(REMOTE_HOST) "chmod -R 755 $(REMOTE_DIR)"
	@echo "🎉 全量部署成功！"

## reload-nginx: 远程重载 Nginx
reload-nginx:
	@echo "🔄 正在远程重载 Nginx..."
	@ssh $(SSH_OPTS) $(REMOTE_USER)@$(REMOTE_HOST) "nginx -t && nginx -s reload"
	@echo "✅ Nginx 重载成功！"
