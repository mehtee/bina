import 'dart:math' as math;

import 'package:flutter/widgets.dart';

/// Immutable single psychophysical trial evidence record (`v2.1 §10.2`).
@immutable
class VisionTrialRecord {
  const VisionTrialRecord({
    required this.trialIndex,
    required this.logMarPresented,
    required this.orientationPresented,
    required this.orientationResponded,
    required this.correct,
    required this.responseTimeMs,
    required this.recordedAtUtc,
  });

  final int trialIndex;
  final double logMarPresented;
  final int orientationPresented;
  final int orientationResponded;
  final bool correct;
  final int responseTimeMs;
  final DateTime recordedAtUtc;
}

/// Deterministic 8-AFC Best-PEST Bayesian adaptive staircase for home Landolt C VA.
/// Completely decoupled from Flutter presentation theming.
@immutable
class BestPestStaircase {
  BestPestStaircase._({
    required this.protocolVersion,
    required this.seed,
    required this.maxTrials,
    required this.minTrialsBeforeStop,
    required this.targetPosteriorSd,
    required List<double> gridLogMar,
    required List<double> posterior,
    required List<VisionTrialRecord> trials,
    required this.currentLogMar,
    required this.currentOrientation,
  })  : _gridLogMar = List<double>.unmodifiable(gridLogMar),
        _posterior = List<double>.unmodifiable(posterior),
        _trials = List<VisionTrialRecord>.unmodifiable(trials);

  factory BestPestStaircase.initial({
    String protocolVersion = 'landolt_best_pest_v1',
    int seed = 14050902,
    int maxTrials = 12,
    int minTrialsBeforeStop = 6,
    double targetPosteriorSd = 0.06,
    double startLogMar = 0.40,
  }) {
    final grid = <double>[
      for (var i = 0; i <= 24; i += 1) double.parse((-0.20 + i * 0.05).toStringAsFixed(2)),
    ];
    final uniformProb = 1.0 / grid.length;
    final prior = List<double>.filled(grid.length, uniformProb);
    return BestPestStaircase._(
      protocolVersion: protocolVersion,
      seed: seed,
      maxTrials: maxTrials,
      minTrialsBeforeStop: minTrialsBeforeStop,
      targetPosteriorSd: targetPosteriorSd,
      gridLogMar: grid,
      posterior: prior,
      trials: const <VisionTrialRecord>[],
      currentLogMar: double.parse(startLogMar.clamp(-0.20, 1.00).toStringAsFixed(2)),
      currentOrientation: _deterministicOrientation(seed, 0),
    );
  }

  static const double chanceRate = 0.125; // 8-AFC
  static const double lapseRate = 0.02;
  static const double psychometricSpread = 0.08;

  final String protocolVersion;
  final int seed;
  final int maxTrials;
  final int minTrialsBeforeStop;
  final double targetPosteriorSd;
  final List<double> _gridLogMar;
  final List<double> _posterior;
  final List<VisionTrialRecord> _trials;
  final double currentLogMar;
  final int currentOrientation;

  List<VisionTrialRecord> get trials => _trials;

  double get estimatedLogMar {
    var mean = 0.0;
    for (var i = 0; i < _gridLogMar.length; i += 1) {
      mean += _gridLogMar[i] * _posterior[i];
    }
    return double.parse(mean.toStringAsFixed(2));
  }

  double get posteriorSd {
    final mean = estimatedLogMar;
    var variance = 0.0;
    for (var i = 0; i < _gridLogMar.length; i += 1) {
      final diff = _gridLogMar[i] - mean;
      variance += diff * diff * _posterior[i];
    }
    return math.sqrt(variance.clamp(0.0, 10.0));
  }

  bool get isComplete =>
      _trials.length >= maxTrials ||
      (_trials.length >= minTrialsBeforeStop && posteriorSd <= targetPosteriorSd);

  static double _pCorrect(double presentedLogMar, double thresholdLogMar) {
    final z = ((presentedLogMar - thresholdLogMar) / psychometricSpread).clamp(-30.0, 30.0);
    final logistic = 1.0 / (1.0 + math.exp(-z));
    return chanceRate + (1.0 - chanceRate - lapseRate) * logistic;
  }

  static int _deterministicOrientation(int seed, int trialIndex) {
    // Deterministic Lehmer/LCG permutation avoiding adjacent repeats
    final raw = ((seed * 1103515245 + (trialIndex + 1) * 12345) & 0x7fffffff) % 8;
    if (trialIndex == 0) return raw;
    final prev = ((seed * 1103515245 + trialIndex * 12345) & 0x7fffffff) % 8;
    return raw == prev ? (raw + 3) % 8 : raw;
  }

  /// Returns an updated immutable staircase with the new [VisionTrialRecord] appended.
  BestPestStaircase recordResponse({
    required int orientationResponded,
    required int responseTimeMs,
    DateTime? timestampUtc,
  }) {
    if (isComplete) return this;
    final normalizedResp = ((orientationResponded % 8) + 8) % 8;
    final correct = normalizedResp == currentOrientation;
    final record = VisionTrialRecord(
      trialIndex: _trials.length,
      logMarPresented: currentLogMar,
      orientationPresented: currentOrientation,
      orientationResponded: normalizedResp,
      correct: correct,
      responseTimeMs: responseTimeMs < 0 ? 0 : responseTimeMs,
      recordedAtUtc: (timestampUtc ?? DateTime.now().toUtc()).toUtc(),
    );

    final updatedPosterior = List<double>.filled(_gridLogMar.length, 0.0);
    var totalWeight = 0.0;
    for (var i = 0; i < _gridLogMar.length; i += 1) {
      final p = _pCorrect(currentLogMar, _gridLogMar[i]).clamp(1e-6, 1.0 - 1e-6);
      final likelihood = correct ? p : (1.0 - p);
      final w = _posterior[i] * likelihood;
      updatedPosterior[i] = w;
      totalWeight += w;
    }

    if (totalWeight > 0) {
      for (var i = 0; i < updatedPosterior.length; i += 1) {
        updatedPosterior[i] /= totalWeight;
      }
    } else {
      for (var i = 0; i < updatedPosterior.length; i += 1) {
        updatedPosterior[i] = _posterior[i];
      }
    }

    var nextMean = 0.0;
    for (var i = 0; i < _gridLogMar.length; i += 1) {
      nextMean += _gridLogMar[i] * updatedPosterior[i];
    }

    // Snap next stimulus intensity to nearest 0.05 logMAR step
    final snappedNext = double.parse(
      ((nextMean * 20.0).round() / 20.0).clamp(-0.20, 1.00).toStringAsFixed(2),
    );
    final nextTrials = <VisionTrialRecord>[..._trials, record];

    return BestPestStaircase._(
      protocolVersion: protocolVersion,
      seed: seed,
      maxTrials: maxTrials,
      minTrialsBeforeStop: minTrialsBeforeStop,
      targetPosteriorSd: targetPosteriorSd,
      gridLogMar: _gridLogMar,
      posterior: updatedPosterior,
      trials: nextTrials,
      currentLogMar: snappedNext,
      currentOrientation: _deterministicOrientation(seed, nextTrials.length),
    );
  }
}
