
import React, { useState, useEffect } from 'react';
import { MountManager } from '../models/MountManager';
import { FileSystemNode, FileSystemNodeType } from '../models/FileSystem';
import { cn } from '@/lib/utils';
import { ChevronRight, ChevronDown, Folder, File } from 'lucide-react';

interface FileExplorerProps {
  mountManager: MountManager;
}

interface TreeNodeProps {
  node: FileSystemNode;
  path: string;
  level: number;
  mountManager: MountManager;
}

const TreeNode: React.FC<TreeNodeProps> = ({ node, path, level, mountManager }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const fullPath = `${path}${node.name}${node.type === FileSystemNodeType.DIRECTORY ? '/' : ''}`;
  const isDirectory = node.type === FileSystemNodeType.DIRECTORY;

  // Automatically expand first level
  useEffect(() => {
    if (level === 0) {
      setIsExpanded(true);
    }
  }, [level]);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="select-none">
      <div 
        className={cn(
          "flex items-center py-1 px-1 hover:bg-slate-700/30 rounded cursor-pointer",
          isDirectory ? "text-terminal-directory" : "text-terminal-file"
        )}
        style={{ paddingLeft: `${level * 16}px` }}
        onClick={toggleExpand}
      >
        {isDirectory ? (
          <>
            <span className="mr-1">
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </span>
            <Folder size={16} className="mr-2" />
          </>
        ) : (
          <div className="ml-5 mr-1">
            <File size={16} className="mr-2" />
          </div>
        )}
        <span className="truncate">
          {node.name || (level === 0 ? 'root' : '')}
        </span>
      </div>

      {isDirectory && isExpanded && (
        <div>
          {node.children?.map((child, index) => (
            <TreeNode 
              key={`${fullPath}${child.name}-${index}`}
              node={child} 
              path={fullPath} 
              level={level + 1}
              mountManager={mountManager}
            />
          ))}
          {(!node.children || node.children.length === 0) && (
            <div 
              className="text-slate-500 italic py-1 text-xs"
              style={{ paddingLeft: `${(level + 1) * 16 + 20}px` }}
            >
              (empty)
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const FileExplorer: React.FC<FileExplorerProps> = ({ mountManager }) => {
  const [fileSystem, setFileSystem] = useState<FileSystemNode | null>(null);

  // Refresh file explorer every second
  useEffect(() => {
    const refreshFileSystem = () => {
      const rootNode = mountManager.getFileSystemTree();
      setFileSystem(rootNode);
    };

    refreshFileSystem();
    const interval = setInterval(refreshFileSystem, 1000);
    return () => clearInterval(interval);
  }, [mountManager]);

  if (!fileSystem) {
    return <div className="text-slate-400">Loading file system...</div>;
  }

  return (
    <div className="bg-[#1E1E2E] rounded-md border border-slate-700 p-2 h-full overflow-y-auto">
      <TreeNode
        node={fileSystem}
        path="/"
        level={0}
        mountManager={mountManager}
      />
    </div>
  );
};

export default FileExplorer;
