/**
 * Dependency free SVG charts, shared by the CLI report (node) and the harness page (browser).
 * Everything returns an SVG string.
 */

const COLORS = ['#3366cc', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd'];

function escape(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function niceMax(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return 1;
  }
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

function formatNumber(value) {
  if (!Number.isFinite(value)) {
    return '-';
  }
  return Math.abs(value) >= 100 ? value.toFixed(0) : value.toFixed(2);
}

/**
 * Line chart of one or more sample series over the sample index (frames).
 * @param {{ title: string, yLabel: string, xLabel?: string, series: { name: string, samples: number[] }[], width?: number, height?: number }} options
 */
export function lineChart(options) {
  const width = options.width ?? 720;
  const height = options.height ?? 320;
  const margin = { top: 36, right: 20, bottom: 44, left: 56 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const series = options.series.filter((s) => s.samples && s.samples.length > 0);
  const maxLength = Math.max(1, ...series.map((s) => s.samples.length));
  // scale the y axis to the 99th percentile so a single spike doesn't flatten the chart
  const allSorted = series
    .flatMap((s) => s.samples)
    .filter((v) => Number.isFinite(v))
    .sort((a, b) => a - b);
  const p99 = allSorted.length ? allSorted[Math.min(allSorted.length - 1, Math.floor(allSorted.length * 0.99))] : 1;
  const yMax = niceMax(p99 * 1.1);
  const x = (i) => margin.left + (i / Math.max(1, maxLength - 1)) * plotWidth;
  const y = (v) => margin.top + plotHeight - (Math.min(v, yMax) / yMax) * plotHeight;

  const parts = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="system-ui, sans-serif" font-size="12">`
  );
  parts.push(`<rect width="${width}" height="${height}" fill="#fff"/>`);
  parts.push(`<text x="${margin.left}" y="20" font-size="14" font-weight="600">${escape(options.title)}</text>`);

  // grid + y axis
  const yTicks = 5;
  for (let t = 0; t <= yTicks; t++) {
    const value = (yMax / yTicks) * t;
    const yy = y(value);
    parts.push(`<line x1="${margin.left}" x2="${width - margin.right}" y1="${yy}" y2="${yy}" stroke="#eee"/>`);
    parts.push(`<text x="${margin.left - 6}" y="${yy + 4}" text-anchor="end" fill="#555">${formatNumber(value)}</text>`);
  }
  // x axis
  const xTicks = 6;
  for (let t = 0; t <= xTicks; t++) {
    const index = Math.round(((maxLength - 1) / xTicks) * t);
    const xx = x(index);
    parts.push(`<line x1="${xx}" x2="${xx}" y1="${margin.top + plotHeight}" y2="${margin.top + plotHeight + 4}" stroke="#555"/>`);
    parts.push(`<text x="${xx}" y="${margin.top + plotHeight + 16}" text-anchor="middle" fill="#555">${index}</text>`);
  }
  parts.push(
    `<line x1="${margin.left}" x2="${width - margin.right}" y1="${margin.top + plotHeight}" y2="${margin.top + plotHeight}" stroke="#555"/>`
  );
  parts.push(`<line x1="${margin.left}" x2="${margin.left}" y1="${margin.top}" y2="${margin.top + plotHeight}" stroke="#555"/>`);
  parts.push(
    `<text x="${margin.left + plotWidth / 2}" y="${height - 8}" text-anchor="middle" fill="#555">${escape(options.xLabel ?? 'frame')}</text>`
  );
  parts.push(
    `<text transform="translate(14 ${margin.top + plotHeight / 2}) rotate(-90)" text-anchor="middle" fill="#555">${escape(options.yLabel)}</text>`
  );

  // series
  series.forEach((s, index) => {
    const color = COLORS[index % COLORS.length];
    const points = s.samples.map((v, i) => `${x(i).toFixed(1)},${y(Number.isFinite(v) ? v : 0).toFixed(1)}`).join(' ');
    parts.push(`<polyline points="${points}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round"/>`);
    // legend
    const lx = margin.left + 8 + index * 220;
    const ly = margin.top + 12;
    parts.push(`<rect x="${lx}" y="${ly - 9}" width="14" height="3" fill="${color}"/>`);
    parts.push(`<text x="${lx + 20}" y="${ly - 4}" fill="#333">${escape(s.name)}</text>`);
  });

  parts.push('</svg>');
  return parts.join('\n');
}

/**
 * Grouped bar chart comparing one value per test for several engines (e.g. median ms per frame)
 * @param {{ title: string, yLabel: string, groups: { name: string, values: { name: string, value: number }[] }[], width?: number }} options
 */
export function barChart(options) {
  const groups = options.groups;
  const seriesNames = [...new Set(groups.flatMap((g) => g.values.map((v) => v.name)))];
  const width = options.width ?? Math.max(520, 200 + groups.length * 130);
  const height = 360;
  const margin = { top: 40, right: 120, bottom: 96, left: 56 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const maxValue = niceMax(Math.max(0, ...groups.flatMap((g) => g.values.map((v) => (Number.isFinite(v.value) ? v.value : 0)))) * 1.1);
  const groupWidth = plotWidth / Math.max(1, groups.length);
  const barWidth = (groupWidth * 0.7) / Math.max(1, seriesNames.length);
  const y = (v) => margin.top + plotHeight - (v / maxValue) * plotHeight;

  const parts = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="system-ui, sans-serif" font-size="12">`
  );
  parts.push(`<rect width="${width}" height="${height}" fill="#fff"/>`);
  parts.push(`<text x="${margin.left}" y="20" font-size="14" font-weight="600">${escape(options.title)}</text>`);
  const yTicks = 5;
  for (let t = 0; t <= yTicks; t++) {
    const value = (maxValue / yTicks) * t;
    parts.push(`<line x1="${margin.left}" x2="${width - margin.right}" y1="${y(value)}" y2="${y(value)}" stroke="#eee"/>`);
    parts.push(`<text x="${margin.left - 6}" y="${y(value) + 4}" text-anchor="end" fill="#555">${formatNumber(value)}</text>`);
  }
  parts.push(
    `<text transform="translate(14 ${margin.top + plotHeight / 2}) rotate(-90)" text-anchor="middle" fill="#555">${escape(options.yLabel)}</text>`
  );
  groups.forEach((group, gi) => {
    const gx = margin.left + gi * groupWidth + groupWidth * 0.15;
    group.values.forEach((v) => {
      const si = seriesNames.indexOf(v.name);
      const value = Number.isFinite(v.value) ? v.value : 0;
      const bx = gx + si * barWidth;
      parts.push(`<rect x="${bx.toFixed(1)}" y="${y(value).toFixed(1)}" width="${barWidth.toFixed(1)}" height="${(margin.top + plotHeight - y(value)).toFixed(1)}" fill="${COLORS[si % COLORS.length]}"/>`);
      parts.push(`<text x="${(bx + barWidth / 2).toFixed(1)}" y="${(y(value) - 4).toFixed(1)}" text-anchor="middle" font-size="10" fill="#333">${formatNumber(value)}</text>`);
    });
    const labelX = margin.left + gi * groupWidth + groupWidth / 2;
    parts.push(
      `<text transform="translate(${labelX.toFixed(1)} ${margin.top + plotHeight + 12}) rotate(30)" text-anchor="start" font-size="11" fill="#333">${escape(group.name)}</text>`
    );
  });
  seriesNames.forEach((name, si) => {
    const lx = margin.left + 8 + si * 220;
    parts.push(`<rect x="${lx}" y="${margin.top - 14}" width="14" height="10" fill="${COLORS[si % COLORS.length]}"/>`);
    parts.push(`<text x="${lx + 20}" y="${margin.top - 5}" fill="#333">${escape(name)}</text>`);
  });
  parts.push('</svg>');
  return parts.join('\n');
}
