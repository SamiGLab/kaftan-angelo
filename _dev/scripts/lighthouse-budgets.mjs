export function evaluateBudgets(lhr, assertions) {
  if (!lhr || lhr.runtimeError || !assertions || !Object.keys(assertions).length) throw Error('Missing Lighthouse results or budget configuration');
  return Object.entries(assertions).map(([metric, rule]) => {
    const [level, limits] = rule;
    if (!['error', 'warn'].includes(level) || !limits || Object.keys(limits).length !== 1) throw Error(`Unsupported budget: ${metric}`);
    const category = metric.startsWith('categories:');
    const value = category ? lhr.categories?.[metric.slice(11)]?.score : lhr.audits?.[metric]?.numericValue;
    const key = category ? 'minScore' : 'maxNumericValue';
    const limit = limits[key];
    if (!Number.isFinite(value) || !Number.isFinite(limit)) throw Error(`Missing or invalid Lighthouse metric: ${metric}`);
    return { metric, level, value, limit, passed: category ? value >= limit : value <= limit };
  });
}
