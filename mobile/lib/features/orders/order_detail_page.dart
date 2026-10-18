import 'package:flutter/material.dart';

import '../../core/app_theme.dart';
import '../../core/formatters.dart';
import '../../data/laba_repository.dart';
import '../../data/models.dart';
import '../../widgets/status_badge.dart';

/// Order detail with the real recorded status history, plus cancellation through
/// the same validated function the website uses.
class OrderDetailPage extends StatefulWidget {
  const OrderDetailPage({super.key, required this.orderId});

  final String orderId;

  @override
  State<OrderDetailPage> createState() => _OrderDetailPageState();
}

class _OrderDetailPageState extends State<OrderDetailPage> {
  final _repository = LabaRepository.of();
  late Future<(LaundryOrder, List<StatusHistoryEntry>)> _future;
  bool _cancelling = false;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<(LaundryOrder, List<StatusHistoryEntry>)> _load() async {
    final order = await _repository.getOrder(widget.orderId);
    final history = await _repository.getOrderHistory(widget.orderId);
    return (order, history);
  }

  Future<void> _refresh() async {
    setState(() => _future = _load());
    await _future;
  }

  Future<void> _cancel() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cancel this order?'),
        content: const Text(
          'The shop will see it as cancelled. You cannot undo this from your account.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Keep order'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Cancel order'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() => _cancelling = true);
    try {
      await _repository.cancelOrder(widget.orderId);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Order cancelled. The shop has been notified.')),
      );
      await _refresh();
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.toString())),
      );
    } finally {
      if (mounted) setState(() => _cancelling = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Order details')),
      body: FutureBuilder<(LaundryOrder, List<StatusHistoryEntry>)>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return ErrorPanel(message: snapshot.error.toString(), onRetry: _refresh);
          }

          final (order, history) = snapshot.data!;

          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          order.orderCode,
                          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
                        ),
                        const SizedBox(height: 8),
                        StatusBadge(status: order.status),
                        const SizedBox(height: 12),
                        Text('Placed ${formatDateTime(order.createdAt)}'),
                        if (order.pickupAt != null)
                          Text('Requested for ${formatDateTime(order.pickupAt)}'),
                        const SizedBox(height: 12),
                        _moneyRow('Total', formatMoney(order.totalAmount)),
                        _moneyRow('Paid', formatMoney(order.amountPaid)),
                        _moneyRow('Balance', formatMoney(order.balance)),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                _sectionTitle('Progress'),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        for (final entry in history)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 10),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Icon(Icons.circle, size: 10, color: OceanColors.primary),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        entry.fromStatus == null
                                            ? 'Order created as ${OrderStatusMeta.of(entry.toStatus).label}'
                                            : '${OrderStatusMeta.of(entry.fromStatus!).label} → '
                                                '${OrderStatusMeta.of(entry.toStatus).label}',
                                        style: const TextStyle(fontWeight: FontWeight.w600),
                                      ),
                                      Text(
                                        '${entry.changedByName ?? 'System'} · ${formatDateTime(entry.createdAt)}',
                                        style: const TextStyle(
                                          color: OceanColors.inkMuted,
                                          fontSize: 12,
                                        ),
                                      ),
                                      if (entry.note != null && entry.note!.isNotEmpty)
                                        Text(
                                          '“${entry.note}”',
                                          style: const TextStyle(
                                            fontStyle: FontStyle.italic,
                                            color: OceanColors.inkMuted,
                                            fontSize: 12,
                                          ),
                                        ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                _sectionTitle('What you ordered'),
                Card(
                  child: Column(
                    children: [
                      for (final item in order.items)
                        ListTile(
                          title: Text(item.serviceName),
                          subtitle: Text(
                            '${formatQuantity(item.quantity, item.unit)} × ${formatMoney(item.unitPrice)}',
                          ),
                          trailing: Text(
                            formatMoney(item.lineTotal),
                            style: const TextStyle(fontWeight: FontWeight.w700),
                          ),
                        ),
                    ],
                  ),
                ),
                if (order.notes != null && order.notes!.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  _sectionTitle('Your instructions'),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Text(order.notes!),
                    ),
                  ),
                ],
                const SizedBox(height: 16),
                _sectionTitle('Payments'),
                Card(
                  child: order.payments.isEmpty
                      ? const Padding(
                          padding: EdgeInsets.all(16),
                          child: Text('No payment recorded yet. Pay at the counter when you collect.'),
                        )
                      : Column(
                          children: [
                            for (final payment in order.payments)
                              ListTile(
                                title: Text(payment.channel),
                                subtitle: Text(formatDateTime(payment.paidAt)),
                                trailing: Text(
                                  formatMoney(payment.amount),
                                  style: const TextStyle(fontWeight: FontWeight.w700),
                                ),
                              ),
                          ],
                        ),
                ),
                if (order.isCancellable) ...[
                  const SizedBox(height: 20),
                  OutlinedButton(
                    onPressed: _cancelling ? null : _cancel,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: OceanColors.danger,
                      side: const BorderSide(color: OceanColors.danger),
                    ),
                    child: Text(_cancelling ? 'Cancelling…' : 'Cancel this order'),
                  ),
                ],
                const SizedBox(height: 24),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _sectionTitle(String text) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Text(
          text.toUpperCase(),
          style: const TextStyle(
            fontSize: 12,
            letterSpacing: 1.2,
            fontWeight: FontWeight.w700,
            color: OceanColors.inkMuted,
          ),
        ),
      );

  Widget _moneyRow(String label, String value) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 2),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: const TextStyle(color: OceanColors.inkMuted)),
            Text(value, style: const TextStyle(fontWeight: FontWeight.w700)),
          ],
        ),
      );
}
