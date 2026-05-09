"""Progress and assessment Pydantic models."""

from typing import Optional, List
from pydantic import BaseModel, Field, field_validator
from datetime import datetime


# ---------------------------------------------------------------------------
# StudentCourseEnrollment
# ---------------------------------------------------------------------------

class StudentCourseEnrollmentCreate(BaseModel):
    student_user_id: int = Field(..., gt=0)
    course_id: int = Field(..., gt=0)
    status: str = Field(default="not_started", max_length=30)

    @field_validator("status", mode="before")
    @classmethod
    def validate_status(cls, v):
        valid_statuses = {"not_started", "in_progress", "completed", "dropped", "paused"}
        if v not in valid_statuses:
            raise ValueError(f"Status must be one of {valid_statuses}")
        return v


class StudentCourseEnrollmentUpdate(BaseModel):
    status: Optional[str] = Field(None, max_length=30)
    current_module_id: Optional[int] = Field(None, gt=0)
    current_lesson_id: Optional[int] = Field(None, gt=0)
    completion_percent: Optional[float] = Field(None, ge=0, le=100)
    lessons_completed_count: Optional[int] = Field(None, ge=0)
    total_lessons_count: Optional[int] = Field(None, ge=0)
    average_quiz_score: Optional[float] = Field(None, ge=0, le=100)
    average_assignment_score: Optional[float] = Field(None, ge=0, le=100)
    total_time_spent_seconds: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None


class StudentCourseEnrollmentResponse(BaseModel):
    id: int
    student_user_id: int
    course_id: int
    status: str
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    last_accessed_at: Optional[datetime]
    current_module_id: Optional[int]
    current_lesson_id: Optional[int]
    completion_percent: float
    lessons_completed_count: int
    total_lessons_count: int
    average_quiz_score: Optional[float]
    average_assignment_score: Optional[float]
    total_time_spent_seconds: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# StudentLessonProgress
# ---------------------------------------------------------------------------

class StudentLessonProgressCreate(BaseModel):
    student_user_id: int = Field(..., gt=0)
    course_id: int = Field(..., gt=0)
    module_id: int = Field(..., gt=0)
    lesson_id: int = Field(..., gt=0)
    status: str = Field(default="not_started", max_length=30)

    @field_validator("status", mode="before")
    @classmethod
    def validate_status(cls, v):
        valid_statuses = {"not_started", "in_progress", "completed", "needs_review"}
        if v not in valid_statuses:
            raise ValueError(f"Status must be one of {valid_statuses}")
        return v


class StudentLessonProgressUpdate(BaseModel):
    status: Optional[str] = Field(None, max_length=30)
    time_spent_seconds: Optional[int] = Field(None, ge=0)
    visit_count: Optional[int] = Field(None, ge=0)
    completion_percent: Optional[float] = Field(None, ge=0, le=100)
    best_quiz_attempt_id: Optional[int] = Field(None, gt=0)
    best_assignment_submission_id: Optional[int] = Field(None, gt=0)
    best_score: Optional[float] = Field(None, ge=0, le=100)
    mastery_level: Optional[str] = Field(None, max_length=30)

    @field_validator("mastery_level", mode="before")
    @classmethod
    def validate_mastery_level(cls, v):
        if v is not None:
            valid_levels = {"beginner", "developing", "proficient", "mastered"}
            if v not in valid_levels:
                raise ValueError(f"Mastery level must be one of {valid_levels}")
        return v


class StudentLessonProgressResponse(BaseModel):
    id: int
    student_user_id: int
    course_id: int
    module_id: int
    lesson_id: int
    status: str
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    last_accessed_at: Optional[datetime]
    time_spent_seconds: int
    visit_count: int
    completion_percent: float
    best_quiz_attempt_id: Optional[int]
    best_assignment_submission_id: Optional[int]
    best_score: Optional[float]
    mastery_level: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# AssessmentAttempt
# ---------------------------------------------------------------------------

