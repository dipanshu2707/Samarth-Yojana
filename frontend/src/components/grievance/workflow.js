export const WORKFLOW_META = {
  open: { en: 'Open', hi: 'खुला', bg: 'bg-sky-100 text-sky-800 border-sky-200', dot: 'bg-sky-500' },
  in_review: { en: 'In Review', hi: 'समीक्षाधीन', bg: 'bg-amber-100 text-amber-800 border-amber-200', dot: 'bg-amber-500' },
  in_progress: { en: 'In Progress', hi: 'कार्रवाई जारी', bg: 'bg-indigo-100 text-indigo-800 border-indigo-200', dot: 'bg-indigo-500' },
  resolved: { en: 'Resolved', hi: 'निराकृत', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' },
};

export function workflowLabel(status, language = 'en') {
  const key = (status || 'open').toLowerCase();
  const meta = WORKFLOW_META[key] || WORKFLOW_META.open;
  return language === 'hi' ? meta.hi : meta.en;
}

export function levelLabel(level, language = 'en') {
  if (level === 3) return language === 'hi' ? 'स्तर 3 • मुख्यमंत्री कार्यालय' : 'Level 3 • CM Office';
  if (level === 2) return language === 'hi' ? 'स्तर 2 • जिला कलेक्टर' : 'Level 2 • District Collector';
  return language === 'hi' ? 'स्तर 1 • विभाग' : 'Level 1 • Department';
}

export const MP_DISTRICTS = [
  'Bhopal', 'Indore', 'Ujjain', 'Gwalior', 'Jabalpur', 'Sagar', 'Rewa', 'Sehore',
  'Satna', 'Chhindwara', 'Dewas', 'Dhar', 'Narmadapuram', 'Khandwa',
  'Khargone', 'Ratlam', 'Shivpuri', 'Vidisha', 'Betul', 'Morena', 'Bhind', 'Damoh',
];

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
