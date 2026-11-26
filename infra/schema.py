"""SQLAlchemy 2.0 declarative models — prototype data layer.

SQLite on disk (./data/kiyos.db). No auth, no RLS.
Swap to Postgres + add RLS when multi-user lands.
"""

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import (
    ForeignKey,
    String,
    Text,
    Float,
    Integer,
    JSON,
    DateTime,
    TypeDecorator,
)
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    mapped_column,
    relationship,
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class UTCDateTime(TypeDecorator):
    """Stores naive UTC (SQLite has no tz) and always returns tz-aware UTC,
    so the API serialises timestamps with an explicit offset."""

    impl = DateTime
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None and value.tzinfo is not None:
            value = value.astimezone(timezone.utc).replace(tzinfo=None)
        return value

    def process_result_value(self, value, dialect):
        if value is not None and value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value


class Base(DeclarativeBase):
    pass


class Case(Base):
    __tablename__ = "case"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255))
    client_name: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(50), default="active")
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    jurisdictions: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    case_captain: Mapped[str] = mapped_column(String(255), default="demo")
    arrival_date: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    tax_year: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    # M2.4 entitlement: "free" (generic Q&A only, capped) | "premium" (case Q&A + advisor)
    plan: Mapped[str] = mapped_column(String(20), default="premium")
    # Chosen paid offering at activation: {offering, household, price_inr, ...}
    plan_choice: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    activated_at: Mapped[Optional[datetime]] = mapped_column(UTCDateTime, nullable=True)
    # Reviewed per-country position shown on the overview:
    # {"IN": {status, detail, year, filing, due, state}, "US": {...}}
    country_status: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    # Named India/US reviewers shown to the customer (PRD §9)
    reviewers: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    # WhatsApp number: the customer's identity, reused for workspace sign-in (PRD §7)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    # M4 verify-and-confirm: set when the customer confirms the pre-filled profile
    profile_confirmed_at: Mapped[Optional[datetime]] = mapped_column(UTCDateTime, nullable=True)
    # Customer workspace visits, for "since your last visit": the current visit and the
    # one before it. A visit lasts while pages are opened less than 30 minutes apart.
    last_seen_at: Mapped[Optional[datetime]] = mapped_column(UTCDateTime, nullable=True)
    prev_seen_at: Mapped[Optional[datetime]] = mapped_column(UTCDateTime, nullable=True)
    # Alerts: when the customer last read their messages, and when an expert last opened
    # the case (so a customer's reply to the expert shows as new until then).
    customer_read_at: Mapped[Optional[datetime]] = mapped_column(UTCDateTime, nullable=True)
    expert_seen_at: Mapped[Optional[datetime]] = mapped_column(UTCDateTime, nullable=True)
    # Prototype journeys: which demo persona this case belongs to (None for real cases).
    demo_key: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    # Expert review state: in_review | awaiting_customer | ready_for_signoff | signed_off
    review_status: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime, default=_utcnow, onupdate=_utcnow)

    facts: Mapped[list["Fact"]] = relationship(back_populates="case", cascade="all, delete-orphan")
    documents: Mapped[list["Document"]] = relationship(back_populates="case", cascade="all, delete-orphan")
    assessments: Mapped[list["Assessment"]] = relationship(back_populates="case", cascade="all, delete-orphan")
    conversations: Mapped[list["Conversation"]] = relationship(back_populates="case", cascade="all, delete-orphan")
    members: Mapped[list["HouseholdMember"]] = relationship(back_populates="case", cascade="all, delete-orphan")
    topics: Mapped[list["TaxTopic"]] = relationship(back_populates="case", cascade="all, delete-orphan")
    recommendations: Mapped[list["Recommendation"]] = relationship(back_populates="case", cascade="all, delete-orphan")
    action_items: Mapped[list["ActionItem"]] = relationship(back_populates="case", cascade="all, delete-orphan")
    notices: Mapped[list["Notice"]] = relationship(back_populates="case", cascade="all, delete-orphan")
    scenarios: Mapped[list["Scenario"]] = relationship(back_populates="case", cascade="all, delete-orphan")
    stays: Mapped[list["Stay"]] = relationship(back_populates="case", cascade="all, delete-orphan")
    notes: Mapped[list["CaseNote"]] = relationship(back_populates="case", cascade="all, delete-orphan")


