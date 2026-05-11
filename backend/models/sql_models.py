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
    DateTime, JSON, ForeignKey, UniqueConstraint, Numeric,
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
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

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
    draft_version_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("courses.id", ondelete="SET NULL"), nullable=True)
    created_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # relationships
    category: Mapped["Category"] = relationship("Category", back_populates="courses")
    modules: Mapped[List["Module"]] = relationship("Module", back_populates="course", cascade="all, delete-orphan")
    draft_version: Mapped["Course"] = relationship("Course", remote_side=[id], foreign_keys=[draft_version_id])

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
            "draft_version_id": self.draft_version_id,
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
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

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
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

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
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

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
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

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
    # Image/video dimensions in pixels (NULL for documents and audio).
    width: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    height: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    # Derived Cloudinary URLs for video — populated at register time.
    poster_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    streaming_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    # 'uploading' | 'processing' | 'ready' | 'failed' — used so the UI can
    # show a spinner while Cloudinary transcodes video uploads.
    upload_status: Mapped[str] = mapped_column(String(30), default="ready", nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    tags: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    uploaded_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

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
            "width": self.width,
            "height": self.height,
            "poster_url": self.poster_url,
            "streaming_url": self.streaming_url,
            "upload_status": self.upload_status,
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
    role: Mapped[str] = mapped_column(String(20), default="learner", nullable=False)
    ai_generation_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

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
            "role": self.role,
            "ai_generation_enabled": self.ai_generation_enabled,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "last_login": self.last_login.isoformat() if self.last_login else None,
        }


# ---------------------------------------------------------------------------
# Supervisor Assignment (supervisor-learner mapping)
# ---------------------------------------------------------------------------

class SupervisorAssignment(Base):
    __tablename__ = "supervisor_assignments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    supervisor_user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    learner_user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # relationships
    supervisor: Mapped["User"] = relationship("User", foreign_keys=[supervisor_user_id])
    learner: Mapped["User"] = relationship("User", foreign_keys=[learner_user_id])

    __table_args__ = (
        UniqueConstraint("supervisor_user_id", "learner_user_id", name="uq_supervisor_learner"),
    )

    def __repr__(self) -> str:
        return f"<SupervisorAssignment(id={self.id}, supervisor_id={self.supervisor_user_id}, learner_id={self.learner_user_id})>"

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "supervisor_user_id": self.supervisor_user_id,
            "learner_user_id": self.learner_user_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# ---------------------------------------------------------------------------
# 15. PricingPlan
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
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

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
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self) -> str:
        return f"<FAQ(id={self.id}, question='{self.question[:50]}...')>"


# ---------------------------------------------------------------------------
# 12. StatusCheck
# ---------------------------------------------------------------------------

class StatusCheck(Base):
    __tablename__ = "status_checks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    client_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self) -> str:
        return f"<StatusCheck(id={self.id}, client_name='{self.client_name}', timestamp={self.timestamp})>"


# ---------------------------------------------------------------------------
# 13. StudentCourseEnrollment (Learning Progress)
# ---------------------------------------------------------------------------

class StudentCourseEnrollment(Base):
    """Tracks when a student starts a course, status, completion, and current position."""
    __tablename__ = "student_course_enrollments"
    __table_args__ = (
        UniqueConstraint("student_user_id", "course_id", name="uq_student_course_enrollment"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    student_user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    course_id: Mapped[int] = mapped_column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="not_started")
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_accessed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    current_module_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("modules.id", ondelete="SET NULL"), nullable=True)
    current_lesson_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("lessons.id", ondelete="SET NULL"), nullable=True)
    completion_percent: Mapped[float] = mapped_column(Numeric(5, 2), default=0)
    lessons_completed_count: Mapped[int] = mapped_column(Integer, default=0)
    total_lessons_count: Mapped[int] = mapped_column(Integer, default=0)
    average_quiz_score: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)
    average_assignment_score: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)
    total_time_spent_seconds: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # relationships
    student: Mapped["User"] = relationship("User", foreign_keys=[student_user_id])
    course: Mapped["Course"] = relationship("Course")
    current_module: Mapped[Optional["Module"]] = relationship("Module", foreign_keys=[current_module_id])
    current_lesson: Mapped[Optional["Lesson"]] = relationship("Lesson", foreign_keys=[current_lesson_id])

    def __repr__(self) -> str:
        return f"<StudentCourseEnrollment(id={self.id}, student_user_id={self.student_user_id}, course_id={self.course_id})>"

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "student_user_id": self.student_user_id,
            "course_id": self.course_id,
            "status": self.status,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "last_accessed_at": self.last_accessed_at.isoformat() if self.last_accessed_at else None,
            "current_module_id": self.current_module_id,
            "current_lesson_id": self.current_lesson_id,
            "completion_percent": float(self.completion_percent) if self.completion_percent else 0,
            "lessons_completed_count": self.lessons_completed_count,
            "total_lessons_count": self.total_lessons_count,
            "average_quiz_score": float(self.average_quiz_score) if self.average_quiz_score else None,
            "average_assignment_score": float(self.average_assignment_score) if self.average_assignment_score else None,
            "total_time_spent_seconds": self.total_time_spent_seconds,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


