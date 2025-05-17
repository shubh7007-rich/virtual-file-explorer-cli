
import React, { useState, useRef, useEffect } from 'react';
import { MountManager } from '../models/MountManager';
import { CommandParser, CommandResult } from '../utils/CommandParser';
import { FileSystemNodeType } from '../models/FileSystem';
import { cn } from '@/lib/utils';

type TerminalLineType = 'input' | 'output' | 'error' | 'success' | 'command';

interface TerminalLine {
  id: number;
  type: TerminalLineType;
  content: React.ReactNode;
}

interface DirectoryItem {
  name: string;
  isDirectory: boolean;
}

interface MountItem {
  mountPoint: string;
  fsType: string;
}

const Terminal: React.FC = () => {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [mountManager] = useState(() => new MountManager());
  const [commandParser] = useState(() => new CommandParser(mountManager));
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lineIdCounter = useRef(0);

  // Add welcome message
  useEffect(() => {
    addLine('output', (
      <div className="p-2">
        <h1 className="text-xl font-bold mb-2 text-terminal-prompt">Virtual File Explorer CLI</h1>
        <p className="mb-1">Welcome to the Virtual File Explorer CLI!</p>
        <p className="mb-1">Type <span className="text-terminal-command">help</span> to see available commands.</p>
        <p>Current directory: <span className="text-terminal-directory">/</span></p>
      </div>
    ));
  }, []);

  // Scroll to bottom when lines change
  useEffect(() => {
    scrollToBottom();
  }, [lines]);

  // Focus input when clicking on terminal
  useEffect(() => {
    const terminal = terminalRef.current;
    if (!terminal) return;

    const handleClick = () => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    };

    terminal.addEventListener('click', handleClick);
    return () => {
      terminal.removeEventListener('click', handleClick);
    };
  }, []);

  const scrollToBottom = () => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  };

  const addLine = (type: TerminalLineType, content: React.ReactNode) => {
    const newId = lineIdCounter.current++;
    setLines(prevLines => [...prevLines, { id: newId, type, content }]);
  };

  const clearScreen = () => {
    setLines([]);
  };

  const handlePromptKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (currentInput.trim()) {
        handleCommand(currentInput);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      navigateHistory(-1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      navigateHistory(1);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Auto-complete could be implemented here
    }
  };

  const navigateHistory = (direction: number) => {
    if (commandHistory.length === 0) return;
    
    const newIndex = historyIndex + direction;
    
    if (newIndex >= commandHistory.length) {
      // Beyond newest command, clear input
      setHistoryIndex(-1);
      setCurrentInput('');
    } else if (newIndex < 0) {
      // Before oldest command, do nothing
      return;
    } else {
      // Set to history item
      setHistoryIndex(newIndex);
      setCurrentInput(commandHistory[commandHistory.length - 1 - newIndex]);
    }
  };

  const handleCommand = (cmd: string) => {
    // Add command to history
    setCommandHistory(prev => [...prev, cmd]);
    setHistoryIndex(-1);
    
    // Add command to terminal
    addLine('command', (
      <div className="flex">
        <span className="text-terminal-prompt mr-2">
          {mountManager.getCurrentDirectory()}
        </span>
        <span className="text-terminal-command">$ {cmd}</span>
      </div>
    ));
    
    // Clear input
    setCurrentInput('');
    
    // Parse and execute command
    const result = commandParser.parseCommand(cmd);
    
    if (result.message === 'CLEAR_SCREEN') {
      clearScreen();
      return;
    }
    
    if (result.message === 'EXIT') {
      addLine('success', 'Goodbye!');
      return;
    }
    
    // Handle ls command with special formatting
    if (cmd.startsWith('ls') && result.success && result.data) {
      const items = result.data as DirectoryItem[];
      addLine('output', (
        <div className="grid grid-cols-3 gap-2">
          {items.map((item, i) => (
            <div 
              key={i} 
              className={cn(
                "px-2 py-1 rounded",
                item.isDirectory ? "text-terminal-directory" : "text-terminal-file"
              )}
            >
              {item.name}
            </div>
          ))}
        </div>
      ));
      return;
    }
    
    // Handle mounts command with special formatting
    if (cmd === 'mounts' && result.success && result.data) {
      const mounts = result.data as MountItem[];
      addLine('output', (
        <div className="my-1">
          <div className="font-bold mb-1">{result.message}</div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-terminal-text/30">
                <th className="text-left py-1">Mount Point</th>
                <th className="text-left py-1">Filesystem Type</th>
              </tr>
            </thead>
            <tbody>
              {mounts.map((mount, i) => (
                <tr key={i} className="border-b border-terminal-text/10">
                  <td className="py-1 text-terminal-directory">{mount.mountPoint}</td>
                  <td className="py-1">{mount.fsType}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ));
      return;
    }
    
    // Handle regular command result
    if (result.success) {
      addLine('success', result.message);
    } else {
      addLine('error', result.message);
    }
  };

  return (
    <div 
      className="terminal-window overflow-auto relative"
      ref={terminalRef}
    >
      <div className="terminal-output">
        {lines.map(line => (
          <div 
            key={line.id}
            className={cn(
              "mb-1 last:mb-3",
              line.type === 'error' && "text-terminal-error",
              line.type === 'success' && "text-terminal-success",
              line.type === 'command' && "font-bold"
            )}
          >
            {line.content}
          </div>
        ))}
      </div>
      
      <div className="terminal-input-line sticky bottom-0 bg-terminal-background">
        <span className="terminal-prompt">
          {mountManager.getCurrentDirectory()}$
        </span>
        <input
          ref={inputRef}
          type="text"
          className="terminal-input"
          value={currentInput}
          onChange={e => setCurrentInput(e.target.value)}
          onKeyDown={handlePromptKeyDown}
          autoFocus
          autoComplete="off"
          spellCheck="false"
        />
        <span className="terminal-caret"></span>
      </div>
    </div>
  );
};

export default Terminal;