class Document(Base):
    __tablename__ = "document"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    case_id: Mapped[int] = mapped_column(ForeignKey("case.id"))
    filename: Mapped[str] = mapped_column(String(500))
    doc_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="uploaded")
    file_path: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    sha256: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    size_bytes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    extracted_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime, default=_utcnow, onupdate=_utcnow)

    case: Mapped["Case"] = relationship(back_populates="documents")


class Fact(Base):
    __tablename__ = "fact"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    case_id: Mapped[int] = mapped_column(ForeignKey("case.id"))
    key: Mapped[str] = mapped_column(String(255))
    value: Mapped[str] = mapped_column(Text)
    unit: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    source: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    as_of: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    # Exactly where the value came from: the document page and line, the message or
    # answer, or the expert entry. `source` stays the short name. See api/evidence.py.
    evidence: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=_utcnow)

    case: Mapped["Case"] = relationship(back_populates="facts")


class Assessment(Base):
    __tablename__ = "assessment"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    case_id: Mapped[int] = mapped_column(ForeignKey("case.id"))
    headline: Mapped[str] = mapped_column(String(500))
    amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    currency: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="draft")
    derivation_trail: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    rule_version_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime, default=_utcnow, onupdate=_utcnow)

    case: Mapped["Case"] = relationship(back_populates="assessments")


class Conversation(Base):
    __tablename__ = "conversation"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    case_id: Mapped[int] = mapped_column(ForeignKey("case.id"))
    title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    # M1.9 / M5.6 human handover: "agent" answers by default; "advisor" while taken over
    controller: Mapped[str] = mapped_column(String(20), default="agent")
    controller_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    # WhatsApp journey stage this thread belongs to: intake | free | paid (null = legacy)
    stage: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    # Intake bot state: {"step": str, "answers": {...}}
    intake: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=_utcnow)

    case: Mapped["Case"] = relationship(back_populates="conversations")
    messages: Mapped[list["Message"]] = relationship(back_populates="conversation", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "message"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    conversation_id: Mapped[int] = mapped_column(ForeignKey("conversation.id"))
    role: Mapped[str] = mapped_column(String(20))  # "user" | "assistant" | "advisor" | "system"
    content: Mapped[str] = mapped_column(Text)
    author: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    # M1.5 confidence routing: 0..1 on assistant messages; routed=True when a ticket was raised
    confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    routed: Mapped[bool] = mapped_column(default=False)
    cited_rules: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    # Free-tier pivot instrumentation on user messages:
    # generic | generic_unanswered | generic_over_limit | personal
    category: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    # Contextual call-to-action rendered under an agent message: {type, label, href}
    action: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    # WhatsApp quick-reply buttons offered with an agent message
    options: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=_utcnow)

    conversation: Mapped["Conversation"] = relationship(back_populates="messages")


class AiCall(Base):
    __tablename__ = "ai_call"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    case_id: Mapped[Optional[int]] = mapped_column(ForeignKey("case.id"), nullable=True)
    service: Mapped[str] = mapped_column(String(50))
    model: Mapped[str] = mapped_column(String(100))
    prompt_tokens: Mapped[int] = mapped_column(Integer, default=0)
    completion_tokens: Mapped[int] = mapped_column(Integer, default=0)
    latency_ms: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=_utcnow)


class RuleVersion(Base):
    __tablename__ = "rule_version"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    hash: Mapped[str] = mapped_column(String(64), unique=True)
    snapshot: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=_utcnow)


# ───────────────────────────────────────────────────────────────────
# PRD-aligned additions (Nov 2026): household members, tax topics,
# recommendations, action items, notices, scenarios.
# These let the prototype hold what Kiyos's PRD describes as the six
# durable records of the case system.
# ───────────────────────────────────────────────────────────────────


class HouseholdMember(Base):
    __tablename__ = "household_member"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    case_id: Mapped[int] = mapped_column(ForeignKey("case.id"))
    name: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(50))  # primary | spouse | dependent
    citizenship: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    visa_status: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    dob: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=_utcnow)

    case: Mapped["Case"] = relationship(back_populates="members")


class TaxTopic(Base):
    __tablename__ = "tax_topic"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    case_id: Mapped[int] = mapped_column(ForeignKey("case.id"))
    topic_key: Mapped[str] = mapped_column(String(100))          # e.g. "rnor", "401k_withdrawal"
    title: Mapped[str] = mapped_column(String(500))
    india_position: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    us_position: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    conclusion: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # PRD §8 confidence policy: Green/Amber/Red
    confidence: Mapped[str] = mapped_column(String(30), default="incomplete")
    # confirmed | likely | incomplete | review_needed
    status: Mapped[str] = mapped_column(String(30), default="open")
    # open | in_progress | resolved
    next_action: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    owner: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    due_date: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime, default=_utcnow, onupdate=_utcnow)

    case: Mapped["Case"] = relationship(back_populates="topics")
    recommendations: Mapped[list["Recommendation"]] = relationship(back_populates="topic")


