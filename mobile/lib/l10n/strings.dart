/// Bilingual UI strings. lang: 'en' | 'hi'.
class S {
  final String lang;
  const S(this.lang);
  bool get hi => lang == 'hi';
  String get appName => hi ? 'एमपी ऑनलाइन' : 'MPOnline';
  String get tagline => hi ? 'नागरिक शिकायत व योजना सहायक' : 'Citizen grievance & scheme assistant';
  String get helpline => hi ? 'सीएम हेल्पलाइन: 181' : 'CM Helpline: 181';
  String get fileComplaint => hi ? 'शिकायत दर्ज करें' : 'File Complaint';
  String get findByMobile => hi ? 'मोबाइल से खोजें' : 'Find by Mobile';
  String get trackByTicket => hi ? 'टिकट से ट्रैक' : 'Track by Ticket';
  String get hotspots => hi ? 'शिकायत हीटमैप' : 'Complaint Heatmap';
  String get authorityLogin => hi ? 'प्राधिकारी लॉगिन' : 'Authority Login';
  String get officerDesk => hi ? 'प्राधिकारी डेस्क' : 'Officer Desk';
  String get yojana => hi ? 'योजना साथी' : 'Yojana Sathi';
  String get settings => hi ? 'सेटिंग' : 'Settings';
  String get submit => hi ? 'शिकायत दर्ज करें' : 'Submit complaint';
  String get search => hi ? 'खोजें' : 'Search';
  String get refresh => hi ? 'ताज़ा करें' : 'Refresh';
  String get signIn => hi ? 'लॉगिन करें' : 'Sign in';
  String get signOut => hi ? 'साइन आउट' : 'Sign out';
  String get open => hi ? 'खुला' : 'Open';
  String get inReview => hi ? 'समीक्षाधीन' : 'In Review';
  String get inProgress => hi ? 'कार्रवाई जारी' : 'In Progress';
  String get resolved => hi ? 'निराकृत' : 'Resolved';
  String workflow(String v) {
    switch (v) {
      case 'in_review':
        return inReview;
      case 'in_progress':
        return inProgress;
      case 'resolved':
        return resolved;
      default:
        return open;
    }
  }

  String level(int l) {
    if (l == 3) return hi ? 'स्तर 3 • मुख्यमंत्री कार्यालय' : 'Level 3 • CM Office';
    if (l == 2) return hi ? 'स्तर 2 • जिला कलेक्टर' : 'Level 2 • District Collector';
    return hi ? 'स्तर 1 • विभाग' : 'Level 1 • Department';
  }
}
