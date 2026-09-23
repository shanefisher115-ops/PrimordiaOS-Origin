export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;

export interface KeyValue<T = any> {
  key: string;
  value: T;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
