const palette = [
  "#6366F1",
  "#22D3EE",
  "#F97316",
  "#A855F7",
  "#2DD4BF",
  "#FDE047",
  "#FB7185",
  "#38BDF8"
];

const hashLabel = (label: string): number => {
  let acc = 0;
  for (let i = 0; i < label.length; i += 1) {
    acc = (acc << 5) - acc + label.charCodeAt(i);
    acc |= 0;
  }
  return Math.abs(acc);
};

export const getSpotColor = (label: string): string => {
  if (!label) {
    return "#6366F1";
  }
  const idx = hashLabel(label) % palette.length;
  return palette[idx];
};
