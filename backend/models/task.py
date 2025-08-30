from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum
from bson import ObjectId

class TaskStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    STOPPED = "stopped"
    RESTARTING = "restarting"

class TaskType(str, Enum):
    GENERATE_MINDMAP = "generate_mindmap"
    EXPAND_NODE = "expand_node"

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, values=None):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, field_schema, handler):
        return {"type": "string"}

class TaskBase(BaseModel):
    task_type: TaskType
    status: TaskStatus = TaskStatus.PENDING
    progress: int = Field(default=0, ge=0, le=100)
    result: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    input_data: Dict[str, Any]
    user_id: str
    title: Optional[str] = Field(None, description="任务标题")
    description: Optional[str] = Field(None, description="任务描述")
    task_definition: Optional[Dict[str, Any]] = Field(None, description="任务定义，包含执行任务所需的所有参数")
    is_stoppable: bool = Field(default=True, description="任务是否可以停止")
    is_restartable: bool = Field(default=True, description="任务是否可以重启")
    deleted: bool = Field(default=False, description="逻辑删除标记")

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    status: Optional[TaskStatus] = None
    progress: Optional[int] = Field(None, ge=0, le=100)
    result: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    task_definition: Optional[Dict[str, Any]] = None
    is_stoppable: Optional[bool] = None
    is_restartable: Optional[bool] = None
    deleted: Optional[bool] = None

class Task(TaskBase):
    id: Optional[str] = Field(None, description="任务ID")
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class TaskInDB(Task):
    pass