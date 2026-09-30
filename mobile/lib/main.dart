import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'state/app_state.dart';
import 'screens/home_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final app = AppState();
  await app.load();
  runApp(ChangeNotifierProvider.value(value: app, child: const MpOnlineApp()));
}

class MpOnlineApp extends StatelessWidget {
  const MpOnlineApp({super.key});
  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    return MaterialApp(
      title: 'MPOnline',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.indigo),
        scaffoldBackgroundColor: const Color(0xFFF1F5F9),
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.white,
          foregroundColor: Color(0xFF0F172A),
          elevation: 0,
          centerTitle: false,
          titleTextStyle: TextStyle(fontSize: 17, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.indigo.shade600,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 14),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            textStyle: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
          ),
        ),
        cardTheme: const CardTheme(color: Colors.white),
      ),
      home: const HomeScreen(),
      locale: Locale(app.lang == 'hi' ? 'hi' : 'en'),
    );
  }
}
