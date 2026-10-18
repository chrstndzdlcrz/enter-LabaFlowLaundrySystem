import 'package:flutter/material.dart';

import '../../core/app_theme.dart';
import '../../data/laba_repository.dart';
import '../../data/models.dart';
import '../../widgets/status_badge.dart';
import '../receipts/receipts_page.dart';

/// Profile and account actions, including switching the account off behind a
/// confirmation dialog.
class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key});

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  final _repository = LabaRepository.of();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _addressController = TextEditingController();

  late Future<Profile> _profile;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _profile = _repository.ensureProfile();
    _profile.then((profile) {
      if (!mounted) return;
      _nameController.text = profile.fullName ?? '';
      _phoneController.text = profile.phone ?? '';
      _addressController.text = profile.address ?? '';
    });
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _addressController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_nameController.text.trim().length < 2) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter your full name.')),
      );
      return;
    }

    setState(() => _saving = true);
    try {
      await _repository.updateProfile(
        fullName: _nameController.text.trim(),
        phone: _phoneController.text.trim().isEmpty ? null : _phoneController.text.trim(),
        address: _addressController.text.trim().isEmpty ? null : _addressController.text.trim(),
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Your profile has been saved.')),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.toString())));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _signOut() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Sign out of LabaFlow?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Stay signed in'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Sign out'),
          ),
        ],
      ),
    );
    if (confirmed == true) await _repository.signOut();
  }

  Future<void> _switchOffAccount() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Switch off your account?'),
        content: const Text(
          'You will be signed out and cannot sign in again until a shop administrator switches the account '
          'back on. Your orders and receipts are kept.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Keep my account'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: OceanColors.danger),
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Switch it off'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      final userId = _repository.currentUser?.id;
      if (userId == null) return;
      await _repository.client.from('profiles').update({'is_active': false}).eq('id', userId);
      await _repository.signOut();
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.toString())));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My profile')),
      body: FutureBuilder<Profile>(
        future: _profile,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return ErrorPanel(message: snapshot.error.toString());
          }

          final profile = snapshot.data!;

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Contact details', style: TextStyle(fontWeight: FontWeight.w700)),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _nameController,
                        decoration: const InputDecoration(labelText: 'Full name'),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _phoneController,
                        keyboardType: TextInputType.phone,
                        decoration: const InputDecoration(labelText: 'Mobile number'),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _addressController,
                        decoration: const InputDecoration(labelText: 'Address'),
                      ),
                      const SizedBox(height: 16),
                      FilledButton(
                        onPressed: _saving ? null : _save,
                        child: Text(_saving ? 'Saving…' : 'Save changes'),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Card(
                child: Column(
                  children: [
                    ListTile(
                      title: const Text('Email'),
                      trailing: Text(profile.email ?? '—'),
                    ),
                    ListTile(
                      title: const Text('Role'),
                      trailing: Text(profile.role),
                    ),
                    ListTile(
                      title: const Text('Account status'),
                      trailing: Text(profile.isActive ? 'Active' : 'Switched off'),
                    ),
                    ListTile(
                      leading: const Icon(Icons.receipt_long_outlined),
                      title: const Text('My receipts'),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => const ReceiptsPage()),
                      ),
                    ),
                    ListTile(
                      leading: const Icon(Icons.logout),
                      title: const Text('Sign out'),
                      onTap: _signOut,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Switch off my account',
                        style: TextStyle(fontWeight: FontWeight.w700, color: OceanColors.danger),
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        'Signs you out and blocks sign-in until a shop administrator switches the account '
                        'back on. Orders and receipts stay on record.',
                        style: TextStyle(color: OceanColors.inkMuted, fontSize: 13),
                      ),
                      const SizedBox(height: 12),
                      OutlinedButton(
                        onPressed: _switchOffAccount,
                        style: OutlinedButton.styleFrom(
                          foregroundColor: OceanColors.danger,
                          side: const BorderSide(color: OceanColors.danger),
                        ),
                        child: const Text('Switch off my account'),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),
            ],
          );
        },
      ),
    );
  }
}
