from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from models.task import Task, TaskCreate, TaskType
from models.mindmap import GenerateMindMapRequest, NodeExpansionRequest
from services.task_service import task_service
from utils.auth import get_current_active_user
from models.user import User

router = APIRouter()

@router.post("/generate-mindmap", response_model=dict)
async def create_generate_mindmap_task(
    request: GenerateMindMapRequest,
    current_user: User = Depends(get_current_active_user)
):
    """创建思维导图生成任务"""
    try:
        task_data = TaskCreate(
            task_type=TaskType.GENERATE_MINDMAP,
            input_data=request.dict(),
            user_id=str(current_user.id)
        )
        
        task_id = await task_service.create_task(task_data)
        
        return {
            "task_id": task_id,
            "message": "思维导图生成任务已创建，请轮询任务状态"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"创建任务失败: {str(e)}"
        )

@router.post("/expand-node", response_model=dict)
async def create_expand_node_task(
    request: NodeExpansionRequest,
    current_nodes: List[dict],
    current_user: User = Depends(get_current_active_user)
):
    """创建节点扩展任务"""
    try:
        task_data = TaskCreate(
            task_type=TaskType.EXPAND_NODE,
            input_data={
                "request": request.dict(),
                "current_nodes": current_nodes
            },
            user_id=str(current_user.id)
        )
        
        task_id = await task_service.create_task(task_data)
        
        return {
            "task_id": task_id,
            "message": "节点扩展任务已创建，请轮询任务状态"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"创建任务失败: {str(e)}"
        )

@router.get("/{task_id}", response_model=Task)
async def get_task_status(
    task_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """获取任务状态"""
    task = await task_service.get_task(task_id, str(current_user.id))
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="任务不存在"
        )
    
    return task

@router.get("/", response_model=List[Task])
async def get_user_tasks(
    limit: int = 10,
    current_user: User = Depends(get_current_active_user)
):
    """获取用户的任务列表"""
    tasks = await task_service.get_user_tasks(str(current_user.id), limit)
    return tasks