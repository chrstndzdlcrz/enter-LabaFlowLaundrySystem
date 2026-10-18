import 'package:flutter/material.dart';

/// Oceanic Breeze palette, kept in step with the web app's design tokens.
class OceanColors {
  static const background = Color(0xFFF7FDFD);
  static const surface = Color(0xFFFFFFFF);
  static const primary = Color(0xFF0B8F92);
  static const primaryGlow = Color(0xFF7FDCD4);
  static const accent = Color(0xFF2AA79B);
  static const secondary = Color(0xFFE4F5F3);
  static const ink = Color(0xFF0D2430);
  static const inkMuted = Color(0xFF4B6672);
  static const success = Color(0xFF1E7A52);
  static const warning = Color(0xFFB4740A);
  static const danger = Color(0xFFB3261E);
  static const border = Color(0xFFD7E8EA);
}

ThemeData buildOceanTheme() {
  final base = ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: OceanColors.primary,
      brightness: Brightness.light,
    ),
  );

  return base.copyWith(
    scaffoldBackgroundColor: OceanColors.background,
    cardTheme: CardTheme(
      color: OceanColors.surface,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: const BorderSide(color: OceanColors.border),
      ),
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: OceanColors.background,
      foregroundColor: OceanColors.ink,
      elevation: 0,
      centerTitle: false,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: OceanColors.surface,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: OceanColors.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: OceanColors.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: OceanColors.primary, width: 2),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: OceanColors.primary,
        foregroundColor: Colors.white,
        minimumSize: const Size.fromHeight(52),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: OceanColors.primary,
        minimumSize: const Size.fromHeight(52),
        side: const BorderSide(color: OceanColors.primary),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: OceanColors.surface,
      indicatorColor: OceanColors.secondary,
      labelTextStyle: WidgetStateProperty.all(
        const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
      ),
    ),
    chipTheme: base.chipTheme.copyWith(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
    ),
  );
}
