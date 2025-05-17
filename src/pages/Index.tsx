
import { Card } from '@/components/ui/card';
import Terminal from '@/components/Terminal';

const Index = () => {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl md:text-4xl font-bold mb-4 text-white">Virtual File Explorer CLI</h1>
      <p className="text-slate-300 mb-8 max-w-2xl text-center">
        An in-memory virtual file system with support for multiple file systems and mounting.
        Type <code className="bg-slate-800 px-2 py-1 rounded text-amber-400">help</code> to see available commands.
      </p>
      
      <Card className="w-full max-w-4xl shadow-xl bg-terminal-background border-slate-700">
        <Terminal />
      </Card>
      
      <div className="mt-8 text-slate-400 max-w-2xl text-center text-sm">
        <h2 className="text-xl font-bold text-slate-200 mb-2">Quick Reference</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-bold text-slate-300 mb-1">File Operations</h3>
            <p><code className="text-amber-400">create_file &lt;path&gt;</code> - Create empty file</p>
            <p><code className="text-amber-400">write_file &lt;path&gt; &lt;content&gt;</code> - Write to file</p>
            <p><code className="text-amber-400">read_file &lt;path&gt;</code> - Display file content</p>
          </div>
          <div>
            <h3 className="font-bold text-slate-300 mb-1">Directory Operations</h3>
            <p><code className="text-amber-400">mkdir &lt;path&gt;</code> - Create directory</p>
            <p><code className="text-amber-400">ls [path]</code> - List contents</p>
            <p><code className="text-amber-400">cd &lt;path&gt;</code> - Change directory</p>
          </div>
        </div>
        <div className="mt-4">
          <h3 className="font-bold text-slate-300 mb-1">Mount Operations</h3>
          <p><code className="text-amber-400">mount &lt;fs_type&gt; &lt;mount_point&gt;</code> - Mount new filesystem</p>
          <p><code className="text-amber-400">mounts</code> - List mounted filesystems</p>
        </div>
      </div>
    </div>
  );
};

export default Index;
