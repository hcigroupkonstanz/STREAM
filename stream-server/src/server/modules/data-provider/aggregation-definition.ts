export interface AggregationDefinition {
    name: string; // e.g. daily / weekly / studyphase / user
    level: number; // 0 == no aggregation
    exclude?: string[]; // either exclude or include
    include?: string[]; // either exclude or include
    aggregator: string; // 'avg(%s) || sum(%s) / count(%s)' etc
    groupBy: string; // GROUP BY sql statement
    // TODO: WHERE statement, e.g. 'WHERE x < 50 AND y IS NOT NULL' ?
}
