/// Plain models mirroring the backend rows the mobile app reads.
///
/// The database is the source of truth: statuses, totals and permissions all come
/// from it, never from the app.
library;

class Profile {
  Profile({
    required this.id,
    this.email,
    this.fullName,
    this.phone,
    this.address,
    this.avatarUrl,
    required this.role,
    required this.isActive,
  });

  final String id;
  final String? email;
  final String? fullName;
  final String? phone;
  final String? address;
  final String? avatarUrl;
  final String role;
  final bool isActive;

  bool get isCustomer => role == 'customer';

  factory Profile.fromJson(Map<String, dynamic> json) => Profile(
        id: json['id'] as String,
        email: json['email'] as String?,
        fullName: json['full_name'] as String?,
        phone: json['phone'] as String?,
        address: json['address'] as String?,
        avatarUrl: json['avatar_url'] as String?,
        role: (json['role'] as String?) ?? 'customer',
        isActive: (json['is_active'] as bool?) ?? true,
      );
}

class Service {
  Service({
    required this.id,
    required this.name,
    this.description,
    this.category,
    required this.unit,
    required this.price,
    required this.estimatedHours,
    required this.isPlaceholder,
    this.baseQuantity,
    this.incrementQuantity,
    this.incrementPrice,
    this.maxQuantity,
  });

  final String id;
  final String name;
  final String? description;
  final String? category;
  final String unit;
  final num price;
  final int estimatedHours;
  final bool isPlaceholder;

  /// Quantity the base price already covers (null for a flat price per unit).
  final num? baseQuantity;

  /// How much each extra charge covers, and what that charge is.
  final num? incrementQuantity;
  final num? incrementPrice;

  /// Largest quantity accepted in one wash, when the shop caps it.
  final num? maxQuantity;

  factory Service.fromJson(Map<String, dynamic> json) => Service(
        id: json['id'] as String,
        name: json['name'] as String,
        description: json['description'] as String?,
        category: json['category'] as String?,
        unit: (json['unit'] as String?) ?? 'kg',
        price: (json['price'] as num?) ?? 0,
        estimatedHours: (json['estimated_hours'] as num?)?.toInt() ?? 24,
        isPlaceholder: (json['is_placeholder'] as bool?) ?? false,
        baseQuantity: json['base_quantity'] as num?,
        incrementQuantity: json['increment_quantity'] as num?,
        incrementPrice: json['increment_price'] as num?,
        maxQuantity: json['max_quantity'] as num?,
      );
}

class OrderItem {
  OrderItem({
    required this.id,
    required this.serviceName,
    required this.unit,
    required this.quantity,
    required this.unitPrice,
    required this.lineTotal,
  });

  final String id;
  final String serviceName;
  final String unit;
  final num quantity;
  final num unitPrice;
  final num lineTotal;

  factory OrderItem.fromJson(Map<String, dynamic> json) => OrderItem(
        id: json['id'] as String,
        serviceName: (json['service_name'] as String?) ?? 'Service',
        unit: (json['unit'] as String?) ?? 'kg',
        quantity: (json['quantity'] as num?) ?? 0,
        unitPrice: (json['unit_price'] as num?) ?? 0,
        lineTotal: (json['line_total'] as num?) ?? 0,
      );
}

class Payment {
  Payment({
    required this.id,
    required this.amount,
    required this.channel,
    this.referenceNo,
    required this.paidAt,
  });

  final String id;
  final num amount;
  final String channel;
  final String? referenceNo;
  final String paidAt;

  factory Payment.fromJson(Map<String, dynamic> json) => Payment(
        id: json['id'] as String,
        amount: (json['amount'] as num?) ?? 0,
        channel: (json['channel'] as String?) ?? 'Cash',
        referenceNo: json['reference_no'] as String?,
        paidAt: (json['paid_at'] as String?) ?? '',
      );
}

class ReceiptRef {
  ReceiptRef({required this.id, required this.receiptNo, required this.isFinal});

  final String id;
  final String receiptNo;
  final bool isFinal;

  factory ReceiptRef.fromJson(Map<String, dynamic> json) => ReceiptRef(
        id: json['id'] as String,
        receiptNo: (json['receipt_no'] as String?) ?? '',
        isFinal: (json['is_final'] as bool?) ?? false,
      );
}

class LaundryOrder {
  LaundryOrder({
    required this.id,
    required this.orderCode,
    required this.status,
    required this.customerName,
    required this.totalAmount,
    required this.amountPaid,
    required this.paymentStatus,
    required this.createdAt,
    this.notes,
    this.pickupAt,
    this.isWalkIn = false,
    required this.items,
    required this.payments,
    this.receipt,
  });

  final String id;
  final String orderCode;
  final String status;
  final String customerName;
  final num totalAmount;
  final num amountPaid;
  final String paymentStatus;
  final String createdAt;
  final String? notes;
  final String? pickupAt;
  final bool isWalkIn;
  final List<OrderItem> items;
  final List<Payment> payments;
  final ReceiptRef? receipt;

  num get balance => (totalAmount - amountPaid).clamp(0, double.infinity);

  bool get isCancellable => status == 'pending' || status == 'confirmed';

