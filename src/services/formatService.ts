import * as dfd from 'danfojs-node';
import { ChartSuggestion } from './analysisService';

export type ChartData = { [key: string]: string | number | Date };

function formatForBarChart(df: dfd.DataFrame, suggestion: ChartSuggestion): ChartData {
  const [categoryCol, valueCol] = suggestion.columns;

  const grouped = df.groupby([categoryCol]).col([valueCol]).sum();
  
  grouped.rename({ [categoryCol]: 'name', [`${valueCol}_sum`]: 'value' }, { inplace: true });

  return dfd.toJSON(grouped) as ChartData;
}

function formatForLineChart(df: dfd.DataFrame, suggestion: ChartSuggestion): ChartData {
  const [dateCol, valueCol] = suggestion.columns;


  let chartDf = df.loc({ columns: [dateCol, valueCol] });

  chartDf.sortValues(dateCol, { inplace: true });

  chartDf.rename({ [dateCol]: 'date', [valueCol]: 'value' }, { inplace: true });

  return dfd.toJSON(chartDf) as ChartData;
}

function formatForScatterPlot(df: dfd.DataFrame, suggestion: ChartSuggestion): ChartData {
  const [xCol, yCol] = suggestion.columns;
  
  let chartDf = df.loc({ columns: [xCol, yCol] });
  
  // Rename columns for the frontend
  chartDf.rename({ [xCol]: 'x', [yCol]: 'y' }, { inplace: true });

  return dfd.toJSON(chartDf) as ChartData;
}

function formatForPieChart(df: dfd.DataFrame, suggestion: ChartSuggestion): ChartData {
  const [categoryCol] = suggestion.columns;
  
  const valueCounts = df.column(categoryCol).valueCounts();
  
  const chartData : ChartData = valueCounts.index.map((name, i) => ({
    name: name,
    value: valueCounts.values[i],
  }));

  return chartData;
}

export function formatChartData(df: dfd.DataFrame, suggestion: ChartSuggestion) {
  switch (suggestion.chartType) {
    case 'Bar':
      return formatForBarChart(df, suggestion);
    case 'Line':
      return formatForLineChart(df, suggestion);
    case 'Scatter':
      return formatForScatterPlot(df, suggestion);
    case 'Pie':
      return formatForPieChart(df, suggestion);
    default:
      return;
  }
}