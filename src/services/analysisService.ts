import * as dfd from 'danfojs-node';
import { Series } from "danfojs-node"
import { number } from 'zod';

export type ColumnDataType = 'Numeric' | 'Categorical' | 'DateTime' | 'Text' | 'Unsupported';

export interface NumericSummary {
  mean: number;
  median: number;
  std: number;
  min: number;
  max: number;
}

export interface CategoricalSummary {
  valueCounts: { [key: string]: number };
}

export interface ColumnProfile {
  columnName: string;
  dataType: ColumnDataType;
  cardinality: number;
  statisticalSummary?: NumericSummary | CategoricalSummary;
}
export interface ChartSuggestion {
  chartType: 'Bar' | 'Line' | 'Scatter' | 'Pie';
  columns: string[];
  title: string;
}

const CATEGORICAL_THRESHOLD = 25;

function isDate(value: any): boolean {
  if (!value || typeof value !== 'string') return false;
  // A more robust solution might try multiple formats or use a library like moment.js or date-fns.
  const date = new Date(value);
  return !isNaN(date.getTime());
}

function profileColumn(series : Series , columnName : string) : ColumnProfile {
    const profile: Partial<ColumnProfile> = {columnName}
    const dtype = series.dtype;
    const nonNullSeries = series.dropNa();

    if(nonNullSeries.size === 0){
        return { columnName , dataType : 'Unsupported' , cardinality : 0};
    }

    profile.cardinality = nonNullSeries.nUnique();

    if(dtype === 'int32' || dtype === 'float32') {
        profile.dataType = "Numeric";
        const description = nonNullSeries.describe();

        profile.statisticalSummary = {
            mean : description['mean'](),
            median : nonNullSeries.median(),
            std : description['std'](),
            min : description['min'](),
            max : description['max']()

        };
    }

    else if(dtype === 'string' || dtype === 'object'){

        const sample = nonNullSeries.head(10).values;
        const isDateTimeColumn = sample.every(isDate);

        if(isDateTimeColumn){
            profile.dataType = 'DateTime';
        }
        //this is where categorical threshold comes into play 
        else if(profile.cardinality <= CATEGORICAL_THRESHOLD){
            profile.dataType = 'Categorical';
            const valueCounts = nonNullSeries.valueCounts();
            const counts : { [key : string] :  number} = {};
            valueCounts.index.forEach((key,i) => {
                counts[String(key)] = valueCounts.values[i] as number;
            })
            profile.statisticalSummary = { valueCounts : counts};

        }
        else {
            profile.dataType = 'Text';
        }
    }
    else {
        profile.dataType = 'Unsupported';
    }

    return profile as ColumnProfile
}

export function generateColumnProfiles(df: dfd.DataFrame): ColumnProfile[] {
  const profiles: ColumnProfile[] = [];
  for (const columnName of df.columns) {
    const series = df.column(columnName);
    profiles.push(profileColumn(series, columnName));
  }
  return profiles;
}

export function recommendCharts(profiles: ColumnProfile[]): ChartSuggestion[] {
  const suggestions: ChartSuggestion[] = [] ;
  const numericCols = profiles.filter(p => p.dataType === 'Numeric');
  const categoricalCols = profiles.filter(p => p.dataType === 'Categorical');
  const dateTimeCols = profiles.filter(p => p.dataType === 'DateTime');

  // Rule 1: 1 DateTime + 1 Numeric -> Line Chart
  if (dateTimeCols.length >= 1 && numericCols.length >= 1) {
    // Suggest a line chart for every combination
    for (const dtCol of dateTimeCols) {
      for (const numCol of numericCols) {
        suggestions.push({
          chartType: 'Line',
          columns: [dtCol.columnName, numCol.columnName],
          title: `${numCol.columnName} over Time (${dtCol.columnName})`,
        });
      }
    }
  }

  // Rule 2: 1 Categorical + 1 Numeric -> Bar Chart
  if (categoricalCols.length >= 1 && numericCols.length >= 1) {
    for (const catCol of categoricalCols) {
      for (const numCol of numericCols) {
        suggestions.push({
          chartType: 'Bar',
          columns: [catCol.columnName, numCol.columnName],
          title: `Total ${numCol.columnName} by ${catCol.columnName}`,
        });
      }
    }
  }

  // Rule 3: 2 Numeric -> Scatter Plot
  if (numericCols.length >= 2) {
    // Create combinations of numeric columns
    for (let i = 0; i < numericCols.length; i++) {
      for (let j = i + 1; j < numericCols.length; j++) {
        suggestions.push({
          chartType: 'Scatter',
          columns: [numericCols[i].columnName, numericCols[j].columnName],
          title: `Relationship between ${numericCols[i].columnName} and ${numericCols[j].columnName}`,
        });
      }
    }
  }

  // Rule 4: 1 Categorical -> Pie Chart
  if (categoricalCols.length >= 1) {
    for (const catCol of categoricalCols) {
      suggestions.push({
        chartType: 'Pie',
        columns: [catCol.columnName],
        title: `Distribution of ${catCol.columnName}`,
      });
    }
  }

  return suggestions;
}
