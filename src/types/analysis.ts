import { ChartData } from '../services/formatService';


export interface FormattedChart {
  title: string;
  chartType: 'Bar' | 'Line' | 'Scatter' | 'Pie';
  data: ChartData;
}


export interface SheetResult {
  sheetName: string;
  charts: FormattedChart;
}


export interface FinalOutput {
  fileName: string;
  sheets: SheetResult;
}