import 'package:flutter/foundation.dart';

/// Backend base URL resolution.
/// - Android emulator: 10.0.2.2 maps to the host machine.
/// - Anything else local: localhost.
/// Overridable at runtime in Settings (persisted).
class ApiConfig {
  static String defaultBaseUrl() {
    const fromDefine = String.fromEnvironment('API_BASE_URL');
    if (fromDefine.isNotEmpty) return fromDefine;
    if (!kIsWeb &&
        defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:8000';
    }
    return 'http://localhost:8000';
  }
}

class RoleAccounts {
  static const l1 = ('kumardp2707@gmail.com', 'nodal123');
  static const l2 = ('manilal2357@gmail.com', 'collector123');
  static const l3 = ('0585mt241001@pimrbhopal.ac.in', 'cmo123');
}
