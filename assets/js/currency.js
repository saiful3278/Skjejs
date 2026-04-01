window.formatRM = function (value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 'RM 0.00';
  return `RM ${n.toFixed(2)}`;
};
