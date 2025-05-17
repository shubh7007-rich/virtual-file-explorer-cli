
import React, { useState, useEffect } from 'react';
import { MountManager } from '../models/MountManager';
import { FileSystemNode, FileSystemNodeType } from '../models/FileSystem';
import { Card, CardContent } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface DiskUsageProps {
  mountManager: MountManager;
}

interface FileStats {
  totalFiles: number;
  totalDirectories: number;
  totalSize: number; // This would represent bytes in a real system
  fileTypes: Record<string, number>;
}

const DiskUsage: React.FC<DiskUsageProps> = ({ mountManager }) => {
  const [stats, setStats] = useState<FileStats>({
    totalFiles: 0,
    totalDirectories: 0,
    totalSize: 0,
    fileTypes: {}
  });

  useEffect(() => {
    const calculateStats = () => {
      const rootNode = mountManager.getFileSystemTree();
      const newStats: FileStats = {
        totalFiles: 0,
        totalDirectories: 0,
        totalSize: 0,
        fileTypes: {}
      };

      // Recursive function to process all nodes
      const processNode = (node: FileSystemNode) => {
        if (node.type === FileSystemNodeType.FILE) {
          newStats.totalFiles++;
          newStats.totalSize += node.content?.length || 0;
          
          // Extract file extension
          const parts = node.name.split('.');
          const ext = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : 'unknown';
          newStats.fileTypes[ext] = (newStats.fileTypes[ext] || 0) + 1;
        } else {
          newStats.totalDirectories++;
          
          if (node.children) {
            node.children.forEach(processNode);
          }
        }
      };

      if (rootNode) {
        processNode(rootNode);
      }

      setStats(newStats);
    };

    calculateStats();
    const interval = setInterval(calculateStats, 1000);
    return () => clearInterval(interval);
  }, [mountManager]);

  // Prepare chart data
  const chartData = Object.entries(stats.fileTypes).map(([name, value]) => ({ name, value }));

  // Colors for the chart
  const COLORS = ['#50FA7B', '#FF79C6', '#BD93F9', '#8BE9FD', '#FFB86C', '#F1FA8C'];

  return (
    <div className="space-y-4">
      <Card className="bg-terminal-background border-slate-700 overflow-hidden">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-3 text-sm mb-3">
            <div className="flex flex-col">
              <span className="text-slate-400">Files</span>
              <span className="text-terminal-file text-xl font-bold">{stats.totalFiles}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-400">Directories</span>
              <span className="text-terminal-directory text-xl font-bold">{stats.totalDirectories}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-400">Total Size</span>
              <span className="text-terminal-text text-xl font-bold">{stats.totalSize} bytes</span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-400">Mount Points</span>
              <span className="text-terminal-prompt text-xl font-bold">
                {mountManager.getMounts().length}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-terminal-background border-slate-700 overflow-hidden">
        <CardContent className="p-4">
          <h3 className="text-terminal-prompt mb-2">File Types</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} files`, 'Count']} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-slate-400">
              No files created yet
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-terminal-background border-slate-700 overflow-hidden">
        <CardContent className="p-4 text-sm">
          <h3 className="text-terminal-prompt mb-2">Mounted Filesystems</h3>
          <div className="space-y-1">
            {mountManager.getMounts().map((mount, index) => (
              <div key={index} className="flex justify-between">
                <span className="text-terminal-directory">{mount.mountPoint}</span>
                <span className="text-slate-400">{mount.fsType}</span>
              </div>
            ))}
            {mountManager.getMounts().length === 0 && (
              <div className="text-slate-400 italic">
                No mounted filesystems
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DiskUsage;
