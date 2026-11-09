"""Seed the SQLite database with Arjun Rao's demo case."""

import asyncio
import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.chdir(os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from infra.schema import (
    Base,
    Case,
    Fact,
    Assessment,
    Conversation,
    Message,
    AiCall,
)

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./data/kiyos.db")


async def seed() -> None:
    os.makedirs("data/documents", exist_ok=True)

    engine = create_async_engine(DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        # Check if already seeded
        from sqlalchemy import select

        result = await session.execute(select(Case))
        if result.scalars().first() is not None:
            print("Database already seeded — skipping.")
            await engine.dispose()
            return

        now = datetime.now(timezone.utc)

        # --- Case: Arjun Rao ---
        case = Case(
            name="Arjun Rao — US→IN return 2026",
            client_name="Arjun Rao",
            status="active",
            summary=(
                "Arjun is a 34-year-old software engineer returning to India in July 2026 "
                "after 8 years in the US (San Francisco). He holds H-1B status, has a 401(k) "
                "with Fidelity ($380K), unvested RSUs from his employer, a US brokerage "
                "account, and rental income from a flat in Pune. He needs a full cross-border "
                "tax assessment for the transition year covering residency status, capital "
                "gains, retirement accounts, salary allocation, and DTAA treaty relief."
            ),
            jurisdictions="IN,US",
            case_captain="demo",
            arrival_date="2026-07-15",
            tax_year="2026-27",
            created_at=now,
            updated_at=now,
        )
        session.add(case)
        await session.flush()

        # --- Facts ---
        facts_data = [
            ("full_name", "Arjun Rao", None, "captain-entered", "2026-06-01"),
            ("date_of_birth", "1992-03-14", None, "captain-entered", "2026-06-01"),
            ("us_arrival_date", "2018-08-20", None, "captain-entered", "2026-06-01"),
            ("india_return_date", "2026-07-15", None, "captain-entered", "2026-06-01"),
            ("visa_status", "H-1B", None, "captain-entered", "2026-06-01"),
            ("us_salary_2026", "240000", "USD", "captain-entered", "2026-06-01"),
            ("us_employer", "Stripe Inc.", None, "captain-entered", "2026-06-01"),
            ("days_in_india_2025_26", "12", "days", "captain-entered", "2026-06-01"),
            ("days_in_india_2024_25", "8", "days", "captain-entered", "2026-06-01"),
            ("days_in_india_2023_24", "15", "days", "captain-entered", "2026-06-01"),
            ("fidelity_401k_balance", "380000", "USD", "captain-entered", "2026-06-01"),
            ("us_brokerage_value", "125000", "USD", "captain-entered", "2026-06-01"),
            ("pune_rental_income_annual", "360000", "INR", "captain-entered", "2026-06-01"),
            ("rsu_unvested_count", "1200", "shares", "captain-entered", "2026-06-01"),
            ("rsu_vest_price", "22.50", "USD/share", "captain-entered", "2026-06-01"),
            ("pan_number", "ABCPR1234A", None, "captain-entered", "2026-06-01"),
            ("ssn_last_four", "7890", None, "captain-entered", "2026-06-01"),
            ("previous_year_statuses", "NR,NR,NR,NR,NR,NR,NR,NR,NR,NR", None, "captain-entered", "2026-06-01"),
        ]

        for key, value, unit, source, as_of in facts_data:
            session.add(Fact(
                case_id=case.id,
                key=key,
                value=value,
                unit=unit,
                source=source,
                as_of=as_of,
            ))

        # --- Assessment (placeholder) ---
        session.add(Assessment(
            case_id=case.id,
            headline="Residency status: RNOR for AY 2026-27",
            amount=None,
            currency=None,
            status="draft",
            derivation_trail=[
                {
                    "rule_id": "IN-RES-RNOR-9OF10",
                    "summary": "Resident is NOT ordinarily resident if NR in 9 of 10 preceding PYs",
                    "inputs_used": {"previous_year_statuses": ["NR"] * 10},
                    "output": True,
                }
            ],
            created_at=now,
            updated_at=now,
        ))

        # --- Conversation ---
        convo = Conversation(
            case_id=case.id,
            title="Main thread",
            created_at=now,
        )
        session.add(convo)
        await session.flush()

        session.add(Message(
            conversation_id=convo.id,
            role="assistant",
            content=(
                "Hello! I'm the Kiyos assistant for Arjun Rao's case. "
                "I can help you explore his cross-border tax situation. "
                "What would you like to know?"
            ),
            created_at=now,
        ))

        # --- AI call log entries (demo data) ---
        ai_calls_data = [
            ("explain", "claude-opus-5-5", 1420, 380, 2340),
            ("extract", "claude-haiku-5-5", 3200, 890, 1120),
            ("converse", "claude-opus-5-5", 2100, 620, 3100),
            ("explain", "claude-opus-5-5", 1100, 290, 1890),
        ]

        for service, model, pt, ct, latency in ai_calls_data:
            session.add(AiCall(
                case_id=case.id,
                service=service,
                model=model,
                prompt_tokens=pt,
                completion_tokens=ct,
                latency_ms=latency,
                created_at=now,
            ))

        await session.commit()
        print(f"Seeded case '{case.name}' (id={case.id}) with {len(facts_data)} facts.")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
