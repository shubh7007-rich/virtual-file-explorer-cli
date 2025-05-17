
import { Card } from '@/components/ui/card';
import FileExplorer from '@/components/FileExplorer';
import Terminal from '@/components/Terminal';
import DiskUsage from '@/components/DiskUsage';
import { Separator } from '@/components/ui/separator';
import { useMemo } from 'react';
import { MountManager } from '@/models/MountManager';

const Index = () => {
  // Create a singleton instance of MountManager to share across components
  const mountManager = useMemo(() => new MountManager(), []);

  return (
    <div className="flex flex-col min-h-screen bg-[#1A1F2C] text-slate-300 font-mono">
      {/* Top Navigation Bar */}
      <header className="bg-[#222] p-4 border-b border-slate-700">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-terminal-success">Virtual File Explorer CLI</h1>
          <p className="text-slate-400 text-sm">An in-memory virtual file system with support for multiple file systems and mounting</p>
        </div>
      </header>
      
      {/* Main Content - Three Panel Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Panel - File Explorer */}
        <div className="lg:w-1/4 border-r border-slate-700 bg-[#221F26] overflow-y-auto">
          <div className="p-4">
            <h2 className="text-xl font-bold mb-4 text-terminal-prompt flex items-center gap-2">
              File Explorer
            </h2>
            <FileExplorer mountManager={mountManager} />
          </div>
        </div>
        
        {/* Center Panel - Terminal */}
        <div className="lg:w-2/4 flex-1 bg-terminal-background overflow-hidden flex flex-col">
          <div className="p-4 flex-1 flex flex-col">
            <h2 className="text-xl font-bold mb-4 text-terminal-prompt flex items-center gap-2">
              Terminal
            </h2>
            <Card className="flex-1 shadow-xl bg-terminal-background border-slate-700 overflow-hidden">
              <Terminal mountManager={mountManager} />
            </Card>
          </div>
        </div>
        
        {/* Right Panel - Disk Usage */}
        <div className="lg:w-1/4 border-l border-slate-700 bg-[#221F26] overflow-y-auto">
          <div className="p-4">
            <h2 className="text-xl font-bold mb-4 text-terminal-prompt flex items-center gap-2">
              Disk Usage
            </h2>
            <DiskUsage mountManager={mountManager} />
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="bg-[#222] py-2 px-4 border-t border-slate-700 text-center text-xs text-slate-400">
        <div>Students ke liye banaya gaya © 2025</div>
      </footer>
    </div>
  );
};

export default Index;
