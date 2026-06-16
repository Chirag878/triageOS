export type DatabaseId = string;

export type ISODateString = string;

export type JsonPrimitive = string | number | boolean | null;

export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | {
      [key: string]: JsonValue;
    };

export type PaginationParams = {
  page?: number;
  pageSize?: number;
};

export type PaginatedResult<TItem> = {
  items: TItem[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
};

export type ApiSuccess<TData> = {
  ok: true;
  data: TData;
};

export type ApiFailure = {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: JsonValue;
  };
};

export type ApiResult<TData> = ApiSuccess<TData> | ApiFailure;

export type SortDirection = "asc" | "desc";

export type Timestamped = {
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

export type SoftDeletable = {
  deletedAt: ISODateString | null;
};