class Recommendation(Base):
    __tablename__ = "recommendation"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    case_id: Mapped[int] = mapped_column(ForeignKey("case.id"))
    topic_id: Mapped[Optional[int]] = mapped_column(ForeignKey("tax_topic.id"), nullable=True)
    author: Mapped[str] = mapped_column(String(100))            # agent | advisor name
    content: Mapped[str] = mapped_column(Text)
    rationale: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="proposed")
    # proposed | accepted | declined | implemented_reported | superseded
    date: Mapped[str] = mapped_column(String(50))
    superseded_by_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("recommendation.id"), nullable=True
    )
    # A way to save (Nov 2026): one of the options set in law (api/expert_entries.py),
    # chosen and sized by the expert. Kiyos never suggests or sizes one itself.
    option: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    country: Mapped[Optional[str]] = mapped_column(String(5), nullable=True)
    amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    currency: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    deadline: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=_utcnow)

    case: Mapped["Case"] = relationship(back_populates="recommendations")
    topic: Mapped[Optional["TaxTopic"]] = relationship(
        back_populates="recommendations", foreign_keys=[topic_id]
    )


class ActionItem(Base):
    __tablename__ = "action_item"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    case_id: Mapped[int] = mapped_column(ForeignKey("case.id"))
    title: Mapped[str] = mapped_column(String(500))
    assignee: Mapped[str] = mapped_column(String(50))           # customer | kiyos | advisor
    status: Mapped[str] = mapped_column(String(30), default="open")
    # open | blocked | done
    due_date: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    owner: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime, default=_utcnow, onupdate=_utcnow)

    case: Mapped["Case"] = relationship(back_populates="action_items")


class Notice(Base):
    __tablename__ = "notice"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    case_id: Mapped[int] = mapped_column(ForeignKey("case.id"))
    authority: Mapped[str] = mapped_column(String(50))          # IRS | ITD | other
    subject: Mapped[str] = mapped_column(String(500))
    received_at: Mapped[str] = mapped_column(String(50))
    deadline: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="open")
    # open | responded | resolved
    response_filed_at: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    response_doc_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("document.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=_utcnow)

    case: Mapped["Case"] = relationship(back_populates="notices")


class Scenario(Base):
    __tablename__ = "scenario"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    case_id: Mapped[int] = mapped_column(ForeignKey("case.id"))
    label: Mapped[str] = mapped_column(String(255))
    assumptions: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    results: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    recommended: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=_utcnow)

    case: Mapped["Case"] = relationship(back_populates="scenarios")


# ───────────────────────────────────────────────────────────────────
# Workflow records (Nov 2026): expert-gate tickets and the case
# event trail. Every human action carries an actor and timestamp.
# ───────────────────────────────────────────────────────────────────


class Ticket(Base):
    """PRD expert gate (M5.7): a question the agent could not answer with confidence."""

    __tablename__ = "ticket"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    case_id: Mapped[int] = mapped_column(ForeignKey("case.id"))
    conversation_id: Mapped[Optional[int]] = mapped_column(ForeignKey("conversation.id"), nullable=True)
    message_id: Mapped[Optional[int]] = mapped_column(ForeignKey("message.id"), nullable=True)
    question: Mapped[str] = mapped_column(Text)
    draft_answer: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    cited_rules: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="open")
    # open | resolved
    owner: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    sla_due_at: Mapped[Optional[datetime]] = mapped_column(UTCDateTime, nullable=True)
    resolution: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    resolved_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(UTCDateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=_utcnow)


class CaseEvent(Base):
    """Audit trail for human and workflow actions (sign-off, verify, upload, takeover…)."""

    __tablename__ = "case_event"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    case_id: Mapped[int] = mapped_column(ForeignKey("case.id"))
    actor: Mapped[str] = mapped_column(String(255))
    action: Mapped[str] = mapped_column(String(100))
    target_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    target_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    detail: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=_utcnow)


