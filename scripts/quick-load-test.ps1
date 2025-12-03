# 快速压力测试脚本 (PowerShell)
# 使用 autocannon 进行压力测试
#
# 前置条件: npm install -g autocannon
#
# 使用方法: .\scripts\quick-load-test.ps1

$BASE_URL = "https://api.yimengpl.com"

Write-Host "`n===========================================" -ForegroundColor Cyan
Write-Host "     压力测试 - $BASE_URL" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan

# 测试1: 健康检查 (轻量接口)
Write-Host "`n[1/4] 测试健康检查接口 - 100并发 30秒" -ForegroundColor Yellow
autocannon -c 100 -d 30 "$BASE_URL/health"

# 测试2: API根路径
Write-Host "`n[2/4] 测试API根路径 - 100并发 30秒" -ForegroundColor Yellow
autocannon -c 100 -d 30 "$BASE_URL/api"

# 测试3: 递增压力测试 (10->50->100->200)
Write-Host "`n[3/4] 递增压力测试 - 健康检查接口" -ForegroundColor Yellow

Write-Host "  - 10并发 10秒" -ForegroundColor Gray
autocannon -c 10 -d 10 "$BASE_URL/health"

Write-Host "  - 50并发 10秒" -ForegroundColor Gray
autocannon -c 50 -d 10 "$BASE_URL/health"

Write-Host "  - 100并发 10秒" -ForegroundColor Gray
autocannon -c 100 -d 10 "$BASE_URL/health"

Write-Host "  - 200并发 10秒" -ForegroundColor Gray
autocannon -c 200 -d 10 "$BASE_URL/health"

Write-Host "  - 500并发 10秒 (极限测试)" -ForegroundColor Gray
autocannon -c 500 -d 10 "$BASE_URL/health"

# 测试4: 高并发极限测试
Write-Host "`n[4/4] 极限测试 - 1000并发 30秒" -ForegroundColor Red
autocannon -c 1000 -d 30 "$BASE_URL/health"

Write-Host "`n===========================================" -ForegroundColor Cyan
Write-Host "     测试完成!" -ForegroundColor Green
Write-Host "===========================================" -ForegroundColor Cyan