  factory LaundryOrder.fromJson(Map<String, dynamic> json) {
    final items = (json['order_items'] as List<dynamic>? ?? const [])
        .map((row) => OrderItem.fromJson(row as Map<String, dynamic>))
        .toList();
    final payments = (json['payments'] as List<dynamic>? ?? const [])
        .map((row) => Payment.fromJson(row as Map<String, dynamic>))
        .toList();
    final receipts = json['receipts'] as List<dynamic>? ?? const [];

    return LaundryOrder(
      id: json['id'] as String,
      orderCode: (json['order_code'] as String?) ?? '',
      status: (json['status'] as String?) ?? 'pending',
      customerName: (json['customer_name'] as String?) ?? '',
      totalAmount: (json['total_amount'] as num?) ?? 0,
      amountPaid: (json['amount_paid'] as num?) ?? 0,
      paymentStatus: (json['payment_status'] as String?) ?? 'unpaid',
      createdAt: (json['created_at'] as String?) ?? '',
      notes: json['notes'] as String?,
      pickupAt: json['pickup_at'] as String?,
      isWalkIn: (json['is_walk_in'] as bool?) ?? false,
      items: items,
      payments: payments,
      receipt: receipts.isEmpty
          ? null
          : ReceiptRef.fromJson(receipts.first as Map<String, dynamic>),
    );
  }
}

class StatusHistoryEntry {
  StatusHistoryEntry({
    required this.id,
    this.fromStatus,
    required this.toStatus,
    this.changedByName,
    required this.createdAt,
    this.note,
  });

  final String id;
  final String? fromStatus;
  final String toStatus;
  final String? changedByName;
  final String createdAt;
  final String? note;

  factory StatusHistoryEntry.fromJson(Map<String, dynamic> json) => StatusHistoryEntry(
        id: json['id'] as String,
        fromStatus: json['from_status'] as String?,
        toStatus: (json['to_status'] as String?) ?? 'pending',
        changedByName: json['changed_by_name'] as String?,
        createdAt: (json['created_at'] as String?) ?? '',
        note: json['note'] as String?,
      );
}

class Receipt {
  Receipt({
    required this.id,
    required this.orderId,
    required this.receiptNo,
    required this.subtotal,
    required this.discount,
    required this.total,
    required this.amountPaid,
    this.channel,
    required this.isFinal,
    required this.issuedAt,
    required this.snapshot,
  });

  final String id;
  final String orderId;
  final String receiptNo;
  final num subtotal;
  final num discount;
  final num total;
  final num amountPaid;
  final String? channel;
  final bool isFinal;
  final String issuedAt;
  final Map<String, dynamic> snapshot;

  num get balance => (total - amountPaid).clamp(0, double.infinity);

  String get shopName =>
      ((snapshot['shop'] as Map<String, dynamic>?)?['name'] as String?) ?? 'Lab-a-Day Laundry Shop';

  String get shopFooter =>
      ((snapshot['shop'] as Map<String, dynamic>?)?['footer'] as String?) ??
      'Thank you for trusting Lab-a-Day Laundry Shop.';

  factory Receipt.fromJson(Map<String, dynamic> json) => Receipt(
        id: json['id'] as String,
        orderId: json['order_id'] as String,
        receiptNo: (json['receipt_no'] as String?) ?? '',
        subtotal: (json['subtotal'] as num?) ?? 0,
        discount: (json['discount'] as num?) ?? 0,
        total: (json['total'] as num?) ?? 0,
        amountPaid: (json['amount_paid'] as num?) ?? 0,
        channel: json['channel'] as String?,
        isFinal: (json['is_final'] as bool?) ?? false,
        issuedAt: (json['issued_at'] as String?) ?? '',
        snapshot: (json['snapshot'] as Map<String, dynamic>?) ?? const {},
      );
}

class AppNotification {
  AppNotification({
    required this.id,
    required this.title,
    required this.body,
    this.readAt,
    required this.createdAt,
    this.orderId,
  });

  final String id;
  final String title;
  final String body;
  final String? readAt;
  final String createdAt;
  final String? orderId;

  bool get isUnread => readAt == null;

  factory AppNotification.fromJson(Map<String, dynamic> json) => AppNotification(
        id: json['id'] as String,
        title: (json['title'] as String?) ?? 'Update',
        body: (json['body'] as String?) ?? '',
        readAt: json['read_at'] as String?,
        createdAt: (json['created_at'] as String?) ?? '',
        orderId: json['order_id'] as String?,
      );
}

class ChatMessage {
  ChatMessage({
    required this.id,
    required this.conversationId,
    required this.senderId,
    required this.senderRole,
    required this.body,
    required this.createdAt,
  });

  final String id;
  final String conversationId;
  final String senderId;
  final String senderRole;
  final String body;
  final String createdAt;

  factory ChatMessage.fromJson(Map<String, dynamic> json) => ChatMessage(
        id: json['id'] as String,
        conversationId: json['conversation_id'] as String,
        senderId: (json['sender_id'] as String?) ?? '',
        senderRole: (json['sender_role'] as String?) ?? 'customer',
        body: (json['body'] as String?) ?? '',
        createdAt: (json['created_at'] as String?) ?? '',
      );
}

/// Lifecycle labels and tones, matching the web app and the database rules.
class OrderStatusMeta {
  const OrderStatusMeta(this.label, this.tone);

  final String label;
  final String tone;

  static const Map<String, OrderStatusMeta> byStatus = {
    'pending': OrderStatusMeta('Booking received', 'warning'),
    'confirmed': OrderStatusMeta('Confirmed', 'info'),
    'received': OrderStatusMeta('Received at counter', 'info'),
    'in_progress': OrderStatusMeta('In progress', 'progress'),
    'ready_for_pickup': OrderStatusMeta('Ready for pick-up', 'success'),
    'completed': OrderStatusMeta('Completed', 'success'),
    'cancelled': OrderStatusMeta('Cancelled', 'danger'),
  };

  static const List<String> flow = [
    'pending',
    'confirmed',
    'received',
    'in_progress',
    'ready_for_pickup',
    'completed',
  ];

  static OrderStatusMeta of(String status) =>
      byStatus[status] ?? const OrderStatusMeta('Unknown', 'neutral');
}
