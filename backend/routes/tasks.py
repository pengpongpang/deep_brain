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
            user_id=str(current_user.id),
            title=f"生成思维导图: {request.topic}",
            description=f"基于主题'{request.topic}'生成思维导图",
            task_definition={
                "type": "generate_mindmap",
                "topic": request.topic,
                "description": request.description,
                "max_depth": getattr(request, 'max_depth', 3),
                "max_children": getattr(request, 'max_children', 5)
            }
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
        # 找到要扩展的节点信息
        target_node = next((node for node in current_nodes if node.get("id") == request.node_id), None)
        node_label = target_node.get("data", {}).get("label", "未知节点") if target_node else "未知节点"
        
        task_data = TaskCreate(
            task_type=TaskType.EXPAND_NODE,
            input_data={
                "request": request.dict(),
                "current_nodes": current_nodes
            },
            user_id=str(current_user.id),
            title=f"扩展节点: {node_label}",
            description=f"扩展节点'{node_label}'，生成{request.max_children}个子节点",
            task_definition={
                "type": "expand_node",
                "node_id": request.node_id,
                "expansion_topic": request.expansion_topic,
                "max_children": request.max_children,
                "node_label": node_label
            }
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

@router.post("/{task_id}/stop", response_model=dict)
async def stop_task(
    task_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """停止任务"""
    try:
        success = await task_service.stop_task(task_id, str(current_user.id))
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="任务不存在或无法停止"
            )
        
        return {
            "message": "任务已停止",
            "task_id": task_id
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"停止任务失败: {str(e)}"
        )

@router.post("/{task_id}/restart", response_model=dict)
async def restart_task(
    task_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """重启任务"""
    try:
        new_task_id = await task_service.restart_task(task_id, str(current_user.id))
        
        if not new_task_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="任务不存在或无法重启"
            )
        
        return {
            "message": "任务已重启",
            "original_task_id": task_id,
            "new_task_id": new_task_id
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"重启任务失败: {str(e)}"
        )

@router.delete("/{task_id}", response_model=dict)
async def delete_task(
    task_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """删除任务"""
    try:
        success = await task_service.delete_task(task_id, str(current_user.id))
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="任务不存在或无法删除（正在运行的任务不能删除）"
            )
        
        return {
            "message": "任务已删除",
            "task_id": task_id
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"删除任务失败: {str(e)}"
        )