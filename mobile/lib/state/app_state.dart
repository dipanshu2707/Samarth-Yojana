import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config.dart';
import '../models/models.dart';

/// Global app state: language, backend URL, officer session.
class AppState extends ChangeNotifier {
  String lang = 'en';
  String baseUrl = ApiConfig.defaultBaseUrl();
  Officer? officer;

  Future<void> load() async {
    final p = await SharedPreferences.getInstance();
    lang = p.getString('lang') ?? 'en';
    baseUrl = p.getString('baseUrl') ?? ApiConfig.defaultBaseUrl();
    final tok = p.getString('officer_token');
    if (tok != null && tok.isNotEmpty) {
      officer = Officer(
        token: tok,
        email: p.getString('officer_email') ?? '',
        name: p.getString('officer_name') ?? '',
        designation: p.getString('officer_desg') ?? '',
        level: p.getInt('officer_level') ?? 1,
        role: p.getString('officer_role') ?? '',
        departments: p.getStringList('officer_depts') ?? const [],
      );
    }
    notifyListeners();
  }

  Future<void> setLang(String v) async {
    lang = v;
    (await SharedPreferences.getInstance()).setString('lang', v);
    notifyListeners();
  }

  Future<void> setBaseUrl(String v) async {
    baseUrl = v.trim().replaceAll(RegExp(r'/+$'), '');
    (await SharedPreferences.getInstance()).setString('baseUrl', baseUrl);
    notifyListeners();
  }

  Future<void> setOfficer(Officer? o) async {
    officer = o;
    final p = await SharedPreferences.getInstance();
    if (o == null) {
      await p.remove('officer_token');
    } else {
      await p.setString('officer_token', o.token);
      await p.setString('officer_email', o.email);
      await p.setString('officer_name', o.name);
      await p.setString('officer_desg', o.designation);
      await p.setInt('officer_level', o.level);
      await p.setString('officer_role', o.role);
      await p.setStringList('officer_depts', o.departments);
    }
    notifyListeners();
  }
}
