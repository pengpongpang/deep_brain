import os
import openai
from typing import List, Dict, Any
import json
import uuid
import asyncio
from concurrent.futures import ThreadPoolExecutor
from dotenv import load_dotenv
from models.mindmap import MindMapNode, MindMapEdge, GenerateMindMapRequest, NodeExpansionRequest

# 加载环境变量
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))

class LLMService:
    def __init__(self):
        self.client = openai.OpenAI(
            api_key=os.getenv("DEEPSEEK_API_KEY"),
            base_url="https://api.deepseek.com"
        )
        self.executor = ThreadPoolExecutor(max_workers=4)
    
    async def generate_mindmap(self, request: GenerateMindMapRequest) -> Dict[str, Any]:
        """根据主题生成思维导图"""
        try:
            prompt = self._create_mindmap_prompt(request)
            
            # 在线程池中执行同步的OpenAI调用
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                self.executor,
                lambda: self.client.chat.completions.create(
                    model="deepseek-chat",
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
            )
            
            content = response.choices[0].message.content
            
            # 提取JSON内容（处理markdown格式包裹的情况）
            json_content = self._extract_json_from_content(content)
            mindmap_data = json.loads(json_content)
            
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
            
            prompt = self._create_expansion_prompt(request, target_node, current_nodes)
            print("prompt: ")
            print(prompt)
            # 在线程池中执行同步的OpenAI调用
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                self.executor,
                lambda: self.client.chat.completions.create(
                    model="deepseek-chat",
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
            )
            
            content = response.choices[0].message.content
            print("content: ")
            print(content)
            
            # 提取JSON内容（处理markdown格式包裹的情况）
            json_content = self._extract_json_from_content(content)
            expansion_data = json.loads(json_content)
            
            # 生成新节点和边
            new_nodes, new_edges = self._create_expansion_nodes(
                target_node, expansion_data, request.max_children
            )
            
            return {
                "nodes": new_nodes,
                "edges": new_edges
            }
            
        except Exception as e:
            print(f"Error expanding node: {e}")
            return {"nodes": [], "edges": []}
    
    def _extract_json_from_content(self, content: str) -> str:
        """从内容中提取JSON字符串，处理markdown格式包裹的情况"""
        import re
        
        # 去除首尾空白
        content = content.strip()
        
        # 尝试匹配markdown代码块中的JSON
        json_pattern = r'```(?:json)?\s*([\s\S]*?)```'
        match = re.search(json_pattern, content, re.IGNORECASE)
        
        if match:
            # 提取代码块中的内容
            json_content = match.group(1).strip()
            print(f"Extracted JSON from markdown: {json_content}")
            return json_content
        
        # 如果没有找到markdown格式，尝试查找纯JSON（以{开头，以}结尾）
        json_start = content.find('{')
        json_end = content.rfind('}') + 1
        
        if json_start != -1 and json_end > json_start:
            json_content = content[json_start:json_end]
            print(f"Extracted JSON from content: {json_content}")
            return json_content
        
        # 如果都没找到，返回原内容
        print("No JSON pattern found, returning original content")
        return content
    
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
  "central_content": "主题的精炼内容描述（20-50字）",
  "branches": [
    {{
      "id": "分支ID",
      "label": "分支标题",
      "content": "分支的精炼内容描述（15-30字）",
      "level": 1,
      "children": [
        {{
          "id": "子节点ID",
          "label": "子节点标题",
          "content": "子节点的精炼内容描述（10-25字）",
          "level": 2,
          "children": []
        }}
      ]
    }}
  ]
}}

要求：
1. 生成{request.depth}层深度的思维导图
2. 每个节点都要有唯一的ID和标题
3. 每个节点都必须包含精炼的内容描述，内容要简洁明了，突出要点
4. 标题简洁，内容补充说明或展开要点
5. 内容要与主题相关且有逻辑性
6. 确保JSON格式正确
"""
        return prompt
    
    # 前端已处理路径节点排序，移除不再需要的方法
    
    def _create_expansion_prompt(self, request: NodeExpansionRequest, target_node: Dict, current_nodes: List[Dict]) -> str:
        """创建节点扩展提示"""
       
        # 直接使用前端传递的已排序节点构建层级结构
        hierarchy_info = ""
        if current_nodes and len(current_nodes) > 1:
            hierarchy_info = ""
            for i, node in enumerate(current_nodes):
                node_data = node.get('data', {})
                node_label = node_data.get('label', '未知节点')
                node_content = node_data.get('content', '')
                indent = "  " * i
                if i == len(current_nodes) - 1:
                    hierarchy_info += f"{indent}└─ {node_label}：{node_content} ← 当前要扩展的节点\n"
                else:
                    hierarchy_info += f"{indent}├─ {node_label}\n"
            hierarchy_info += "\n"
        elif len(current_nodes) == 1:
            node_data = current_nodes[0].get('data', {})
            node_label = node_data.get('label', '未知节点')
            node_content = node_data.get('content', '')
            hierarchy_info = f"当前思维导图只有根节点：{node_label}：{node_content}\n"
        
        prompt = f"""
请扩展思维导图节点，生成最多不超过{request.max_children}个子节点。
下面是当前思维导图分支的结构：
{hierarchy_info}

扩展要求：{request.expansion_topic or '根据当前节点内容进行合理扩展'}
补充上下文：{request.context or '无'}

请返回JSON格式的数据：
{{
  "children": [
    {{
      "label": "子节点标题1",
      "content": "子节点的精炼内容描述1（10-25字）",
      "description": "子节点描述1"
    }},
    {{
      "label": "子节点标题2",
      "content": "子节点的精炼内容描述2（10-25字）",
      "description": "子节点描述2"
    }}
  ]
}}

要求：
1. 生成的子节点要与父节点相关，并考虑整个层级结构的逻辑关系
2. 每个子节点都必须包含标题和精炼的内容描述
3. 标题简洁，内容补充说明或展开要点
4. 内容要有逻辑性和实用性，符合思维导图的层级逻辑
5. 确保JSON格式正确
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
                "content": mindmap_data.get("central_content", ""),
                "description": mindmap_data.get("central_content", ""),
                "level": 0,
                "parent_id": None,
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
                "content": branch.get("content", ""),
                "description": branch.get("content", ""),
                "level": level,
                "parent_id": parent_id,
                "isRoot": False
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
                    "content": child.get("content", ""),
                    "description": child.get("description", child.get("content", "")),
                    "level": parent_level + 1,
                    "parent_id": parent_node["id"],
                    "isRoot": False
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
                "parent_id": None,
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