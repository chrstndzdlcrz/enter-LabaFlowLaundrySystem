import 'package:flutter/material.dart';

import '../../core/app_theme.dart';
import '../../core/formatters.dart';
import '../../data/laba_repository.dart';
import '../../data/models.dart';
import '../../widgets/status_badge.dart';

/// Digital receipts. Every figure comes from the recorded payments, so a receipt
/// can never disagree with the ledger.
class ReceiptsPage extends StatefulWidget {
  const ReceiptsPage({super.key});

  @override
  State<ReceiptsPage> createState() => _ReceiptsPageState();
}

class _ReceiptsPageState extends State<ReceiptsPage> {
  final _repository = LabaRepository.of();
  late Future<List<Receipt>> _future;

  @override
  void initState() {
    super.initState();
    _future = _repository.listReceipts();
  }

  Future<void> _refresh() async {
    setState(() => _future = _repository.listReceipts());
    await _future;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My receipts')),
      body: FutureBuilder<List<Receipt>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return ErrorPanel(message: snapshot.error.toString(), onRetry: _refresh);
          }

          final receipts = snapshot.data ?? const <Receipt>[];
          if (receipts.isEmpty) {
            return const EmptyState(
              icon: Icons.receipt_long_outlined,
              title: 'No receipts yet',
              description: 'Once the shop records a payment, your e-receipt appears here.',
            );
          }

          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: receipts.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final receipt = receipts[index];
                return Card(
                  child: ListTile(
                    contentPadding: const EdgeInsets.all(16),
                    onTap: () => _showReceipt(receipt),
                    title: Row(
                      children: [
                        Expanded(
                          child: Text(
                            receipt.receiptNo,
                            style: const TextStyle(fontWeight: FontWeight.w700),
                          ),
                        ),
                        Text(
                          formatMoney(receipt.total),
                          style: const TextStyle(
                            fontWeight: FontWeight.w700,
                            color: OceanColors.primary,
                          ),
                        ),
                      ],
                    ),
                    subtitle: Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(
                        '${receipt.isFinal ? 'Final receipt' : 'Proforma — partly paid'} · '
                        'issued ${formatDate(receipt.issuedAt)}'
                        '${receipt.channel == null ? '' : ' · ${receipt.channel}'}',
                        style: const TextStyle(color: OceanColors.inkMuted, fontSize: 12),
                      ),
                    ),
                    trailing: const Icon(Icons.chevron_right),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }

  void _showReceipt(Receipt receipt) {
    final items = (receipt.snapshot['items'] as List<dynamic>? ?? const []);

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: OceanColors.background,
      builder: (context) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.7,
        builder: (context, controller) => ListView(
          controller: controller,
          padding: const EdgeInsets.all(20),
          children: [
            Text(
              receipt.shopName,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
            ),
            Text(
              '${receipt.isFinal ? 'Official receipt' : 'Proforma receipt'} · ${receipt.receiptNo}',
              style: const TextStyle(color: OceanColors.inkMuted, fontSize: 12),
            ),
            const SizedBox(height: 16),
            for (final raw in items)
              Builder(
                builder: (context) {
                  final item = raw as Map<String, dynamic>;
                  return ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text((item['name'] ?? 'Service') as String),
                    subtitle: Text(
                      '${formatQuantity(item['quantity'] as num?, item['unit'] as String?)} × '
                      '${formatMoney(item['unit_price'] as num?)}',
                    ),
                    trailing: Text(formatMoney(item['line_total'] as num?)),
                  );
                },
              ),
            const Divider(),
            _row('Subtotal', formatMoney(receipt.subtotal)),
            if (receipt.discount > 0) _row('Discount', '-${formatMoney(receipt.discount)}'),
            _row('Total', formatMoney(receipt.total), bold: true),
            _row('Amount paid', formatMoney(receipt.amountPaid)),
            _row('Balance', formatMoney(receipt.balance)),
            const SizedBox(height: 12),
            Text(
              receipt.shopFooter,
              textAlign: TextAlign.center,
              style: const TextStyle(color: OceanColors.inkMuted, fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }

  Widget _row(String label, String value, {bool bold = false}) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 3),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: const TextStyle(color: OceanColors.inkMuted)),
            Text(
              value,
              style: TextStyle(fontWeight: bold ? FontWeight.w800 : FontWeight.w600),
            ),
          ],
        ),
      );
}
