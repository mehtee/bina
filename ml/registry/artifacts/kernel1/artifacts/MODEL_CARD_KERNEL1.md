# Bina AI Kernel 1 Model Card — Layer 1 & Fundus (Apache 2.0)

- **Commercial License Policy (ADR-051):** Only Apache-2.0 / MIT backbones (`vit_small_patch14_dinov2.lvd142m`, `mobilenetv3_small_100`). Zero `RETFound` (`CC BY-NC 4.0`).
- **Patient-Grouped Holdout Splits (ADR-033):** Zero patient or patient-eye overlap between train, validation, and held-out test sets.
- **Modality Router Held-Out Accuracy:** `1.0` (Macro F1 `1.0`)
- **QC Gate Held-Out AUROC:** Blur `0.9799`, Lighting `0.8125`, OD/OS Accuracy `0.6034`
- **Fundus Specialist Held-Out Macro-AUROC:** `0.9077` (Accuracy `0.7763`)
