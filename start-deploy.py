#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Deep Brain 项目自动部署启动器
自动检测操作系统并运行相应的部署脚本
"""

import os
import sys
import platform
import subprocess

def detect_os():
    """检测操作系统"""
    system = platform.system().lower()
    if system == 'windows':
        return 'windows'
    elif system == 'darwin':
        return 'macos'
    elif system == 'linux':
        return 'linux'
    else:
        return 'unknown'

def check_admin_windows():
    """检查Windows管理员权限"""
    try:
        import ctypes
        return ctypes.windll.shell32.IsUserAnAdmin()
    except:
        return False

def run_windows_deploy():
    """运行Windows部署脚本"""
    print("检测到 Windows 系统")
    
    if not check_admin_windows():
        print("错误: 需要管理员权限")
        print("请以管理员身份运行此脚本")
        input("按任意键退出...")
        return False
    
    script_path = os.path.join(os.path.dirname(__file__), 'deploy.bat')
    if not os.path.exists(script_path):
        print(f"错误: 找不到部署脚本 {script_path}")
        input("按任意键退出...")
        return False
    
    try:
        subprocess.run([script_path], check=True, shell=True)
        return True
    except subprocess.CalledProcessError as e:
        print(f"部署失败: {e}")
        return False

def run_unix_deploy():
    """运行Unix/Linux/macOS部署脚本"""
    os_name = detect_os()
    print(f"检测到 {os_name.upper()} 系统")
    
    script_path = os.path.join(os.path.dirname(__file__), 'deploy.sh')
    if not os.path.exists(script_path):
        print(f"错误: 找不到部署脚本 {script_path}")
        return False
    
    # 确保脚本有执行权限
    os.chmod(script_path, 0o755)
    
    try:
        subprocess.run([script_path], check=True)
        return True
    except subprocess.CalledProcessError as e:
        print(f"部署失败: {e}")
        return False
    except PermissionError:
        print("权限错误: 请确保有执行权限")
        print(f"运行: chmod +x {script_path}")
        return False

def main():
    """主函数"""
    print("="*50)
    print("Deep Brain 项目自动部署启动器")
    print("="*50)
    print()
    
    # 检测操作系统
    os_type = detect_os()
    
    if os_type == 'unknown':
        print("错误: 不支持的操作系统")
        print(f"当前系统: {platform.system()}")
        print("支持的系统: Windows, macOS, Linux")
        return False
    
    # 检查是否在项目根目录
    if not os.path.exists('docker-compose.yml'):
        print("错误: 请在项目根目录运行此脚本")
        print("确保当前目录包含 docker-compose.yml 文件")
        return False
    
    # 根据操作系统运行相应的部署脚本
    success = False
    if os_type == 'windows':
        success = run_windows_deploy()
    else:
        success = run_unix_deploy()
    
    if success:
        print("\n" + "="*50)
        print("部署完成！")
        print("="*50)
        print("前端访问地址: http://localhost")
        print("后端API地址: http://localhost:8000")
        print("MongoDB地址: localhost:27017")
        print("="*50)
    else:
        print("\n" + "="*50)
        print("部署失败！")
        print("="*50)
        print("请检查错误信息并重试")
        print("或查看 README-DEPLOY.md 获取详细说明")
        print("="*50)
    
    return success

if __name__ == '__main__':
    try:
        success = main()
        if not success:
            sys.exit(1)
    except KeyboardInterrupt:
        print("\n用户取消部署")
        sys.exit(1)
    except Exception as e:
        print(f"\n未知错误: {e}")
        sys.exit(1)