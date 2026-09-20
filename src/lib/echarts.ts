// 按需注册的 echarts 实例：只包含本项目图表实际用到的模块。
// 整包约 1 MB，按需后体积只有几分之一；新增图表类型或组件时要在这里补注册。
import * as echarts from 'echarts/core';
import { BarChart, LineChart } from 'echarts/charts';
import { AxisPointerComponent, GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([LineChart, BarChart, GridComponent, TooltipComponent, AxisPointerComponent, LegendComponent, CanvasRenderer]);

export { echarts };
