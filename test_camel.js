const toCamelCase = (str) => str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
const mapRow = (row) => {
  const result = {};
  for (const key in row) {
    result[toCamelCase(key)] = row[key];
  }
  return result;
}
console.log(mapRow({ owner_id: 1, created_at: "now" }));
