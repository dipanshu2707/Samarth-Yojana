/// Approximate MP district centroids [lat, lng] for the heatmap.
const mpCenter = [23.45, 78.4];

const Map<String, List<double>> mpCentroids = {
  'agar malwa': [23.71, 76.01],
  'alirajpur': [22.31, 74.36],
  'anuppur': [23.10, 81.69],
  'ashoknagar': [24.58, 77.74],
  'balaghat': [21.81, 80.19],
  'barwani': [21.93, 75.11],
  'betul': [21.92, 77.90],
  'bhind': [26.56, 78.79],
  'bhopal': [23.26, 77.41],
  'burhanpur': [21.31, 76.23],
  'chhatarpur': [24.92, 79.59],
  'chhindwara': [22.06, 78.94],
  'damoh': [23.84, 79.45],
  'datia': [25.67, 78.46],
  'dewas': [22.96, 76.06],
  'dhar': [22.60, 75.30],
  'dindori': [22.94, 81.08],
  'guna': [24.65, 77.32],
  'gwalior': [26.22, 78.18],
  'harda': [22.35, 77.09],
  'hoshangabad (narmadapuram)': [22.75, 77.72],
  'indore': [22.72, 75.86],
  'jabalpur': [23.16, 79.91],
  'jhabua': [22.77, 74.59],
  'katni': [23.83, 80.40],
  'khandwa': [21.83, 76.36],
  'khargone': [21.83, 75.62],
  'maihar': [24.27, 80.76],
  'mandla': [22.60, 80.38],
  'mandsaur': [24.07, 75.08],
  'mauganj': [24.68, 81.89],
  'morena': [26.50, 78.00],
  'narmadapuram': [22.75, 77.72],
  'narsinghpur': [22.95, 79.19],
  'neemuch': [24.48, 74.88],
  'niwari': [25.07, 78.40],
  'pandhurna': [21.60, 78.52],
  'panna': [24.72, 80.18],
  'raisen': [23.33, 77.79],
  'rajgarh': [24.01, 76.73],
  'ratlam': [23.33, 75.04],
  'rewa': [24.54, 81.30],
  'sagar': [23.84, 78.74],
  'satna': [24.60, 80.83],
  'sehore': [23.20, 77.08],
  'seoni': [22.09, 79.54],
  'shahdol': [23.30, 81.36],
  'shajapur': [23.43, 76.27],
  'sheopur': [25.67, 76.70],
  'shivpuri': [25.43, 77.67],
  'sidhi': [24.42, 81.88],
  'singrauli': [24.20, 82.66],
  'tikamgarh': [24.74, 78.83],
  'ujjain': [23.18, 75.79],
  'umaria': [23.52, 80.90],
  'vidisha': [23.53, 77.81],
};

List<double> centroidOf(String district) {
  return mpCentroids[district.toLowerCase().trim()] ?? const [23.26, 77.41];
}

/// Deterministic spread around a centroid so same-district cases fan out.
List<double> jitterFor(String ticketId, [double spread = 0.16]) {
  int h = 0;
  for (int i = 0; i < ticketId.length; i++) {
    h = ((h * 31 + ticketId.codeUnitAt(i)) & 0xFFFFFFFF);
  }
  final a = ((h % 628) / 100) - 3.14;
  final r = spread * (((h >> 8) % 100) / 100);
  return [a, r];
}

double intensityFor(String priority, String workflow) {
  if (workflow == 'resolved') return 0.22;
  switch (priority.toLowerCase()) {
    case 'critical':
      return 1.0;
    case 'high':
      return 0.72;
    case 'medium':
      return 0.48;
    default:
      return 0.35;
  }
}