# ---------------------------------------------------------------------------
# 14. StudentLessonProgress
# ---------------------------------------------------------------------------

class StudentLessonProgress(Base):
    """Tracks detailed progress at lesson level."""
    __tablename__ = "student_lesson_progress"
    __table_args__ = (
        UniqueConstraint("student_user_id", "lesson_id", name="uq_student_lesson_progress"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    student_user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    course_id: Mapped[int] = mapped_column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    module_id: Mapped[int] = mapped_column(Integer, ForeignKey("modules.id", ondelete="CASCADE"), nullable=False)
    lesson_id: Mapped[int] = mapped_column(Integer, ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="not_started")
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_accessed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    time_spent_seconds: Mapped[int] = mapped_column(Integer, default=0)
    visit_count: Mapped[int] = mapped_column(Integer, default=0)
    completion_percent: Mapped[float] = mapped_column(Numeric(5, 2), default=0)
    best_quiz_attempt_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    best_assignment_submission_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    best_score: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)
    mastery_level: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # relationships
    student: Mapped["User"] = relationship("User", foreign_keys=[student_user_id])
    course: Mapped["Course"] = relationship("Course")
    module: Mapped["Module"] = relationship("Module")
    lesson: Mapped["Lesson"] = relationship("Lesson")

    def __repr__(self) -> str:
        return f"<StudentLessonProgress(id={self.id}, student_user_id={self.student_user_id}, lesson_id={self.lesson_id})>"

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "student_user_id": self.student_user_id,
            "course_id": self.course_id,
            "module_id": self.module_id,
            "lesson_id": self.lesson_id,
            "status": self.status,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "last_accessed_at": self.last_accessed_at.isoformat() if self.last_accessed_at else None,
            "time_spent_seconds": self.time_spent_seconds,
            "visit_count": self.visit_count,
            "completion_percent": float(self.completion_percent) if self.completion_percent else 0,
            "best_quiz_attempt_id": self.best_quiz_attempt_id,
            "best_assignment_submission_id": self.best_assignment_submission_id,
            "best_score": float(self.best_score) if self.best_score else None,
            "mastery_level": self.mastery_level,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


# ---------------------------------------------------------------------------
# 15. AssessmentAttempt
# ---------------------------------------------------------------------------

class AssessmentAttempt(Base):
    """Tracks every scored attempt across quizzes and assignments."""
    __tablename__ = "assessment_attempts"
    __table_args__ = (
        UniqueConstraint("student_user_id", "assessment_type", "assessment_id", "attempt_number", name="uq_assessment_attempt"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    student_user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    course_id: Mapped[int] = mapped_column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    module_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("modules.id", ondelete="SET NULL"), nullable=True)
    lesson_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("lessons.id", ondelete="SET NULL"), nullable=True)
    assessment_type: Mapped[str] = mapped_column(String(30), nullable=False)
    assessment_id: Mapped[int] = mapped_column(Integer, nullable=False)
    attempt_number: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="started")
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    submitted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    graded_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    time_spent_seconds: Mapped[int] = mapped_column(Integer, default=0)
    raw_score: Mapped[Optional[float]] = mapped_column(Numeric(8, 2), nullable=True)
    max_score: Mapped[Optional[float]] = mapped_column(Numeric(8, 2), nullable=True)
    percentage_score: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)
    passed: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    grader_type: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    graded_by_user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    feedback_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # relationships
    student: Mapped["User"] = relationship("User", foreign_keys=[student_user_id])
    course: Mapped["Course"] = relationship("Course")
    module: Mapped[Optional["Module"]] = relationship("Module", foreign_keys=[module_id])
    lesson: Mapped[Optional["Lesson"]] = relationship("Lesson", foreign_keys=[lesson_id])
    graded_by: Mapped[Optional["User"]] = relationship("User", foreign_keys=[graded_by_user_id])

    def __repr__(self) -> str:
        return f"<AssessmentAttempt(id={self.id}, student_user_id={self.student_user_id}, assessment_type='{self.assessment_type}')>"

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "student_user_id": self.student_user_id,
            "course_id": self.course_id,
            "module_id": self.module_id,
            "lesson_id": self.lesson_id,
            "assessment_type": self.assessment_type,
            "assessment_id": self.assessment_id,
            "attempt_number": self.attempt_number,
            "status": self.status,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "submitted_at": self.submitted_at.isoformat() if self.submitted_at else None,
            "graded_at": self.graded_at.isoformat() if self.graded_at else None,
            "time_spent_seconds": self.time_spent_seconds,
            "raw_score": float(self.raw_score) if self.raw_score else None,
            "max_score": float(self.max_score) if self.max_score else None,
            "percentage_score": float(self.percentage_score) if self.percentage_score else None,
            "passed": self.passed,
            "grader_type": self.grader_type,
            "graded_by_user_id": self.graded_by_user_id,
            "feedback_summary": self.feedback_summary,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


