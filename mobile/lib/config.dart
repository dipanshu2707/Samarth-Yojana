/// Backend base URL resolution (see ApiConfig below).
/// - Android emulator: 10.0.2.2 maps to the host machine.
/// - Anything else local: localhost.
/// Overridable at runtime in Settings (persisted).
class ApiConfig {
  static const String renderBase = 'https://yojana-sathi-api-orro.onrender.com';

  static String defaultBaseUrl() {
    const fromDefine = String.fromEnvironment('API_BASE_URL');
    if (fromDefine.isNotEmpty) return fromDefine;
    // Production backend. The Settings screen can override this
    // (emulator: http://10.0.2.2:8000, USB: http://127.0.0.1:8000).
    return renderBase;
  }
}

class RoleAccounts {
  static const l1 = ('kumardp2707@gmail.com', 'nodal123');
  static const l2 = ('manilal2357@gmail.com', 'collector123');
  static const l3 = ('0585mt241001@pimrbhopal.ac.in', 'cmo123');
}
