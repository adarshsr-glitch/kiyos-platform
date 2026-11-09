"""Kiyos deterministic tax calculation engine.

This package is the only part of the codebase allowed to compute tax numbers.
It reads YAML rules from knowledge/ and applies them to structured inputs.

No network calls. No LLM. No randomness. Pydantic in, Pydantic out.
Every result includes a DerivationTrail.
"""
