import os
import openai
from typing import List, Dict, Any
import json
import uuid
from dotenv import load_dotenv
from models.mindmap import MindMapNode, MindMapEdge, GenerateMindMapRequest, NodeExpansionRequest

# 加载环境变量
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))

class LLMService:
    def __init__(self):
        self.client = openai.OpenAI(
            api_key=os.getenv("OPENAI_API_KEY")
        )
    
    async def generate_mindmap(self, request: GenerateMindMapRequest) -> Dict[str, Any]:
        """根据主题生成思维导图"""
        try:
            prompt = self._create_mindmap_prompt(request)
            
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {
                        "role": "system",
                        "content": "你是一个专业的思维导图生成助手。请根据用户提供的主题生成结构化的思维导图数据。返回的数据必须是有效的JSON格式。"
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7,
                max_tokens=2000
            )
            
            content = response.choices[0].message.content
            mindmap_data = json.loads(content)
            
            # 转换为标准格式
            nodes, edges = self._convert_to_react_flow_format(mindmap_data)
            
            return {
                "nodes": nodes,
                "edges": edges,
                "title": request.topic,
                "description": request.description
            }
            
        except Exception as e:
            print(f"Error generating mindmap: {e}")
            # 返回默认的思维导图结构
            return self._create_default_mindmap(request.topic, request.description)
    
    async def expand_node(self, request: NodeExpansionRequest, current_nodes: List[Dict]) -> Dict[str, Any]:
        """扩展思维导图节点"""
        try:
            # 找到要扩展的节点
            target_node = None
            for node in current_nodes:
                if node.get("id") == request.node_id:
                    target_node = node
                    break
            
            if not target_node:
                raise ValueError("Node not found")
            
            prompt = self._create_expansion_prompt(request, target_node)
            
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {
                        "role": "system",
                        "content": "你是一个专业的思维导图扩展助手。请根据用户的要求为指定节点生成子节点。返回的数据必须是有效的JSON格式。"
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7,
                max_tokens=1000
            )
            
            content = response.choices[0].message.content
            expansion_data = json.loads(content)
            
            # 生成新节点和边
            new_nodes, new_edges = self._create_expansion_nodes(
                target_node, expansion_data, request.max_children
            )
            
            return {
                "new_nodes": new_nodes,
                "new_edges": new_edges
            }
            
        except Exception as e:
            print(f"Error expanding node: {e}")
            return {"new_nodes": [], "new_edges": []}
    
    def _create_mindmap_prompt(self, request: GenerateMindMapRequest) -> str:
        """创建思维导图生成提示"""
        style_descriptions = {
            "comprehensive": "详细全面的",
            "simple": "简洁明了的",
            "detailed": "深入详细的"
        }
        
        style_desc = style_descriptions.get(request.style, "全面的")
        
        prompt = f"""
请为主题「{request.topic}」生成一个{style_desc}思维导图。

主题描述：{request.description or '无'}
深度层级：{request.depth}
风格：{request.style}

请返回JSON格式的数据，包含以下结构：
{{
  "central_topic": "主题名称",
  "branches": [
    {{
      "id": "分支ID",
      "label": "分支标题",
      "level": 1,
      "children": [
        {{
          "id": "子节点ID",
          "label": "子节点标题",
          "level": 2,
          "children": []
        }}
      ]
    }}
  ]
}}

要求：
1. 生成{request.depth}层深度的思维导图
2. 每个节点都要有唯一的ID
3. 内容要与主题相关且有逻辑性
4. 确保JSON格式正确
"""
        return prompt
    
    def _create_expansion_prompt(self, request: NodeExpansionRequest, target_node: Dict) -> str:
        """创建节点扩展提示"""
        prompt = f"""
请为思维导图节点「{target_node.get('data', {}).get('label', target_node.get('label', ''))}」生成{request.max_children}个子节点。

扩展要求：{request.expansion_prompt}
上下文信息：{request.context or '无'}

请返回JSON格式的数据：
{{
  "children": [
    {{
      "label": "子节点标题1",
      "description": "子节点描述1"
    }},
    {{
      "label": "子节点标题2",
      "description": "子节点描述2"
    }}
  ]
}}

要求：
1. 生成的子节点要与父节点相关
2. 内容要有逻辑性和实用性
3. 确保JSON格式正确
"""
        return prompt
    
    def _convert_to_react_flow_format(self, mindmap_data: Dict) -> tuple:
        """将LLM生成的数据转换为React Flow格式"""
        nodes = []
        edges = []
        
        # 创建中心节点
        central_id = str(uuid.uuid4())
        nodes.append({
            "id": central_id,
            "type": "custom",
            "position": {"x": 400, "y": 200},
            "data": {
                "label": mindmap_data.get("central_topic", "主题"),
                "level": 0,
                "isRoot": True
            },
            "style": {
                "background": "#ff6b6b",
                "color": "white",
                "border": "2px solid #ff5252",
                "borderRadius": "10px",
                "fontSize": "16px",
                "fontWeight": "bold"
            }
        })
        
        # 处理分支
        branches = mindmap_data.get("branches", [])
        angle_step = 360 / max(len(branches), 1)
        
        for i, branch in enumerate(branches):
            self._add_branch_nodes(
                nodes, edges, branch, central_id, i, angle_step, 1
            )
        
        return nodes, edges
    
    def _add_branch_nodes(self, nodes: List, edges: List, branch: Dict, parent_id: str, 
                         branch_index: int, angle_step: float, level: int):
        """递归添加分支节点"""
        import math
        
        # 计算节点位置
        angle = math.radians(branch_index * angle_step)
        radius = 150 * level
        x = 400 + radius * math.cos(angle)
        y = 200 + radius * math.sin(angle)
        
        node_id = branch.get("id", str(uuid.uuid4()))
        
        # 根据层级设置不同的样式
        colors = ["#4ecdc4", "#45b7d1", "#96ceb4", "#feca57", "#ff9ff3"]
        color = colors[min(level - 1, len(colors) - 1)]
        
        nodes.append({
            "id": node_id,
            "type": "custom",
            "position": {"x": x, "y": y},
            "data": {
                "label": branch.get("label", f"节点{branch_index + 1}"),
                "level": level
            },
            "style": {
                "background": color,
                "color": "white",
                "border": f"2px solid {color}",
                "borderRadius": "8px",
                "fontSize": "14px"
            }
        })
        
        # 添加边
        edges.append({
            "id": f"edge-{parent_id}-{node_id}",
            "source": parent_id,
            "target": node_id,
            "type": "smoothstep",
            "animated": True,
            "style": {"stroke": color, "strokeWidth": 2}
        })
        
        # 递归处理子节点
        children = branch.get("children", [])
        if children:
            child_angle_step = 60 / max(len(children), 1)
            for j, child in enumerate(children):
                self._add_branch_nodes(
                    nodes, edges, child, node_id, j, child_angle_step, level + 1
                )
    
    def _create_expansion_nodes(self, parent_node: Dict, expansion_data: Dict, max_children: int) -> tuple:
        """创建扩展节点"""
        import math
        
        new_nodes = []
        new_edges = []
        
        children = expansion_data.get("children", [])[:max_children]
        parent_pos = parent_node.get("position", {"x": 400, "y": 200})
        parent_level = parent_node.get("data", {}).get("level", 0)
        
        # 计算子节点位置
        angle_step = 60 / max(len(children), 1)
        radius = 120
        
        colors = ["#4ecdc4", "#45b7d1", "#96ceb4", "#feca57", "#ff9ff3"]
        color = colors[min(parent_level, len(colors) - 1)]
        
        for i, child in enumerate(children):
            angle = math.radians((i - len(children) / 2) * angle_step)
            x = parent_pos["x"] + radius * math.cos(angle)
            y = parent_pos["y"] + radius * math.sin(angle)
            
            child_id = str(uuid.uuid4())
            
            new_nodes.append({
                "id": child_id,
                "type": "custom",
                "position": {"x": x, "y": y},
                "data": {
                    "label": child.get("label", f"新节点{i + 1}"),
                    "description": child.get("description", ""),
                    "level": parent_level + 1
                },
                "style": {
                    "background": color,
                    "color": "white",
                    "border": f"2px solid {color}",
                    "borderRadius": "8px",
                    "fontSize": "12px"
                }
            })
            
            new_edges.append({
                "id": f"edge-{parent_node['id']}-{child_id}",
                "source": parent_node["id"],
                "target": child_id,
                "type": "smoothstep",
                "animated": True,
                "style": {"stroke": color, "strokeWidth": 2}
            })
        
        return new_nodes, new_edges
    
    def _create_default_mindmap(self, topic: str, description: str = None) -> Dict[str, Any]:
        """创建默认的思维导图结构"""
        central_id = str(uuid.uuid4())
        
        nodes = [{
            "id": central_id,
            "type": "custom",
            "position": {"x": 400, "y": 200},
            "data": {
                "label": topic,
                "level": 0,
                "isRoot": True
            },
            "style": {
                "background": "#ff6b6b",
                "color": "white",
                "border": "2px solid #ff5252",
                "borderRadius": "10px",
                "fontSize": "16px",
                "fontWeight": "bold"
            }
        }]
        
        return {
            "nodes": nodes,
            "edges": [],
            "title": topic,
            "description": description
        }

# 创建全局LLM服务实例
# 延迟初始化，在需要时创建实例
_llm_service_instance = None

def get_llm_service():
    global _llm_service_instance
    if _llm_service_instance is None:
        _llm_service_instance = LLMService()
    return _llm_service_instance

llm_service = get_llm_service()