class AssessmentAttemptCreate(BaseModel):
    student_user_id: Optional[int] = Field(None, gt=0)
    course_id: int = Field(..., gt=0)
    assessment_type: str = Field(..., max_length=30)
    assessment_id: int = Field(..., gt=0)
    attempt_number: int = Field(..., gt=0)
    module_id: Optional[int] = Field(None, gt=0)
    lesson_id: Optional[int] = Field(None, gt=0)

    @field_validator("assessment_type", mode="before")
    @classmethod
    def validate_assessment_type(cls, v):
        valid_types = {"quiz", "assignment"}
        if v not in valid_types:
            raise ValueError(f"Assessment type must be one of {valid_types}")
        return v


class AssessmentAttemptUpdate(BaseModel):
    status: Optional[str] = Field(None, max_length=30)
    submitted_at: Optional[datetime] = None
    graded_at: Optional[datetime] = None
    time_spent_seconds: Optional[int] = Field(None, ge=0)
    raw_score: Optional[float] = Field(None, ge=0)
    max_score: Optional[float] = Field(None, ge=0)
    percentage_score: Optional[float] = Field(None, ge=0, le=100)
    passed: Optional[bool] = None
    grader_type: Optional[str] = Field(None, max_length=30)
    graded_by_user_id: Optional[int] = Field(None, gt=0)
    feedback_summary: Optional[str] = None

    @field_validator("status", mode="before")
    @classmethod
    def validate_status(cls, v):
        if v is not None:
            valid_statuses = {"started", "submitted", "graded", "abandoned"}
            if v not in valid_statuses:
                raise ValueError(f"Status must be one of {valid_statuses}")
        return v

    @field_validator("grader_type", mode="before")
    @classmethod
    def validate_grader_type(cls, v):
        if v is not None:
            valid_types = {"auto", "teacher", "ai"}
            if v not in valid_types:
                raise ValueError(f"Grader type must be one of {valid_types}")
        return v


class AssessmentAttemptResponse(BaseModel):
    id: int
    student_user_id: int
    course_id: int
    module_id: Optional[int]
    lesson_id: Optional[int]
    assessment_type: str
    assessment_id: int
    attempt_number: int
    status: str
    started_at: Optional[datetime]
    submitted_at: Optional[datetime]
    graded_at: Optional[datetime]
    time_spent_seconds: int
    raw_score: Optional[float]
    max_score: Optional[float]
    percentage_score: Optional[float]
    passed: Optional[bool]
    grader_type: Optional[str]
    graded_by_user_id: Optional[int]
    feedback_summary: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# AssessmentAttemptAnswer
# ---------------------------------------------------------------------------

class AssessmentAttemptAnswerCreate(BaseModel):
    attempt_id: int = Field(..., gt=0)
    question_id: int = Field(..., gt=0)
    question_type: str = Field(..., max_length=30)
    prompt_snapshot: str = Field(..., min_length=1)
    student_answer_text: Optional[str] = None
    student_answer_json: Optional[dict] = None
    correct_answer_json: Optional[dict] = None
    is_correct: Optional[bool] = None
    score_awarded: Optional[float] = Field(None, ge=0)
    max_score: Optional[float] = Field(None, ge=0)
    feedback: Optional[str] = None


class AssessmentAttemptAnswerResponse(BaseModel):
    id: int
    attempt_id: int
    question_id: int
    question_type: str
    prompt_snapshot: str
    student_answer_text: Optional[str]
    student_answer_json: Optional[dict]
    correct_answer_json: Optional[dict]
    is_correct: Optional[bool]
    score_awarded: Optional[float]
    max_score: Optional[float]
    feedback: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# ParentStudentLink
# ---------------------------------------------------------------------------

class ParentStudentLinkCreate(BaseModel):
    parent_user_id: int = Field(..., gt=0)
    student_user_id: int = Field(..., gt=0)
    relationship_type: Optional[str] = Field(None, max_length=30)

    @field_validator("relationship_type", mode="before")
    @classmethod
    def validate_relationship_type(cls, v):
        if v is not None:
            valid_types = {"father", "mother", "guardian", "mentor"}
            if v not in valid_types:
                raise ValueError(f"Relationship type must be one of {valid_types}")
        return v


class ParentStudentLinkUpdate(BaseModel):
    relationship_type: Optional[str] = Field(None, max_length=30)
    is_active: Optional[bool] = None


class ParentStudentLinkResponse(BaseModel):
    id: int
    parent_user_id: int
    student_user_id: int
    relationship_type: Optional[str]
    is_active: bool
    linked_at: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
