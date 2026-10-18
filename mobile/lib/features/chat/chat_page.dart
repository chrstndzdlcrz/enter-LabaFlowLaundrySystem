import 'package:flutter/material.dart';

import '../../core/app_theme.dart';
import '../../core/formatters.dart';
import '../../data/laba_repository.dart';
import '../../data/models.dart';
import '../../widgets/status_badge.dart';

/// The customer's private conversation with the shop, kept live with Realtime.
class ChatPage extends StatefulWidget {
  const ChatPage({super.key});

  @override
  State<ChatPage> createState() => _ChatPageState();
}

class _ChatPageState extends State<ChatPage> {
  final _repository = LabaRepository.of();
  final _controller = TextEditingController();
  final _scrollController = ScrollController();

  Future<String>? _conversation;
  late Future<List<ChatMessage>> _messages;
  bool _sending = false;

  @override
  void initState() {
    super.initState();
    _conversation = _repository.myConversationId();
    _messages = _conversation!.then(_repository.listMessages);
  }

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _send(String conversationId) async {
    final body = _controller.text.trim();
    if (body.isEmpty) return;

    setState(() => _sending = true);
    try {
      await _repository.sendMessage(conversationId, body);
      _controller.clear();
      setState(() => _messages = _repository.listMessages(conversationId));
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.toString())));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final currentUserId = _repository.currentUser?.id;

    return Scaffold(
      appBar: AppBar(title: const Text('Chat with the shop')),
      body: FutureBuilder<String>(
        future: _conversation,
        builder: (context, conversationSnapshot) {
          if (conversationSnapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (conversationSnapshot.hasError) {
            return ErrorPanel(message: conversationSnapshot.error.toString());
          }

          final conversationId = conversationSnapshot.data!;
          void markRead() => _repository.markConversationRead(conversationId);

          return Column(
            children: [
              Expanded(
                child: StreamBuilder<List<Map<String, dynamic>>>(
                  stream: _repository.watchMessages(conversationId),
                  builder: (context, liveSnapshot) {
                    final messages = liveSnapshot.hasData
                        ? liveSnapshot.data!.map(ChatMessage.fromJson).toList()
                        : null;

                    if (messages == null) {
                      return FutureBuilder<List<ChatMessage>>(
                        future: _messages,
                        builder: (context, snapshot) {
                          if (snapshot.connectionState == ConnectionState.waiting) {
                            return const Center(child: CircularProgressIndicator());
                          }
                          if (snapshot.hasError) {
                            return ErrorPanel(message: snapshot.error.toString());
                          }
                          final loaded = snapshot.data ?? const <ChatMessage>[];
                          markRead();
                          return _thread(loaded, currentUserId);
                        },
                      );
                    }

                    markRead();
                    return _thread(messages, currentUserId);
                  },
                ),
              ),
              SafeArea(
                top: false,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                  child: Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _controller,
                          minLines: 1,
                          maxLines: 4,
                          textInputAction: TextInputAction.newline,
                          decoration: const InputDecoration(hintText: 'Write a message…'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      IconButton.filled(
                        onPressed: _sending ? null : () => _send(conversationId),
                        icon: const Icon(Icons.send),
                        tooltip: 'Send',
                      ),
                    ],
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _thread(List<ChatMessage> messages, String? currentUserId) {
    if (messages.isEmpty) {
      return const EmptyState(
        icon: Icons.chat_bubble_outline,
        title: 'No messages yet',
        description: 'Say hello, or ask about your order code — shop staff reply here.',
      );
    }

    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.all(16),
      itemCount: messages.length,
      itemBuilder: (context, index) {
        final message = messages[index];
        final mine = message.senderId == currentUserId;
        return Align(
          alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
          child: Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            constraints: BoxConstraints(
              maxWidth: MediaQuery.of(context).size.width * 0.78,
            ),
            decoration: BoxDecoration(
              color: mine ? OceanColors.primary : OceanColors.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: mine ? OceanColors.primary : OceanColors.border,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (!mine)
                  Text(
                    message.senderRole == 'staff' ? 'Shop staff' : 'You',
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 12,
                      color: OceanColors.inkMuted,
                    ),
                  ),
                Text(
                  message.body,
                  style: TextStyle(color: mine ? Colors.white : OceanColors.ink),
                ),
                const SizedBox(height: 4),
                Text(
                  formatRelative(message.createdAt),
                  style: TextStyle(
                    fontSize: 11,
                    color: mine ? Colors.white70 : OceanColors.inkMuted,
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
