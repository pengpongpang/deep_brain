from fastapi import APIRouter, HTTPException, status, Depends
from models.mindmap import GenerateMindMapRequest, NodeExpansionRequest, MindMapCreate
from models.user import User
from utils.auth import get_current_active_user
from services.llm_service import llm_service
from database import get_mindmaps_collection
from bson import ObjectId
from datetime import datetime
from typing import List, Dict, Any

router = APIRouter(prefix="/llm", tags=["llm"])

@router.post("/generate-mindmap")
async def generate_mindmap(
    request: GenerateMindMapRequest,
    current_user: User = Depends(get_current_active_user)
):
    """使用LLM生成思维导图"""
    try:
        # 调用LLM服务生成思维导图
        mindmap_data = await llm_service.generate_mindmap(request)
        
        # 自动保存生成的思维导图
        mindmaps_collection = await get_mindmaps_collection()
        
        mindmap_dict = {
            "title": mindmap_data["title"],
            "description": mindmap_data["description"],
            "nodes": mindmap_data["nodes"],
            "edges": mindmap_data["edges"],
            "layout": "hierarchical",
            "theme": "default",
            "is_public": False,
            "user_id": ObjectId(current_user.id),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "version": 1
        }
        
        result = await mindmaps_collection.insert_one(mindmap_dict)
        mindmap_data["id"] = str(result.inserted_id)
        
        return {
            "success": True,
            "mindmap": mindmap_data,
            "message": "思维导图生成成功"
        }
        
    except Exception as e:
        print(f"Error in generate_mindmap: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="生成思维导图时发生错误"
        )

@router.post("/expand-node/{mindmap_id}")
async def expand_node(
    mindmap_id: str,
    request: NodeExpansionRequest,
    current_user: User = Depends(get_current_active_user)
):
    """扩展思维导图节点"""
    try:
        mindmaps_collection = await get_mindmaps_collection()
        
        # 获取思维导图
        mindmap = await mindmaps_collection.find_one({
            "_id": ObjectId(mindmap_id),
            "user_id": ObjectId(current_user.id)
        })
        
        if not mindmap:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="思维导图不存在"
            )
        
        # 调用LLM服务扩展节点
        expansion_result = await llm_service.expand_node(
            request, mindmap.get("nodes", [])
        )
        
        # 更新思维导图
        new_nodes = mindmap.get("nodes", []) + expansion_result["new_nodes"]
        new_edges = mindmap.get("edges", []) + expansion_result["new_edges"]
        
        await mindmaps_collection.update_one(
            {"_id": ObjectId(mindmap_id)},
            {
                "$set": {
                    "nodes": new_nodes,
                    "edges": new_edges,
                    "updated_at": datetime.utcnow(),
                    "version": mindmap.get("version", 1) + 1
                }
            }
        )
        
        return {
            "success": True,
            "new_nodes": expansion_result["new_nodes"],
            "new_edges": expansion_result["new_edges"],
            "message": "节点扩展成功"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in expand_node: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="扩展节点时发生错误"
        )

@router.post("/suggest-topics")
async def suggest_topics(
    query: str,
    current_user: User = Depends(get_current_active_user)
):
    """根据查询建议相关主题"""
    try:
        # 使用LLM生成主题建议
        prompt = f"""
请为查询「{query}」推荐5个相关的思维导图主题。

返回JSON格式：
{{
  "suggestions": [
    {{
      "title": "主题标题",
      "description": "主题描述",
      "category": "分类"
    }}
  ]
}}

要求：
1. 主题要与查询相关
2. 涵盖不同角度和层面
3. 确保JSON格式正确
"""
        
        response = llm_service.client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {
                    "role": "system",
                    "content": "你是一个专业的主题推荐助手。请根据用户查询推荐相关的思维导图主题。"
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.8,
            max_tokens=800
        )
        
        import json
        content = response.choices[0].message.content
        suggestions_data = json.loads(content)
        
        return {
            "success": True,
            "suggestions": suggestions_data.get("suggestions", []),
            "query": query
        }
        
    except Exception as e:
        print(f"Error in suggest_topics: {e}")
        # 返回默认建议
        return {
            "success": True,
            "suggestions": [
                {
                    "title": f"{query} - 基础概念",
                    "description": f"探索{query}的基本概念和要素",
                    "category": "基础知识"
                },
                {
                    "title": f"{query} - 应用场景",
                    "description": f"分析{query}的实际应用和案例",
                    "category": "实践应用"
                }
            ],
            "query": query
        }

@router.get("/usage-stats")
async def get_usage_stats(
    current_user: User = Depends(get_current_active_user)
):
    """获取用户的LLM使用统计"""
    try:
        mindmaps_collection = await get_mindmaps_collection()
        
        # 统计用户创建的思维导图数量
        total_mindmaps = await mindmaps_collection.count_documents({
            "user_id": ObjectId(current_user.id)
        })
        
        # 统计本月创建的思维导图
        from datetime import datetime, timedelta
        month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        monthly_mindmaps = await mindmaps_collection.count_documents({
            "user_id": ObjectId(current_user.id),
            "created_at": {"$gte": month_start}
        })
        
        return {
            "success": True,
            "stats": {
                "total_mindmaps": total_mindmaps,
                "monthly_mindmaps": monthly_mindmaps,
                "user_since": current_user.created_at.isoformat(),
                "last_activity": current_user.updated_at.isoformat()
            }
        }
        
    except Exception as e:
        print(f"Error in get_usage_stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取使用统计时发生错误"
        )