import 'package:flutter/material.dart';

/// Premium civic design system — deep indigo + saffron accent on paper.
/// Inspired by top civic-reporting concepts: bold hero headers, category
/// tiles, floating bottom navigation, status-driven color.
class AppColors {
  static const ink = Color(0xFF0B1026);
  static const indigo900 = Color(0xFF1E1B4B);
  static const indigo600 = Color(0xFF4F46E5);
  static const saffron = Color(0xFFF59E0B);
  static const saffronDeep = Color(0xFFB45309);
  static const paper = Color(0xFFF4F5FA);
  static const card = Colors.white;
  static const line = Color(0xFFE4E7F0);
  static const muted = Color(0xFF64748B);
  static const success = Color(0xFF059669);
  static const danger = Color(0xFFE11D48);

  static const hero = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [ink, indigo900, Color(0xFF312E81)],
  );

  static const saffronGlow = LinearGradient(
    colors: [Color(0xFFFBBF24), Color(0xFFF59E0B)],
  );
}

class AppText {
  static const hero = TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: Colors.white, height: 1.2);
  static const heroSub = TextStyle(fontSize: 13, color: Color(0xFFC7D2FE), height: 1.4);
  static const cardTitle = TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: AppColors.ink);
  static const section = TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: AppColors.muted, letterSpacing: 0.6);
  static const body = TextStyle(fontSize: 13, color: Color(0xFF334155), height: 1.5);
}

BoxDecoration cardDec({Color? border, double radius = 22}) => BoxDecoration(
      color: AppColors.card,
      borderRadius: BorderRadius.circular(radius),
      border: Border.all(color: border ?? AppColors.line),
      boxShadow: const [BoxShadow(color: Color(0x141E1B4B), blurRadius: 18, offset: Offset(0, 8))],
    );

/// Department accent colors (shared by tiles, map dots, pills).
Color deptColor(String id) {
  switch (id) {
    case 'pwd':
      return const Color(0xFF2563EB);
    case 'phe':
      return const Color(0xFF0891B2);
    case 'discom':
      return const Color(0xFFD97706);
    case 'urban':
      return const Color(0xFF7C3AED);
    case 'health':
      return const Color(0xFF059669);
    default:
      return AppColors.indigo600;
  }
}

IconData deptIcon(String id) {
  switch (id) {
    case 'pwd':
      return Icons.add_road;
    case 'phe':
      return Icons.water_drop;
    case 'discom':
      return Icons.bolt;
    case 'urban':
      return Icons.delete_sweep;
    case 'health':
      return Icons.local_hospital;
    default:
      return Icons.account_balance;
  }
}
