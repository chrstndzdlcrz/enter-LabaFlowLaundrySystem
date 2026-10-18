import 'package:intl/intl.dart';

import 'app_config.dart';

final _currency = NumberFormat.currency(
  locale: 'en_PH',
  symbol: '₱',
  decimalDigits: 2,
);

final _dateTime = DateFormat('d MMM yyyy, h:mm a');

final _date = DateFormat('d MMM yyyy');

String formatMoney(num? value) => _currency.format(value ?? 0);

String formatDateTime(String? iso) {
  if (iso == null || iso.isEmpty) return '—';
  final parsed = DateTime.tryParse(iso)?.toLocal();
  if (parsed == null) return '—';
  return _dateTime.format(parsed);
}

String formatDate(String? iso) {
  if (iso == null || iso.isEmpty) return '—';
  final parsed = DateTime.tryParse(iso)?.toLocal();
  if (parsed == null) return '—';
  return _date.format(parsed);
}

String formatRelative(String? iso) {
  if (iso == null || iso.isEmpty) return '—';
  final parsed = DateTime.tryParse(iso)?.toLocal();
  if (parsed == null) return '—';
  final diff = DateTime.now().difference(parsed);
  if (diff.inMinutes < 1) return 'just now';
  if (diff.inMinutes < 60) return '${diff.inMinutes} min ago';
  if (diff.inHours < 24) return '${diff.inHours} hr ago';
  if (diff.inDays < 7) return '${diff.inDays} day${diff.inDays == 1 ? '' : 's'} ago';
  return _date.format(parsed);
}

String formatQuantity(num? value, String? unit) {
  final amount = value ?? 0;
  final text = amount == amount.roundToDouble()
      ? amount.toInt().toString()
      : amount.toStringAsFixed(2);
  return unit == null || unit.isEmpty ? text : '$text $unit';
}

String currencyCode() => AppConfig.currencyCode;
