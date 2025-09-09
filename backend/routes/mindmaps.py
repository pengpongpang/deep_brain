from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Optional
from models.mindmap import (
    MindMap, MindMapCreate, MindMapUpdate, MindMapInDB,
    NodeExpansionRequest, GenerateMindMapRequest
)
from models.user import User
from utils.auth import get_current_active_user
from database import get_mindmaps_collection
from bson import ObjectId
from datetime import datetime
import uuid

router = APIRouter(prefix="/mindmaps", tags=["mindmaps"])

@router.post("", response_model=MindMap)
async def create_mindmap(
    mindmap: MindMapCreate,
    current_user: User = Depends(get_current_active_user)
):
    """创建新的思维导图"""
    mindmaps_collection = await get_mindmaps_collection()
    
    mindmap_dict = mindmap.dict()
    mindmap_dict.update({
        "user_id": ObjectId(current_user.id),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "version": 1
    })
    
    result = await mindmaps_collection.insert_one(mindmap_dict)
    created_mindmap = await mindmaps_collection.find_one({"_id": result.inserted_id})
    
    # 将MongoDB的_id转换为id字段
    if '_id' in created_mindmap:
        created_mindmap['id'] = str(created_mindmap['_id'])
        del created_mindmap['_id']  # 删除原始_id字段
    
    # 将user_id转换为字符串
    if 'user_id' in created_mindmap:
        created_mindmap['user_id'] = str(created_mindmap['user_id'])
    
    return MindMap(**created_mindmap)

@router.get("", response_model=List[MindMap])
async def get_user_mindmaps(
    current_user: User = Depends(get_current_active_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100)
):
    """获取用户的思维导图列表"""
    mindmaps_collection = await get_mindmaps_collection()
    
    cursor = mindmaps_collection.find(
        {"user_id": ObjectId(current_user.id)}
    ).sort("created_at", -1).skip(skip).limit(limit)
    
    mindmaps = await cursor.to_list(length=limit)
    
    # 转换数据格式以匹配Pydantic模型
    converted_mindmaps = []
    for mindmap in mindmaps:
        # 将MongoDB的_id转换为id字段
        if '_id' in mindmap:
            mindmap['id'] = str(mindmap['_id'])
            del mindmap['_id']  # 删除原始_id字段
        
        # 将user_id转换为字符串
        if 'user_id' in mindmap:
            mindmap['user_id'] = str(mindmap['user_id'])
        
        # 确保nodes字段格式正确
        if 'nodes' in mindmap:
            for node in mindmap['nodes']:
                # 确保每个节点都有必需的label字段
                if 'data' in node and 'label' in node['data'] and 'label' not in node:
                    node['label'] = node['data']['label']
                elif 'label' not in node:
                    node['label'] = 'Untitled'
        
        converted_mindmaps.append(MindMap(**mindmap))
    
    return converted_mindmaps

@router.get("/{mindmap_id}", response_model=MindMap)
async def get_mindmap(
    mindmap_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """获取特定思维导图"""
    mindmaps_collection = await get_mindmaps_collection()
    
    try:
        mindmap = await mindmaps_collection.find_one({
            "_id": ObjectId(mindmap_id),
            "user_id": ObjectId(current_user.id)
        })
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid mindmap ID"
        )
    
    if not mindmap:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mindmap not found"
        )
    
    # 将MongoDB的_id转换为id字段
    if '_id' in mindmap:
        mindmap['id'] = str(mindmap['_id'])
        del mindmap['_id']  # 删除原始_id字段
    
    # 将user_id转换为字符串
    if 'user_id' in mindmap:
        mindmap['user_id'] = str(mindmap['user_id'])
    
    # 确保nodes字段格式正确
    if 'nodes' in mindmap:
        for node in mindmap['nodes']:
            # 确保每个节点都有必需的label字段
            if 'data' in node and 'label' in node['data'] and 'label' not in node:
                node['label'] = node['data']['label']
            elif 'label' not in node:
                node['label'] = 'Untitled'
    
    return MindMap(**mindmap)

@router.put("/{mindmap_id}", response_model=MindMap)
async def update_mindmap(
    mindmap_id: str,
    mindmap_update: MindMapUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """更新思维导图"""
    mindmaps_collection = await get_mindmaps_collection()
    
    try:
        # 检查思维导图是否存在且属于当前用户
        existing_mindmap = await mindmaps_collection.find_one({
            "_id": ObjectId(mindmap_id),
            "user_id": ObjectId(current_user.id)
        })
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid mindmap ID"
        )
    
    if not existing_mindmap:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mindmap not found"
        )
    
    # 准备更新数据
    update_data = mindmap_update.dict(exclude_unset=True)
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        update_data["version"] = existing_mindmap.get("version", 1) + 1
        
        await mindmaps_collection.update_one(
            {"_id": ObjectId(mindmap_id)},
            {"$set": update_data}
        )
    
    # 返回更新后的思维导图
    updated_mindmap = await mindmaps_collection.find_one({"_id": ObjectId(mindmap_id)})
    
    # 将MongoDB的_id转换为id字段
    if '_id' in updated_mindmap:
        updated_mindmap['id'] = str(updated_mindmap['_id'])
        del updated_mindmap['_id']  # 删除原始_id字段
    
    # 将user_id转换为字符串
    if 'user_id' in updated_mindmap:
        updated_mindmap['user_id'] = str(updated_mindmap['user_id'])
    
    return MindMap(**updated_mindmap)

@router.delete("/{mindmap_id}")
async def delete_mindmap(
    mindmap_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """删除思维导图"""
    mindmaps_collection = await get_mindmaps_collection()
    
    try:
        result = await mindmaps_collection.delete_one({
            "_id": ObjectId(mindmap_id),
            "user_id": ObjectId(current_user.id)
        })
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid mindmap ID"
        )
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mindmap not found"
        )
    
    return {"message": "Mindmap deleted successfully"}

@router.get("/public/search", response_model=List[MindMap])
async def search_public_mindmaps(
    q: str = Query(..., min_length=1),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=50)
):
    """搜索公开的思维导图"""
    mindmaps_collection = await get_mindmaps_collection()
    
    cursor = mindmaps_collection.find({
        "is_public": True,
        "$text": {"$search": q}
    }).sort("created_at", -1).skip(skip).limit(limit)
    
    mindmaps = await cursor.to_list(length=limit)
    
    # 转换数据格式以匹配Pydantic模型
    converted_mindmaps = []
    for mindmap in mindmaps:
        # 将MongoDB的_id转换为id字段
        if '_id' in mindmap:
            mindmap['id'] = str(mindmap['_id'])
        converted_mindmaps.append(MindMap(**mindmap))
    
    return converted_mindmaps