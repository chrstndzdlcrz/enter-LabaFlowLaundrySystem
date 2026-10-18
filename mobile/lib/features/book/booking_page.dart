import 'package:flutter/material.dart';

import '../../core/app_theme.dart';
import '../../core/formatters.dart';
import '../../data/laba_repository.dart';
import '../../data/models.dart';
import '../../widgets/status_badge.dart';

/// Booking with a live price preview. The final amount is still computed on the
/// backend from the shop's own service records.
class BookingPage extends StatefulWidget {
  const BookingPage({super.key});

  @override
  State<BookingPage> createState() => _BookingPageState();
}

class _BookingPageState extends State<BookingPage> {
  final _repository = LabaRepository.of();
  final _notesController = TextEditingController();
  final Map<String, num> _quantities = {};

  late Future<List<Service>> _future;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _future = _repository.listServices();
  }

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  num _totalFor(List<Service> services) {
    num total = 0;
    for (final service in services) {
      total += service.price * (_quantities[service.id] ?? 0);
    }
    return total;
  }

  Future<void> _submit(List<Service> services) async {
    final selected = services
        .where((service) => (_quantities[service.id] ?? 0) > 0)
        .map((service) => {
              'service_id': service.id,
              'quantity': _quantities[service.id],
            })
        .toList();

    if (selected.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Add at least one service before submitting.')),
      );
      return;
    }

    setState(() => _submitting = true);
    try {
      final order = await _repository.createBooking(
        items: selected,
        notes: _notesController.text.trim().isEmpty ? null : _notesController.text.trim(),
      );
      if (!mounted) return;
      setState(() => _quantities.clear());
      _notesController.clear();
      await showDialog<void>(
        context: context,
        builder: (context) => AlertDialog(
          title: Text('Booking ${order.orderCode} submitted'),
          content: const Text(
            'Bring your laundry to the counter and quote this order code. You can follow every status '
            'change from the Orders tab.',
          ),
          actions: [
            FilledButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Got it'),
            ),
          ],
        ),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.toString())),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Book a service')),
      body: FutureBuilder<List<Service>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return ErrorPanel(
              message: snapshot.error.toString(),
              onRetry: () => setState(() => _future = _repository.listServices()),
            );
          }

          final services = snapshot.data ?? const <Service>[];
          if (services.isEmpty) {
            return const EmptyState(
              icon: Icons.local_laundry_service_outlined,
              title: 'No services published yet',
              description: 'The shop has not opened its price list yet.',
            );
          }

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              for (final service in services)
                Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                service.name,
                                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                              ),
                            ),
                            Text(
                              '${formatMoney(service.price)} / ${service.unit}',
                              style: const TextStyle(
                                fontWeight: FontWeight.w700,
                                color: OceanColors.primary,
                              ),
                            ),
                          ],
                        ),
                        if (service.description != null) ...[
                          const SizedBox(height: 4),
                          Text(
                            service.description!,
                            style: const TextStyle(color: OceanColors.inkMuted, fontSize: 13),
                          ),
                        ],
                        if (service.isPlaceholder)
                          const Padding(
                            padding: EdgeInsets.only(top: 6),
                            child: Text(
                              'Placeholder price — the shop still has to confirm it.',
                              style: TextStyle(color: OceanColors.warning, fontSize: 12),
                            ),
                          ),
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            IconButton(
                              onPressed: () => setState(() {
                                final current = _quantities[service.id] ?? 0;
                                final step = service.unit == 'piece' ? 1 : 0.5;
                                final next = current - step;
                                if (next <= 0) {
                                  _quantities.remove(service.id);
                                } else {
                                  _quantities[service.id] = next;
                                }
                              }),
                              icon: const Icon(Icons.remove_circle_outline),
                              tooltip: 'Remove one',
                            ),
                            Text(
                              formatQuantity(_quantities[service.id] ?? 0, service.unit),
                              style: const TextStyle(fontWeight: FontWeight.w600),
                            ),
                            IconButton(
                              onPressed: () => setState(() {
                                final step = service.unit == 'piece' ? 1 : 0.5;
                                _quantities[service.id] = (_quantities[service.id] ?? 0) + step;
                              }),
                              icon: const Icon(Icons.add_circle_outline),
                              tooltip: 'Add one',
                            ),
                            const Spacer(),
                            Text(
                              formatMoney(service.price * (_quantities[service.id] ?? 0)),
                              style: const TextStyle(fontWeight: FontWeight.w700),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              TextField(
                controller: _notesController,
                maxLines: 3,
                decoration: const InputDecoration(
                  labelText: 'Instructions for the shop (optional)',
                  alignLabelWithHint: true,
                ),
              ),
              const SizedBox(height: 16),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Estimated total'),
                      Text(
                        formatMoney(_totalFor(services)),
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                          color: OceanColors.primary,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),
              const Text(
                'The final amount is confirmed at the counter once your laundry is weighed. '
                'Payment is collected there — cash or GCash.',
                style: TextStyle(color: OceanColors.inkMuted, fontSize: 12),
              ),
              const SizedBox(height: 20),
              FilledButton(
                onPressed: _submitting ? null : () => _submit(services),
                child: Text(_submitting ? 'Submitting…' : 'Submit booking'),
              ),
              const SizedBox(height: 24),
            ],
          );
        },
      ),
    );
  }
}