class InitialScan(Base):
    """The free five-minute assessment (PRD §5 stage 2): a bounded risk map built from
    the customer's answers. Not a personal tax opinion; not counted toward free Q&A."""

    __tablename__ = "initial_scan"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    case_id: Mapped[int] = mapped_column(ForeignKey("case.id"))
    version: Mapped[str] = mapped_column(String(50))
    answers: Mapped[dict] = mapped_column(JSON)
    # [{area, country, finding, why, input, confidence, rule}]
    rows: Mapped[list] = mapped_column(JSON)
    missing: Mapped[list] = mapped_column(JSON)
    confidence: Mapped[str] = mapped_column(String(20))
    household: Mapped[str] = mapped_column(String(20), default="individual")
    consent_saved: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=_utcnow)


class DocumentRequest(Base):
    """One item the case needs, with why — the target of a per-item upload link."""

    __tablename__ = "document_request"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    case_id: Mapped[int] = mapped_column(ForeignKey("case.id"))
    title: Mapped[str] = mapped_column(String(255))
    why: Mapped[str] = mapped_column(Text)
    country: Mapped[Optional[str]] = mapped_column(String(5), nullable=True)
    doc_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    # pending | received | reviewed | rejected
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    document_id: Mapped[Optional[int]] = mapped_column(ForeignKey("document.id"), nullable=True)
    due_date: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=_utcnow)


class ProfileChange(Base):
    """A fact change suggested in conversation, held until the customer confirms it in
    the workspace (PRD §6 fact design, §8 deep links). Confirmed changes keep history."""

    __tablename__ = "profile_change"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    case_id: Mapped[int] = mapped_column(ForeignKey("case.id"))
    fact_id: Mapped[Optional[int]] = mapped_column(ForeignKey("fact.id"), nullable=True)
    fact_key: Mapped[str] = mapped_column(String(255))
    previous_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    proposed_value: Mapped[str] = mapped_column(Text)
    source: Mapped[str] = mapped_column(String(50), default="whatsapp")
    quote: Mapped[Optional[str]] = mapped_column(Text, nullable=True)   # what the customer said
    affects: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # why it matters
    status: Mapped[str] = mapped_column(String(20), default="proposed")
    # proposed | confirmed | rejected
    decided_at: Mapped[Optional[datetime]] = mapped_column(UTCDateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=_utcnow)


class Stay(Base):
    """A period of physical presence in a country: the factual basis for residency.

    `departed` is None while the person is still there. `source` says where the dates
    came from (onboarding, passport, customer correction); dates change only through
    a confirmed profile change.
    """

    __tablename__ = "stay"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    case_id: Mapped[int] = mapped_column(ForeignKey("case.id"))
    country: Mapped[str] = mapped_column(String(5))          # IN | US
    arrived: Mapped[str] = mapped_column(String(10))         # ISO date
    departed: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    source: Mapped[str] = mapped_column(String(100), default="onboarding")
    document_id: Mapped[Optional[int]] = mapped_column(ForeignKey("document.id"), nullable=True)
    # The passport page and stamp lines behind these dates (see api/evidence.py).
    evidence: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=_utcnow)

    case: Mapped["Case"] = relationship(back_populates="stays")


class CaseNote(Base):
    """An expert's internal observation on a case. Never shown to the customer."""

    __tablename__ = "case_note"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    case_id: Mapped[int] = mapped_column(ForeignKey("case.id"))
    author: Mapped[str] = mapped_column(String(255))
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=_utcnow)

    case: Mapped["Case"] = relationship(back_populates="notes")


class MagicLink(Base):
    """A secure, time-limited link sent on WhatsApp (scope: magic-link sign-in and payment
    magic link). Opening a sign-in link takes the customer straight to the page it points at;
    a pay link opens the payment page pre-filled with the customer and the plan they chose."""

    __tablename__ = "magic_link"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    token: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    case_id: Mapped[int] = mapped_column(ForeignKey("case.id"))
    purpose: Mapped[str] = mapped_column(String(20))          # signin | pay
    target: Mapped[str] = mapped_column(String(255))          # where it opens
    payload: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)  # pay: the plan chosen
    expires_at: Mapped[datetime] = mapped_column(UTCDateTime)
    used_at: Mapped[Optional[datetime]] = mapped_column(UTCDateTime, nullable=True)
    opened_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=_utcnow)


class ExpertAccount(Base):
    """A Kiyos tax expert who signs in to the expert workspace (scope: expert sign-in and sign-up)."""

    __tablename__ = "expert_account"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    qualification: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
    role: Mapped[str] = mapped_column(String(40), default="Tax expert")
    last_sign_in_at: Mapped[Optional[datetime]] = mapped_column(UTCDateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=_utcnow)
