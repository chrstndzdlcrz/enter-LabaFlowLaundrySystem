import 'package:supabase_flutter/supabase_flutter.dart';

import 'models.dart';

/// The single place the mobile app talks to the backend.
///
/// Every write goes through the same validated functions and row level security
/// policies the web app uses: the app never computes a price, never decides a
/// role and never sets a status the lifecycle rules do not allow.
class LabaRepository {
  LabaRepository(this._client);

  final SupabaseClient _client;

  factory LabaRepository.of() => LabaRepository(Supabase.instance.client);

  SupabaseClient get client => _client;

  User? get currentUser => _client.auth.currentUser;

  // ------------------------------------------------------------------ profile
  Future<Profile> ensureProfile() async {
    final data = await _client.rpc('ensure_profile');
    return Profile.fromJson((data as Map).cast<String, dynamic>());
  }

  Future<Profile> updateProfile({
    required String fullName,
    String? phone,
    String? address,
    String? avatarUrl,
  }) async {
    final userId = _client.auth.currentUser?.id;
    if (userId == null) throw const AuthException('You are not signed in.');

    final row = await _client
        .from('profiles')
        .update({
          'full_name': fullName,
          'phone': phone,
          'address': address,
          'avatar_url': avatarUrl,
        })
        .eq('id', userId)
        .select()
        .single();

    return Profile.fromJson(row);
  }

  // ------------------------------------------------------------------- auth
  Future<void> signInWithPassword({required String email, required String password}) async {
    await _client.auth.signInWithPassword(email: email, password: password);
  }

  Future<void> signUp({
    required String email,
    required String password,
    required String fullName,
    String? phone,
  }) async {
    await _client.auth.signUp(
      email: email,
      password: password,
      data: {'full_name': fullName, 'phone': phone},
      emailRedirectTo: 'io.labaflow.app://login-callback',
    );
  }

  Future<void> signInWithGoogle() async {
    await _client.auth.signInWithOAuth(
      OAuthProvider.google,
      redirectTo: 'io.labaflow.app://login-callback',
    );
  }

  Future<void> signOut() => _client.auth.signOut();

  // --------------------------------------------------------------- catalogue
  Future<List<Service>> listServices() async {
    final rows = await _client
        .from('services')
        .select()
        .eq('is_active', true)
        .order('sort_order', ascending: true);
    return (rows as List<dynamic>)
        .map((row) => Service.fromJson((row as Map).cast<String, dynamic>()))
        .toList();
  }

  // ----------------------------------------------------------------- orders
  static const String _orderRelations =
      '*, order_items(*), payments(*), receipts(id, receipt_no, is_final, total)';

  Future<List<LaundryOrder>> listMyOrders() async {
    final rows = await _client
        .from('orders')
        .select(_orderRelations)
        .order('created_at', ascending: false);
    return (rows as List<dynamic>)
        .map((row) => LaundryOrder.fromJson((row as Map).cast<String, dynamic>()))
        .toList();
  }

  Future<LaundryOrder> getOrder(String orderId) async {
    final row =
        await _client.from('orders').select(_orderRelations).eq('id', orderId).single();
    return LaundryOrder.fromJson((row as Map).cast<String, dynamic>());
  }

  Future<List<StatusHistoryEntry>> getOrderHistory(String orderId) async {
    final rows = await _client
        .from('order_status_history')
        .select()
        .eq('order_id', orderId)
        .order('created_at', ascending: true);
    return (rows as List<dynamic>)
        .map((row) => StatusHistoryEntry.fromJson((row as Map).cast<String, dynamic>()))
        .toList();
  }

  /// Prices are computed on the server from the shop's own service records.
  Future<LaundryOrder> createBooking({
    required List<Map<String, dynamic>> items,
    String? notes,
    DateTime? pickupAt,
  }) async {
    final data = await _client.rpc('create_booking', params: {
      'p_items': items,
      'p_notes': notes,
      'p_pickup_at': pickupAt?.toUtc().toIso8601String(),
    });
    return LaundryOrder.fromJson((data as Map).cast<String, dynamic>());
  }

