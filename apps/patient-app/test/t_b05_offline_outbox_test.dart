import 'package:bina_api_dtos/bina_api_dtos.dart';
import 'package:bina_offline_store/bina_offline_store.dart';
import 'package:bina_patient_app/core/data/patient_gateway.dart';
import 'package:bina_patient_app/core/data/session_cache_repository.dart';
import 'package:flutter_test/flutter_test.dart';

final class _SequencedTransport implements OutboxTransportPort {
  _SequencedTransport(this.responder);
  final Future<OutboxDispatchResult> Function(OutboxEntry entry) responder;
  int calls = 0;

  @override
  Future<OutboxDispatchResult> send(OutboxEntry entry) async {
    calls += 1;
    return responder(entry);
  }
}

void main() {
  test('PersistentOutboxQueue survives simulated app restart and keeps exact idempotencyKey', () async {
    final store = InMemoryOfflineStore();
    const partition = StoragePartitionKey(tenantId: 't1', patientId: 'pat1', actorId: 'pat1');

    // First app session (offline)
    final queue1 = PersistentOutboxQueue(
      store: store,
      transport: _SequencedTransport((_) async => const OutboxDispatchResult(status: OutboxSyncStatus.retryableFailure)),
    );
    final entry = OutboxEntry(
      idempotencyKey: 'uuid-dose-001',
      partition: partition,
      operationType: 'adherence',
      endpointPath: '/v1/episodes/ep1/adherence',
      payloadJson: '{"episodeId":"ep1"}',
      createdAtUtc: DateTime.utc(2026, 11, 25, 6),
      status: OutboxSyncStatus.pendingUpload,
      eyeLaterality: 'OS',
      prescriptionVersion: 1,
    );
    await queue1.enqueue(entry);
    await queue1.enqueue(entry); // idempotent duplicate ignored
    await queue1.flushPartition(partition);

    final afterOffline = await queue1.listForPartition(partition);
    expect(afterOffline.single.status, OutboxSyncStatus.retryableFailure);
    expect(afterOffline.single.idempotencyKey, 'uuid-dose-001');

    // Second app session (restart recovery over same persistent store, now online)
    String? sentKey;
    final queue2 = PersistentOutboxQueue(
      store: store,
      transport: _SequencedTransport((e) async {
        sentKey = e.idempotencyKey;
        return OutboxDispatchResult(
          status: OutboxSyncStatus.acknowledged,
          acknowledgedAtUtc: DateTime.utc(2026, 11, 25, 6, 5),
        );
      }),
    );

    final recovered = await queue2.listForPartition(partition);
    expect(recovered.length, 1);
    expect(recovered.single.idempotencyKey, 'uuid-dose-001');

    await queue2.flushPartition(partition);
    expect(sentKey, 'uuid-dose-001');
    final synced = await queue2.listForPartition(partition);
    expect(synced.single.status, OutboxSyncStatus.acknowledged);
    expect(synced.single.acknowledgedAtUtc, isNotNull);
  });

  test('PersistentOutboxQueue preserves evidence on 409 conflict & stops immediately on 403 revoked', () async {
    final store = InMemoryOfflineStore();
    const partition = StoragePartitionKey(tenantId: 't1', patientId: 'pat1', actorId: 'cg1');
    final transport = _SequencedTransport((entry) async {
      if (entry.idempotencyKey == 'k-conflict') {
        return const OutboxDispatchResult(
          status: OutboxSyncStatus.conflictOrRejected,
          failureReasonFa: 'نسخه دارو تغییر کرده است.',
        );
      }
      return const OutboxDispatchResult(
        status: OutboxSyncStatus.unauthorizedOrRevoked,
        failureReasonFa: 'دسترسی همراه لغو شده است.',
      );
    });

    final queue = PersistentOutboxQueue(store: store, transport: transport);
    await queue.enqueue(OutboxEntry(
      idempotencyKey: 'k-conflict',
      partition: partition,
      operationType: 'adherence',
      endpointPath: '/v1/episodes/ep1/adherence',
      payloadJson: '{"v":1}',
      createdAtUtc: DateTime.utc(2026, 11, 25),
      status: OutboxSyncStatus.pendingUpload,
    ));
    await queue.enqueue(OutboxEntry(
      idempotencyKey: 'k-revoked',
      partition: partition,
      operationType: 'adherence',
      endpointPath: '/v1/episodes/ep1/adherence',
      payloadJson: '{"v":2}',
      createdAtUtc: DateTime.utc(2026, 11, 25),
      status: OutboxSyncStatus.pendingUpload,
    ));
    await queue.enqueue(OutboxEntry(
      idempotencyKey: 'k-never-sent',
      partition: partition,
      operationType: 'adherence',
      endpointPath: '/v1/episodes/ep1/adherence',
      payloadJson: '{"v":3}',
      createdAtUtc: DateTime.utc(2026, 11, 25),
      status: OutboxSyncStatus.pendingUpload,
    ));

    await queue.flushPartition(partition);
    expect(transport.calls, 2); // halted immediately on k-revoked without sending k-never-sent
    final items = await queue.listForPartition(partition);
    expect(items[0].status, OutboxSyncStatus.conflictOrRejected);
    expect(items[0].payloadJson, '{"v":1}'); // evidence preserved, never mutated
    expect(items[1].status, OutboxSyncStatus.unauthorizedOrRevoked);
    expect(items[2].status, OutboxSyncStatus.pendingUpload);
  });

  test('SessionCacheRepository isolates tenant/patient/actor partitions cleanly', () async {
    final store = InMemoryOfflineStore();
    final repo = SessionCacheRepository(store);
    const patA = AuthSessionContext(
      accessToken: 'a',
      tenantId: 't1',
      clinicId: 'c1',
      patientId: 'patA',
      actorType: 'patient',
    );
    const patB = AuthSessionContext(
      accessToken: 'b',
      tenantId: 't1',
      clinicId: 'c1',
      patientId: 'patB',
      actorType: 'caregiver',
      grantId: 'grant1',
    );

    const clinicA = ClinicProfile(
      clinicId: 'c1',
      tenantId: 't1',
      nameFa: 'کلینیک الف',
      locale: 'fa-IR',
      calendarMode: 'jalali',
      emergencyPhone: '+982182400000',
      staffedHoursFa: '۸ تا ۲۰',
    );
    await repo.saveClinic(patA, clinicA, DateTime.utc(2026, 11, 25, 7));

    expect((await repo.loadClinic(patA))?.data.nameFa, 'کلینیک الف');
    expect(await repo.loadClinic(patB), isNull);

    await repo.purgeForSession(patA);
    expect(await repo.loadClinic(patA), isNull);
  });

  test('InMemoryLocalReminderAdapter isolates OD vs OS reminders and checks OS permission honestly', () async {
    final reminders = InMemoryLocalReminderAdapter(initialOsPermission: false);
    expect(await reminders.hasOsPermission(), isFalse);

    // Permission denied -> scheduling yields 0 active reminders rather than faking enabled state
    await reminders.syncEpisodeEyeReminders(
      tenantId: 't1',
      patientId: 'pat1',
      episodeId: 'ep-od',
      eyeLaterality: 'OD',
      items: const <ReminderScheduleItem>[
        ReminderScheduleItem(
          tenantId: 't1',
          patientId: 'pat1',
          episodeId: 'ep-od',
          eyeLaterality: 'OD',
          prescriptionVersion: 1,
          doseId: 'd1',
          scheduledAtIso: '2026-11-25T14:00:00Z',
        ),
      ],
    );
    expect(await reminders.listScheduled(tenantId: 't1', patientId: 'pat1'), isEmpty);

    // Grant OS permission and schedule both OD (v1) and OS (v1)
    reminders.setPermissionForTest(true);
    expect(await reminders.requestPermission(), isTrue);
    await reminders.syncEpisodeEyeReminders(
      tenantId: 't1',
      patientId: 'pat1',
      episodeId: 'ep-od',
      eyeLaterality: 'OD',
      items: const <ReminderScheduleItem>[
        ReminderScheduleItem(
          tenantId: 't1',
          patientId: 'pat1',
          episodeId: 'ep-od',
          eyeLaterality: 'OD',
          prescriptionVersion: 1,
          doseId: 'od-d1',
          scheduledAtIso: '2026-11-25T14:00:00Z',
        ),
      ],
    );
    await reminders.syncEpisodeEyeReminders(
      tenantId: 't1',
      patientId: 'pat1',
      episodeId: 'ep-os',
      eyeLaterality: 'OS',
      items: const <ReminderScheduleItem>[
        ReminderScheduleItem(
          tenantId: 't1',
          patientId: 'pat1',
          episodeId: 'ep-os',
          eyeLaterality: 'OS',
          prescriptionVersion: 1,
          doseId: 'os-d1',
          scheduledAtIso: '2026-11-25T16:00:00Z',
        ),
      ],
    );

    // Update OS to v2 -> ONLY OS reminders change; OD reminder stays untouched!
    await reminders.syncEpisodeEyeReminders(
      tenantId: 't1',
      patientId: 'pat1',
      episodeId: 'ep-os',
      eyeLaterality: 'OS',
      items: const <ReminderScheduleItem>[
        ReminderScheduleItem(
          tenantId: 't1',
          patientId: 'pat1',
          episodeId: 'ep-os',
          eyeLaterality: 'OS',
          prescriptionVersion: 2,
          doseId: 'os-v2-d1',
          scheduledAtIso: '2026-11-25T18:00:00Z',
        ),
      ],
    );

    final active = await reminders.listScheduled(tenantId: 't1', patientId: 'pat1');
    expect(active.length, 2);
    final odItem = active.firstWhere((r) => r.eyeLaterality == 'OD');
    final osItem = active.firstWhere((r) => r.eyeLaterality == 'OS');
    expect(odItem.prescriptionVersion, 1);
    expect(odItem.doseId, 'od-d1');
    expect(odItem.genericBodyFa, ReminderScheduleItem.defaultPhiFreeBodyFa);
    expect(osItem.prescriptionVersion, 2);
    expect(osItem.doseId, 'os-v2-d1');
  });
}