# ---------------------------------------------------------------------------
# 16. AssessmentAttemptAnswer
# ---------------------------------------------------------------------------

class AssessmentAttemptAnswer(Base):
    """Stores question-level answers for each quiz attempt."""
    __tablename__ = "assessment_attempt_answers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    attempt_id: Mapped[int] = mapped_column(Integer, ForeignKey("assessment_attempts.id", ondelete="CASCADE"), nullable=False)
    question_id: Mapped[int] = mapped_column(Integer, nullable=False)
    question_type: Mapped[str] = mapped_column(String(30), nullable=False)
    prompt_snapshot: Mapped[str] = mapped_column(Text, nullable=False)
    student_answer_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    student_answer_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    correct_answer_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    is_correct: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    score_awarded: Mapped[Optional[float]] = mapped_column(Numeric(8, 2), nullable=True)
    max_score: Mapped[Optional[float]] = mapped_column(Numeric(8, 2), nullable=True)
    feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # relationships
    attempt: Mapped["AssessmentAttempt"] = relationship("AssessmentAttempt")

    def __repr__(self) -> str:
        return f"<AssessmentAttemptAnswer(id={self.id}, attempt_id={self.attempt_id}, question_id={self.question_id})>"

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "attempt_id": self.attempt_id,
            "question_id": self.question_id,
            "question_type": self.question_type,
            "prompt_snapshot": self.prompt_snapshot,
            "student_answer_text": self.student_answer_text,
            "student_answer_json": self.student_answer_json,
            "correct_answer_json": self.correct_answer_json,
            "is_correct": self.is_correct,
            "score_awarded": float(self.score_awarded) if self.score_awarded else None,
            "max_score": float(self.max_score) if self.max_score else None,
            "feedback": self.feedback,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# ---------------------------------------------------------------------------
# 17. ParentStudentLink
# ---------------------------------------------------------------------------

class ParentStudentLink(Base):
    """Maps parent accounts to student accounts for parent reporting."""
    __tablename__ = "parent_student_links"
    __table_args__ = (
        UniqueConstraint("parent_user_id", "student_user_id", name="uq_parent_student_link"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    parent_user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    student_user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    relationship_type: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    linked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # relationships
    parent: Mapped["User"] = relationship("User", foreign_keys=[parent_user_id])
    student: Mapped["User"] = relationship("User", foreign_keys=[student_user_id])

    def __repr__(self) -> str:
        return f"<ParentStudentLink(id={self.id}, parent_user_id={self.parent_user_id}, student_user_id={self.student_user_id})>"

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "parent_user_id": self.parent_user_id,
            "student_user_id": self.student_user_id,
            "relationship_type": self.relationship_type,
            "is_active": self.is_active,
            "linked_at": self.linked_at.isoformat() if self.linked_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