  Future<LaundryOrder> cancelOrder(String orderId) async {
    final data = await _client.rpc('cancel_my_order', params: {'p_order_id': orderId});
    return LaundryOrder.fromJson((data as Map).cast<String, dynamic>());
  }

  // --------------------------------------------------------------- receipts
  Future<List<Receipt>> listReceipts() async {
    final rows = await _client
        .from('receipts')
        .select()
        .order('issued_at', ascending: false);
    return (rows as List<dynamic>)
        .map((row) => Receipt.fromJson((row as Map).cast<String, dynamic>()))
        .toList();
  }

  // ---------------------------------------------------------- notifications
  Future<List<AppNotification>> listNotifications() async {
    final rows = await _client
        .from('notifications')
        .select()
        .order('created_at', ascending: false)
        .limit(100);
    return (rows as List<dynamic>)
        .map((row) => AppNotification.fromJson((row as Map).cast<String, dynamic>()))
        .toList();
  }

  Future<void> markNotificationRead(String id) async {
    await _client
        .from('notifications')
        .update({'read_at': DateTime.now().toUtc().toIso8601String()}).eq('id', id);
  }

  Future<void> markAllNotificationsRead() async {
    final userId = _client.auth.currentUser?.id;
    if (userId == null) return;
    await _client
        .from('notifications')
        .update({'read_at': DateTime.now().toUtc().toIso8601String()})
        .eq('user_id', userId)
        .isFilter('read_at', null);
  }

  /// FCM device registration. The token only exists once Firebase Messaging is
  /// added and the shop's Firebase project is configured.
  Future<void> registerDeviceToken(String token) async {
    final userId = _client.auth.currentUser?.id;
    if (userId == null) return;
    await _client.from('device_tokens').upsert(
      {
        'user_id': userId,
        'token': token,
        'platform': 'android',
        'last_seen_at': DateTime.now().toUtc().toIso8601String(),
      },
      onConflict: 'token',
    );
  }

  // ------------------------------------------------------------------- chat
  Future<String> myConversationId() async {
    final data = await _client.rpc('get_or_create_my_conversation');
    return ((data as Map)['id'] as String);
  }

  Future<List<ChatMessage>> listMessages(String conversationId) async {
    final rows = await _client
        .from('messages')
        .select()
        .eq('conversation_id', conversationId)
        .order('created_at', ascending: true)
        .limit(300);
    return (rows as List<dynamic>)
        .map((row) => ChatMessage.fromJson((row as Map).cast<String, dynamic>()))
        .toList();
  }

  Future<ChatMessage> sendMessage(String conversationId, String body) async {
    final userId = _client.auth.currentUser?.id;
    if (userId == null) throw const AuthException('You are not signed in.');

    final row = await _client
        .from('messages')
        .insert({
          'conversation_id': conversationId,
          'sender_id': userId,
          'body': body.trim(),
        })
        .select()
        .single();
    return ChatMessage.fromJson((row as Map).cast<String, dynamic>());
  }

  Future<void> markConversationRead(String conversationId) async {
    await _client.rpc('mark_conversation_read', params: {'p_conversation_id': conversationId});
  }

  /// Live message inserts for one conversation.
  Stream<List<Map<String, dynamic>>> watchMessages(String conversationId) => _client
      .from('messages')
      .stream(primaryKey: ['id'])
      .eq('conversation_id', conversationId)
      .order('created_at')
      .map((rows) => rows.cast<Map<String, dynamic>>());

  /// Live notifications for the signed-in customer.
  Stream<List<Map<String, dynamic>>> watchNotifications(String userId) => _client
      .from('notifications')
      .stream(primaryKey: ['id'])
      .eq('user_id', userId)
      .order('created_at')
      .map((rows) => rows.cast<Map<String, dynamic>>());
}

/// Thrown for sign-in and profile problems the UI should show to the customer.
class AuthException implements Exception {
  const AuthException(this.message);

  final String message;

  @override
  String toString() => message;
}
