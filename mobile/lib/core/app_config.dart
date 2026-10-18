/// Backend configuration.
///
/// Values are injected at build time with `--dart-define`, never committed.
/// Only the publishable (anon) key belongs in a client: every table in the
/// backend is protected by row level security.
class AppConfig {
  static const String supabaseUrl = String.fromEnvironment('SUPABASE_URL');

  static const String supabasePublishableKey =
      String.fromEnvironment('SUPABASE_PUBLISHABLE_KEY');

  /// Deep link used for OAuth and email confirmation redirects.
  static const String authRedirect = 'io.labaflow.app://login-callback';

  static const String shopName = 'Lab-a-Day Laundry Shop';
  static const String currencyCode = 'PHP';

  /// Fails loudly and early when the build was made without the defines, instead
  /// of showing a confusing network error later.
  static void assertConfigured() {
    if (supabaseUrl.isEmpty || supabasePublishableKey.isEmpty) {
      throw StateError(
        'LabaFlow is not configured. Build with '
        '--dart-define=SUPABASE_URL=... and --dart-define=SUPABASE_PUBLISHABLE_KEY=...',
      );
    }
  }
}
