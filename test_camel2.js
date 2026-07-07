const toCamelCase = (str) => str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
console.log(toCamelCase("displayName"));
