import * as dfd from 'danfojs-node';
import { Series } from "danfojs-node"

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

        }
    }


}