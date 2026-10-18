import 'dart:math' as math;

import '../data/models.dart';

/// Service pricing, mirroring the backend function that charges the line.
///
/// The database recomputes every line when an order is created, so a mistake here
/// can never change what a customer is charged — it would only make the preview
/// disagree, which is why these values are compared against the server.
class LabaPricing {
  const LabaPricing._();

  static double lineTotal(Service service, num quantity) {
    final qty = quantity.toDouble();
    final base = service.baseQuantity;

    if (base == null || base <= 0) {
      return _round2(service.price * qty);
    }
    final extra = math.max(qty - base, 0);
    if (extra == 0) return _round2(service.price);

    final increment = (service.incrementQuantity ?? 1) <= 0
        ? 1.0
        : service.incrementQuantity!.toDouble();
    final steps = (extra / increment).ceil();
    return _round2(service.price + steps * (service.incrementPrice ?? 0));
  }

  /// Largest quantity the shop accepts in one wash, when it caps it.
  static double? maxQuantity(Service service) => service.maxQuantity;

  static double clampQuantity(Service service, num quantity) {
    final max = service.maxQuantity;
    final qty = math.max(quantity.toDouble(), 0);
    return max != null && qty > max ? max : qty;
  }

  static String money(num value) => '₱${value.toStringAsFixed(2)}';

  /// One-line explanation of the price rule.
  static String summary(Service service) {
    final base = service.baseQuantity;
    final unit = service.unit;

    if (base == null || base <= 0) {
      return '${money(service.price)} per $unit';
    }

    final parts = <String>['${money(service.price)} for the first ${_trim(base)} $unit'];
    final incrementPrice = service.incrementPrice ?? 0;
    if (incrementPrice > 0) {
      final increment = service.incrementQuantity ?? 1;
      parts.add(
        '${money(incrementPrice)} per extra ${increment == 1 ? unit : '${_trim(increment)} $unit'}',
      );
    }
    final max = service.maxQuantity;
    if (max != null) parts.add('maximum ${_trim(max)} $unit per wash');
    return parts.join(' · ');
  }

  static String? quantityHint(Service service) {
    final base = service.baseQuantity;
    if (base == null || base <= 0) return null;
    final max = service.maxQuantity;
    return max != null
        ? 'Minimum charge covers up to ${_trim(base)} ${service.unit}; the most we take per wash is ${_trim(max)} ${service.unit}.'
        : 'Minimum charge covers up to ${_trim(base)} ${service.unit}.';
  }

  static double _round2(num value) => (value * 100).round() / 100;

  static String _trim(num value) =>
      value == value.roundToDouble() ? value.toInt().toString() : value.toString();
}
