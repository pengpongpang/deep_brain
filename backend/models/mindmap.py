from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from bson import ObjectId
from .user import PyObjectId

class MindMapNode(BaseModel):
    id: str
    type: str = "default"
    position: Dict[str, float] = {"x": 0, "y": 0}
    data: Optional[Dict[str, Any]] = {}
    style: Optional[Dict[str, Any]] = {}
    parent_id: Optional[str] = None
    level: int = 0
    order: int = 0
    
    @property
    def label(self) -> str:
        """从data中获取label字段"""
        return self.data.get('label', '') if self.data else ''

class MindMapEdge(BaseModel):
    id: str
    source: str
    target: str
    type: str = "default"
    style: Optional[Dict[str, Any]] = {}
    animated: bool = False

class MindMapBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    nodes: List[MindMapNode] = []
    edges: List[MindMapEdge] = []
    layout: str = "hierarchical"  # hierarchical, radial, force
    theme: str = "default"
    is_public: bool = False

class MindMapCreate(MindMapBase):
    pass

class MindMapUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    nodes: Optional[List[MindMapNode]] = None
    edges: Optional[List[MindMapEdge]] = None
    layout: Optional[str] = None
    theme: Optional[str] = None
    is_public: Optional[bool] = None

class MindMapInDB(MindMapBase):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    user_id: PyObjectId
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    version: int = 1

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class MindMap(MindMapBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime
    version: int

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class NodeExpansionRequest(BaseModel):
    node_id: str
    expansion_topic: str
    context: Optional[str] = None
    max_children: int = Field(default=15, ge=1, le=20)

class ExpandNodeTaskRequest(BaseModel):
    request: NodeExpansionRequest
    current_nodes: List[Dict[str, Any]]

class GenerateMindMapRequest(BaseModel):
    topic: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    depth: int = Field(default=3, ge=1, le=5)
    style: str = Field(default="comprehensive")  # comprehensive, simple, detailed