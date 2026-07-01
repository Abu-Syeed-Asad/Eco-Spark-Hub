
import type {
  IQueryConfig,
  IQueryParams,
  IQueryResult,
  PrismaCountArgs,
  PrismaFindManyArgs,
  PrismaModelDelegate,
  PrismaNumberFilter,
  PrismaStringFilter,
  PrismaWhereConditions,
} from "../interface/queryBuilder.interface";


export class QueryBuilder<
  T,
  TWhereInpute = Record<string, unknown>,
  TInclude = Record<string, unknown>,
> {
  private query: PrismaFindManyArgs;
  private counntQuery: PrismaCountArgs;
  private page: number = 1;
  private limit: number = 10;
  private skip: number = 0;
  private sortBy: string = "createdAt";
  private sortOrder: "asc" | "desc" = "desc";
  private selectFields: Record<string, boolean> | undefined;
  private deepMerge(
    target: Record<string, unknown>,
    source: Record<string, unknown>,
  ): Record<string, unknown> {
    const result = { ...target };

    for (const key in source) {
      if (
        source[key] &&
        typeof source[key] === "object" &&
        !Array.isArray(source[key])
      ) {
        if (
          result[key] &&
          typeof result[key] === "object" &&
          !Array.isArray(result[key])
        ) {
          result[key] = this.deepMerge(
            result[key] as Record<string, unknown>,
            source[key] as Record<string, unknown>,
          );
        } else {
          result[key] = source[key];
        }
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }

  constructor(
    private model: PrismaModelDelegate,
    private queryParams: IQueryParams,
    private config: IQueryConfig,
  ) {
    this.query = {
      where: {},
      include: {},
      orderBy: {},
      skip: 0,
      take: 10,
    };
    this.counntQuery = {
      where: {},
    };
  }
  search(): this {
    const { searchableFields } = this.config;
    const { searchTerm } = this.queryParams;
    if (searchTerm && searchableFields && searchableFields.length > 0) {
      const searchCondition: Record<string, unknown>[] = searchableFields.map(
        (field) => {
          const stringFilter: PrismaStringFilter = {
            contains: searchTerm,
            mode: "insensitive",
          };

          if (field.includes(".")) {
            const parts = field.split(".");
            if (parts.length === 2) {
              const [relation, nestedField] = parts as [string, string];
              return {
                [relation]: {
                  [nestedField]: stringFilter,
                },
              };
            }

            if (parts.length === 3) {
              const [relation, nestedRelation, nestedField] = parts as [
                string,
                string,
                string,
              ];
              return {
                [relation]: {
                  some: {
                    [nestedRelation]: {
                      [nestedField]: stringFilter,
                    },
                  },
                },
              };
            }

            return {
              [field]: stringFilter,
            };
          }

          return {
            [field]: stringFilter,
          };
        },
      );
      const whereCondition = this.query.where as PrismaWhereConditions;
      whereCondition.OR = searchCondition;
      const countWhereCondition = this.counntQuery
        .where as PrismaWhereConditions;
      countWhereCondition.OR = searchCondition;
    }

    return this;
  }
  filter(): this {
    const { filterableFields } = this.config;
    const excludeFields = [
      "searchTerm",
      "page",
      "limit",
      "sortBy",
      "sortOrder",
      "fields",
      "includes",
    ];
    const filterableQueryParams: Record<string, unknown> = {};
    Object.keys(this.queryParams).forEach((key) => {
      if (!excludeFields.includes(key)) {
        filterableQueryParams[key] = this.queryParams[key];
      }
    });
    const queryWhere = this.query.where as Record<string, unknown>;
    const countQueryWhere = this.counntQuery.where as Record<string, unknown>;
    Object.keys(filterableQueryParams).forEach((key) => {
      const value = filterableQueryParams[key];
      if (value === undefined || value === "") {
        return;
      }
      const isAllowField =
        !filterableFields ||
        filterableFields.length === 0 ||
        filterableFields.includes(key);
      if (key.includes(".")) {
        const parts = key.split(".");
        if (filterableFields && !filterableFields.includes(key)) {
          return;
        }

        if (parts.length === 2) {
          const [relation, nestedField] = parts as [string, string];
          if (!queryWhere[relation]) {
            queryWhere[relation] = {};
            countQueryWhere[relation] = {};
          }
          const queryRelation = queryWhere[relation] as Record<string, unknown>;
          const countRelatin = countQueryWhere[relation] as Record<
            string,
            unknown
          >;

          queryRelation[nestedField] = this.parseFilterValue(value);
          countRelatin[nestedField] = this.parseFilterValue(value);
          return;
        } else if (parts.length === 3) {
          const [relation, nestedRelation, nestedField] = parts as [
            string,
            string,
            string,
          ];
          if (!queryWhere[relation]) {
            queryWhere[relation] = {
              some: {},
            };
            countQueryWhere[relation] = {
              some: {},
            };
          }
          const queryRelation = queryWhere[relation] as Record<string, unknown>;
          const countRelatin = countQueryWhere[relation] as Record<
            string,
            unknown
          >;
          if (!queryRelation.some) {
            queryRelation.some = {};
          }
          if (!countRelatin.some) {
            countRelatin.some = {};
          }
          const querySome = queryRelation.some as Record<string, unknown>;
          const countSome = countRelatin.some as Record<string, unknown>;
          if (!querySome[nestedRelation]) {
            querySome[nestedRelation] = {};
          }
          if (!countSome[nestedRelation]) {
            countSome[nestedRelation] = {};
          }
          const queryNestedRelatin = querySome[nestedRelation] as Record<
            string,
            unknown
          >;
          const countNestedRelation = countSome[nestedRelation] as Record<
            string,
            unknown
          >;
          queryNestedRelatin[nestedField] = this.parseFilterValue(value);
          countNestedRelation[nestedField] = this.parseFilterValue(value);
          return;
        }
      }
      if (!isAllowField) {
        return;
      }
      if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
      ) {
        queryWhere[key] = this.parseRangeFilter(
          value as Record<string, string | number>,
        );
        countQueryWhere[key] = this.parseRangeFilter(
          value as Record<string, string | number>,
        );
        return;
      }
      queryWhere[key] = this.parseFilterValue(value);
      countQueryWhere[key] = this.parseFilterValue(value);
    });

    return this;
  }
  pagination(): this {
    const page = Number(this.queryParams.page) || 1;
    const limit = Number(this.queryParams.limit) || 10;
    this.page = page;
    this.limit = limit;
    this.skip = (page - 1) * limit;
    this.query.skip = this.skip;
    this.query.take = this.limit;
    return this;
  }
  sort(): this {
    const sortBy = this.queryParams.sortBy || "createdAt";
    const sortOrder = this.queryParams.sortOrder || "desc";
    if (sortBy.includes(".")) {
      const part = sortBy.split(".");
      if (part.length === 2) {
        const [relation, nestedField] = part;
        this.query.orderBy = {
          [relation as string]: {
            [nestedField as string]: sortOrder,
          },
        };
      } else if (part.length === 3) {
        const [relation, nestedRelation, nestedField] = part;
        this.query.orderBy = {
          [relation as string]: {
            [nestedRelation as string]: {
              [nestedField as string]: sortOrder,
            },
          },
        };
      } else {
        this.query.orderBy = {
          [sortBy]: sortOrder,
        };
      }
    } else {
      this.query.orderBy = {
        [sortBy]: sortOrder,
      };
    }
    return this;
  }
  fields(): this {
    const fieldsParams = this.queryParams.fields;
    if (fieldsParams && typeof (fieldsParams === "string")) {
      const fieldArray = fieldsParams?.split(",").map((fiedl) => fiedl.trim());
      this.selectFields = {};
      fieldArray?.forEach((field) => {
        if (this.selectFields) {
          this.selectFields[field] = true;
        }
      });
      this.query.select = this.selectFields as Record<
        string,
        boolean | Record<string, unknown>
      >;
      delete this.query.include;
    }

    return this;
  }
  include(relation: TInclude): this {
    if (this.selectFields) {
      return this;
    }
    this.query.include = {
      ...(this.query.include as Record<string, unknown>),
      ...(relation as Record<string, unknown>),
    };
    return this;
  }
  dynamicInclude(
    includeConfig: Record<string, unknown>,
    defaultInclude?: string[],
  ): this {
    if (this.selectFields) {
      return this;
    }
    const result: Record<string, unknown> = {};
    defaultInclude?.forEach((field) => {
      if (includeConfig[field]) {
        result[field] = includeConfig[field];
      }
    });
    const includeParam = this.queryParams.includes as string | undefined;
    if (includeParam && typeof includeParam === "string") {
      const requestedRelation = includeParam
        .split(",")
        .map((rlation) => rlation.trim());
      requestedRelation.forEach((relation) => {
        if (includeConfig[relation]) {
          result[relation] = includeConfig[relation];
        }
      });
    }
    this.query.include = {
      ...(this.query.include as Record<string, unknown>),
      ...result,
    };
    return this;
  }
  parseFilterValue(value: unknown): unknown {
    if (value === "true") {
      return true;
    }
    if (value === "false") {
      return false;
    }
    if (typeof value === "string" && !isNaN(Number(value)) && value != "") {
      return Number(value);
    }
    if (Array.isArray(value)) {
      return { in: value.map((item) => this.parseFilterValue(item)) };
    }
    return value;
  }
  parseRangeFilter(
    value: Record<string, string | number>,
  ): PrismaNumberFilter | PrismaStringFilter | Record<string, unknown> {
    const rangeQuery: Record<string, string | number | (string | number)[]> =
      {};
    Object.keys(value).forEach((operator) => {
      const operatorVale = value[operator];
      if (operatorVale === undefined) {
        return;
      }
      const parsedValue: string | number =
        typeof operatorVale === "string" && !isNaN(Number(operatorVale))
          ? Number(operatorVale)
          : operatorVale;
      switch (operator) {
        case "lt":
        case "lte":
        case "gt":
        case "gte":
        case "equal":
        case "not":
        case "contains":
        case "startsWith":
        case "endWith":
          rangeQuery[operator] = parsedValue;
          break;
        case "in":
        case "notIn":
          if (Array.isArray(operatorVale)) {
            rangeQuery[operator] = operatorVale;
          } else {
            rangeQuery[operator] = [parsedValue];
          }
          break;
        default:
          break;
      }
    });
    return Object.keys(rangeQuery).length > 0 ? rangeQuery : value;
  }
  getQuery(): PrismaFindManyArgs {
    return this.query;
  }
  async execute(): Promise<IQueryResult<T>> {
    const [total, data] = await Promise.all([
      this.model.count(
        this.counntQuery as Parameters<typeof this.model.count>[0],
      ),
      this.model.findMany(
        this.query as Parameters<typeof this.model.findMany>[0],
      ),
    ]);
    const totalPages = Math.ceil(total / this.limit);
    return {
      data: data as T[],
      meta: {
        page: this.page,
        limit: this.limit,
        total,
        totalPages,
      },
    };
  }
  async count(): Promise<number> {
    return await this.model.count(
      this.counntQuery as Parameters<typeof this.model.count>[0],
    );
  }
  where(condition: TWhereInpute): this {
    this.query.where = this.deepMerge(
      this.query.where as Record<string, unknown>,
      condition as Record<string, unknown>,
    );

    this.counntQuery.where = this.deepMerge(
      this.counntQuery.where as Record<string, unknown>,
      condition as Record<string, unknown>,
    );

    return this;
  }
}
