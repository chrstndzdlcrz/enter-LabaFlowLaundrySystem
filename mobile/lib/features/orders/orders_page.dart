import 'package:flutter/material.dart';

import '../../core/app_theme.dart';
import '../../core/formatters.dart';
import '../../data/laba_repository.dart';
import '../../data/models.dart';
import '../../widgets/status_badge.dart';
import 'order_detail_page.dart';

class OrdersPage extends StatefulWidget {
  const OrdersPage({super.key});

  @override
  State<OrdersPage> createState() => _OrdersPageState();
}

class _OrdersPageState extends State<OrdersPage> {
  final _repository = LabaRepository.of();
  late Future<List<LaundryOrder>> _future;

  @override
  void initState() {
    super.initState();
    _future = _repository.listMyOrders();
  }

  Future<void> _refresh() async {
    setState(() => _future = _repository.listMyOrders());
    await _future;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My orders'),
        actions: [
          IconButton(
            onPressed: _refresh,
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: FutureBuilder<List<LaundryOrder>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return ErrorPanel(
              message: snapshot.error.toString(),
              onRetry: _refresh,
            );
          }

          final orders = snapshot.data ?? const <LaundryOrder>[];
          if (orders.isEmpty) {
            return const EmptyState(
              icon: Icons.local_laundry_service_outlined,
              title: 'No orders yet',
              description: 'Book a service and your laundry will be tracked here.',
            );
          }

          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: orders.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final order = orders[index];
                return Card(
                  child: InkWell(
                    borderRadius: BorderRadius.circular(18),
                    onTap: () async {
                      await Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => OrderDetailPage(orderId: order.id),
                        ),
                      );
                      await _refresh();
                    },
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  order.orderCode,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w700,
                                    fontSize: 16,
                                  ),
                                ),
                              ),
                              Text(
                                formatMoney(order.totalAmount),
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                  color: OceanColors.primary,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          StatusBadge(status: order.status),
                          const SizedBox(height: 10),
                          Text(
                            order.items
                                .map((item) => '${item.serviceName} (${formatQuantity(item.quantity, item.unit)})')
                                .join(' · '),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(color: OceanColors.inkMuted, fontSize: 13),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            'Placed ${formatDateTime(order.createdAt)}',
                            style: const TextStyle(color: OceanColors.inkMuted, fontSize: 12),
                          ),
                          if (order.paymentStatus != 'unpaid') ...[
                            const SizedBox(height: 4),
                            Text(
                              'Payment: ${order.paymentStatus} · ${formatMoney(order.amountPaid)} received',
                              style: const TextStyle(color: OceanColors.inkMuted, fontSize: 12),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
