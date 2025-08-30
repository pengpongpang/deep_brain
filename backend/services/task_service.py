import asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime
from bson import ObjectId
from models.task import Task, TaskCreate, TaskUpdate, TaskStatus, TaskType
from database import get_database
from services.llm_service import llm_service
from models.mindmap import GenerateMindMapRequest, NodeExpansionRequest
import uuid
import traceback

class TaskService:
    def __init__(self):
        self.running_tasks = {}
    
    async def get_tasks_collection(self):
        """获取任务集合"""
        db = await get_database()
        return db.tasks
    
    async def create_task(self, task_data: TaskCreate) -> str:
        """创建新任务"""
        tasks_collection = await self.get_tasks_collection()
        
        task_dict = task_data.dict()
        task_dict.update({
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "user_id": ObjectId(task_data.user_id)
        })
        
        result = await tasks_collection.insert_one(task_dict)
        task_id = str(result.inserted_id)
        
        # 启动异步任务
        asyncio.create_task(self._execute_task(task_id, task_data))
        
        return task_id
    
    async def get_task(self, task_id: str, user_id: str) -> Optional[Task]:
        """获取任务详情"""
        tasks_collection = await self.get_tasks_collection()
        
        try:
            task = await tasks_collection.find_one({
                "_id": ObjectId(task_id),
                "user_id": ObjectId(user_id)
            })
            
            if not task:
                return None
            
            # 转换数据格式
            if '_id' in task:
                task['id'] = str(task['_id'])
                del task['_id']
            
            if 'user_id' in task:
                task['user_id'] = str(task['user_id'])
            
            return Task(**task)
            
        except Exception:
            return None
    
    async def update_task(self, task_id: str, update_data: TaskUpdate) -> bool:
        """更新任务状态"""
        tasks_collection = await self.get_tasks_collection()
        
        try:
            update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
            update_dict["updated_at"] = datetime.utcnow()
            
            if update_data.status == TaskStatus.COMPLETED or update_data.status == TaskStatus.FAILED:
                update_dict["completed_at"] = datetime.utcnow()
            
            result = await tasks_collection.update_one(
                {"_id": ObjectId(task_id)},
                {"$set": update_dict}
            )
            
            return result.modified_count > 0
            
        except Exception:
            return False
    
    async def get_user_tasks(self, user_id: str, limit: int = 10) -> List[Task]:
        """获取用户的任务列表"""
        tasks_collection = await self.get_tasks_collection()
        
        cursor = tasks_collection.find(
            {"user_id": ObjectId(user_id)}
        ).sort("created_at", -1).limit(limit)
        
        tasks = await cursor.to_list(length=limit)
        
        # 转换数据格式
        converted_tasks = []
        for task in tasks:
            if '_id' in task:
                task['id'] = str(task['_id'])
                del task['_id']
            
            if 'user_id' in task:
                task['user_id'] = str(task['user_id'])
            
            converted_tasks.append(Task(**task))
        
        return converted_tasks
    
    async def _execute_task(self, task_id: str, task_data: TaskCreate):
        """执行异步任务"""
        try:
            # 更新任务状态为运行中
            await self.update_task(task_id, TaskUpdate(
                status=TaskStatus.RUNNING,
                progress=10
            ))
            
            if task_data.task_type == TaskType.GENERATE_MINDMAP:
                result = await self._execute_generate_mindmap(task_id, task_data.input_data)
            elif task_data.task_type == TaskType.EXPAND_NODE:
                result = await self._execute_expand_node(task_id, task_data.input_data)
            else:
                raise ValueError(f"Unknown task type: {task_data.task_type}")
            
            # 任务完成
            await self.update_task(task_id, TaskUpdate(
                status=TaskStatus.COMPLETED,
                progress=100,
                result=result
            ))
            
        except Exception as e:
            error_message = f"Task execution failed: {str(e)}"
            print(f"Task {task_id} failed: {error_message}")
            print(traceback.format_exc())
            
            # 任务失败
            await self.update_task(task_id, TaskUpdate(
                status=TaskStatus.FAILED,
                progress=0,
                error_message=error_message
            ))
    
    async def _execute_generate_mindmap(self, task_id: str, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """执行思维导图生成任务"""
        # 更新进度
        await self.update_task(task_id, TaskUpdate(progress=30))
        
        # 创建请求对象
        request = GenerateMindMapRequest(**input_data)
        
        # 更新进度
        await self.update_task(task_id, TaskUpdate(progress=50))
        
        # 调用LLM服务生成思维导图
        mindmap_data = await llm_service.generate_mindmap(request)
        
        # 更新进度
        await self.update_task(task_id, TaskUpdate(progress=70))
        
        # 自动保存生成的思维导图到数据库
        db = await get_database()
        mindmaps_collection = db.mindmaps
        
        # 从任务数据中获取用户ID并保存思维导图
        tasks_collection = await self.get_tasks_collection()
        task_doc = await tasks_collection.find_one({"_id": ObjectId(task_id)})
        
        if task_doc and task_doc.get('user_id'):
            mindmap_dict = {
                "title": mindmap_data["title"],
                "description": mindmap_data["description"],
                "nodes": mindmap_data["nodes"],
                "edges": mindmap_data["edges"],
                "layout": "hierarchical",
                "theme": "default",
                "is_public": False,
                "user_id": task_doc['user_id'],
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "version": 1
            }
            
            result = await mindmaps_collection.insert_one(mindmap_dict)
            mindmap_data["mindmap_id"] = str(result.inserted_id)
        
        # 更新进度
        await self.update_task(task_id, TaskUpdate(progress=90))
        
        return mindmap_data
    
    async def _execute_expand_node(self, task_id: str, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """执行节点扩展任务"""
        # 更新进度
        await self.update_task(task_id, TaskUpdate(progress=30))
        
        # 创建请求对象
        request = NodeExpansionRequest(**input_data["request"])
        current_nodes = input_data["current_nodes"]
        
        # 更新进度
        await self.update_task(task_id, TaskUpdate(progress=50))
        
        # 调用LLM服务扩展节点
        expansion_data = await llm_service.expand_node(request, current_nodes)
        
        # 更新进度
        await self.update_task(task_id, TaskUpdate(progress=90))
        
        return expansion_data

# 创建全局任务服务实例
_task_service_instance = None

def get_task_service():
    global _task_service_instance
    if _task_service_instance is None:
        _task_service_instance = TaskService()
    return _task_service_instance

task_service = get_task_service()