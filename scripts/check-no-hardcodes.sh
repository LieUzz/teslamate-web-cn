#!/bin/sh
# 防回退：源码里不允许再出现为某一辆车写死的数值、演示数据或会顶替真实值的兜底写法。
# 用法: sh scripts/check-no-hardcodes.sh   (命中任意一条即以非 0 退出)
set -u
cd "$(dirname "$0")/.."
fail=0

check() { # $1 = 说明, $2 = 扩展正则
  hits=$(grep -rnE --include='*.ts' --include='*.tsx' -e "$2" src | grep -v '^src/lib/constants.ts:' | grep -v '^src/lib/coordtransform.ts:' || true)
  if [ -n "$hits" ]; then
    echo "✗ $1"; echo "$hits" | sed 's/^/    /'; fail=1
  fi
}

check '原作者的提车日期'                 '2026-08-16'
check '写死的电价 / 每公里费用'           '0\.311|0\.000311|0\.069|10\.5%'
check '写死的能耗常数'                   '\b0\.138\b|\b0\.155\b|\* ?138\b|\* ?155\b|: ?(122|143|148)\b'
check '写死的电池 / 续航参数'             '\b433(\.0)?\b|\b432\.5\b|60\.0 ?kWh|\b699\.9\b|99\.8'
check '写死的油车对比参数'               '8\.0 ?L|\* ?0\.64\b|fuelCostPerKm ?= ?[0-9]'
check '原作者所在城市 / 坐标'            '西安|咸阳|陕西|34\.2[0-9]|108\.[89][0-9]'
check '编造的车辆状态兜底'               '\|\| ?(3\.0|76|331\.2|310\.0|27\.9|28(\.0)?|7\.0|220|32|98\.0|91(\.0)?)\b|\?\? ?(28|3\.0)\b'
check '假 VIN / 写死的软件版本'           '5YJ3E1EB8NF000000|2024\.32\.10'
check '编造的统计口号'                   '优于.{0,6}[0-9]+% ?车友|行业(平均|大数据)|衰减极低'
check '对车主的假设 (家充/谷电/7kW)'      '家用 ?7 ?kW|谷电|家里车位|次家充'
check '已移除的油车对比模块'               'SavingsAnalysis|fetchSavings|fuel_equivalent_cost|saved_cost|FUEL_PRICE_CNY|FUEL_CONSUMPTION_L|燃油|油车|油费'
check '演示 / 模拟数据'                   'MOCK_|mockData|NEXT_PUBLIC_DEMO_MODE|generateStaticParams'
check '向 TeslaMate 数据库写入'           'INSERT INTO|CREATE TABLE|UPDATE [a-z_]+ SET|DELETE FROM|car_metadata'
check '密钥暴露给浏览器'                  'NEXT_PUBLIC_AMAP_KEY'

if [ "$fail" -eq 0 ]; then echo '✓ no hardcoded values found'; fi
exit $fail
