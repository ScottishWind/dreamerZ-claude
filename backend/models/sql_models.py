"""
DreamerZ Platform — SQLAlchemy ORM Models (18 tables)

4-level course hierarchy: Category → Course → Module → Lesson
Compatible with both SQLite (local dev) and PostgreSQL (production).
Uses SQLAlchemy 2.0 declarative style with DeclarativeBase.
"""

from datetime import datetime
from typing import Optional, List

from sqlalchemy import (
    Column, Integer, String, Text, Boolean, Float,
    DateTime, JSON, ForeignKey, UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, relationship, Mapped, mapped_column
from sqlalchemy.sql import func


# ---------------------------------------------------------------------------
# Base
# ---------------------------------------------------------------------------

class Base(DeclarativeBase):
    pass


# ---------------------------------------------------------------------------
# 1. Category
# ---------------------------------------------------------------------------

class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    icon: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    status: Mapped[str] = mapped_column(String(50), default="published")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    # relationships
    courses: Mapped[List["Course"]] = relationship("Course", back_populates="category", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Category(id={self.id}, slug='{self.slug}', name='{self.name}')>"

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "slug": self.slug,
            "name": self.name,
            "description": self.description,
            "icon": self.icon,
            "sort_order": self.sort_order,
            "is_active": self.is_active,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


# ---------------------------------------------------------------------------
# 2. Course (NEW — inserted between Category and Module)
# ---------------------------------------------------------------------------

class Course(Base):
    __tablename__ = "courses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    category_id: Mapped[int] = mapped_column(Integer, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tagline: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    icon: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    theme_color: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    difficulty: Mapped[str] = mapped_column(String(50), default="beginner")
    total_xp: Mapped[int] = mapped_column(Integer, default=0)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(50), default="published")
    available_languages: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    tags: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    blueprint_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    # relationships
    category: Mapped["Category"] = relationship("Category", back_populates="courses")
    modules: Mapped[List["Module"]] = relationship("Module", back_populates="course", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Course(id={self.id}, slug='{self.slug}', name='{self.name}')>"

    def to_dict(self) -> dict:
        # Only emit `category_slug` if the relationship was eager-loaded.
        # Async sessions raise MissingGreenlet on a lazy fetch, so callers
        # who didn't selectinload(Course.category) just get None here.
        from sqlalchemy import inspect as sa_inspect
        cat_loaded = "category" not in sa_inspect(self).unloaded
        return {
            "id": self.id,
            "category_id": self.category_id,
            "category_slug": (
                self.category.slug if cat_loaded and self.category else None
            ),
            "slug": self.slug,
            "name": self.name,
            "description": self.description,
            "tagline": self.tagline,
            "icon": self.icon,
            "theme_color": self.theme_color,
            "difficulty": self.difficulty,
            "total_xp": self.total_xp,
            "sort_order": self.sort_order,
            "status": self.status,
            "available_languages": self.available_languages,
            "tags": self.tags,
            "created_by": self.created_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


# ---------------------------------------------------------------------------
# 3. Module (now linked to Course instead of Category)
# ---------------------------------------------------------------------------

class Module(Base):
    __tablename__ = "modules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    course_id: Mapped[int] = mapped_column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    status: Mapped[str] = mapped_column(String(50), default="published")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    # relationships
    course: Mapped["Course"] = relationship("Course", back_populates="modules")
    lessons: Mapped[List["Lesson"]] = relationship("Lesson", back_populates="module", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Module(id={self.id}, slug='{self.slug}', title='{self.title}')>"

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "course_id": self.course_id,
            "slug": self.slug,
            "title": self.title,
            "description": self.description,
            "sort_order": self.sort_order,
            "is_active": self.is_active,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


# ---------------------------------------------------------------------------
# 4. Lesson (replaces old Section)
# ---------------------------------------------------------------------------

class Lesson(Base):
    __tablename__ = "lessons"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    module_id: Mapped[int] = mapped_column(Integer, ForeignKey("modules.id", ondelete="CASCADE"), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    level: Mapped[str] = mapped_column(String(50), default="beginner")
    estimated_minutes: Mapped[int] = mapped_column(Integer, default=10)
    xp_reward: Mapped[int] = mapped_column(Integer, default=100)
    week: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    day: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_weekly_test: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(50), default="published")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    # relationships
    module: Mapped["Module"] = relationship("Module", back_populates="lessons")
    lesson_contents: Mapped[List["LessonContent"]] = relationship("LessonContent", back_populates="lesson", cascade="all, delete-orphan")
    quizzes: Mapped[List["Quiz"]] = relationship("Quiz", back_populates="lesson", cascade="all, delete-orphan")
    media_assets: Mapped[List["MediaAsset"]] = relationship("MediaAsset", back_populates="lesson", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Lesson(id={self.id}, slug='{self.slug}', title='{self.title}')>"

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "module_id": self.module_id,
            "slug": self.slug,
            "title": self.title,
            "description": self.description,
            "sort_order": self.sort_order,
            "level": self.level,
            "estimated_minutes": self.estimated_minutes,
            "xp_reward": self.xp_reward,
            "week": self.week,
            "day": self.day,
            "is_weekly_test": self.is_weekly_test,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


# ---------------------------------------------------------------------------
# 5. LessonContent (was TextContent, now linked to lesson_id)
# ---------------------------------------------------------------------------

class LessonContent(Base):
    __tablename__ = "lesson_contents"
    __table_args__ = (
        UniqueConstraint("lesson_id", "language", name="uq_lesson_content_lesson_language"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    lesson_id: Mapped[int] = mapped_column(Integer, ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False)
    language: Mapped[str] = mapped_column(String(10), default="en")
    explanation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    explanation_format: Mapped[str] = mapped_column(String(50), default="markdown")
    example: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    activity: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    bengali_tip: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    micro_grammar: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    speaking_task: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    vocab: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    dialogue: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    translated_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="published")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    # relationships
    lesson: Mapped["Lesson"] = relationship("Lesson", back_populates="lesson_contents")

    def __repr__(self) -> str:
        return f"<LessonContent(id={self.id}, lesson_id={self.lesson_id}, language='{self.language}')>"

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "lesson_id": self.lesson_id,
            "language": self.language,
            "explanation": self.explanation,
            "explanation_format": self.explanation_format,
            "example": self.example,
            "activity": self.activity,
            "bengali_tip": self.bengali_tip,
            "micro_grammar": self.micro_grammar,
            "speaking_task": self.speaking_task,
            "vocab": self.vocab,
            "dialogue": self.dialogue,
            "sort_order": self.sort_order,
            "translated_by": self.translated_by,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


# ---------------------------------------------------------------------------
# 6. Quiz (linked to lesson_id)
# ---------------------------------------------------------------------------

class Quiz(Base):
    __tablename__ = "quizzes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    lesson_id: Mapped[int] = mapped_column(Integer, ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    passing_score: Mapped[int] = mapped_column(Integer, default=70)
    max_attempts: Mapped[int] = mapped_column(Integer, default=3)
    shuffle_questions: Mapped[bool] = mapped_column(Boolean, default=False)
    shuffle_options: Mapped[bool] = mapped_column(Boolean, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(50), default="published")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    # relationships
    lesson: Mapped["Lesson"] = relationship("Lesson", back_populates="quizzes")
    questions: Mapped[List["QuizQuestion"]] = relationship("QuizQuestion", back_populates="quiz", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Quiz(id={self.id}, title='{self.title}')>"

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "lesson_id": self.lesson_id,
            "title": self.title,
            "passing_score": self.passing_score,
            "max_attempts": self.max_attempts,
            "shuffle_questions": self.shuffle_questions,
            "shuffle_options": self.shuffle_options,
            "sort_order": self.sort_order,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# ---------------------------------------------------------------------------
# 7. QuizQuestion (unchanged)
# ---------------------------------------------------------------------------

class QuizQuestion(Base):
    __tablename__ = "quiz_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    quiz_id: Mapped[int] = mapped_column(Integer, ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    question_type: Mapped[str] = mapped_column(String(50), default="mcq")
    options: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    correct_answer: Mapped[str] = mapped_column(String(500), nullable=False)
    hint: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    feedback: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    # relationships
    quiz: Mapped["Quiz"] = relationship("Quiz", back_populates="questions")

    def __repr__(self) -> str:
        return f"<QuizQuestion(id={self.id}, quiz_id={self.quiz_id}, type='{self.question_type}')>"

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "quiz_id": self.quiz_id,
            "question_text": self.question_text,
            "question_type": self.question_type,
            "options": self.options,
            "correct_answer": self.correct_answer,
            "hint": self.hint,
            "feedback": self.feedback,
            "sort_order": self.sort_order,
        }


# ---------------------------------------------------------------------------
# 8. MediaAsset (linked to lesson_id)
# ---------------------------------------------------------------------------

class MediaAsset(Base):
    __tablename__ = "media_assets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    lesson_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("lessons.id", ondelete="CASCADE"), nullable=True)
    asset_type: Mapped[str] = mapped_column(String(50), nullable=False)
    cloudinary_url: Mapped[str] = mapped_column(String(500), nullable=False)
    cloudinary_public_id: Mapped[str] = mapped_column(String(500), nullable=False)
    original_filename: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    mime_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    file_size_bytes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    alt_text: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    duration_seconds: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    tags: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    uploaded_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    # relationships
    lesson: Mapped[Optional["Lesson"]] = relationship("Lesson", back_populates="media_assets")

    def __repr__(self) -> str:
        return f"<MediaAsset(id={self.id}, type='{self.asset_type}', filename='{self.original_filename}')>"

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "lesson_id": self.lesson_id,
            "asset_type": self.asset_type,
            "cloudinary_url": self.cloudinary_url,
            "cloudinary_public_id": self.cloudinary_public_id,
            "original_filename": self.original_filename,
            "mime_type": self.mime_type,
            "file_size_bytes": self.file_size_bytes,
            "alt_text": self.alt_text,
            "duration_seconds": self.duration_seconds,
            "sort_order": self.sort_order,
            "tags": self.tags,
            "uploaded_by": self.uploaded_by,
            "uploaded_at": self.uploaded_at.isoformat() if self.uploaded_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


# ---------------------------------------------------------------------------
# 9. User
# ---------------------------------------------------------------------------

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(500), nullable=False)
    preferred_language: Mapped[str] = mapped_column(String(10), default="en")
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # relationships
    enrollments: Mapped[List["Enrollment"]] = relationship("Enrollment", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<User(id={self.id}, username='{self.username}', email='{self.email}')>"

    def to_dict(self) -> dict:
        """Return dict representation, excluding sensitive fields."""
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "preferred_language": self.preferred_language,
            "is_admin": self.is_admin,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "last_login": self.last_login.isoformat() if self.last_login else None,
        }


# ---------------------------------------------------------------------------
# 10. Enrollment
# ---------------------------------------------------------------------------

class Enrollment(Base):
    __tablename__ = "enrollments"
    __table_args__ = (
        UniqueConstraint("user_id", "plan_id", name="uq_enrollment_user_plan"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    plan_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("pricing_plans.id", ondelete="SET NULL"), nullable=True)
    payment_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    enrolled_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # relationships
    user: Mapped["User"] = relationship("User", back_populates="enrollments")
    plan: Mapped[Optional["PricingPlan"]] = relationship("PricingPlan", back_populates="enrollments")

    def __repr__(self) -> str:
        return f"<Enrollment(id={self.id}, user_id={self.user_id}, plan_id={self.plan_id})>"


# ---------------------------------------------------------------------------
# 15. PricingPlan (unchanged)
# ---------------------------------------------------------------------------

class PricingPlan(Base):
    __tablename__ = "pricing_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    tagline: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    price: Mapped[float] = mapped_column(Float, nullable=False)
    original_price: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    currency: Mapped[str] = mapped_column(String(10), default="INR")
    emoji: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    color: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    gradient: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    light_bg: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    badge: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    popular: Mapped[bool] = mapped_column(Boolean, default=False)
    highlights: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    cta: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    payment_link: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    course_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    # relationships
    enrollments: Mapped[List["Enrollment"]] = relationship("Enrollment", back_populates="plan")

    def __repr__(self) -> str:
        return f"<PricingPlan(id={self.id}, slug='{self.slug}', name='{self.name}', price={self.price})>"


# ---------------------------------------------------------------------------
# 16. FAQ (unchanged)
# ---------------------------------------------------------------------------

class FAQ(Base):
    __tablename__ = "faqs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    answer: Mapped[str] = mapped_column(Text, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    def __repr__(self) -> str:
        return f"<FAQ(id={self.id}, question='{self.question[:50]}...')>"


# ---------------------------------------------------------------------------
# 12. StatusCheck
# ---------------------------------------------------------------------------

class StatusCheck(Base):
    __tablename__ = "status_checks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    client_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    def __repr__(self) -> str:
        return f"<StatusCheck(id={self.id}, client_name='{self.client_name}', timestamp={self.timestamp})>"
