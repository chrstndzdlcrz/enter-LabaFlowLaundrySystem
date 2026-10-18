import 'package:flutter/material.dart';

import '../../core/app_theme.dart';
import '../../core/formatters.dart';
import '../../data/laba_repository.dart';
import '../../data/models.dart';
import '../../widgets/status_badge.dart';

/// Live notifications for the signed-in customer.
///
/// Delivery here is in-app through Realtime, which needs no extra credentials.
/// Background push additionally requires the shop's Firebase configuration.
class NotificationsPage extends StatefulWidget {
  const NotificationsPage({super.key, required this.userId});

  final String userId;

  @override
  State<NotificationsPage> createState() => _NotificationsPageState();
}

class _NotificationsPageState extends State<NotificationsPage> {
  final _repository = LabaRepository.of();
  late Future<List<AppNotification>> _future;

  @override
  void initState() {
    super.initState();
    _future = _repository.listNotifications();
  }

  Future<void> _refresh() async {
    setState(() => _future = _repository.listNotifications());
    await _future;
  }

  Future<void> _markRead(String id) async {
    try {
      await _repository.markNotificationRead(id);
      await _refresh();
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.toString())));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          IconButton(
            onPressed: () async {
              await _repository.markAllNotificationsRead();
              await _refresh();
            },
            icon: const Icon(Icons.done_all),
            tooltip: 'Mark all as read',
          ),
        ],
      ),
      body: StreamBuilder<List<Map<String, dynamic>>>(
        stream: _repository.watchNotifications(widget.userId),
        builder: (context, liveSnapshot) {
          // The live stream wins as soon as it has data, so a ready-for-pick-up
          // alert appears without pulling to refresh.
          if (liveSnapshot.hasData) {
            final live = liveSnapshot.data!
                .map(AppNotification.fromJson)
                .toList()
                .reversed
                .toList();
            return _list(live);
          }

          return FutureBuilder<List<AppNotification>>(
            future: _future,
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }
              if (snapshot.hasError) {
                return ErrorPanel(message: snapshot.error.toString(), onRetry: _refresh);
              }
              return _list(snapshot.data ?? const []);
            },
          );
        },
      ),
    );
  }

  Widget _list(List<AppNotification> notifications) {
    if (notifications.isEmpty) {
      return const EmptyState(
        icon: Icons.notifications_none,
        title: 'No notifications yet',
        description: 'We will tell you here the moment your laundry is ready for pick-up.',
      );
    }

    return RefreshIndicator(
      onRefresh: _refresh,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: notifications.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (context, index) {
          final item = notifications[index];
          return Card(
            color: item.isUnread ? OceanColors.secondary : null,
            child: ListTile(
              contentPadding: const EdgeInsets.all(16),
              title: Text(
                item.title,
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
              subtitle: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 4),
                  Text(item.body),
                  const SizedBox(height: 4),
                  Text(
                    formatRelative(item.createdAt),
                    style: const TextStyle(color: OceanColors.inkMuted, fontSize: 12),
                  ),
                ],
              ),
              trailing: item.isUnread
                  ? IconButton(
                      onPressed: () => _markRead(item.id),
                      icon: const Icon(Icons.check_circle_outline),
                      tooltip: 'Mark as read',
                    )
                  : null,
            ),
          );
        },
      ),
    );
  }
}
